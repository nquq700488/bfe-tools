# bfe-tools

前端实用工具集合站 — 一站式解决日常开发与使用中的高频痛点。

## 工具一览

### 后端工具（Python 引擎）

| 工具 | 功能 | 引擎 |
| ---- | ---- | ---- |
| 🎙️ 语音转文字 | 上传音频 → 识别为文本 | faster-whisper（base 模型） |
| 🔊 文字转语音 | 输入文本 → 生成音频 | edge-tts（微软 Edge 免费 TTS） |
| 🖼️ 图片信息识别 | 上传图片 → 提取文字 | easyocr（中文 + 英文） |
| 🎬 媒体格式转换 | 浏览器不兼容格式 → Web 友好格式 | PyAV（Python FFmpeg 绑定） |
| 🧹 图片去水印 | 框选水印区域 → AI 智能填充 | OpenCV cv2.inpaint() NS 算法 + LAB 色彩空间 |

### 纯前端工具

| 工具 | 功能 | 技术 |
| ---- | ---- | ---- |
| ✨ 动画实验室 | 11 种预设动画实时预览与参数调节 | Anime.js v4 |
| 🎨 颜色转换器 | HEX / RGB / HSL / OKLCH 互转 | culori |
| ✏️ SVG 编辑器 | 在线编辑 SVG 源码 + 实时预览 | - |
| 🗜️ 图片压缩 | 浏览器端压缩图片，调整尺寸与格式 | browser-image-compression |
| 📱 二维码生成 | 文本/链接 → 可定制二维码（颜色+Logo） | qrcode |
| ⏰ Cron 表达式解析 | 解析为人类可读描述，计算未来执行时间 | cronstrue |
| 📊 CSV 转 JSON | CSV → JSON，自动编码检测+表格预览 | papaparse |
| 🔤 HTML 实体编解码 | HTML 实体与原始字符双向转换 | - |
| 📋 JSON 格式化/校验 | 格式化、压缩、校验、树形浏览 | - |
| 🔗 URL 编解码 | URL 编解码 + 组件级参数解析 | - |

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
| UI 组件库 | Naive UI（通过 n-config-provider 注入自定义主题） |
| 构建工具 | Vite |
| 类型系统 | TypeScript（strict） |
| CSS 方案 | UnoCSS + CSS Custom Properties（设计 token） |
| 动画引擎 | Anime.js v4 |
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
pnpm kill                 # 杀掉所有开发端口进程
pnpm kill:web             # 仅杀前端端口 (5170-5179)
pnpm kill:server          # 仅杀后端端口 (8000)
pnpm kill:desktop         # 仅杀桌面端端口 (18000-18009)
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
│   │   ├── pages/             # 页面组件（HomePage/ToolPage/NotFoundPage）
│   │   ├── components/
│   │   │   ├── layout/        # 布局组件（AppSidebar）
│   │   │   ├── tools/
│   │   │   │   ├── backend/   # 后端工具表单（TtsForm/WatermarkRemovalForm/MediaConvertForm）
│   │   │   │   ├── pure/      # 纯前端工具（AnimeLab/JsonFormatter/QrcodeGenerator…）
│   │   │   │   └── shared/    # 共享组件（CopyButton/ToolHeader）
│   │   │   └── ui/            # 通用 UI（ResultDownload）
│   │   ├── hooks/             # 组合式函数
│   │   ├── tools/             # 工具注册中心（registry.ts）
│   │   ├── lib/               # 工具库（常亮/运行时/工具函数）
│   │   ├── types/             # TypeScript 类型定义
│   │   └── styles/            # 设计 token + 全局样式
│   └── e2e/                   # Playwright E2E 测试
├── server/                    # 后端（Python + FastAPI）
│   ├── app/
│   │   ├── engine/            # 处理引擎（OCR/TTS/STT/转码/去水印）
│   │   ├── api/               # API 路由（jobs/upload）
│   │   ├── services/          # 业务服务（任务/上传管理）
│   │   ├── schemas/           # Pydantic 数据模型
│   │   └── core/              # 配置
│   ├── data/                  # 运行时数据（uploads/results/temp）
│   └── start.sh               # 启动脚本（uv sync + uvicorn）
├── desktop/                   # 桌面端（Tauri v2 通用 WebView 壳）
│   └── src-tauri/src/         # Rust 源码（lib/backend/csp）
├── package.json               # 根脚本
├── dev.sh                     # 一键启动前后端
├── clean.sh                   # 清理脚本
├── .agents/                   # AI 编码助手规范
├── AGENTS.md
├── CLAUDE.md
└── README.md
```

## 引擎说明

五个处理引擎均为纯 Python pip 包，**无需任何系统级依赖**：

| 引擎 | 包 | 大小 | 特点 |
|------|-----|------|------|
| STT | `faster-whisper` | ~145MB（base） | CPU 快 2-4 倍，内置 VAD |
| TTS | `edge-tts` | 无模型文件，**磁盘缓存** | 微软免费，20 种声音；相同参数秒播 |
| OCR | `easyocr` + `torch` | ~300MB | CPU 推理，中英文 |
| 转码 | `av`（PyAV） | ~10MB | 内置 FFmpeg C 库 |
| 去水印 | `opencv-python-headless` + `numpy` | ~148MB | NS 算法 + LAB 色彩 + 直方图匹配 |

## 开发约定

- 文档、注释、Commit 说明使用**中文**
- 变量/函数命名使用**英文 camelCase**
- 组件使用 **PascalCase**，按功能组织
- 遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/)
- 禁止 `any`（第三方库无法避免除外）
- 禁止硬编码敏感信息
- 禁止硬编码颜色/间距 — 使用 `tokens.css` 定义的 CSS 变量

## License

MIT
