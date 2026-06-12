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

---

## 执行卡片

必须：
- 完成任务路由和模式判断
- 完整模式先产出并确认 `.changes/{feature}/` 四文档
- P1 校验 `tasks.md` 后再进入开发
- P2 按 `tasks.md` 逐项执行并更新状态
- P3 使用 `code-review` 两阶段审查

禁止：
- 缺少 `tasks.md` 时进入实现
- 子 Agent 递归启动编排 skill
- 跳过验证或用子 Agent 汇报替代复核

输出：
- 开始时输出 `【任务路由】`
- 交付时输出 `【交付检查】`

---

## 必读规范

1. `AGENTS.md`
2. `.agents/task-routing.md`
3. `.agents/execution-mode-guidelines.md`
4. `.agents/orchestrator.md`
5. `.agents/agent-registry.md`

按阶段补读：开发 → `workflow.md` + `coding-standards/common.md` + `contexts/development.md`；审查 → `quality-checklist.md` + `contexts/review.md`；测试 → `testing-guidelines.md`；调试 → `contexts/debug.md`。需要 CCB 时切到 `multi-agent-orchestrate`。

---

## 使用边界

✅ 使用：完整模式任务、多 Agent 协作、Plan→Dev→Review→Test→Deliver 阶段治理
❌ 不使用：纯咨询、轻量修改、单次审查（用 `code-review`）、单次调试（用 `systematic-debug`）、外部模型协作（用 `multi-agent-orchestrate`）

---

## 五阶段编排

| Phase | 角色 | 委托 Skill | 产出 |
|-------|------|-----------|------|
| **P0** 头脑风暴 | Orchestrator | `solution-brainstorm`（完整模式执行模式 A；用户要求多模型时执行模式 B） | 设计确认 + `.changes/{feature}/` 四文档（proposal + specs + design + tasks） |
| **P1** 规划校验 | Planner | — | 校验 P0 产出的 tasks.md 可执行性；补充实现细节、文件级影响面、潜在风险标注；**不重新生成方案** |
| **P2** 开发 | Developer | `test-driven-development` | 改动文件、lint/typecheck 结果 |
| **P3** 审查 | Reviewer | `code-review`（两阶段：spec→quality） | 审查结论 |
| **P4** 测试 | Tester | `testing-guidelines.md` 门禁 | 测试报告 |
| **P5** 交付 | Orchestrator | 按需 `commit-helper` → `memory-update` → 持续学习回顾 | 交付说明 + 按需提交 + 记忆落盘 + 模式回顾 |

---

## 编排规则

### Phase 0 → Phase 1 切换：上下文卫生

从设计阶段进入实现阶段前，执行上下文清理：

1. **确认 `.changes/{feature}/tasks.md` 已就绪** — P1 Planner 将基于此校验可执行性；缺失时阻断，不进入实现
2. **建议清理上下文窗口** — 长设计对话后，告知用户：
   > "设计阶段已完成，建议清理上下文窗口以保持实现阶段上下文清洁。关键信息已落盘到 `.changes/{feature}/` 和 `TASK_MEMORY.md`。"
3. **重新读取核心文件** — 进入 Phase 1 前重新读取 `AGENTS.md`、`workflow.md`、`.changes/{feature}/tasks.md`

### Phase 1 → Phase 2 切换：上下文注入

进入开发阶段前，必须：
1. 在派发 Developer 的 prompt 中注入 `contexts/development.md` 的核心约束
2. 在派发协议中要求 Developer 以 `contexts/development.md` 的执行节奏工作

### Phase 2 → Phase 3 切换：审查上下文注入

进入审查阶段前，必须：
1. 在派发 Reviewer 的 prompt 中注入 `contexts/review.md` 的两阶段审查约定
2. 确认 Reviewer 已知悉 Stage 1→Stage 2 顺序强制

### 调试/调研场景

- 开发中遇到 bug → 注入 `contexts/debug.md` 四阶段系统化调试纪律
- 技术选型/方案调研 → 注入 `contexts/research.md` 多方案对比要求

### Phase 2 开发：按任务清单逐项执行

Developer 按 `.changes/{feature}/tasks.md` 中的子任务清单逐项执行：

**执行节奏**：

```text
任务 1.1：[描述]
  → 读取相关文件
  → 实现代码
  → 验证（lint / typecheck / 测试）
  ✅ 完成

任务 1.2：[描述]
  → ...
  ✅ 完成
```

**进度输出格式**：
每完成一个任务，输出一行进度：
```text
✅ 1.1 Add theme context provider
⏳ 1.2 Create toggle component  ← 当前进行中
❌ 2.1 Add CSS variables
❌ 2.2 Wire up localStorage
```

全部任务完成后，更新 `.changes/{feature}/tasks.md` 中的所有状态为 ✅。

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
- **开发阶段按 tasks.md 逐项执行**：不得跳过清单中的任务，不得添加清单外的功能。
- **Phase 5 交付前执行模式回顾**：按 `hooks/session-end.md`「重复模式回顾」检查，为持续学习收集信号。
