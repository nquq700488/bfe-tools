# 任务记忆

> **上下文压缩防护**：对话过长时早期信息可能丢失，关键信息必须落盘。

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
