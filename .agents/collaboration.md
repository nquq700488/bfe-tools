# 多模型协作规范（Collaboration）

> 本文件只定义**何时引入外部模型，以及如何通过 CCB 协作**。
> 本地做事方法看 `workflow.md`，模式判断看 `execution-mode-guidelines.md`。

---

## 核心原则

项目基线是本地 Agent 框架（Orchestrator + Planner / Developer / Reviewer / Tester）；CCB 多模型只作为按需增强。

- 跨模型通讯统一走 `ccb ask <agent>`；禁止直连外部 AI CLI / API，禁止用全局 skill 绕过 CCB。
- CCB agent / provider 只以 `.ccb/ccb.config` 为准；角色语义只以 `agent-registry.md` 为准。
- 全局 skill 与本文冲突时，以本文为准。
- **禁止 Orchestrator 自修**：reviewer / tester 发现的问题必须路由回 developer / planner 修复。
- **禁止递归编排**：外部 CCB agent 只执行被派发的角色任务，不得在任务内再次启动 `agent-workflow` / `multi-agent-orchestrate` 或组织新的多 Agent 流程。

### 验证铁律（P0）

外部 agent 返回的结论必须独立验证：

```text
禁止声明完成，除非有新的验证证据
```

- ❌ "应该可以了"、"Agent 说通过了"
- ✅ 运行验证命令 → 读取输出 → 确认通过 → 然后声明
- 子 Agent 汇报成功后，Orchestrator 必须 git diff 或 Read 确认改动存在

### 审查反馈规则（反表演性认同）

收到外部 reviewer 反馈后：

- ❌ "你说得太对了！"、"好建议！" — 禁止表演性认同
- ✅ 复述技术需求 → 对照代码库验证 → 评估是否适用 → 然后行动
- 反馈不对：用技术推理反驳；反馈正确：直接修复，代码本身证明你听到了

---

## 术语与选型

| 概念 | 解决的问题 | 典型形式 |
|------|-----------|---------|
| 多 Agent | 任务如何分工 | Planner / Developer / Reviewer / Tester |
| 多模型（CCB） | 某个角色由谁来做 | `ccb ask planner` / `reviewer` / `developer` / `tester` |

- 先判断是否需要多 Agent 分工，再判断是否需要 CCB 多模型增强。
- 简单任务优先本地轻量执行；高风险任务优先在审查和测试环节引入第二视角。
- 只检查并调用本次计划注入的 agent；未计划注入的 agent 离线不阻断流程。
- CCB 不可用时降级到本地 Agent 框架；无子 Agent 能力时由主 Agent 按角色清单自检。
- 用户明确要求多模型协作 / 全链路协作时，至少引入两个外部视角。
- 同一任务只有一个主协作层：已执行 CCB Phase 0 时不再执行本地 Phase 0。

---

## CCB 通讯协议

> 完整命令速查见 [`.ccb/README.md`](../.ccb/README.md)。本节只保留协作场景判断和关键差异。

### Ask / Pend 最小规则

`ccb ask` 是异步邮箱任务，**必须配套监听机制**，不存在"只发 ask"的用法：

| 方式 | 场景 |
|------|------|
| `ccb ask <agent>` + `ccb pend --watch <job_id>` | 默认：提交并等待结果（优先传 job_id） |
| `ccb pend --watch --timeout 300 <job_id>` | 复杂任务，显式设置超时秒数 |
| `ccb ask --callback <agent>` | 链式委派，需要结果回传后继续（仅 Claude/Codex 支持） |
| `ccb ask --notify-sender <agent>` | 完成时发通知，不阻塞当前流程（v7.0.9+，含 Kimi） |
| `ccb ask --silence <agent>` | 仅用户明确说"不用等回复"时 |

**禁止**：发 `ccb ask` 后不监听，导致无法获取结果。

### 等待与观察

- 需要结果驱动下一步 → `ccb pend --watch <job_id>`
- 没有 job_id 时才退回 `ccb pend --watch <agent>`
- `pend`/`watch` 是 weak observer；非终态输出不代表完成，权威链路用 `ccb trace <id>`
- `--notify-sender` 通知通过 `ccb pend --inbox <agent>` 查看，不保证任务已完成

### 信息传递

- 有文件读取能力的 agent → 写明文件路径，agent 自行读取
- 无文件读取能力的 agent → 压缩为文本摘要传递

### 调用模板（最小示例）

所有 `ccb ask` 必须注入 `【身份设定】` + `【角色规范】`（按 agent-registry.md 动态解析）。详细模板见 `agent-registry.md`。

```bash
# 向 planner 提交方案请求
ccb ask planner <<'EOF'
【身份设定】[按 agent-registry.md CCB 身份注入规则]
【角色规范】[按本次执行角色 = Planner 展开]
需求：[需求]  约束：[约束]  相关文件：[路径列表]
请输出：方案摘要、子任务拆解、影响面、验收标准、可并行标注
EOF
ccb pend --watch <job_id>

# 向 reviewer 提交审查请求
ccb ask reviewer <<'EOF'
【身份设定】[按 agent-registry.md CCB 身份注入规则]
【角色规范】[按本次执行角色 = Reviewer 展开]
【已确认方案】[方案摘要 / 验收标准]
【代码改动】[diff 或文件路径列表]
必须读取：.agents/quality-checklist.md、.agents/coding-standards/common.md
请按「Reviewer 实现质量门禁」输出结论：可合入是/否、CRITICAL/HIGH 阻断、MEDIUM/LOW 建议
EOF
ccb pend --watch <job_id>
```

---

## 何时引入外部模型：四档决策

| 模式 | 外部模型介入 | 适用场景 | 相对成本 | 推荐 |
|:----:|:------------:|---------|:-------:|------|
| **A 纯 Agent** | 无 | 日常 bugfix、轻量任务 | **1×** | 默认 |
| **B 方案审查增强** | Phase 1 `reviewer` | 新功能、架构设计 | **1.3×** | 需求模糊时 |
| **C 执行增强** | Phase 2 `developer` + Phase 4 `tester` | 大量编码、复杂测试 | **2.5×** | ≥ 5 个文件时 |
| **D 全链路** | 所有环节 | 探索性任务、实验 | **3×** | 时间充足时 |

### 量化评分（1–5 分）

| 维度 | 1 分 | 5 分 |
|------|------|------|
| 复杂度 | 单文件改动 | 跨模块架构设计 |
| 时间压力 | 无 deadline | 1 小时内必须交付 |
| 创新度 | 纯实现，无新设计 | 全新功能，需求模糊 |
| 测试要求 | 无需测试 | 需覆盖 10+ 边界 |
| 一致性要求 | 独立模块 | 改动核心 store / 数据流 |

### 决策规则

```text
时间压力 ≥ 4 分              → A（纯 Agent，速度第一）
时间压力 ≤ 2 且 创新度 ≥ 4    → B（reviewer 审查方案）
时间压力 ≤ 2 且 复杂度 ≥ 4    → C（developer + tester）
所有维度平均 ≥ 4              → D（全链路，需用户确认）
其他                          → A（默认）
```

### 各 Phase 注入条件

| 环节 | 注入（满足任一） | 跳过（满足任一） |
|------|-----------------|-----------------|
| Phase 1 `reviewer` | 新功能 / 架构调整 / 需求模糊 | 单文件改动 / 未配置 |
| Phase 2 `developer` | ≥ 5 个文件 / 纯实现类 | 涉及核心 store / 未配置 |
| Phase 4 `tester` | ≥ 10 用例 / 边界多 | 改动极小 / 未配置 |

> agent 已配置但离线 → 优先 `ccb` 启动团队；仅单个 pane 异常用 `ccb restart <agent>`，恢复失败才降级。

### 模型选择分层

按任务复杂度分层，用最合适的模型，不总是用最强的：

| 任务类型 | 特征 | 模型层级 |
|---------|------|---------|
| 机械实现 | 1-2 文件、完整 spec、零决策 | 快速/便宜模型 |
| 集成协调 | 多文件、有依赖、需模式匹配 | 标准模型 |
| 设计审查 | 架构决策、代码审查、调试 | 最强可用模型 |

### Inspiration 弹性协作

`inspiration` 默认不参与 B 模式；用户明确要求多模型头脑风暴 / 全链路协作时加入。也可协助其他模型或在 agent 异常时代执行对应角色。代执行时必须把 `【角色规范】` 的"本次执行角色"写为被替代角色，并按被替代角色门禁执行。

---

## 多模型头脑风暴预阶段（Phase 0）

触发条件：

- 用户明确说"多模型头脑风暴""一起想方案""全链路协作"
- 用户点名多个外部 agent
- D 全链路模式

详细执行规则见 `solution-brainstorm` skill。本节只保留协作层特有的规则：

### 参与角色

`ccb.config` 中所有 agent 全部参与，各自角色视角产出：

| Agent | 角色视角 | 产出 |
|-------|---------|------|
| `planner` | 方案设计 | 主方案、任务拆解、影响面、验收标准草案 |
| `inspiration` | 弹性协作 | 替代方案、创新路径、易忽略方向 |
| `developer` | 工程实现 | 技术可行性、实现风险、既有代码约束 |
| `reviewer` | 质量审查 | 风险、反例、遗漏场景 |
| `tester` | 测试视角 | 可测试性、关键边界、回归风险预判 |

### 轮次协议

| 轮次 | 目的 | 输入 | 输出 |
|------|------|------|------|
| Round 1 独立发散 | 防止从众，收集独立判断 | 需求、约束、相关文件 | 各 agent 独立方案 / 风险 |
| Round 2 交叉挑战 | 看到彼此观点并碰撞 | Round 1 摘要矩阵 | 每个 agent 对其他观点的支持/反对/补充/待验证 |
| Round 3 收敛补强 | 消解关键分歧 | Round 2 分歧清单 | 修订建议、保留意见、共识确认 |

Round 3 后仍有分歧 → 输出分歧选项 + 代价 + 默认建议，交用户裁决。

### 执行规则

- 首轮全部并行提交；每轮 prompt 按 agent-registry.md 注入身份和角色规范
- 首轮完成后不得直接定稿；至少进入 1 轮交叉挑战
- agent 未配置 → 降级该视角；已配置离线 → 尝试恢复，失败降级
- Orchestrator 主持记录，不直接消解重大分歧
- 共识后输出：共识方案、采纳记录、少数意见、未决问题、定稿动作
- 仅一个外部 agent 成功返回时，告知用户"已降级为单外部视角 + 本地自检"

---

## 协作流程

决策顺序：先判断是否为开发任务 → 按 `execution-mode-guidelines.md` 判断轻量/完整 → 按本文决定是否注入 CCB。

### 完整模式（CCB 增强）

```text
Phase 0: ccb ask <全量 agent>（仅 D 全链路 / 用户点名多 agent / 头脑风暴）
Phase 1: Planner / ccb ask planner → 方案 → ccb ask reviewer（按需）→ 用户确认
Phase 2: ccb ask developer → 编码实现
Phase 3: ccb ask reviewer → 代码审查
Phase 4: ccb ask tester   → 测试验证
Phase 5: Orchestrator 汇总交付
```

### 审查-修复闭环（P0）

审查和修复必须由不同 agent 完成。

**代码审查（Phase 3）不通过**：

1. Orchestrator 汇总 reviewer 问题列表（不得修改或过滤）
2. Orchestrator 将问题 + 方案 + 改动路径传给 developer
3. developer 修复后重新提交 reviewer 审查
4. 功能可用但存在 HIGH 级实现质量问题 → 仍视为不通过
5. 修复后仍存在同类问题（第 2 轮）→ reviewer 必须给出**具体修复方案**
6. 最多 2 轮；超过 → 交用户决策

**测试验证（Phase 4）不通过**：

1. Orchestrator 汇总 tester 失败用例
2. 路由 developer 修复
3. 验收标准缺失或影响面不完整 → 回传 planner 补齐
4. 最多 2 轮；超过 → 交用户决策

**方案审查（Phase 1）不通过**：

1. Orchestrator 将 reviewer 意见传给 planner
2. planner 修改后回传
3. 涉及接口/数据流/任务拆分 → 必须 planner 定稿，Orchestrator 不得自行修改
4. 最多 2 轮；超过 → 交用户决策

> 闭环内的路由、修复、重审无需用户确认。超 2 轮或方案结构变更时才请求决策。

### 禁止行为

- ❌ Orchestrator 直接修改代码以"修复" reviewer/tester 发现的问题
- ❌ Orchestrator 直接修改方案以"解决" reviewer 的方案审查意见
- ❌ Orchestrator 修改 reviewer/tester 的反馈后传递给 developer
- ❌ 跳过 developer/planner，自修后标记"已解决"

### 轻量模式

- 默认不注入外部模型
- 边界多、回归风险高时，可选 `ccb ask tester`
- 本地执行与验证要求看 `workflow.md` 与 `AGENTS.md`

---

## 降级策略

### 触发条件

**P0 阻断（必须降级）**：

- `command -v ccb` 失败
- 目标 agent 不在 `.ccb/ccb.config` 中
- 用户明确要求"不用多模型，直接做"

**P1 恢复（优先启动，失败才降级）**：

- `ccb ping ccbd` 失败 → 尝试 `ccb`
- `ccb ping <agent>` 失败但已配置 → 尝试 `ccb` 启动团队；单 pane 异常用 `ccb restart <agent>`
- `ccb ask` 提交失败，或 `ccb pend --watch` 长时间无进展
- 模型返回质量明显异常

### 降级对应表

| 环节 | 多模型 | 降级 |
|------|--------|------|
| 方案设计 | `ccb ask planner` | `inspiration` 代执行 / 本地 Planner |
| 方案审查 | `ccb ask reviewer` | `inspiration` 代执行 / Orchestrator 自检 |
| 开发 | `ccb ask developer` | `inspiration` 代执行 / 本地 Developer |
| 代码审查 | `ccb ask reviewer` | `inspiration` 代执行 / Orchestrator 自检 |
| 测试 | `ccb ask tester` | `inspiration` 代执行 / 本地 Tester |

代执行规则：

- 目标 agent 是 `inspiration`，但 `【角色规范】` 写被替代角色
- 被替代的是 reviewer/tester → 按对应门禁阻断或放行，不按发散建议处理
- `inspiration` 也不可用 → 降级到本地角色

### 降级决策流程

```text
准备调用外部模型
  ↓ command -v ccb
CCB 已安装？
  ├─ 否 → 降级本地 Agent 框架
  └─ 是 → 检查 .ccb/ccb.config
目标 agent 已配置？
  ├─ 否 → 降级 + 告知用户
  └─ 是 → ccb ping <agent>
在线？
  ├─ 是 → 正常调用
  └─ 否 → ccb → ccb restart <agent>
      ├─ 成功 → 正常调用
      └─ 失败 → 关键环节？→ inspiration 代执行 / 降级 + 记录 TASK_MEMORY.md
```

降级后必须告知："⚠️ [agent] 因 [原因] 降级为 [替代]，预计影响：[无/可能遗漏边界]"

---

## 使用流程总览

```text
用户提需求
  ↓
Orchestrator 模式判断（execution-mode-guidelines.md）
  ↓
本文量化评分 → A / B / C / D
  ↓
展示注入环节 + 预计耗时 + 降级预案 → 用户确认
  ↓
按模式执行（各 Phase 注入外部 agent 或走本地）
  ↓
Orchestrator 汇总交付
```

---

## 相关文档

- [agent-registry.md](agent-registry.md) — 本地 Agent 角色索引与 CCB 语义
- [orchestrator.md](orchestrator.md) — Orchestrator 调度规范
- [workflow.md](workflow.md) — 本地执行方法
- [execution-mode-guidelines.md](execution-mode-guidelines.md) — 模式判断
- [solution-brainstorm](skills/solution-brainstorm/SKILL.md) — Phase 0 头脑风暴详细规则
- [.ccb/README.md](../.ccb/README.md) — CCB 命令速查
