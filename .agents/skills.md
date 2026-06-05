# Skill 指令清单

> 本文档是 Skill（斜杠指令）的**说明文档**，用于介绍项目中可复用的 Skill 有哪些、它们的描述和用法。
>
> `.agents/skills/` 是所有 Skill 的唯一维护点，各 AI 工具通过适配层路由到此处读取，无需重复维护内容。

---

## 各工具 Skill 配置位置

| AI 工具 | 配置目录 | 使用方式 |
|---------|---------|---------|
| Claude Code | `.claude/commands/{skill-name}.md` | 对话中输入 `/{skill-name}` 调用 |
| Cursor | `.cursor/rules/` | 通过规则文件引导执行 |
| Copilot | `.github/copilot-instructions.md` | 通过指令文件引导执行 |

> 新增 Skill 后，在 `.claude/commands/{skill-name}.md` 创建一行路由文件即可（内容：`执行 .agents/skills/{skill-name}/SKILL.md 中定义的流程`）。Skill 内容本身只在 `.agents/skills/` 维护。

---

## 已注册 Skill

### /commit-helper — 按项目规范执行 Git 提交

- **用途**：按 `git-workflow.md` 执行提交流程，完成变更拆分、质量验证、提交信息确认、精确暂存和提交
- **触发时机**：用户说"提交代码"、"commit"、"提交更改"、"提交修改"等
- **执行流程**：
  1. `git status` + `git diff --stat` 检查变更内容
  2. 按 `git-workflow.md` 做变更拆分分析
  3. 执行 `pnpm lint` + `npx vue-tsc --noEmit` 验证代码质量
  4. 根据当前提交组推断 type 和中文 description，向用户确认
  5. 精确 stage 当前提交组文件，禁止 `git add .`
  6. 执行 `git commit`
- **注意事项**：提交规范、type 列表、拆分规则、分支规则统一维护在 `git-workflow.md`；禁止 `--no-verify`
- **配置文件**：[skills/commit-helper/SKILL.md](skills/commit-helper/SKILL.md)

---

### /agent-workflow — 多 Agent 协作工作流

- **用途**：本地多 Agent 工作流薄入口，串联 `execution-mode-guidelines.md`、`orchestrator.md`、`workflow.md`、`quality-checklist.md`
- **触发时机**：复杂开发、复杂修复、代码审查、测试验证等需要 Plan → Dev → Review → Test → Deliver 阶段治理的任务
- **执行流程**：先做模式判断，再按 Orchestrator 五阶段推进；开发前必须做正式并行分析，交付前完成质量门禁
- **注意事项**：本地多 Agent 基线；需要 CCB 多模型增强时升级到 `multi-agent-orchestrate`，CCB 不可用时从 `multi-agent-orchestrate` 降级回本流程；详细规则不在 skill 内维护
- **配置文件**：[skills/agent-workflow/SKILL.md](skills/agent-workflow/SKILL.md)

---

### /ccb-bridge — 单次 CCB 通讯入口

- **用途**：与 `planner`、`reviewer`、`developer`、`tester`、`inspiration` 等 CCB agent 进行单次通讯
- **触发时机**：用户要求问某个外部 agent、让外部模型审查/测试/规划/生成内容，但不需要完整多模型开发流程
- **执行流程**：确认目标 agent，按 `collaboration.md`、`agent-registry.md` 与 `.ccb/ccb.config` 组织上下文，通过 CCB 发送请求并回传结论
- **注意事项**：完整多模型流程使用 `multi-agent-orchestrate`；`inspiration` 可作为弹性协作 / 备用执行 agent，代执行时必须按被替代角色注入规范；不得绕过 CCB 直接调用外部 AI CLI / API
- **配置文件**：[skills/ccb-bridge/SKILL.md](skills/ccb-bridge/SKILL.md)

---

### /multi-agent-orchestrate — 多模型协作编排器

- **用途**：高复杂任务的多模型协作薄编排层，把 `task-routing.md`、`execution-mode-guidelines.md`、`collaboration.md`、`orchestrator.md` 串起来执行
- **触发时机**：用户明确要求多模型/多角色协作、多模型头脑风暴、一起想方案，或完整模式任务存在高风险、高复杂度、跨模块决策
- **不触发**：普通"实现 xxx"、"开发 xxx"、单文件 bugfix、纯问答、用户明确要求"直接做/不用多模型"
- **执行流程**：先做模式判断，再按 `collaboration.md` 判断 A/B/C/D 注入档位；用户要求多模型头脑风暴时先按 `solution-brainstorm` 执行 Phase 0（独立发散 → 交叉挑战 → 共识收敛），再按完整模式推进
- **注意事项**：这是 `agent-workflow` 的 CCB 多模型增强路径；CCB 未安装、目标 agent 不可用或用户要求不用多模型时，降级回 `agent-workflow`；Orchestrator 只做裁决和回传，不替 Planner 产出实质方案
- **配置文件**：[skills/multi-agent-orchestrate/SKILL.md](skills/multi-agent-orchestrate/SKILL.md)

---

### /solution-brainstorm — 多角色 / 多模型头脑风暴出方案

- **用途**：只执行方案头脑风暴，把多个角色或模型的独立发散、交叉挑战和多轮补强收敛为共识方案
- **触发时机**：用户说"先一起想方案"、"多模型头脑风暴"、"多角色碰撞后出方案"，且暂不要求编码
- **执行流程**：读取协作与角色规范，选择 CCB 多模型或本地多角色，执行独立发散 → 交叉挑战 → 共识收敛，输出共识方案、采纳记录、少数意见和未决问题
- **注意事项**：这是头脑风暴，不是首轮观点汇总；不进入编码、review 或 test 放行；详细轮次和降级规则统一维护在 `collaboration.md` 与 `agent-registry.md`
- **配置文件**：[skills/solution-brainstorm/SKILL.md](skills/solution-brainstorm/SKILL.md)

---

### /memory-update — 更新项目记忆

- **用途**：按记忆规范把任务状态、关键决策、风险或长期工程经验写入 `TASK_MEMORY.md` / `AI_MEMORY.md`
- **触发时机**：用户说"记录一下"、"更新记忆"、"写入 TASK_MEMORY/AI_MEMORY"，或任务收尾时命中记忆沉淀条件
- **执行流程**：读取 `AGENTS.md` 与记忆规范，判断写入目标，查重后精简落盘，并向用户说明写入结果
- **注意事项**：具体触发、格式、精简规则统一维护在 `.agents/task-memory.md` 与 `.agents/ai-memory.md`；不把未验证猜测或任务流水写入记忆
- **配置文件**：[skills/memory-update/SKILL.md](skills/memory-update/SKILL.md)

---

### /context-handoff — 生成上下文交接摘要

- **用途**：按上下文压缩规范生成可恢复的任务交接摘要，并在需要跨会话恢复时更新记忆
- **触发时机**：用户说"压缩上下文"、"整理交接"、"生成恢复摘要"、"准备下个会话继续"，或长任务存在上下文丢失风险
- **执行流程**：读取 `AGENTS.md`、上下文压缩规范与任务记忆规范，汇总目标、状态、决策、风险、文件和下一步，按需落盘
- **注意事项**：具体压缩规则统一维护在 `.agents/context-compression-guidelines.md`；不确定内容必须标记待确认，不凭记忆补全
- **配置文件**：[skills/context-handoff/SKILL.md](skills/context-handoff/SKILL.md)

<!--
新增 Skill 模板：

### /skill-name — 一句话描述
- **用途**：做什么
- **触发时机**：什么场景下使用
- **执行流程**：
  1. 步骤一
  2. 步骤二
- **注意事项**：特殊说明

注册后在 `.claude/commands/{skill-name}.md` 创建一行路由文件。
-->
