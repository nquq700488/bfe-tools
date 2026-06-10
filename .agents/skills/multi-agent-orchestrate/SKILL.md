---
name: multi-agent-orchestrate
description: >
  高复杂任务的 CCB 多模型协作薄编排层。仅在用户明确要求多模型/多角色协作，
  或完整模式且存在高风险、跨模块决策时使用。
  只负责 CCB 多模型特有的调度、通讯和降级，各阶段执行委托给独立 skill。
---

# 多模型协作编排器

> 本 skill 是 `agent-workflow` 的 CCB 多模型增强——只负责 CCB 特有的调度、通讯和降级。
> 设计：`solution-brainstorm` · 编码：`test-driven-development`
> 审查：`code-review` · 反馈：`receiving-code-review` · 调试：`systematic-debug`
> 各阶段执行细节委托给上述独立 skill，本 skill 不重复维护。

## 必读规范

1. `AGENTS.md`
2. `.agents/task-routing.md`
3. `.agents/execution-mode-guidelines.md`
4. `.agents/collaboration.md`
5. `.agents/agent-registry.md`
6. `.ccb/ccb.config`
7. `.agents/orchestrator.md`

---

## 使用边界

✅ 使用：用户明确说"多模型""全链路""一起想方案"；完整模式 + 高风险/跨模块；用户点名多个外部 agent
❌ 不使用：单次问某个 agent（用 `ccb-bridge`）；普通轻量修改；用户说"直接做""不要多模型"

---

## CCB 编排五阶段

> CCB 外部 agent 是远端独立会话，**不能调用本地 skill**。Orchestrator 的职责是：
> 从对应规范/门禁中提取关键文本 → 内联到 prompt → 外部 agent 按这些门禁执行。
> 下表中的 `ccb ask ...` 均为简写；实际执行必须记录每个 `job_id`，并对每个 job 执行 `ccb pend --watch <job_id>` 直到终态。P0 并行提交多个 agent 时，必须收集全部 `job_id` 并逐个监听；除非用户明确要求静默发送，否则不得只 ask 不 watch。

| Phase | CCB 调用 | Orchestrator 向 prompt 注入的门禁（来自规范） |
|-------|---------|------------------------------------------|
| **P0** 头脑风暴 | `ccb ask <所有 agent>` 并行，按 `solution-brainstorm` 模式 B 的三轮协议 | 需求、约束、相关文件；各角色的独立发散 → 交叉挑战 → 共识收敛 prompt |
| **P1** 方案定稿 | 有 P0 → 共识后 `ccb ask planner` 定稿；无 P0 → 直接 `ccb ask planner` 出方案 | Planner 门禁（`agent-registry.md`）：方案目标、影响面、验收标准、风险、非目标、可并行拆分 |
| **P2** 编码 | `ccb ask developer` 实施 | Developer 门禁（`agent-registry.md`）+ TDD 铁律（`testing-guidelines.md`）+ 方案全文 + 文件路径；四态报告（DONE/DONE_WITH_CONCERNS/NEEDS_CONTEXT/BLOCKED） |
| **P3** 审查 | `ccb ask reviewer` | Reviewer 门禁（`quality-checklist.md`「Reviewer 实现质量门禁」）：Stage 1 spec 合规 → Stage 2 代码质量，两阶段顺序强制，功能可用但粗糙必须阻断 |
| **P4** 测试 | `ccb ask tester` | Tester 门禁（`testing-guidelines.md`「Tester 验证质量门禁」）：覆盖矩阵、执行真实性、证据充分性，主路径通过但关键风险未测必须阻断 |
| **P5** 交付 | Orchestrator 汇总 + `commit-helper` + `memory-update` | — |

---

## CCB 通讯最小规则

```bash
# 发送任务 + 等待结果（默认）
ccb ask <agent> <<'EOF'
【身份设定】[按 agent-registry.md CCB 身份注入规则]
【角色规范】[按本次执行角色展开，不能留占位]
……
EOF
ccb pend --watch <job_id>       # 优先传 job_id
ccb pend --watch --timeout 300 <job_id>  # 复杂任务显式超时

# 链式委派（agent 内部需要另一个结果继续）
ccb ask --callback <agent>

# 完成通知（不阻塞当前流程）
ccb ask --notify-sender <agent>
```

- 有文件能力 → 传规范路径；无文件能力 → 内联关键门禁
- `ccb ask` 必须配套监听（`pend --watch` / `--callback` / `--notify-sender`），禁止裸发
- 验证铁律：外部 agent 返回后必须 git diff 或 Read 核实

---

## 降级路径

```text
CCB 不可用 / agent 离线 / 用户要求不用多模型
  → 降级回 agent-workflow（本地多 Agent）
  → 继续按五阶段推进，各阶段仍委托独立 skill
```

详细降级决策树见 `collaboration.md`。

---

## 必守红线

- 不跳过模式判断、注入判断、方案确认。
- 所有 CCB 通讯走 `ccb ask <agent>`，禁止直连外部 AI CLI/API。
- `ccb ask` 后必须记录 `job_id` 并 `ccb pend --watch <job_id>`。
- 每个 prompt 注入 `【身份设定】` + 展开的 `【角色规范】`，禁止占位。
- 子 agent 不得递归编排。
- 各阶段执行委托给独立 skill（code-review、test-driven-development、solution-brainstorm 等），不重复维护门禁正文。
- 反馈委托给 `receiving-code-review`：禁止表演性认同。
- CCB 不可用时降级回 `agent-workflow`。
