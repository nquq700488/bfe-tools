---
name: multi-agent-orchestrate
description: >
  高复杂任务的多模型协作薄编排层。仅在用户明确要求多模型/多角色协作，
  或任务已判定为完整模式且存在高风险、高复杂度、跨模块决策时使用。
  详细规则以 task-routing.md、execution-mode-guidelines.md、collaboration.md、orchestrator.md 为准。
---

# 多模型协作编排器

> 本 skill 只负责启动 CCB 多模型增强流程，不重复维护模式判断、角色职责、调用模板、降级策略或质量门禁正文。

## 必读规范

按顺序读取：

1. `AGENTS.md`
2. `.agents/task-routing.md`
3. `.agents/execution-mode-guidelines.md`
4. `.agents/collaboration.md`
5. `.agents/agent-registry.md`
6. `.ccb/ccb.config`
7. `.agents/orchestrator.md`

涉及开发、审查或测试时补读：

- `.agents/workflow.md`
- `.agents/quality-checklist.md`
- `.agents/testing-guidelines.md`
- 对应领域规范

## 使用边界

使用本 skill：

- 用户明确要求多模型协作、全链路协作、多模型头脑风暴、一起想方案
- 用户要求 `planner` / `reviewer` / `developer` / `tester` / `inspiration` 参与完整流程
- 完整模式任务存在高风险、高复杂度、跨模块决策，且按 `collaboration.md` 需要 CCB 增强

不使用本 skill：

- 单次询问某个 CCB agent，使用 `ccb-bridge`
- 本地多 Agent 流程，使用 `agent-workflow`
- 普通轻量修改、纯咨询、代码解释
- 用户明确说"直接做"、"不用多模型"、"本地执行"

## 执行骨架

1. 按 `task-routing.md` 和 `execution-mode-guidelines.md` 判断轻量 / 完整模式，并等待必要确认。
2. 按 `collaboration.md` 的 A/B/C/D 决策判断 CCB 注入环节；用户已明确要求多模型时，不得自行降级为纯本地。
3. 从 `.ccb/ccb.config` 读取可用 agent / provider，从 `agent-registry.md` 解析角色语义、身份设定和本次执行角色门禁。
4. 进入注入前执行 CCB 可用性检查；agent 离线、超时或质量异常时按 `collaboration.md` 的降级策略处理，必要时使用 `inspiration` 代执行被替代角色。
5. 需要 Phase 0 时，按 `solution-brainstorm` 执行多模型头脑风暴预阶段：独立发散 -> 交叉挑战 -> 共识收敛；禁止只汇总首轮观点。
6. 方案、开发、审查、测试、交付阶段按 `orchestrator.md` / `workflow.md` 推进；外部调用点、prompt 模板和监听方式按 `collaboration.md` 执行。
7. 审查阶段可并行调用 `reviewer` 和 `inspiration`：`reviewer` 是正式质量门禁，`inspiration` 提供补充审查、反例和遗漏方向；两者发现的阻断问题都进入同一审查-修复闭环。
8. 测试阶段可并行调用 `tester` 和 `inspiration`：`tester` 是正式验证门禁，`inspiration` 提供补充测试视角、边界场景和遗漏风险；两者发现的阻断问题都进入同一测试-修复闭环。
9. Reviewer / Tester 不通过时，按 `collaboration.md` 的审查-修复闭环路由回对应角色；Orchestrator 不得自修后冒充通过。

## 必守红线

- 不跳过模式判断、注入判断、方案确认、并行分析、失败处理等用户确认门禁。
- 所有 CCB 通讯必须走 `ccb ask <agent>`，不得直连外部 AI CLI / API。
- 需要结果驱动下一步时，`ccb ask` 后必须记录 `job_id` 并优先 `ccb pend --watch <job_id>`；默认等待不合适时使用 `ccb pend --watch --timeout <秒> <job_id>`。
- 每个 prompt 必须按 `agent-registry.md` 注入 `【身份设定】` 和按本次执行角色解析的 `【角色规范】`；不得按 provider、模型或固定 agent 名硬编码。
- `【角色规范】` 必须在发送前展开为该角色规范索引 / 路径和必须门禁；有文件读取能力时可给索引，无文件读取能力时内联关键门禁，禁止发送占位文本。
- 子 agent / CCB agent 不得递归启动 `agent-workflow` / `multi-agent-orchestrate`，也不得组织新的多 Agent 流程。
- `reviewer` 必须执行「Reviewer 实现质量门禁」；功能可用但实现粗糙、破坏既有模式、缺少必要通用组件/函数或过度封装时必须阻断。
- `inspiration` 可参与审查但不能替代 `reviewer` 的正式放行结论；其 HIGH / CRITICAL 发现必须汇总给 reviewer 或路由 developer 修复。
- `tester` 必须执行「Tester 验证质量门禁」；主路径通过但缺少边界、异常、回归或可复现证据时必须阻断。
- `inspiration` 可参与测试但不能替代 `tester` 的正式验证结论；其 HIGH / CRITICAL 发现必须汇总给 tester 或路由 developer 修复。
- `inspiration` 是弹性协作 / 备用执行角色；代执行时目标 agent 是 `inspiration`，但本次执行角色必须写被替代角色，并使用被替代角色门禁。
- CCB 不可用时降级回 `agent-workflow`；当前工具无子 Agent 能力时，由主 Agent 按对应角色清单自检执行并明确标注。
- 不以本 skill 覆盖 `collaboration.md`、`execution-mode-guidelines.md`、`orchestrator.md`、`agent-registry.md` 的权威规则。
