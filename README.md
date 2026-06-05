# bfe-tools

前端实用工具集合站 — 一站式解决日常开发与使用中的高频痛点。

## 工具一览

| 工具 | 功能 | 引擎 |
| ---- | ---- | ---- |
| 🎙️ 语音转文字 | 上传音频 → 识别为文本 | faster-whisper（base 模型） |
| 🔊 文字转语音 | 输入文本 → 生成音频 | edge-tts（微软 Edge 免费 TTS） |
| 🖼️ 图片信息识别 | 上传图片 → 提取文字 | easyocr（中文 + 英文） |
| 🎬 媒体格式转换 | 浏览器不兼容格式 → Web 友好格式 | PyAV（Python FFmpeg 绑定） |

## 运行方式

bfe-tools 支持三种运行方式：

| 方式 | 说明 |
| ---- | ---- |
| 🌐 **Web 开发** | 前后端分离开发，Vite 开发服务器 + uvicorn |
| 🖥️ **桌面应用** | Tauri v2 通用 WebView 壳 — URL 模式（远程）或 Embed 模式（离线），后端可选 |
| 📦 **生产部署** | 前端静态构建 + 后端独立部署 |

## 技术栈

| 层级 | 技术 |
| ---- | ---- |
| 前端框架 | Vue 3（Composition API + `<script setup>`） |
| UI 组件库 | Naive UI |
| 构建工具 | Vite |
| 类型系统 | TypeScript（strict） |
| CSS 方案 | UnoCSS |
| 后端框架 | Python + FastAPI |
| 桌面端 | Tauri v2（Rust） |
| 包管理 | pnpm（前端/桌面）/ uv（后端） |
| 提交规范 | Conventional Commits |

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 8
- Python >= 3.13 + uv（`pip install uv`）
- Rust >= 1.70（仅桌面端）

### 一键启动（推荐）

```bash
pnpm install    # 首次安装根依赖
pnpm dev        # 一键启动前后端（server + web）
```

前台输出 server 和 web 的日志，Ctrl+C 统一关闭。

### 单独启动

```bash
pnpm dev:server   # 仅启动后端 → http://localhost:8000
pnpm dev:web      # 仅启动前端 → http://localhost:5173
pnpm dev:desktop  # 启动 Tauri 桌面端
```

### 根命令速查

```bash
pnpm dev                  # 一键启动前后端
pnpm clean                # 清理运行时数据、编译缓存、残留文件
pnpm kill                 # 一键杀掉所有开发端口进程
pnpm build:web            # 构建前端
pnpm build:desktop        # 构建桌面端（URL 模式）
pnpm build:desktop:embed  # 构建桌面端（Embed 模式）
```

> **国内环境**：whisper 模型下载需 HuggingFace 镜像，引擎已内置 `HF_ENDPOINT=https://hf-mirror.com`。

## 项目结构

```
bfe-tools/
├── web/                       # 前端（Vue 3 + Vite + TypeScript + UnoCSS）
│   ├── src/
│   │   ├── pages/             # 页面组件
│   │   ├── components/        # 通用 UI 组件（FileUpload/ResultDownload/TaskStatus）
│   │   ├── hooks/             # 组合式函数（useTaskPolling/useDownload/useFileUpload）
│   │   ├── tools/             # 工具注册中心
│   │   ├── lib/               # 工具库（apiClient/runtime/to/constants）
│   │   ├── types/             # TypeScript 类型定义
│   │   └── styles/            # 全局样式（UnoCSS）
│   └── README.md
├── server/                    # 后端（Python + FastAPI）
│   ├── app/
│   │   ├── engine/            # 处理引擎（OCR/TTS/STT/转码），TTS 带磁盘缓存
│   │   ├── api/               # API 路由（jobs/upload）
│   │   ├── services/          # 业务服务（任务/上传管理，内存存储）
│   │   ├── schemas/           # Pydantic 数据模型
│   │   └── core/              # 配置（含桌面模式 BFE_* 环境变量）
│   ├── data/                  # 运行时数据（uploads/results/temp），桌面端共享
│   └── README.md
├── desktop/                   # 桌面端（Tauri v2 通用 WebView 壳）
│   ├── src-tauri/src/         # Rust 源码（lib/backend/csp）
│   ├── stub/                  # 初始加载页（splash screen）
│   └── README.md
├── package.json               # 根脚本（dev/clean/kill/build）
├── dev.sh                     # 一键启动前后端
├── clean.sh                   # 清理运行时数据、编译缓存
├── .agents/                   # AI 编码助手规范
├── AGENTS.md
├── CLAUDE.md
└── README.md
```

## 引擎说明

四个处理引擎均为纯 Python pip 包，**无需任何系统级依赖**：

| 引擎 | 包 | 大小 | 特点 |
|------|-----|------|------|
| STT | `faster-whisper` | ~145MB（base） | CPU 快 2-4 倍，内置 VAD |
| TTS | `edge-tts` | 无模型文件，**磁盘缓存** | 微软免费，20 种声音；相同参数秒播 |
| OCR | `easyocr` + `torch` | ~300MB | CPU 推理，中英文 |
| 转码 | `av`（PyAV） | ~10MB | 内置 FFmpeg C 库 |

## 开发约定

- 文档、注释、Commit 说明使用**中文**
- 变量/函数命名使用**英文 camelCase**
- 组件使用 **PascalCase**，按功能组织
- 遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/)
- 禁止 `any`（第三方库无法避免除外）
- 禁止硬编码敏感信息

## License

MIT
