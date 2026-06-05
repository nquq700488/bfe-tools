---
name: solution-brainstorm
description: >
  方案头脑风暴入口。当用户要求“先一起想方案”“多模型头脑风暴”
  “多角色碰撞后出方案”，或只需要发散、挑战、共识方案而不进入编码时使用。
  详细轮次、角色规范和 CCB 调用规则以 collaboration.md 与 agent-registry.md 为准。
---

# Solution Brainstorm

> 本 skill 只负责启动“独立发散 -> 交叉挑战 -> 共识收敛”的方案头脑风暴，不进入编码、审查或测试执行。

## 必读规范

1. `AGENTS.md`
2. `.agents/task-routing.md`
3. `.agents/agent-registry.md`
4. `.agents/collaboration.md`
5. `.ccb/ccb.config`（需要 CCB 多模型时）

需要降级到本地多角色时，读取 `agent-registry.md` 的「本地多角色头脑风暴」。

## 使用边界

使用本 skill：

- 用户明确要求头脑风暴、一起想方案、多模型 / 多角色碰撞
- 用户只要方案、风险、替代路径、待确认点，不要求直接编码
- `multi-agent-orchestrate` 需要执行 Phase 0 方案头脑风暴

不使用本 skill：

- 用户要求完整开发流程，使用 `multi-agent-orchestrate` 或 `agent-workflow`
- 用户只想问单个 CCB agent，使用 `ccb-bridge`
- 用户明确说“直接做”“不用多模型”“不要头脑风暴”

## 执行骨架

1. 判断使用 CCB 多模型还是本地多角色；CCB 可用且用户要求多模型时，按 `.ccb/ccb.config` 调用计划参与 agent。
2. Round 1 独立发散：各 agent / 角色在不知道其他观点的情况下输出方案、风险、替代路径和验收关注点。
3. Round 2 交叉挑战：把 Round 1 摘要发回各 agent / 角色，要求明确回应支持、反对、补充、待验证。
4. Round 3 共识收敛：围绕关键分歧和候选共识补强，最多 3 轮；仍有方向性分歧时交用户裁决。
5. 输出 `collaboration.md` 的「多模型头脑风暴共识」格式：共识方案、采纳记录、少数意见、未决问题、下一步建议。
6. 若用户确认继续开发，再切换到 `multi-agent-orchestrate` 或 `agent-workflow`，不得在本 skill 内直接进入编码。

## 必守红线

- 这是头脑风暴，不是观点汇总；禁止只收集首轮观点后直接定稿。
- 只有最外层 Orchestrator 可以启动本 skill；子 agent 不得递归启动头脑风暴或完整协作流程。
- 每次派发都必须按 `agent-registry.md` 注入本次执行角色的 `【角色规范】`；不得按 provider、模型或固定 agent 名硬编码。
- CCB 多模型时，agent / provider 只看 `.ccb/ccb.config`；角色语义只看 `agent-registry.md`。
- `inspiration` 可协助或代执行异常角色；代执行时必须按被替代角色注入规范和门禁。
- 单外部 agent 成功返回时，必须说明已降级为“单外部视角 + 本地自检”。
- 不进入代码修改、review 放行或 test 放行；输出方案后等待用户确认下一步。
