# AI_MEMORY.md — 项目共享认知入口

> 目标：让任意 AI 在读完本文件后，快速建立本项目的工作心智模型。
> 内容包含：项目概览、架构地图、关键业务链路、高风险区域、长期有效规则。
> 不包含：任务级流水、临时调试过程（这些写入 `TASK_MEMORY.md`）。

## 项目概览

- **业务**：前端实用工具集合站（bfe-tools），一站式解决日常开发与使用中的高频痛点，已落地 25+ 个工具。
- **技术栈**：
  - 前端：Vue 3（Composition API + `<script setup>`）+ Vite + TypeScript（strict）+ UnoCSS + Naive UI + Anime.js
  - Python 后端：FastAPI + 12 个处理引擎（Whisper、edge-tts、easyocr、PyAV、Playwright、Pillow、PyMuPDF 等）
  - Bun 服务：Bun + Elysia，提供 HTML/CSS 工具、API 请求测试、WebSocket 测试
  - 桌面端：Tauri v2（Rust）
  - 包管理：pnpm / bun（前端）· uv（Python 后端）· bun（Bun 服务）
  - 提交规范：Conventional Commits
- **代码主入口页面**：
  - 前端应用入口：`web/src/main.ts`
  - 前端根布局：`web/src/App.vue`
  - 工具页面：`web/src/pages/ToolPage.vue`
  - Python 后端入口：`py-server/app/main.py`
  - Bun 服务入口：`bun-server/src/index.ts`
  - Tauri 桌面入口：`desktop/src-tauri/src/main.rs`

## 工程基线

- **Node**：>= 18（以 `.nvmrc` / `.node-version` 为准，若存在）
- **Python**：>= 3.10（推荐 3.13），使用 `uv` 管理依赖
- **Bun**：>= 1.3（Bun 服务所需）
- **Rust**：>= 1.70（仅桌面端）
- **包管理**：
  - 前端/web/desktop：pnpm（bun 可作为替代）
  - Python 后端：uv
  - Bun 服务：bun
- **常用验证命令**：
  - 前端类型检查：`cd web && pnpm type-check`（`vue-tsc --noEmit`）
  - 前端构建：`cd web && pnpm build`
  - Python lint/format：`cd py-server && ruff check . && ruff format --check .`
  - Python 类型检查：`cd py-server && mypy app/`
  - Python 测试：`cd py-server && pytest`
  - 顶层规范完整性测试：`pnpm test` 或 `node tests/spec-integrity.test`

## 架构地图（先看这一节再改代码）

### 页面层

- `web/src/pages/HomePage.vue`：首页，展示工具分类卡片、搜索入口。
- `web/src/pages/ToolPage.vue`：通用工具页，根据 `toolId` 从 `registry.ts` 获取工具元数据，渲染对应工具面板。
- `web/src/pages/NotFoundPage.vue`：404 页面。
- `web/src/App.vue`：根布局，左侧固定 `AppSidebar` + 右侧内容区；检测 Tauri 桌面模式并等待后端就绪。

### 业务状态层

- `web/src/tools/registry.ts`：工具注册中心。启动时从后端 `/api/v1/tools`、`/api/v1/categories` 拉取工具与分类元数据并缓存，是前端工具列表的唯一真相源。
- `web/src/hooks/useTaskPolling.ts`：后端任务轮询 Hook（当前默认 1s 轮询，后端同时支持 SSE `/events`）。
- `web/src/hooks/useFileUpload.ts`：文件上传 Hook，支持分片上传。
- `web/src/hooks/useClientToolState.ts`：纯前端工具的状态管理（如历史记录、撤销重做）。
- `py-server/app/services/job.py`：任务状态机（内存实现），负责任务创建、状态流转、SSE 广播、TTL 清理。
- `py-server/app/services/upload.py`：分片上传服务（内存实现），负责上传会话、SHA256 校验、合并。

### 核心领域层

#### 前端工具组件

- `web/src/components/tools/backend/`：12 个 Python 后端工具的表单/面板。
  - `BackendJobToolPanel.vue`：统一后端任务外壳，按 `toolId` 分发到各子表单。
  - 子表单：`MediaConvertForm`、`WatermarkRemovalForm`、`TtsForm`、`PdfToolkitForm`、`ResponsiveScreenshotForm`、`ImageBatchForm`、`VideoKeyframeForm`、`HtmlToImageForm`、`UrlToPdfForm`、`PerfSnapshotForm`。
- `web/src/components/tools/pure/`：14 个纯前端 + Bun 工具组件。
  - `AnimeLab`、`ApiTester`、`WsTester`、`ColorConverter`、`CronParser`、`CsvToJson`、`FilePreview`、`HtmlCssTool`、`HtmlEntityCodec`、`ImageCompression`、`JsonFormatter`、`QrcodeGenerator`、`SvgEditor`、`UrlCodec`。
- `web/src/components/ui/`：通用 UI 组件：`FileUpload`、`ProgressBar`、`ResultDownload`、`TaskStatus`。

#### Python 后端引擎

- `py-server/app/engine/__init__.py`：引擎抽象基类 + `EngineRegistry`，启动时注册 12 个引擎。
- 12 个引擎实现：
  - `ocr_engine.py`：easyocr 图片 OCR
  - `stt_engine.py`：faster-whisper 语音转文字
  - `tts_engine.py`：edge-tts 文字转语音
  - `transcode_engine.py`：PyAV 媒体格式转换
  - `watermark_engine.py`：OpenCV inpainting 图片去水印
  - `pdf_engine.py`：PyMuPDF PDF 拆分/合并/压缩/提取
  - `screenshot_engine.py`：Playwright 多分辨率截图
  - `image_batch_engine.py`：Pillow 图片批量处理
  - `video_keyframe_engine.py`：PyAV 视频取帧
  - `html_to_image_engine.py`：Playwright HTML 渲染截图
  - `url_to_pdf_engine.py`：Playwright 网页转 PDF
  - `perf_snapshot_engine.py`：Playwright 性能快照

#### Bun 服务

- `bun-server/src/index.ts`：Elysia 服务入口（默认 :3999）。
- `bun-server/src/routes/html-css.ts`：HTML/CSS 压缩、格式化、CSS 分析。
- `bun-server/src/routes/api-tester.ts`：HTTP 代理请求，绕过浏览器 CORS，支持 curl 粘贴识别。
- `bun-server/src/routes/ws-tester.ts`：WebSocket 代理转发 + 实时日志。

#### 桌面端

- `desktop/src-tauri/src/main.rs`：Tauri 应用入口。
- `desktop/src-tauri/src/lib.rs`：Tauri Builder、命令、设置面板注入。
- `desktop/src-tauri/src/backend.rs`：Python 后端进程管理（端口发现、token 生成、启动、健康检查、优雅关闭）。
- `desktop/src-tauri/src/csp.rs`：256-bit token 生成。

### 基础设施层

- `web/src/lib/api.ts`：基于 fetch 的 API 客户端，支持 Vite proxy / Tauri 动态后端地址 / token 注入。
- `web/src/lib/runtime.ts`：运行环境检测（browser/desktop）、后端信息解析、URL 清理。
- `web/src/types/tool.ts` / `web/src/types/api.ts`：TypeScript 类型定义。
- `py-server/app/core/config.py`：Pydantic-Settings 配置（CORS、目录、并发、Playwright、zip 安全）。
- `py-server/app/core/security.py`：文件名安全化、路径遍历防护、扩展名/MIME 白名单。
- `py-server/app/lib/browser_manager.py`：Playwright 单例、并发信号量、SSRF 防护。
- `py-server/app/lib/zip_utils.py`：安全解压/打包（防路径遍历、限制大小/数量）。
- `py-server/app/db/database.py`：aiosqlite 异步 SQLite，启动时建表 + seed 25+ 工具与 8 个分类。
- `py-server/app/db/models.py`：Pydantic schema（Category/Tool/Voices/Formats）。

## 关键业务链路（高频改动先过脑）

### 链路 A：后端任务通用流程

1. 用户在前端选择文件，`FileUpload` 组件调用 `POST /api/v1/upload/chunks` 创建分片上传会话。
2. 前端逐片上传，`POST /api/v1/upload/chunks/{upload_id}/{index}`。
3. 上传完成后，`POST /api/v1/upload/chunks/{upload_id}/complete`，后端合并文件。
4. 前端调用 `POST /api/v1/jobs`，传入 `toolId` 与参数，创建异步任务。
5. 引擎异步执行任务，更新任务状态。
6. 前端通过 `GET /api/v1/jobs/{id}` 轮询状态（或 SSE `/api/v1/jobs/{id}/events`）。
7. 任务完成后，前端通过 `GET /api/v1/jobs/{jobId}/result` 下载结果；多文件场景通过 `?file={name}` 指定文件。

**风险点**：
- `job_service` / `upload_service` 当前是内存实现，服务重启后任务/上传会话丢失。
- STT/OCR/视频转码等长任务可能耗时很久，前端默认 30s 请求超时；SSE 当前未完全替代轮询。

### 链路 B：工具注册与发现

1. `py-server/app/db/database.py` 在启动时通过 `seed_data()` 写入 8 个分类 + 25+ 个工具定义到 SQLite。
2. 前端 `web/src/tools/registry.ts` 启动时调用 `/api/v1/categories` 和 `/api/v1/tools` 获取元数据。
3. `ToolPage.vue` 根据 `toolId` 从 `registry` 查找工具定义，按 `mode`（`backend`/`bun`/`pure`）渲染对应面板。
4. `AppSidebar.vue` 使用 Naive UI `NMenu`，按分类分组展示工具，支持搜索过滤与分类折叠。

**风险点**：
- 不要在前端硬编码工具列表；新增/修改工具必须更新 `py-server/app/db/database.py` 的 seed 数据。
- 前端组件与后端 `toolId` 必须保持一致，否则渲染失败。

### 链路 C：桌面端启动与安全

1. Tauri Rust 启动时，在端口范围 18000-18099 中发现可用端口。
2. Rust 生成 256-bit token，启动 Python 后端子进程，将端口/token 注入环境变量。
3. Rust 加载前端 URL，在受信任的本地目标 URL 上追加 `__bfe_port` 和 `__bfe_token` query 参数。
4. 前端读取 query 后立即 `history.replaceState` 清除，将信息写入 `window.__BFE_BACKEND_INFO__`。
5. 后续 API 请求通过 `api.ts` 的 `buildURL` 解析动态后端地址，请求头携带 `X-BFE-Desktop-Token`。
6. Python 后端 `main.py` 中的桌面 token 中间件校验 token。

**风险点**：
- token 通过 URL query 短暂传递，存在极短暴露窗口；CSP 配置较宽松（`frame-src *`、`script-src 'unsafe-inline'`）。
- 桌面端后端地址/端口是动态的，任何地方都不能硬编码 `localhost:8000`。

### 链路 D：Bun 服务代理

1. 前端通过 `web/.env` 中的 `VITE_BUN_API_BASE` 连接 Bun 服务（默认 `http://localhost:3999`）。
2. HTML/CSS 工具、API 请求测试、WebSocket 测试的表单提交到 `/api/bun/*`。
3. Bun 服务在服务端执行 HTML/CSS 处理或转发 HTTP/WebSocket 请求，绕过浏览器 CORS。

**风险点**：
- `api-tester` 和 `ws-tester` 作为代理会接触外部网络，需警惕 SSRF 与滥用风险。
- 修改 Bun 服务端口只需改 `web/.env` 的 `VITE_BUN_API_BASE` 一处。

## 高风险区域（改前优先补读）

- **Playwright 浏览器管理**：`py-server/app/lib/browser_manager.py` 是重资源 + 并发敏感组件。新增浏览器类工具必须复用该单例，注意 `PLAYWRIGHT_CONCURRENCY` 信号量与 60s 超时。
- **任务状态机内存存储**：`py-server/app/services/job.py` 使用内存 dict，服务重启后任务丢失，多实例部署不可能。
- **上传服务内存状态**：`py-server/app/services/upload.py` 同样内存存储，重启后上传会话丢失。
- **桌面端 token 传递**：URL query 短暂暴露 token；所有 API 调用必须通过 `api.ts` 的动态地址解析。
- **SSRF 防护**：`is_url_safe` 仅校验入口 URL；页面跳转后的二次请求由 Playwright 控制，仍可能通过目标页面触发。
- **HEIC 预处理平台依赖**：`transcode_engine.py` 使用 macOS 专属 `sips` 命令处理 HEIC/HEIF，非 macOS 环境会失败。
- **大型文件/长时间任务**：STT/OCR/视频转码可能耗时很长，前端默认 30s 请求超时，SSE 未完全启用。
- **OCR/STT 模型预热**：启动时预热 easyocr 和 faster-whisper，首次启动慢且占大量内存。
- **`BackendJobToolPanel` 复杂度**：1270 行组件，条件分支极多（按 `tool.id` 判断的 `isXxxTool` 密集），新增后端工具需要修改此处。
- **Tauri 配置切换**：`tauri.conf.json`、`.embed.conf.json`、`.url.conf.json` 之间用 `cp` 切换，容易误提交错误配置。
- **`clean.sh` 会删除 `$HOME/Library/Application Support/com.bfe.tools`**：旧桌面端数据目录，执行前确认。

## 长期有效规则（跨任务复用）

- **[架构]** 工具列表由 `py-server/app/db/database.py` 在 SQLite 中 seed，前端 `web/src/tools/registry.ts` 启动时拉取，禁止在前端硬编码工具列表。
- **[数据]** 后端任务统一走 `upload → create job → poll → download result` 流程；文件下载 URL 格式为 `/api/v1/jobs/{jobId}/result`，多文件用 `?file={name}`。
- **[安全]** 所有上传文件必须经过 `sanitize_filename` + `safe_path_join`；解压 zip 必须用 `lib/zip_utils.safe_unzip`。
- **[并发]** Playwright 任务受 `PLAYWRIGHT_CONCURRENCY` 信号量限制，新增浏览器类工具需要复用 `browser_manager`。
- **[状态]** `job_service` / `upload_service` 当前是内存实现，重启丢失状态；不要假设任务在服务端持久化。
- **[桌面]** 桌面端后端地址/端口/token 是动态的，API 调用必须通过 `resolveBackendUrl` / `api.ts` 的 `buildURL`，不能直接写死 `localhost:8000`。
- **[构建]** 修改 Bun 服务端口只需改 `web/.env` 的 `VITE_BUN_API_BASE`；后端端口固定 8000，由 Vite proxy 转发。
- **[编码]** 文档/注释/commit 使用中文；变量函数 camelCase，组件 PascalCase；禁止硬编码颜色和敏感信息。
- **[类型]** TypeScript 开启 strict，禁止 `any`（第三方库声明缺失除外）；Python 使用 Pydantic v2 + mypy strict。
- **[配置]** 环境变量统一走 `.env` / Pydantic-Settings，禁止在源码中硬编码密钥、Token、路径。

## 观察中模式（持续学习信号收集）

<!-- 格式：- **[N/阈值] [信号类型]：[一句话描述]**
        - 最近出现：[日期]（[任务简述]）
        - 特征：[关键共性（可选）]
  信号类型：同类 bug / 同类任务 / 同一坑位 / 规范绕过 / 技术栈变更
  阈值：同类 bug → 2，同一坑位 → 2，同类任务 → 3，规范绕过 → 3，技术栈变更 → 1
  达到阈值后 → 进入 .agents/continuous-learning.md 进化流程
  连续 6 个任务未再出现 → 标注（待清理）
-->

- **[1/2] [同一坑位]：`BackendJobToolPanel` 按 tool.id 做大量 isXxxTool 判断，新增后端工具时容易遗漏分支**
  - 最近出现：2026-06-12（补全 AI_MEMORY.md 项目认知整理）
  - 特征：组件 1270+ 行，新增工具需要同时改 seed 数据、表单组件、面板分发逻辑

- **[1/2] [同类任务]：新增后端引擎类工具需要同时改动 py-server seed 数据、引擎实现、前端表单与面板**
  - 最近出现：2026-06-12（补全 AI_MEMORY.md 项目认知整理）
  - 特征：涉及跨运行时（Python + TypeScript + 数据库 schema）

- **[1/3] [规范绕过]：AI_MEMORY.md 长期为空模板，项目认知未落盘**
  - 最近出现：2026-06-12（补全 AI_MEMORY.md）
  - 特征：前期未将架构地图、高风险区域、长期规则写入共享记忆

## 读取建议（给新 AI）

1. 先读本文件的"架构地图 + 关键链路"。
2. 再读"长期有效规则 + 高风险区域"。
3. 命中具体领域时，按需读对应 `.agents/*.md`：
   - 编码规范：`.agents/coding-standards/common.md`、`.agents/coding-standards/typescript.md`
   - 工作流：`.agents/workflow.md`、`.agents/task-routing.md`、`.agents/execution-mode-guidelines.md`
   - Git 与质量：`.agents/git-workflow.md`、`.agents/quality-checklist.md`
4. 涉及历史决策或跨会话上下文时，按需读 `TASK_MEMORY.md`。
5. 修改代码前，先 Read 目标文件及其相关规范，再做最小改动。

## 维护规则

- 写入触发条件见 `.agents/ai-memory.md`。
- 新增内容优先写"结论/边界/风险"，避免堆叠实现细节。
- 架构变更、新增高风险区域、新发现的长期规则应及时更新本节。
- 观察中模式达到阈值后，进入 `.agents/continuous-learning.md` 进化流程。
- 定期做去重与过期清理。
