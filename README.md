# bfe-tools

前端实用工具集合站 — 一站式解决日常开发与使用中的高频痛点。

## 工具一览

### 后端工具（Python 引擎）

| 工具 | 功能 | 引擎 |
| ---- | ---- | ---- |
| 🎙️ 语音转文字 | 上传音频 → 识别为文本 | faster-whisper |
| 🔊 文字转语音 | 输入文本 → 生成音频 | edge-tts |
| 🖼️ 图片信息识别 | 上传图片 → 提取文字 | easyocr |
| 🎬 媒体格式转换 | 浏览器不兼容格式 → Web 友好格式 | PyAV |
| 🧹 图片去水印 | 框选水印区域 → AI 智能填充 | OpenCV inpainting |
| 📄 PDF 工具箱 | 拆分/合并/压缩 PDF，提取文字与图片 | PyMuPDF |
| 📸 多分辨率截图 | 输入 URL → 多分辨率截图并排对比 + srcset | Playwright |
| 🖼️ 图片批量处理 | 批量 resize / 格式转换 / 多倍图 + srcset 代码 | Pillow |
| 🎞️ 视频取帧 | 按间隔或指定时间点提取关键帧 → 打包下载 | PyAV |
| 🖥️ HTML 渲染截图 | 粘贴 HTML/CSS → 无头浏览器渲染 → 高清截图 | Playwright |
| 📑 网页转 PDF | 输入 URL → 输出高质量 PDF | Playwright |
| ⚡ 性能快照 | Core Web Vitals（FCP/LCP/TTFB）+ 网络 + 资源统计 | Playwright |

### Bun 工具

| 工具 | 功能 | 技术 |
| ---- | ---- | ---- |
| 🧹 HTML/CSS 工具 | HTML/CSS 压缩 / 格式化 / CSS 统计分析 | Bun + Elysia |
| 🔌 API 请求测试 | 发送 HTTP 请求，绕过 CORS，粘贴 curl 自动识别 | Bun + Elysia |
| 🔗 WebSocket 测试 | 连接 ws/wss，收发消息并实时日志 | Bun + Elysia |

### 纯前端工具

| 工具 | 功能 | 技术 |
| ---- | ---- | ---- |
| ✨ 动画实验室 | 11 种预设动画实时预览与参数调节 | Anime.js |
| 🎨 颜色转换器 | HEX / RGB / HSL / OKLCH 互转 | culori |
| ✏️ SVG 编辑器 | 在线编辑 SVG 源码 + 实时预览 + 一键优化 | 浏览器端 |
| 🗜️ 图片压缩 | 浏览器端压缩图片，调整尺寸与格式 | browser-image-compression |
| 📱 二维码生成 | 文本/链接 → 可定制二维码（颜色+Logo） | qrcode |
| ⏰ Cron 表达式解析 | 解析为人类可读描述，计算未来执行时间 | cronstrue |
| 📊 CSV 转 JSON | CSV → JSON，自动编码检测+表格预览 | papaparse |
| 🔤 HTML 实体编解码 | HTML 实体与原始字符双向转换 | 浏览器端 |
| 📋 JSON 格式化/校验 | 格式化、压缩、校验、树形浏览 | 浏览器端 |
| 🔗 URL 编解码 | URL 编解码 + 组件级参数解析 | 浏览器端 |

> 侧边栏基于 Naive UI NMenu，支持搜索过滤 + 分类折叠，25 个工具按 8 个分类分组导航。

## 技术栈

| 层级 | 技术 |
| ---- | ---- |
| 前端框架 | Vue 3（Composition API + `<script setup>`） |
| UI 组件库 | Naive UI |
| 构建工具 | Vite |
| 类型系统 | TypeScript（strict） |
| CSS 方案 | UnoCSS + CSS Custom Properties |
| 动画引擎 | Anime.js |
| Python 后端 | FastAPI + 12 个引擎 |
| 浏览器引擎 | Playwright（Chromium headless） |
| Bun 服务 | Bun + Elysia（HTTP/WebSocket 代理） |
| 桌面端 | Tauri v2（Rust） |
| 包管理 | pnpm / bun（前端）· uv（后端） |
| 提交规范 | Conventional Commits |

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 8（或 bun 作为替代）
- Python >= 3.13 + uv（`pip install uv`）
- Bun >= 1.3（Bun 服务所需）
- Rust >= 1.70（仅桌面端）

### 一键启动

```bash
pnpm install    # 首次安装根依赖
pnpm dev        # 一键启动前后端（Python + Web）
```

前台的 server 和 web 日志合并输出，Ctrl+C 统一关闭。

### 单独启动

```bash
pnpm dev:server     # Python 后端 → :8000
pnpm dev:web        # Vite 前端  → :5173
pnpm dev:bun-server # Bun 服务   → :3999
pnpm dev:desktop    # Tauri 桌面端
```

### 常用命令

```bash
pnpm dev                  # 一键启动（Python + Web）
pnpm kill                 # 杀掉所有开发端口
pnpm kill:web             # 清理前端（5170-5179）
pnpm kill:server          # 清理后端（8000）
pnpm kill:bun-server      # 清理 Bun（3999）
pnpm build:web            # 构建前端
pnpm clean                # 清理编译缓存
```

### Bun 命令

```bash
bun dev:web           # 用 bun 启动前端
bun run build:web     # 用 bun 构建前端
bun dev:bun-server    # 启动 Bun 服务（watch 热重载）
```

> Bun 服务地址通过 `web/.env` 中的 `VITE_BUN_API_BASE` 配置（默认 `http://localhost:3999`），修改端口只需改这一处。

### 国内环境

whisper 模型下载需 HuggingFace 镜像，引擎已内置 `HF_ENDPOINT=https://hf-mirror.com`。

## 项目结构

```text
bfe-tools/
├── web/                    # 前端（Vue 3 + Vite + TS + UnoCSS）
│   ├── src/
│   │   ├── pages/          # 页面（HomePage / ToolPage / NotFoundPage）
│   │   ├── components/
│   │   │   ├── layout/     # AppSidebar
│   │   │   ├── tools/
│   │   │   │   ├── backend/  # Python 工具表单
│   │   │   │   ├── pure/     # 纯前端 + Bun 工具
│   │   │   │   └── shared/   # CopyButton / ToolHeader
│   │   │   └── ui/         # ResultDownload / FileUpload
│   │   ├── hooks/          # 组合式函数
│   │   ├── tools/          # 工具注册中心（registry.ts）
│   │   ├── lib/            # 常量 / 运行时 / 工具函数
│   │   ├── types/          # TypeScript 类型
│   │   └── styles/         # 设计 token + 全局样式
│   └── e2e/                # Playwright E2E
├── py-server/              # Python 后端（FastAPI）
│   ├── app/
│   │   ├── engine/         # 12 个处理引擎
│   │   ├── api/            # API 路由（jobs / upload）
│   │   ├── services/       # 业务服务
│   │   ├── schemas/        # Pydantic 模型
│   │   ├── lib/            # zip_utils / browser_manager
│   │   └── core/           # 配置
│   ├── data/
│   └── start.sh
├── bun-server/             # Bun 服务（Elysia）
│   ├── src/
│   │   ├── index.ts        # 入口（:3999）
│   │   ├── lib/            # html-css.ts
│   │   └── routes/         # html-css / api-tester / ws-tester
│   └── package.json
├── desktop/                # Tauri v2 桌面壳
├── package.json            # 根脚本
├── dev.sh                  # 一键启动
└── README.md
```

## 引擎说明

### Python 引擎

| 引擎 | 包 | 特点 |
| ---- | -- | ---- |
| STT | `faster-whisper` | 语音转文字，CPU 快 2-4x，内置 VAD |
| TTS | `edge-tts` | 微软免费 TTS，20 种声音，磁盘缓存 |
| OCR | `easyocr` + `torch` | 图片识别，CPU 推理，中英文 |
| 转码 | `av`（PyAV） | 图片/视频/音频格式转换 |
| 去水印 | `opencv-python-headless` | NS 算法 + LAB 色彩空间 |
| PDF | `pymupdf`（fitz） | PDF 拆分/合并/压缩/文字提取/图片提取 |
| 截图 | `playwright` | 多分辨率网页截图 + SSRF 防护 |
| 批处理 | `pillow` | 图片批量 resize / 格式转换 / 多倍图 |
| 取帧 | `av`（PyAV） | 视频关键帧提取，支持间隔/时间点模式 |
| HTML 渲染 | `playwright` | HTML/CSS → 高清截图，独立 BrowserContext |
| 网页转 PDF | `playwright` | 网页 → A4/A3/Letter 高质量 PDF |
| 性能快照 | `playwright` | Core Web Vitals + 网络耗时 + 资源统计 |

> Playwright 需额外安装 Chromium：`playwright install chromium`

### Bun 服务

1 个服务，3 个端点：

| 端点 | 功能 |
| ---- | ---- |
| `/api/bun/html-css` | HTML/CSS 压缩 / 格式化 / CSS 分析 |
| `/api/bun/api-tester` | HTTP 请求代理，绕过 CORS，curl 粘贴识别 |
| `/api/bun/ws-tester` | WebSocket 代理转发 + 实时日志 |

## 开发约定

- 文档、注释、Commit 说明使用**中文**
- 变量/函数命名使用**英文 camelCase**，组件使用 **PascalCase**
- 禁止硬编码颜色/间距 — 统一使用 `tokens.css` 中的 CSS 变量
- 禁止硬编码敏感信息（密钥、Token 等）
- 遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/)

## License

MIT
