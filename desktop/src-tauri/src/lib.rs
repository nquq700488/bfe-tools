use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::{Emitter, Manager};

mod backend;
mod csp;

use backend::{BackendConfig, BackendProcess};

// ---- 配置持久化 ----

/// 应用配置（读写 app_data_dir()/config.json）
#[derive(Debug, Clone, Serialize, Deserialize)]
struct AppConfig {
    /// 用户设置的目标 URL，None 表示未设置
    target_url: Option<String>,
}

/// 受信任的后端注入目标：仅限 localhost/127.0.0.1 且 scheme 为 http/https
fn is_trusted_local_target(url: &str) -> bool {
    let lower = url.to_lowercase();
    if !lower.starts_with("http://") && !lower.starts_with("https://") {
        return false;
    }
    let after_scheme = &lower[lower.find("://").unwrap() + 3..];
    let host = after_scheme
        .split('/').next().unwrap_or("")
        .split(':').next().unwrap_or("")
        .split('?').next().unwrap_or("");
    host == "localhost" || host == "127.0.0.1"
}

fn config_path(app_handle: &tauri::AppHandle) -> PathBuf {
    app_handle
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("config.json")
}

fn load_config(app_handle: &tauri::AppHandle) -> AppConfig {
    let path = config_path(app_handle);
    fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or(AppConfig { target_url: None })
}

fn save_config(app_handle: &tauri::AppHandle, config: &AppConfig) -> Result<(), String> {
    let path = config_path(app_handle);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("创建配置目录失败: {e}"))?;
    }
    let json =
        serde_json::to_string_pretty(config).map_err(|e| format!("序列化配置失败: {e}"))?;
    fs::write(&path, json).map_err(|e| format!("写入配置失败: {e}"))
}

// ---- URL 校验 ----

const MAX_URL_LENGTH: usize = 2048;

fn validate_target_url(raw: &str) -> Result<String, String> {
    let url = raw.trim().to_string();
    if url.is_empty() {
        return Err("URL 不能为空".into());
    }
    if url.len() > MAX_URL_LENGTH {
        return Err(format!("URL 长度不能超过 {} 字符", MAX_URL_LENGTH));
    }
    if url.contains(char::is_whitespace) {
        return Err("URL 不能包含空白字符".into());
    }

    let lower = url.to_lowercase();
    if lower.starts_with("javascript:") || lower.starts_with("data:") || lower.starts_with("vbscript:") {
        return Err("不允许使用 javascript:/data:/vbscript: 等危险协议".into());
    }

    if !url.contains("://") {
        return Err("URL 必须包含 scheme（http:// 或 https:// 或 file://）".into());
    }

    let lower = url.to_lowercase();
    if !lower.starts_with("http://") && !lower.starts_with("https://") && !lower.starts_with("file://") {
        let scheme = lower.split("://").next().unwrap_or("?");
        return Err(format!("不支持的 URL 方案: {scheme}，仅支持 http/https/file"));
    }

    Ok(url)
}

// ---- Tauri 命令 ----

struct BackendState {
    backend: Mutex<Option<BackendProcess>>,
}

#[tauri::command]
fn get_backend_info(state: tauri::State<'_, BackendState>) -> Result<serde_json::Value, String> {
    let guard = state.backend.lock().map_err(|e| e.to_string())?;
    match guard.as_ref() {
        Some(b) => Ok(serde_json::json!({
            "baseUrl": b.base_url(),
            "token": b.token,
            "port": b.port.load(std::sync::atomic::Ordering::SeqCst),
        })),
        None => Ok(serde_json::json!({
            "baseUrl": null,
            "token": "",
            "port": null,
        })),
    }
}

#[tauri::command]
fn get_target_url(app_handle: tauri::AppHandle) -> Result<Option<String>, String> {
    Ok(load_config(&app_handle).target_url)
}

#[tauri::command]
fn set_target_url(app_handle: tauri::AppHandle, url: String) -> Result<(), String> {
    let validated = validate_target_url(&url).map_err(|e| format!("URL 校验失败: {e}"))?;
    let mut config = load_config(&app_handle);
    config.target_url = Some(validated);
    save_config(&app_handle, &config)
}

/// 返回已拼接后端参数的完整跳转 URL。
/// 仅对受信任本地目标追加 __bfe_port/__bfe_token，外部 URL / file:// 原样返回。
#[tauri::command]
fn get_target_url_with_query(
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, BackendState>,
) -> Result<Option<String>, String> {
    let config = load_config(&app_handle);
    let Some(ref raw_url) = config.target_url else {
        return Ok(None);
    };

    let url = match validate_target_url(raw_url) {
        Ok(u) => u,
        Err(_) => {
            let _ = save_config(&app_handle, &AppConfig { target_url: None });
            return Ok(None);
        }
    };

    if !is_trusted_local_target(&url) {
        return Ok(Some(url));
    }

    let guard = state.backend.lock().map_err(|e| e.to_string())?;
    let Some(ref backend) = *guard else {
        return Ok(Some(url));
    };
    let port = backend.port.load(std::sync::atomic::Ordering::SeqCst);
    let token = &backend.token;

    if token.is_empty() {
        return Ok(Some(url));
    }

    Ok(Some(append_query(&url, port, token)))
}

/// 清空保存的 URL，通知控制器页面清除 iframe
#[tauri::command]
fn reset_target_url(app_handle: tauri::AppHandle) -> Result<(), String> {
    save_config(&app_handle, &AppConfig { target_url: None })?;
    // 通知控制器页面清除 iframe（空字符串 = 显示 placeholder）
    app_handle.emit("bfe-navigate", "").ok();
    Ok(())
}

/// 弹窗直接注入到当前页面 — 不用独立窗口，不依赖外部文件
#[tauri::command]
fn open_settings_window(app: tauri::AppHandle) -> Result<(), String> {
    let window = app.get_webview_window("main").ok_or("主窗口未找到")?;
    window.eval(INJECT_SETTINGS_PANEL).map_err(|e| format!("注入设置面板失败: {e}"))
}

const INJECT_SETTINGS_PANEL: &str = r##"
(function(){
if(document.getElementById('__bfe_settings')){ return; }
var css = document.createElement('style');
css.textContent = [
  '#__bfe_overlay{position:fixed;inset:0;z-index:2147483646;background:rgba(0,0,0,.5);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center}',
  '#__bfe_dialog{background:#1e293b;border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:20px;width:400px;max-width:90vw;box-shadow:0 24px 64px rgba(0,0,0,.5);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#e2e8f0}',
  '#__bfe_dialog h2{font-size:15px;font-weight:600;margin:0 0 14px;color:#f1f5f9}',
  '#__bfe_dialog label{display:block;font-size:11px;color:#64748b;margin-bottom:4px}',
  '#__bfe_dialog input{width:100%;height:34px;padding:0 10px;border-radius:6px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:#e2e8f0;font-size:13px;font-family:"SF Mono","Fira Code",monospace;outline:none;box-sizing:border-box}',
  '#__bfe_dialog input:focus{border-color:#3b82f6}',
  '#__bfe_dialog input.error{border-color:#ef4444}',
  '#__bfe_hint{font-size:10px;color:#475569;margin-top:3px}',
  '#__bfe_error{font-size:11px;color:#ef4444;margin-top:4px;min-height:14px}',
  '#__bfe_actions{display:flex;gap:6px;margin-top:14px;align-items:center}',
  '#__bfe_actions .spacer{flex:1}',
  '#__bfe_actions button{height:30px;padding:0 12px;border-radius:6px;border:none;font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap;transition:all .15s}',
  '#__bfe_save{background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff}',
  '#__bfe_save:hover{filter:brightness(1.1)}',
  '#__bfe_save:disabled{opacity:.4;cursor:not-allowed}',
  '#__bfe_cancel{background:rgba(255,255,255,.06);color:#94a3b8;border:1px solid rgba(255,255,255,.08)}',
  '#__bfe_cancel:hover{background:rgba(255,255,255,.1);color:#e2e8f0}',
  '#__bfe_reset{background:transparent;color:#ef4444;font-size:11px;padding:0 8px}',
  '#__bfe_reset:hover{background:rgba(239,68,68,.1)}',
  '#__bfe_clear_cache{background:transparent;color:#f59e0b;font-size:11px;padding:0 8px}',
  '#__bfe_clear_cache:hover{background:rgba(245,158,11,.1)}',
  '#__bfe_toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:2147483647;padding:10px 20px;border-radius:8px;font-size:13px;color:#fff;background:rgba(15,23,42,.95);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:0 8px 24px rgba(0,0,0,.3);opacity:0;transition:opacity .3s}',
].join('\n');
document.head.appendChild(css);

var el = document.createElement('div');
el.id = '__bfe_settings';
el.innerHTML = '<div id="__bfe_overlay"><div id="__bfe_dialog"><h2>⚙ 设置</h2><label>目标网页地址</label><input id="__bfe_input" type="text" placeholder="http://localhost:5173" spellcheck="false" autocomplete="off"><p id="__bfe_hint">http:// https:// file:// / localhost / 127.0.0.1</p><p id="__bfe_error"></p><div id="__bfe_actions"><button id="__bfe_clear_cache">清除缓存</button><button id="__bfe_reset">清除配置</button><span class="spacer"></span><button id="__bfe_cancel">取消</button><button id="__bfe_save">保存并跳转</button></div></div></div>';
document.body.appendChild(el);

var input   = document.getElementById('__bfe_input');
var errorEl = document.getElementById('__bfe_error');
var saveBtn = document.getElementById('__bfe_save');

function validateUrl(raw) {
  var url = (raw || '').trim();
  if (!url) return 'URL 不能为空';
  if (/\s/.test(url)) return 'URL 不能包含空白字符';
  if (url.length > 2048) return 'URL 长度不能超过 2048 字符';
  if (!/^[a-z][a-z0-9+\-.]*:\/\//i.test(url)) return '必须以 http:// 或 https:// 或 file:// 开头';
  var l = url.toLowerCase();
  if (l.startsWith('javascript:')||l.startsWith('data:')||l.startsWith('vbscript:')) return '不允许使用危险协议';
  if (l.startsWith('http://')||l.startsWith('https://')||l.startsWith('file://')) return null;
  return '不支持的 URL 方案';
}

function close() { el.remove(); }

function toast(msg) {
  var t = document.createElement('div');t.id='__bfe_toast';t.textContent=msg;document.body.appendChild(t);
  requestAnimationFrame(function(){ t.style.opacity='1'; });
  setTimeout(function(){ t.style.opacity='0';setTimeout(function(){ t.remove(); },300); },2000);
}

function taInvoke(cmd, args) {
  var t = window.__TAURI__;
  if (!t) return Promise.reject(new Error('Tauri API 不可用'));
  return t.core.invoke(cmd, args||{});
}

// 加载当前 URL
taInvoke('get_target_url').then(function(v){ input.value = v||''; });

// 输入
input.addEventListener('input', function(){ input.classList.remove('error');errorEl.textContent='';saveBtn.disabled=false; });
input.addEventListener('keydown', function(e){ if(e.key==='Escape')close();if(e.key==='Enter')saveBtn.click(); });

// 关闭
document.getElementById('__bfe_cancel').addEventListener('click', close);
document.getElementById('__bfe_overlay').addEventListener('click', function(e){ if(e.target===e.currentTarget)close(); });

// 保存
saveBtn.addEventListener('click', function(){
  var url = input.value.trim();
  var err = validateUrl(url);
  if(err){ errorEl.textContent=err;input.classList.add('error');return; }
  saveBtn.disabled = true; saveBtn.textContent = '保存中...';
  taInvoke('set_target_url',{url:url})
    .then(function(){ return taInvoke('get_target_url_with_query'); })
    .then(function(targetUrl){
      if(!targetUrl) return;
      taInvoke('navigate_main_window',{url:targetUrl});
      close();
    })
    .catch(function(e){ errorEl.textContent='保存失败: '+(e.message||e);saveBtn.disabled=false;saveBtn.textContent='保存并跳转'; });
});

// 清除配置
document.getElementById('__bfe_reset').addEventListener('click', function(){
  taInvoke('reset_target_url').then(function(){ close(); });
});

// 清除缓存
document.getElementById('__bfe_clear_cache').addEventListener('click', function(){
  taInvoke('clear_app_cache').then(function(){ toast('缓存已清除'); }).catch(function(e){ toast('清除失败: '+(e.message||e)); });
});

setTimeout(function(){ input.focus();input.select(); }, 100);
})();
"##;

/// 清除桌面端缓存（数据目录 + 配置）。
#[tauri::command]
fn clear_app_cache(app_handle: tauri::AppHandle, state: tauri::State<'_, BackendState>) -> Result<String, String> {
    let mut cleared = vec![];

    // 清除后端数据目录
    let guard = state.backend.lock().map_err(|e| e.to_string())?;
    if let Some(ref b) = guard.as_ref() {
        if b.data_dir.exists() {
            let _ = fs::remove_dir_all(&b.data_dir);
            cleared.push(format!("数据目录: {}", b.data_dir.display()));
        }
    }
    drop(guard);

    // 清除配置
    let config_path = config_path(&app_handle);
    if config_path.exists() {
        let _ = fs::remove_file(&config_path);
        cleared.push(format!("配置文件: {}", config_path.display()));
    }

    if cleared.is_empty() { Ok("没有可清除的缓存".to_string()) }
    else { Ok(format!("已清除: {}", cleared.join(", "))) }
}

/// 通知控制器页面切换目标 URL（发射 bfe-navigate 事件，控制器监听后更新 iframe）
#[tauri::command]
fn navigate_main_window(app: tauri::AppHandle, url: String) -> Result<(), String> {
    app.emit("bfe-navigate", url).map_err(|e| format!("发送事件失败: {e}"))
}

// ---- URL 辅助 ----

fn append_query(url: &str, port: u16, token: &str) -> String {
    let separator = if url.contains('?') { '&' } else { '?' };
    format!("{url}{separator}__bfe_port={port}&__bfe_token={token}")
}


fn extract_origin(url: &str) -> String {
    let Some(idx) = url.find("://") else {
        return url.to_string();
    };
    let after = &url[idx + 3..];
    let host = after
        .split('/').next().unwrap_or("")
        .split('?').next().unwrap_or("");
    format!("{}://{}", &url[..idx], host)
}

// ---- 启动 ----

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut backend_config = BackendConfig::from_env();
    if backend_config.cwd == std::path::PathBuf::from(".") {
        backend_config.cwd = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("..").join("..").join("server");
    }
    let backend_enabled = backend_config.enabled;
    let backend = BackendProcess::new(backend_config).ok();

    let (_port, _token) = match backend.as_ref() {
        Some(b) => (
            b.port.load(std::sync::atomic::Ordering::SeqCst),
            b.token.clone(),
        ),
        None => (0u16, String::new()),
    };

    if let Some(ref b) = backend {
        for d in &["logs", "uploads", "results", "temp"] {
            let _ = std::fs::create_dir_all(b.data_dir.join(d));
        }
    }

    let backend_state = BackendState {
        backend: Mutex::new(backend),
    };

    tauri::Builder::default()
        .manage(backend_state)
        .setup(move |app| {
            let app_handle = app.handle().clone();

            // 校验已保存的 URL（仅日志，导航由控制器页面处理）
            if let Some(ref raw_url) = load_config(&app_handle).target_url {
                match validate_target_url(raw_url) {
                    Ok(_) => eprintln!("已保存目标: {}", extract_origin(raw_url)),
                    Err(e) => {
                        eprintln!("保存的 URL 无效 ({}), 已清空", e);
                        let _ = save_config(&app_handle, &AppConfig { target_url: None });
                    }
                }
            }

            if backend_enabled {
                eprintln!("后端启动中...");
                start_and_wait_backend(app);

                let state = app.state::<BackendState>();
                let guard = state.backend.lock()
                    .expect("bfe-tools: 后端状态锁获取失败");
                if let Some(ref b) = guard.as_ref() {
                    let port = b.port.load(std::sync::atomic::Ordering::SeqCst);
                    eprintln!("后端就绪: http://127.0.0.1:{port}");
                }
            }

            // 清理过期任务
            let state = app.state::<BackendState>();
            let guard = state.backend.lock()
                .expect("bfe-tools: 后端状态锁获取失败");
            if let Some(ref b) = guard.as_ref() {
                b.enforce_disk_quota();
            }
            drop(guard);

            // 启动时自动跳转到保存的 URL
            let _main_window = app.get_webview_window("main").unwrap();
            let config = load_config(&app_handle);
            if let Some(ref raw_url) = config.target_url {
                if let Ok(validated) = validate_target_url(raw_url) {
                    let url = if is_trusted_local_target(&validated) {
                        let state = app.state::<BackendState>();
                        let guard = state.backend.lock().unwrap_or_else(|_| panic!("lock"));
                        if let Some(ref b) = guard.as_ref() {
                            let port = b.port.load(std::sync::atomic::Ordering::SeqCst);
                            if !b.token.is_empty() {
                                append_query(&validated, port, &b.token)
                            } else { validated }
                        } else { validated }
                    } else { validated };
                    app_handle.emit("bfe-navigate", &url).ok();
                    eprintln!("已加载目标: {}", extract_origin(&url));
                }
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                let state = window.state::<BackendState>();
                let Ok(mut guard) = state.backend.lock() else { return; };
                if let Some(ref mut backend) = guard.as_mut() {
                    backend.shutdown();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_backend_info,
            get_target_url,
            set_target_url,
            get_target_url_with_query,
            reset_target_url,
            open_settings_window,
            navigate_main_window,
            clear_app_cache
        ])
        .run(tauri::generate_context!())
        .expect("启动桌面应用失败");
}

fn start_and_wait_backend(app: &tauri::App) -> bool {
    let state = app.state::<BackendState>();
    let mut guard = state
        .backend
        .lock()
        .expect("bfe-tools: 后端状态锁获取失败");
    match guard.as_mut() {
        Some(backend) => match backend.start() {
            Ok(()) => match backend.wait_until_ready(20) {
                Ok(()) => true,
                Err(e) => {
                    eprintln!("后端启动超时: {e}");
                    false
                }
            },
            Err(e) => {
                eprintln!("后端启动失败: {e}");
                false
            }
        },
        None => false,
    }
}
