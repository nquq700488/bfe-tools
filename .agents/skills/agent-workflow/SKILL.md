---
name: agent-workflow
description: >
  多 Agent 协作工作流薄入口。用于复杂开发、复杂修复、代码审查、测试验证等需要
  Plan → Dev → Review → Test → Deliver 阶段治理的任务。详细规则以
  execution-mode-guidelines.md、orchestrator.md、workflow.md、quality-checklist.md 为准。
---

# 多 Agent 协作工作流

> 本 skill 只负责启动本地多 Agent 工作流，不重复维护模式判断、阶段门禁、角色职责或质量清单正文。

## 必读规范

按顺序读取：

1. `AGENTS.md`
2. `.agents/task-routing.md`
3. `.agents/execution-mode-guidelines.md`
4. `.agents/orchestrator.md`
5. `.agents/workflow.md`
6. `.agents/quality-checklist.md`
7. `.agents/agent-registry.md`

按任务补读对应领域规范；需要 CCB 多模型增强时改读 `.agents/collaboration.md` 并切到 `multi-agent-orchestrate`。

## 使用边界

使用本 skill：

- 用户明确要求完整模式、多 Agent 协作、代码审查或测试验证
- 开发任务按 `execution-mode-guidelines.md` 命中完整模式
- 任务需要方案、开发、审查、测试、交付多个阶段治理

不使用本 skill：

- 纯咨询、代码解释、方案讨论但不落地
- 单文件轻改、低风险 bugfix，且满足轻量模式
- 用户明确要求多模型 / CCB 外部 agent 协作，此时使用 `multi-agent-orchestrate` 或 `ccb-bridge`

## 执行骨架

1. 按 `orchestrator.md` 完成入口检查、必要澄清和阶段推进。
2. 按 `execution-mode-guidelines.md` 判断轻量 / 完整模式，并等待必要确认。
3. 完整模式按 Orchestrator Phase 推进：Planner -> Developer -> Reviewer -> Tester -> Deliver。
4. 开发前必须完成正式并行执行分析；未经确认不得进入编码。
5. 派发任何本地角色前，按 `agent-registry.md` 的「动态角色规范解析」注入本次执行角色的规范和门禁。
6. 审查阶段可并行派发 Reviewer 和 Inspiration；Reviewer 是正式质量门禁，Inspiration 提供补充审查、反例和遗漏方向。
7. 测试阶段可并行派发 Tester 和 Inspiration；Tester 是正式验证门禁，Inspiration 提供补充测试视角、边界场景和遗漏风险。
8. 若当前工具不支持真实子 Agent，由主 Agent 按对应角色清单自检执行，并明确标注“本地角色自检”。

## 必守红线

- 不跳过模式判断、方案确认、并行分析、Reviewer / Tester 失败处理。
- 子 Agent 不得递归启动 `agent-workflow` / `multi-agent-orchestrate`，也不得把角色内自检冒充独立阶段。
- 派发给本地角色的 `【角色规范】` 必须包含该角色规范索引 / 路径和必须门禁；不得只写占位。
- Inspiration 可参与审查但不能替代 Reviewer 的正式放行结论；其 HIGH / CRITICAL 发现必须汇总给 Reviewer 或路由 Developer 修复。
- Inspiration 可参与测试但不能替代 Tester 的正式验证结论；其 HIGH / CRITICAL 发现必须汇总给 Tester 或路由 Developer 修复。
- 已执行 CCB 多模型 Phase 0 时，不再执行本地多角色 Phase 0；降级到本地时，只由最外层 Orchestrator 执行一次本地 Phase 0。
- 不把 CCB 多模型调用规则写进本 skill；详细规则只维护在 `collaboration.md`。
- 不跳过 lint、typecheck、必要测试或使用 `--no-verify` 绕过检查。
