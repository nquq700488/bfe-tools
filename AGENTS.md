# AGENTS.md — AI 编码助手规范入口

> 适用于所有 AI 编码助手（Claude Code、Cursor、Copilot、Windsurf、Aider 等）。
> 工具特有约束另见对应工具的配置文件（如 `CLAUDE.md`）。

---

## 你是谁

在此描述：

- **角色与技术水平**：资深全栈工程师，擅长 Vue 3 前端、Python 后端、Bun 运行时与 Tauri 桌面端开发
- **项目业务背景**：前端实用工具集合站（bfe-tools），围绕前端开发与日常使用中的高频痛点，提供 25+ 个工具，按 Python 后端引擎、Bun 服务和纯前端三类运行时组织
- **技术栈**：
  - **前端**：Vue 3（Composition API + `<script setup>`）+ Vite + TypeScript（strict）+ UnoCSS + Naive UI + Anime.js
  - **Python 后端**：FastAPI + 12 个处理引擎（Whisper、edge-tts、easyocr、PyAV、Playwright、Pillow、PyMuPDF 等）
  - **Bun 服务**：Bun + Elysia，提供 HTML/CSS 工具、API 请求测试、WebSocket 测试
  - **桌面端**：Tauri v2（Rust）
  - **包管理**：pnpm / bun（前端）· uv（Python 后端）· bun（Bun 服务）
  - **提交规范**：Conventional Commits
- **当前工具地图**：已落地 25+ 个工具，按 Python 后端引擎、Bun 服务、纯前端三类运行时组织。详见 [README.md#工具一览](README.md#工具一览)。

---

## 语言

明确项目的语言约定：

- 代码注释、commit 说明、文档使用中文
- 变量/函数命名语言（如英文 camelCase）

---

## 铁律（P0，不可违背）

列出项目不可违背的硬约束，例如：

- ❌ 禁止 `any`（第三方库无法避免除外）
- ❌ 禁止特定 API / 模式（如 Options API、`var`、`==`）
- ❌ 禁止绕过质量门禁（如 `--no-verify`）
- ❌ 禁止硬编码敏感信息
- ❌ 禁止跳过必要设计直接编码：完整模式、高风险或需求不清的创造性工作必须先呈现设计并获用户批准；轻量任务可用一句话说明意图后继续
- ❌ 禁止未经验证的完成声明：不得使用"应该可以了""看起来没问题""Agent 说通过了"等模糊表述
- ✅ 先读后写：改任何文件前先 Read 该文件 + 相关规范

---

## 会话启动协议

每次任务第一步，必须完成此检查清单。P0 项全部满足后才能继续：

```text
【会话启动检查】
✅/❌ 已读取 AGENTS.md：[是/否]
✅/❌ 已读取 workflow.md（工作方式与执行流程）：[是/否]
✅/❌ 已完成任务分流判断：[是/否]
✅/❌ 已完成模式判断：[是/否]
当前模式：[完整模式 / 轻量模式 / 直接回复 / 待判断]
```

**P0 阻断项**（必须先解决再行动）：

- `AGENTS.md` 未读取 → 先读
- `workflow.md` 未读取 → 先读
- 模式未判断 → 先判断

补充：

- `AI_MEMORY.md`：项目背景、架构经验、历史坑位，按需读取
- `TASK_MEMORY.md`：默认不读，只有用户明确要求或上下文压缩恢复时才读
- 长流程、多轮任务按规范落盘 `TASK_MEMORY.md`

> 详细的启动检查清单和自检流程见 `.agents/hooks/session-start.md`。

---

## 任务路由

详细路由见 `.agents/task-routing.md`。

除纯咨询外，所有任务先按 `.agents/task-routing.md` 选择执行路径；不得跳过路由直接自由执行。

最小原则：

- 纯咨询：直接回复，不进入编码流程
- 轻量修改：读取最小必要规范后直接执行
- 涉及职责边界、公共契约、数据流/状态流或独立决策面：按 `.agents/execution-mode-guidelines.md` 判断模式
- 涉及多 Agent 协作：必读 `.agents/collaboration.md`

任务开始时按固定格式输出：

```text
【任务路由】
模式：[完整模式 / 轻量模式 / 直接回复]
使用 Skill：[无 / skill-name]
必读规范：[文件列表]
是否需要 .changes：[是/否]
下一步：[一句话说明]
```

---

## 规范导航

主流程必读：

- `.agents/task-routing.md`
- `.agents/workflow.md`
- `.agents/execution-mode-guidelines.md`

领域规范（按任务命中补读）：

- `.agents/coding-standards/common.md`（语言无关原则，所有编码任务必读）
- `.agents/coding-standards/typescript.md`（TS 项目补读；其他语言有对应文件时同理）
- `.agents/git-workflow.md`
- `.agents/quality-checklist.md`
- `.agents/testing-guidelines.md`
- （若项目存在则补读：component-guidelines、api-guidelines、state-management-guidelines 等）

模式上下文（按当前阶段注入）：

- `.agents/contexts/development.md` — 编码实现阶段
- `.agents/contexts/review.md` — 代码审查阶段
- `.agents/contexts/research.md` — 技术调研/探索阶段
- `.agents/contexts/debug.md` — 调试排错阶段

自动化钩子（自检清单）：

- `.agents/hooks/session-start.md` — 会话启动检查
- `.agents/hooks/session-end.md` — 会话收尾与记忆落盘
- `.agents/hooks/pre-edit.md` — 编辑前检查
- `.agents/hooks/pre-commit.md` — 提交前质量门禁

协作规范（多 Agent / CCB 多模型场景）：

- `.agents/collaboration.md`
- `.agents/orchestrator.md`
- `.agents/agent-registry.md`
- `.ccb/ccb.config`（涉及 CCB agent / provider 配置时）

记忆与治理：

- `AI_MEMORY.md`
- `TASK_MEMORY.md`
- `.agents/task-memory.md`
- `.agents/ai-memory.md`
- `.agents/context-compression-guidelines.md`
- `.agents/spec-governance.md`
- `.agents/continuous-learning.md`（Skill 进化与长期规则沉淀）

Skill 与工具适配：

- `.agents/skills.md`
- `.agents/skills/{skill-name}/SKILL.md`
- `.claude/commands/{skill-name}.md`（Claude Code 斜杠命令薄路由，按需存在）

CCB 可选配置：

- `.ccb/README.md`（CCB 安装、验证、项目配置与排障）
- `.ccb/ccb.config`（CCB agent / provider 配置）
- `.ccb/start.sh` / `.ccb/stop.sh` / `.ccb/restart.sh`（CCB 团队启停脚本）

---

## 记忆文件

| 文件 | 用途 | 读 | 写 |
|------|------|----|----|
| `AI_MEMORY.md` | 项目背景、架构决策与通用经验 | 按需读取 | 命中写入触发条件时立即更新 |
| `TASK_MEMORY.md` | 任务进展、关键决策 | 用户明确要求或恢复上下文时 | 决策产生时立即落盘；会话结束前更新状态 |

详细写法见 `.agents/task-memory.md` 与 `.agents/ai-memory.md`。

---

## 编码后强制验证

列出项目的最小验证要求，如：

- 类型检查无错误
- Lint 无报错
- 边界：空值/极限/异常/竞态/资源释放检查
- UI 改动：真机或 devtools 实测关键场景

---

## 工作方式

**理解问题 > 解决问题；最小改动；先读后写；跑完检查再交卷。**

- 执行流程见 `.agents/workflow.md`
- 模式判断见 `.agents/execution-mode-guidelines.md`

---

## 流程哲学

**流程是工具，不是目的。** 如果某个流程不能帮你更有效率，就应该改掉它。

- Artifact（proposal、specs、design、tasks）可随时更新，不必 rigid 执行
- 规范是指导而非枷锁；冲突时以用户明确指令为准
- 轻量任务可裁剪步骤，只保留核心约束（先读后写、最小改动、验证）
- 完整模式允许在 artifact 落盘后、实施前随时修改设计

---

## 通用检查清单（每次任务）

所有 AI 助手执行任务前/后需自检：

```text
【通用自检】
✅/❌ 已读取 AGENTS.md 并理解当前任务上下文
✅/❌ 已读取本工具专用规范（如 CLAUDE.md / CURSOR.md 等）
✅/❌ 已读取 workflow.md 并完成任务分流与模式判断
✅/❌ 文件修改前已确认路径存在（Glob / ls 验证）
✅/❌ 修改后已实际写入磁盘（非仅对话展示）
✅/❌ 编码后已运行验证（lint / test / type-check 等）
✅/❌ 长任务已按规范更新 TASK_MEMORY.md
```

> 工具特有检查项见对应工具配置文件（如 `CLAUDE.md` 中的「Claude 自检扩展」）。

---

## 规范索引

### 🚀 启动必读

| 规范 | 路径 | 读取时机 |
|------|------|----------|
| **通用规范入口** | `AGENTS.md` | 每次会话启动 |
| **工作流与模式** | `.agents/workflow.md` | 任务启动时 |
| **执行模式判断** | `.agents/execution-mode-guidelines.md` | 判断模式时 |
| **任务路由** | `.agents/task-routing.md` | 任务启动时 |
| **Claude 专用** | `CLAUDE.md` | 使用 Claude Code 时 |

### 🔧 编码与质量

| 规范 | 路径 | 适用场景 |
|------|------|----------|
| **编码标准（通用）** | `.agents/coding-standards/common.md` | 所有代码修改 |
| **编码标准（TS）** | `.agents/coding-standards/typescript.md` | TypeScript 代码修改 |
| **Git 规范** | `.agents/git-workflow.md` | git 操作 |
| **质量检查** | `.agents/quality-checklist.md` | 编码完成后 |
| **测试规范** | `.agents/testing-guidelines.md` | 编码/测试任务时 |
| **编辑前钩子** | `.agents/hooks/pre-edit.md` | 编辑文件前 |
| **提交前钩子** | `.agents/hooks/pre-commit.md` | git 提交前 |

### 🤝 多 Agent / CCB 协作

| 规范 | 路径 | 适用场景 |
|------|------|----------|
| **多 Agent / CCB 协作** | `.agents/collaboration.md` | 复杂任务 |
| **编排规范** | `.agents/orchestrator.md` | 复杂任务 |
| **Agent 注册表** | `.agents/agent-registry.md` | 多 Agent 场景 |
| **CCB 安装与配置** | `.ccb/README.md` | 安装/排障 CCB |
| **CCB Agent 配置** | `.ccb/ccb.config` | 调整 CCB 配置 |

### 📋 Skill 与命令

| 规范 | 路径 | 适用场景 |
|------|------|----------|
| **Skill 指令清单** | `.agents/skills.md` | 使用或维护 skill |
| **Skill 实现** | `.agents/skills/{skill-name}/SKILL.md` | 执行具体 skill |
| **Claude 命令适配** | `.claude/commands/{skill-name}.md` | Claude 专属 |
| **启动钩子** | `.agents/hooks/session-start.md` | 会话启动时 |
| **收尾钩子** | `.agents/hooks/session-end.md` | 会话结束时 |

### 🧠 记忆与持久化

| 规范 | 路径 | 适用场景 |
|------|------|----------|
| **AI 记忆** | `AI_MEMORY.md` | 项目背景、架构经验 |
| **任务记忆** | `TASK_MEMORY.md` | 长任务/恢复上下文 |
| **记忆写入规则** | `.agents/ai-memory.md` | 按需 |
| **任务记忆规则** | `.agents/task-memory.md` | 按需 |

### 🎯 模式上下文

| 规范 | 路径 | 注入阶段 |
|------|------|----------|
| **开发模式** | `.agents/contexts/development.md` | Phase 2 编码 |
| **审查模式** | `.agents/contexts/review.md` | Phase 3 审查 |
| **调研模式** | `.agents/contexts/research.md` | 技术调研 |
| **调试模式** | `.agents/contexts/debug.md` | Bug 修复 |

### 🛡️ 治理与进化

| 规范 | 路径 | 适用场景 |
|------|------|----------|
| **规范治理** | `.agents/spec-governance.md` | 规范变更 |
| **持续学习** | `.agents/continuous-learning.md` | Skill 进化 |
| **上下文压缩** | `.agents/context-compression-guidelines.md` | 长会话 |

> 工具特有约束优先级高于通用规范。冲突时以专用配置文件为准。
