# bfe-tools — 桌面端

Tauri v2 通用 WebView 壳，支持两种模式加载前端，可选择性管理本地后端进程。

## 两种构建模式

| 维度 | URL 模式 | Embed 模式 |
| --- | --- | --- |
| **构建命令** | `pnpm build` | `pnpm build:embed` |
| **前端来源** | 远程 URL（`BFE_WEB_URL`） | 本地 `web/dist` 打包进 app |
| **web 更新** | 部署服务器即生效，桌面端不动 | 每次需重新打包 |
| **适用场景** | 频繁迭代、线上服务 | 离线分发、版本交付 |
| **体积** | 二进制 ~4.5MB / DMG ~2.8MB | 二进制 ~4.9MB / DMG ~95MB |

## 快速开始

```bash
cd desktop
npm install
pnpm dev          # URL 模式开发
pnpm build        # URL 模式生产构建
pnpm build:embed  # Embed 模式生产构建
```

## 加载任意 Web 页面

不启动后端就是纯 WebView 浏览器，直接加载任意 URL：

```bash
BFE_WEB_URL=https://example.com pnpm dev
```

## 可选后端管理

设置 `BFE_BACKEND_ENABLED=1` 后，桌面端自动管理本地后端进程：

```bash
BFE_BACKEND_ENABLED=1 \
BFE_BACKEND_CMD="uv run uvicorn app.main:app --host 127.0.0.1 --port {port} --log-level info" \
BFE_BACKEND_DIR=/path/to/server \
BFE_WEB_URL=http://localhost:5173 \
pnpm dev
```

**后端完全可选**：不设这些环境变量，桌面端就是纯 WebView 浏览器。

## 后端进程管理

| 阶段 | 行为 |
| --- | --- |
| **启动** | 执行 `BFE_BACKEND_CMD`（`{port}` 自动替换为实际端口） |
| **端口** | 18000-18099 自动发现可用端口 |
| **健康检查** | 每 500ms 轮询 `BFE_BACKEND_HEALTH_PATH`，最长 10s |
| **崩溃** | 进程异常退出自动重启（最多 3 次，间隔 2s） |
| **关闭** | POST `BFE_BACKEND_SHUTDOWN_PATH` → 等待 5s → SIGKILL |
| **磁盘** | 数据目录超 2GB 自动删除最旧文件至 80% |
| **数据目录** | 优先 BFE_BACKEND_DIR/data，与 `pnpm dev` 共享 `server/data/` |

## 安全

| 机制 | 说明 |
| --- | --- |
| Token | 256-bit 随机 hex，仅存 Rust 内存 |
| Token 传递 | 通过 `window.__BFE_BACKEND_INFO__` 注入前端 |
| 监听地址 | 后端仅绑定 `127.0.0.1`，外部不可达 |
| 不崩溃 | 后端启动失败显示错误页，不导致窗口退出 |
| CSP | CSP 设为 null，由前端自行控制 |
| capabilities | 最小权限 `core:default`，不依赖任何 Tauri plugin |

## 前端适配

前端通过 `window.__BFE_BACKEND_INFO__` 读取后端信息：

```typescript
const info = window.__BFE_BACKEND_INFO__
if (info?.ready) {
  // 直连本地后端
  fetch(`${info.baseUrl}/api/v1/jobs`)
}
```

- 不依赖 `@tauri-apps/api`
- 浏览器模式和桌面端共用同一套代码
- 桌面端通过 `__bfe_port` URL 参数识别

## TTS 磁盘缓存

同名文本+声音+语速+语调生成相同 hash 文件名，首次请求调 edge-tts，后续直接返回磁盘缓存文件。桌面端和 `pnpm dev` 共享 `server/data/results/` 目录，浏览器端生成的缓存桌面端可秒播。

## vConsole 调试

桌面端（URL 含 `__bfe_port`）和浏览器 dev 模式自动启用：

- Console — 所有 `console.log/warn/error`
- Network — 所有 `fetch` 请求和方法、状态码、耗时

## 通用性

不设 `BFE_BACKEND_ENABLED` 时是纯 WebView 壳：

- ✅ 加载任意网页 URL
- ✅ 不依赖任何运行时（Python/Node.js）
- ✅ 不依赖 `@tauri-apps/api`
- ✅ 不绑定前端框架
- ✅ 可接入任何后端（或无需后端）

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `BFE_WEB_URL` | `http://localhost:5173` | URL 模式目标地址 |
| `BFE_EMBED` | 空 | 设为任意值启用 Embed 模式 |
| `BFE_BACKEND_ENABLED` | 空 | 设为 `1` 启用后端管理 |
| `BFE_BACKEND_CMD` | 空 | 后端启动命令，`{port}` 占位符 |
| `BFE_BACKEND_DIR` | `server/` | 后端工作目录 |
| `BFE_BACKEND_HEALTH_PATH` | `/healthz` | 健康检查路径 |
| `BFE_BACKEND_SHUTDOWN_PATH` | `/shutdown` | 优雅关闭路径 |

## 前置条件

- Node.js >= 18
- Rust >= 1.70（[rustup.rs](https://rustup.rs)）
- macOS 11+ 或 Windows 10+

## 目录结构

```text
desktop/
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json         # URL 模式配置
│   ├── tauri.url.conf.json     # URL 模式备份
│   ├── tauri.embed.conf.json   # Embed 模式配置
│   ├── build.rs                # BFE_EMBED → embed_mode cfg
│   ├── capabilities/
│   │   └── default.json        # 最小权限
│   ├── icons/
│   │   ├── 32x32.png
│   │   ├── 128x128.png
│   │   ├── 128x128@2x.png
│   │   ├── icon.icns
│   │   └── icon.ico
│   └── src/
│       ├── main.rs             # 入口
│       ├── lib.rs              # Builder + 模式分支 + 后端可选
│       ├── backend.rs          # 后端进程管理
│       └── csp.rs              # Token 生成
├── stub/                       # URL 模式初始加载页
│   └── index.html
├── package.json
└── README.md
```

## 构建产物

```bash
pnpm build        # URL 模式：二进制 4.5MB / DMG 2.8MB
pnpm build:embed  # Embed 模式：二进制 4.9MB / DMG ≈95MB
```

- **macOS**：`src-tauri/target/release/bundle/dmg/bfe-tools_*.dmg`
- **Windows**：`src-tauri/target/release/bundle/msi/bfe-tools_*.msi`
