---
name: agent-workflow
description: >
  多 Agent 协作工作流薄编排层。用于复杂开发、复杂修复等需要
  Plan → Dev → Review → Test → Deliver 阶段治理的任务。
  只负责阶段串联和角色调度，各阶段的执行细节委托给独立 skill。
---

# 多 Agent 协作工作流

> 本 skill 是**编排层**——负责阶段串联和角色调度。
> 设计：`solution-brainstorm` · 编码：`test-driven-development`
> 审查：`code-review` · 反馈：`receiving-code-review` · 调试：`systematic-debug`

## 必读规范

1. `AGENTS.md`
2. `.agents/task-routing.md`
3. `.agents/execution-mode-guidelines.md`
4. `.agents/orchestrator.md`
5. `.agents/agent-registry.md`

按阶段补读：开发 → `workflow.md` + `coding-standards.md`；审查 → `quality-checklist.md`；测试 → `testing-guidelines.md`。需要 CCB 时切到 `multi-agent-orchestrate`。

## 使用边界

✅ 使用：完整模式任务、多 Agent 协作、Plan→Dev→Review→Test→Deliver 阶段治理
❌ 不使用：纯咨询、轻量修改、单次审查（用 `code-review`）、单次调试（用 `systematic-debug`）、外部模型协作（用 `multi-agent-orchestrate`）

---

## 五阶段编排

| Phase | 角色 | 委托 Skill | 产出 |
|-------|------|-----------|------|
| **P0** 头脑风暴 | Orchestrator | `solution-brainstorm`（完整模式执行模式 A；用户要求多模型时执行模式 B） | 设计确认 + Spec 文档 |
| **P1** 规划 | Planner | — | 方案、子任务、验收标准、影响面 |
| **P2** 开发 | Developer | `test-driven-development` | 改动文件、lint/typecheck 结果 |
| **P3** 审查 | Reviewer | `code-review`（两阶段：spec→quality） | 审查结论 |
| **P4** 测试 | Tester | `testing-guidelines.md` 门禁 | 测试报告 |
| **P5** 交付 | Orchestrator | 按需 `commit-helper` → `memory-update` | 交付说明 + 按需提交 + 记忆落盘 |

---

## 编排规则

### 派发协议

每次派发本地角色按 `agent-registry.md`「本地 Agent 派发协议」注入：
- 角色身份 + 输入上下文（方案全文、相关文件路径）
- 必读规范索引 + 必须门禁
- 产出格式 + 阻断条件
- **禁止递归编排**

### 子 Agent 上下文隔离

不传递会话历史，只传精确构建的输入。不让子 Agent 自行读取方案文件推导意图。

### 连续执行

已确认方案不暂停。只在 BLOCKED、不可解决的模糊点或全部完成时才中断。进度用一句话 + emoji 同步。

### 并行派发

- Planner 标注的可并行子任务 → 同时派发多个 Developer
- 审查阶段：Reviewer（正式门禁）+ Inspiration（补充视角）可并行；Inspiration 不替代正式结论
- 测试阶段：Tester（正式门禁）+ Inspiration（补充视角）可并行

### 实施者四态

| 状态 | 处理 |
|------|------|
| `DONE` | 进入下一阶段 |
| `DONE_WITH_CONCERNS` | 涉及正确性→解决后继续；仅备注→记录后继续 |
| `NEEDS_CONTEXT` | 补充上下文重新派发 |
| `BLOCKED` | 缺上下文补、需更强推理换模型、任务太大拆、方案有误上报 |

---

## 必守红线

- 不跳过模式判断、方案确认、并行分析。
- 子 Agent 不得递归启动 `agent-workflow` / `multi-agent-orchestrate`。
- 审查委托给 `code-review`：两阶段顺序强制，不可颠倒。
- 反馈委托给 `receiving-code-review`：禁止表演性认同。
- 不信任子 Agent 汇报：用 git diff/Read 复核真实变更。
- 已执行 CCB Phase 0 时不再执行本地 Phase 0。
- 不跳过 lint、typecheck、必要测试，禁止 `--no-verify`。
