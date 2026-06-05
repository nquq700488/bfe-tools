# 任务记忆

> **上下文压缩防护**：对话过长时早期信息可能丢失，关键信息必须落盘。

---

## 设计审查 + 全站 UI 优化 [已完成 2026-06-05]

目标：executor 以设计总监身份审查所有页面，按优先级修复。

### 高优先级

- **统一 tokens.css 和 UnoCSS 色板**：两套蓝色调不一致，已以 tokens.css 为准统一 uno.config.ts
- **注入 n-config-provider 主题**：App.vue 新增 NConfigProvider，覆盖 primaryColor/borderRadius/fontFamily
- **替换全部硬编码颜色**：global.css/ResultDownload.vue/App.vue/JsonFormatter.vue 全部改为 CSS 变量
- **提取重复 CSS 为全局工具类**：global.css 新增 `.form-label`/`.output-section`/`.output-header`
- **新增 JSON 语法高亮 token**：`--color-syntax-string/number/boolean/null`

### 中优先级

- **删除死代码**：AppHeader.vue 和 AppFooter.vue（未被 App.vue 引用）
- **移除子组件冗余 max-width**：8 个工具组件的 `max-width: 960px` 已删
- **统一 960px 限制**：BackendJobToolPanel/ClientToolPanel/ToolPage 改为 `var(--max-content-width)` (1152px)
- **AnimeLab 全宽**：ClientToolPanel 非 scoped `:has(.anime-lab)` 突破限制
- **流体排版 token**：tokens.css 新增 `--text-hero`/`--text-headline`
- **统一侧边栏 active 指示器**：移动端改为底部蓝色横条（与桌面端竖条同色系）
- **CopyButton 自定义样式**：从裸 NButton 改为自定义 button，含 copied 状态
- **TTS 按钮文字色修复**：删除 n-config-provider 中 Button.textColorPrimary 蓝色覆盖

### 低优先级

- **页面过渡动画**：`<router-view>` 加了 `<transition name="page">` fade 动画
- **AnimeLab 重构**：三段式纵向工作台（预设画廊 → 预览舞台 → 参数 Inspector），去掉 100vh 固定高度，支持键盘操作

### 其他改动

- **pyproject.toml**：补了 faster-whisper/av/numpy/pillow 依赖
- **删除 requirements.txt**：统一用 uv sync + pyproject.toml
- **start.sh 重构**：自动创建 .venv，uv sync 同步，去掉 requirements.txt 引用
- **kill 命令拆分**：`pnpm kill:web` / `kill:server` / `kill:desktop` + `pnpm kill` 一键全杀
- **WatermarkRemovalForm**：宽度限制放开、按钮统一 size、实现算法描述修正（TELEA → NS）
- **Playwright 已安装**：用于多分辨率视觉检查

---

## 9 个纯前端工具实现 [已完成 2026-06-04]

目标：`.planning/todos/pending/` 下 9 个待办工具全部实现

决策：
- 架构：ToolPage → 外壳 + BackendJobToolPanel + ClientToolPanel，discriminated union 分流
- 类型：ToolMode = 'backend-job' | 'client-only'，category 扩为 audio/image/video/text/ui/general
- 目录：components/tools/backend/ + pure/ + shared/；lib/parsers/ + lib/security/
- npm 包：culori/papaparse/cronstrue/qrcode/browser-image-compression，全部懒加载
- 安全：HTML禁v-html、SVG清洗script/on*、URL标记危险协议、CSV防公式注入

执行：
- Phase 0：5 agent × 2 轮头脑风暴 → 共识
- Phase 1：Planner 方案定稿 → .planning/PLAN-9-pure-frontend-tools.md
- Phase 2：Developer 编码 B0→B1→B2→B3→B4，~35 文件
- Phase 3：Reviewer 4 轮审查修复闭环，9 HIGH → 0
- Phase 4：Tester(kimi) + Tester(inspiration) 双视角验证 → 可通过

验证：
- vue-tsc 零错误
- vitest 6 文件 57/57 测试通过
- vite build 成功

遗留：GBK 编码（浏览器 TextDecoder 不支持，需 polyfill 或提示用户）；URL 状态分享（二期）；SvgEditor sandbox 单测覆盖（建议）

---

## AI Cron 自然语言生成 [已完成 2026-06-04]

目标：为 Cron 解析器增加 AI 自然语言 → cron 表达式生成

决策：
- 前端：CronParser.vue 新增自然语言输入框 + AI 生成按钮 + 设置面板（模型/API Key/Base URL）
- 后端：FastAPI AI 代理路由 `/api/v1/ai/cron`，支持 OpenAI/Anthropic/Google/Custom
- 安全：API Key → sessionStorage，model/baseUrl → localStorage，后端不持久化 key

执行：
- Developer 编码：前端 575 行 + 后端 ~230 行
- Reviewer 2 轮审查修复：5 HIGH（baseUrl 未传/字符串注入/Google key 在 URL/异常泄漏/key 存 localStorage）→ 0
- Tester：前置测试分析（Kimi  provider 限制无法代码变更验证）

验证：
- vue-tsc 零错误
- vitest 57/57 通过
- Reviewer 判定可合入

遗留：
- sessionStorage 仍可能被同源 XSS 读取（接受风险）
- AI 代理建议后续抽出通用 LLM client（不阻断）
- 缺少后端单测（不支持模型/custom 缺 base_url/上游错误脱敏/非法 cron/超时）
