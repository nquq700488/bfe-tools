use std::fs;
use std::net::TcpListener;
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicU16, AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;

const PORT_RANGE_START: u16 = 18000;
const PORT_RANGE_END: u16 = 18099;
const HEALTH_CHECK_INTERVAL_MS: u64 = 500;
const HEALTH_CHECK_MAX_RETRIES: u32 = 20;
const RESTART_DELAY_SECS: u64 = 2;
const MAX_DATA_DIR_SIZE: u64 = 2 * 1024 * 1024 * 1024; // 2GB
const QUOTA_SAFE_RATIO: f64 = 0.8;

/// 后端配置（从环境变量读取）
pub struct BackendConfig {
    pub enabled: bool,
    pub program: String,
    pub args: Vec<String>,
    pub cwd: PathBuf,
    pub health_path: String,
    pub shutdown_path: String,
}

impl Default for BackendConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            program: String::new(),
            args: vec![],
            cwd: PathBuf::from("."),
            health_path: "/healthz".to_string(),
            shutdown_path: "/shutdown".to_string(),
        }
    }
}

/// 安全解析命令字符串为 (program, args)，支持引号防止空格路径错误
fn parse_command(cmd: &str) -> (String, Vec<String>) {
    let cmd = cmd.trim();
    if cmd.is_empty() {
        return (String::new(), vec![]);
    }

    let mut tokens: Vec<String> = vec![];
    let mut current = String::new();
    let mut in_quote = false;
    let mut quote_char = ' ';

    for ch in cmd.chars() {
        if in_quote {
            if ch == quote_char {
                in_quote = false;
            } else {
                current.push(ch);
            }
        } else if ch == '"' || ch == '\'' {
            in_quote = true;
            quote_char = ch;
        } else if ch == ' ' {
            if !current.is_empty() {
                tokens.push(current.clone());
                current.clear();
            }
        } else {
            current.push(ch);
        }
    }
    if !current.is_empty() {
        tokens.push(current);
    }

    if tokens.is_empty() {
        (String::new(), vec![])
    } else {
        let prog = tokens.remove(0);
        (prog, tokens)
    }
}

impl BackendConfig {
    /// 从环境变量构建
    pub fn from_env() -> Self {
        let enabled = std::env::var("BFE_BACKEND_ENABLED").map(|v| v == "1").unwrap_or(false);
        let cmd_str = std::env::var("BFE_BACKEND_CMD").unwrap_or_default();
        let (program, args) = parse_command(&cmd_str);
        Self {
            enabled,
            program,
            args,
            cwd: std::env::var("BFE_BACKEND_DIR")
                .map(PathBuf::from)
                .unwrap_or_else(|_| PathBuf::from(".")),
            health_path: std::env::var("BFE_BACKEND_HEALTH_PATH").unwrap_or_else(|_| "/healthz".to_string()),
            shutdown_path: std::env::var("BFE_BACKEND_SHUTDOWN_PATH").unwrap_or_else(|_| "/shutdown".to_string()),
        }
    }
}

/// 后端进程管理器
pub struct BackendProcess {
    child: Option<Child>,
    pub port: Arc<AtomicU16>,
    pub token: String,
    running: Arc<AtomicBool>,
    pub data_dir: PathBuf,
    config: BackendConfig,
}

impl BackendProcess {
    fn find_available_port() -> Result<u16, String> {
        for port in PORT_RANGE_START..=PORT_RANGE_END {
            if TcpListener::bind(("127.0.0.1", port)).is_ok() {
                return Ok(port);
            }
        }
        Err(format!("端口范围 {}-{} 全部被占用", PORT_RANGE_START, PORT_RANGE_END))
    }

    fn default_data_dir(backend_dir: &PathBuf) -> PathBuf {
        // 优先用 BFE_DATA_DIR 环境变量
        if let Ok(d) = std::env::var("BFE_DATA_DIR") {
            if !d.is_empty() {
                return PathBuf::from(d);
            }
        }
        // 有 BFE_BACKEND_DIR 时，数据目录 = {backend_dir}/data（与 pnpm dev 共享缓存）
        if backend_dir != &PathBuf::from(".") {
            return backend_dir.join("data");
        }
        // 无后端目录时，用系统 AppData
        #[cfg(target_os = "macos")]
        {
            let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
            PathBuf::from(home)
                .join("Library")
                .join("Application Support")
                .join("com.bfe.tools")
        }
        #[cfg(target_os = "windows")]
        {
            let appdata = std::env::var("APPDATA").unwrap_or_else(|_| ".".to_string());
            PathBuf::from(appdata).join("com.bfe.tools")
        }
        #[cfg(not(any(target_os = "macos", target_os = "windows")))]
        {
            PathBuf::from("./data")
        }
    }

    pub fn new(config: BackendConfig) -> Result<Self, String> {
        if !config.enabled {
            return Err("后端未启用（BFE_BACKEND_ENABLED 未设置）".to_string());
        }
        if config.program.is_empty() {
            return Err("未配置后端启动命令（BFE_BACKEND_CMD 为空）".to_string());
        }
        let port = Self::find_available_port()?;
        let token = crate::csp::generate_token();
        let data_dir = Self::default_data_dir(&config.cwd);
        let _ = fs::create_dir_all(&data_dir);

        Ok(Self {
            child: None,
            port: Arc::new(AtomicU16::new(port)),
            token,
            running: Arc::new(AtomicBool::new(false)),
            data_dir,
            config,
        })
    }

    /// 启动后端进程。占位符 {port} 和 {token} 在 args 中被替换
    pub fn start(&mut self) -> Result<(), String> {
        let port = self.port.load(Ordering::SeqCst);
        let token = self.token.clone();
        let data_dir = self.data_dir.to_string_lossy().to_string();
        let cwd = self.config.cwd.to_string_lossy().to_string();

        // 替换 args 中的占位符
        let args: Vec<String> = self.config.args.iter().map(|a| {
            a.replace("{port}", &port.to_string())
                .replace("{token}", &token)
        }).collect();

        let child = Command::new(&self.config.program)
            .args(&args)
            .current_dir(&cwd)
            .env("BFE_DESKTOP", "1")
            .env("BFE_PORT", &port.to_string())
            .env("BFE_DATA_DIR", &data_dir)
            .env("BFE_DESKTOP_TOKEN", &token)
            .env("BFE_ALLOWED_ORIGINS", &format!(
                "http://127.0.0.1:{0},http://localhost:{0},tauri://localhost",
                port
            ))
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("启动后端失败: {}（program: {}）", e, self.config.program))?;

        self.child = Some(child);
        self.running.store(true, Ordering::SeqCst);

        Ok(())
    }

    /// 等待健康检查通过
    pub fn wait_until_ready(&self, max_retries: u32) -> Result<(), String> {
        let port = self.port.load(Ordering::SeqCst);
        let url = format!("http://127.0.0.1:{}{}", port, self.config.health_path);

        for i in 0..max_retries {
            if let Ok(resp) = ureq::get(&url).call() {
                if resp.status() == 200 {
                    return Ok(());
                }
            }
            if i < max_retries - 1 {
                std::thread::sleep(Duration::from_millis(HEALTH_CHECK_INTERVAL_MS));
            }
        }

        Err(format!("后端未能在 {} 秒内就绪", max_retries * HEALTH_CHECK_INTERVAL_MS as u32 / 1000))
    }

    /// 重启后端
    #[allow(dead_code)]
    pub fn restart_if_needed(&mut self, max_retries: u32) -> bool {
        let port = self.port.load(Ordering::SeqCst);
        let url = format!("http://127.0.0.1:{}{}", port, self.config.health_path);

        if ureq::get(&url).call().map(|r| r.status() == 200).unwrap_or(false) {
            return true;
        }

        for i in 0..max_retries {
            eprintln!("后端无响应，第 {} 次重启尝试...", i + 1);
            self.force_kill();
            std::thread::sleep(Duration::from_secs(RESTART_DELAY_SECS));
            let new_port = Self::find_available_port().unwrap_or(PORT_RANGE_START);
            self.port.store(new_port, Ordering::SeqCst);
            if self.start().is_err() {
                continue;
            }
            if self.wait_until_ready(HEALTH_CHECK_MAX_RETRIES).is_ok() {
                return true;
            }
        }
        false
    }

    /// 磁盘配额检查
    pub fn enforce_disk_quota(&self) {
        let data_dir = &self.data_dir;
        if !data_dir.exists() {
            return;
        }

        let mut total: u64 = 0;
        let mut files: Vec<(u64, PathBuf)> = vec![];

        if let Ok(entries) = fs::read_dir(data_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() {
                    if let Ok(meta) = fs::metadata(&path) {
                        let modified = meta
                            .modified()
                            .map(|t| {
                                t.duration_since(std::time::UNIX_EPOCH)
                                    .map(|d| d.as_secs())
                                    .unwrap_or(0)
                            })
                            .unwrap_or(0);
                        files.push((modified, path));
                        total += meta.len();
                    }
                }
            }
        }

        if total > MAX_DATA_DIR_SIZE {
            files.sort_by_key(|(t, _)| *t);
            let target = (MAX_DATA_DIR_SIZE as f64 * QUOTA_SAFE_RATIO) as u64;
            for (_, path) in files {
                if total <= target { break; }
                if let Ok(meta) = fs::metadata(&path) {
                    total = total.saturating_sub(meta.len());
                }
                let _ = fs::remove_file(&path);
            }
        }
    }

    fn force_kill(&mut self) {
        if let Some(ref mut child) = self.child {
            let _ = child.kill();
            let _ = child.wait();
        }
        self.child = None;
    }

    /// 优雅关闭
    pub fn shutdown(&mut self) {
        self.running.store(false, Ordering::SeqCst);

        let port = self.port.load(Ordering::SeqCst);
        let url = format!("http://127.0.0.1:{}{}", port, self.config.shutdown_path);

        let _ = ureq::post(&url)
            .set("Content-Type", "application/json")
            .set("X-BFE-Desktop-Token", &self.token)
            .send_string("{}");

        for _ in 0..10 {
            if ureq::get(&format!("http://127.0.0.1:{}{}", port, self.config.health_path))
                .call()
                .is_err()
            {
                break;
            }
            std::thread::sleep(Duration::from_millis(500));
        }

        self.force_kill();
    }

    pub fn base_url(&self) -> String {
        format!("http://127.0.0.1:{}", self.port.load(Ordering::SeqCst))
    }
}

impl Drop for BackendProcess {
    fn drop(&mut self) {
        self.shutdown();
    }
}
