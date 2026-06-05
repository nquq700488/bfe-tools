# AGENTS.md — AI 编码助手规范入口

> 适用于所有 AI 编码助手（Claude Code、Cursor、Copilot、Windsurf、Aider 等）。
> 工具特有约束另见对应工具的配置文件（如 `CLAUDE.md`）。

---

## 你是谁

- **角色与技术水平**：资深全栈工程师，擅长 Vue 3 生态和 Python 后端开发
- **项目业务背景**：前端实用工具集合站（bfe-tools），提供语音文字互转、图片信息识别、浏览器不兼容媒体格式转换等日常高频工具，解决前端开发与日常使用中的痛点
- **技术栈**：
  - **前端**：Vue 3（Composition API + `<script setup>`） + Vite + TypeScript + UnoCSS
  - **后端**：Python + FastAPI
  - **包管理**：pnpm（前端）/ uv 或 pip（后端）
  - **提交规范**：Conventional Commits
- **当前工具规划**：

  | 工具         | 功能                               | 核心能力                  |
  | ------------ | ---------------------------------- | ------------------------- |
  | 语音转文字   | 上传音频 → 识别为文本              | Web Speech API / Whisper  |
  | 文字转语音   | 输入文本 → 生成音频                | TTS 引擎                  |
  | 图片信息识别 | 上传图片 → 提取文字/信息           | OCR / 多模态模型          |
  | 媒体格式转换 | 浏览器不兼容格式 → Web 友好格式    | FFmpeg 转码               |

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

---

## 任务路由

详细路由见 `.agents/task-routing.md`。

最小原则：

- 纯咨询：直接回复，不进入编码流程
- 轻量修改：读取最小必要规范后直接执行
- 涉及职责边界、公共契约、数据流/状态流或独立决策面：按 `.agents/execution-mode-guidelines.md` 判断模式
- 涉及多 Agent 协作：必读 `.agents/collaboration.md`

---

## 规范导航

主流程必读：

- `.agents/task-routing.md`
- `.agents/workflow.md`
- `.agents/execution-mode-guidelines.md`

领域规范（按任务命中补读）：

- `.agents/coding-standards.md`（前端 TypeScript/Vue 3）
- `.agents/coding-standards-python.md`（后端 Python/FastAPI）
- `.agents/git-workflow.md`
- `.agents/quality-checklist.md`
- `.agents/testing-guidelines.md`
- （若项目存在则补读：component-guidelines、api-guidelines、state-management-guidelines 等）

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
| --- | --- | --- | --- |
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

| 规范 | 路径 | 读取时机 | 适用场景 |
| ------ | ------ | ---------- | ---------- |
| **通用规范入口** | `AGENTS.md` | 每次会话启动 | 所有任务 |
| **工作流与模式** | `.agents/workflow.md` | 任务启动时 | 所有任务 |
| **执行模式判断** | `.agents/execution-mode-guidelines.md` | 判断模式时 | 所有任务 |
| **任务路由** | `.agents/task-routing.md` | 任务启动时 | 所有任务 |
| **编码标准（前端）** | `.agents/coding-standards.md` | 前端编码任务命中时 | 前端代码修改 |
| **编码标准（Python）** | `.agents/coding-standards-python.md` | 后端编码任务命中时 | Python/FastAPI 代码修改 |
| **Git 规范** | `.agents/git-workflow.md` | 涉及提交时 | git 操作 |
| **质量检查** | `.agents/quality-checklist.md` | 编码完成后 | 代码修改 |
| **测试规范** | `.agents/testing-guidelines.md` | 编码/测试任务时 | 代码修改 |
| **多 Agent / CCB 协作** | `.agents/collaboration.md` | 多 Agent / CCB 场景 | 复杂任务 |
| **编排规范** | `.agents/orchestrator.md` | 多 Agent / CCB 场景 | 复杂任务 |
| **Agent 注册表** | `.agents/agent-registry.md` | 多 Agent / CCB 场景 | 复杂任务 |
| **CCB 角色语义** | `.agents/agent-registry.md` | 判断 CCB agent 职责时 | 多模型协作 |
| **Skill 指令清单** | `.agents/skills.md` | 使用或维护 skill 时 | 斜杠指令 |
| **Skill 实现目录** | `.agents/skills/{skill-name}/SKILL.md` | 执行具体 skill 时 | 斜杠指令 |
| **Claude 命令适配** | `.claude/commands/{skill-name}.md` | 使用 Claude Code 斜杠命令时 | Claude 专属 |
| **CCB 安装与配置说明** | `.ccb/README.md` | 安装/迁移/排障 CCB 时 | CCB 多模型协作 |
| **CCB Agent 配置** | `.ccb/ccb.config` | 调整 CCB agent / provider 时 | CCB 多模型协作 |
| **AI 记忆** | `.agents/ai-memory.md` | 按需读取 | 所有任务 |
| **任务记忆** | `.agents/task-memory.md` | 按需读取 | 长任务/恢复上下文 |
| **AI 记忆文件** | `AI_MEMORY.md` | 按需读取 | 所有任务 |
| **任务记忆文件** | `TASK_MEMORY.md` | 用户明确要求或恢复上下文时 | 长任务/恢复上下文 |
| **上下文压缩** | `.agents/context-compression-guidelines.md` | 上下文告警时 | 长会话 |
| **规范治理** | `.agents/spec-governance.md` | 规范变更时 | 维护规范 |
| **Claude 专用** | `CLAUDE.md` | 使用 Claude Code 时 | Claude 专属 |

> 工具特有约束优先级高于通用规范。冲突时以专用配置文件为准。
