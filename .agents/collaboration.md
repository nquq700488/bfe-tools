# 多模型协作规范（Collaboration）

> 本文件只定义**何时引入外部模型，以及如何通过 CCB 协作**。
> 本地做事方法看 `workflow.md`，模式判断看 `execution-mode-guidelines.md`。

---

## 核心原则

项目基线是本地 Agent 框架（Orchestrator + Planner / Developer / Reviewer / Tester）；CCB 多模型只作为按需增强。

- 跨模型通讯统一走 `ccb ask <agent>`；禁止直连外部 AI CLI / API，禁止用全局 skill 绕过 CCB。
- CCB agent / provider 只以 `.ccb/ccb.config` 为准；角色语义只以 [agent-registry.md](agent-registry.md) 为准。
- 全局 skill 与本文冲突时，以本文为准。
- **禁止 Orchestrator 自修**：reviewer / tester 发现的问题必须路由回 developer / planner 修复。
- **禁止递归编排**：外部 CCB agent 只执行被派发的角色任务，不得在任务内再次启动 `agent-workflow` / `multi-agent-orchestrate` 或组织新的多 Agent 流程。

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
- 用户明确要求多模型协作 / 全链路协作 / 多模型头脑风暴时，至少引入两个外部视角，不能只调用单一 `planner` 或 `reviewer`。
- 同一任务只能有一个主协作层：已执行 CCB 多模型 Phase 0 时，不再执行本地多角色 Phase 0；CCB Phase 0 降级失败后，才由最外层 Orchestrator 执行本地 Phase 0。

---

## 可用 Agent

本文只描述协作流程，不维护 provider 映射表。可用 agent 看 `.ccb/ccb.config`；角色语义看 [agent-registry.md](agent-registry.md)。

---

> CCB 命令速查（按场景索引）见 [`.ccb/README.md`](../.ccb/README.md)。本文只保留协作场景判断和关键差异说明，具体命令用法以该文档为准。

## Ask / Pend / Callback 选择

**强制约束：`ccb ask` 必须与监听机制配套使用。**

`ccb ask` 是异步邮箱任务，单独发送无法及时获取结果。**不存在"只发 ask"的用法**，使用 `ccb ask` 时必须选择以下配套方式之一：

| 方式 | 适用场景 |
|------|---------|
| `ccb ask --callback <agent>` | 链式委派，需要结果回传后继续处理 |
| `ccb ask --notify-sender <agent>` | 任务完成后通知到发件箱，不阻塞当前流程 |
| `ccb pend --watch <job_id>` | 发任务后主动流式监听直到完成 |
| `ccb pend --watch --timeout <秒> <job_id>` | 按任务预期耗时显式设置监听超时 |
| `ccb ask <agent>` + `ccb pend --watch <job_id>` | 显式提交后监听，优先传 job_id |

**禁止**：只发 `ccb ask` 不带任何监听机制，导致无法获取或及时获取结果。

---

**默认：提交任务并等待结果**。用户说"让 reviewer 看看"、"问 planner 怎么设计"——这些都是**期望收到回复**的。

```bash
ccb ask <agent> <<'EOF'
<请求内容>
EOF

# 从 ask 输出中取 job_id，优先按 job 观察，避免混入同一 agent 的其他任务
ccb pend --watch <job_id>

# 复杂任务或默认超时不合适时，显式设置等待时间
ccb pend --watch --timeout 300 <job_id>
```

**链式委派**：当当前 Agent 正在处理 CCB 任务，且需要另一个 Agent 的结果才能继续时，必须使用 `--callback`：

```bash
ccb ask --callback <agent> <<'EOF'
<请求内容>
EOF
```

> **Provider 兼容性注意**：`--callback` 创建 continuation job，要求 parent Agent 有活跃的 provider session 来接收回传。Claude / Codex 支持；**Kimi pane-log 模式不支持持续 watch**，可能无法接收回传。

**任务完成通知**（v7.0.9+）：当 Skill 或 Agent 向其他 Agent 发送异步任务后，需要在任务完成时收到通知（无论成功、失败或取消），且不依赖 provider watch 机制时，使用 `--notify-sender`：

```bash
ccb ask --notify-sender <agent> <<'EOF'
<请求内容>
EOF
```

> 与 `--callback` 的区别：`--notify-sender` 仅在任务完成时向 sender inbox 发送一条系统 notice，**不创建 continuation job**，适合所有 provider（包括 Kimi）。两者可以独立使用，也可以组合使用。通知优先通过 `ccb pend --inbox <agent>` 查看。

**静默委派**（仅用户明确说"不用等回复"、"先发过去"、"异步通知一下"时用）：

```bash
ccb ask --silence <agent> <<'EOF'
<请求内容>
EOF
```

> CCB 的 `ask` 是异步邮箱任务；需要结果驱动下一步时优先用 `ccb pend --watch <job_id>` 观察该任务终态；默认 watch 超时来自 `CCB_WATCH_TIMEOUT_S` 或 CCB 默认值，任务耗时可预期时应显式加 `--timeout <秒>`；没有 job id 时才退回 `ccb pend --watch <agent>`。
> `pend` / `watch` 是 weak observer / diagnostics surface；非终态输出不代表完成，需要权威链路时用 `ccb trace <id>`。
> 向无文件能力的 agent 传递内容时，用 heredoc（`<<'EOF'`）避免 shell 转义问题。

### 等待与观察

按任务需要选择观察方式。完整命令速查见 [`.ccb/README.md`](../.ccb/README.md)，本节只保留关键判断原则：

- 需要**结果驱动下一步**时：优先 `ccb pend --watch <job_id>`；预期耗时较长、较短或默认等待不合适时用 `ccb pend --watch --timeout <秒> <job_id>`；没有 `job_id` 时才退回 `ccb pend --watch <agent>` 或按当前 CCB target 语法使用 `ccb wait-*`
- `pend` / `watch` 是 weak observer / diagnostics surface；**非终态输出不代表完成**，需要权威链路时用 `ccb trace <id>`
- `--notify-sender` 的通知通过 `ccb pend --inbox <agent>` 查看，不保证任务已完成

---

## 调用示例

所有示例中的 `ccb ask <agent>` 都必须按 [agent-registry.md](agent-registry.md) 注入身份设定和 `【角色规范】`。角色规范按**本次执行角色**解析，不按 provider、模型或固定 agent 名硬编码；若 agent 临时承担其他角色，必须注入临时执行角色的规范和门禁。示例中的 `[按 ... 注入]` 是文档占位，实际发送前必须替换为该角色的规范索引 / 路径和必须门禁；无文件读取能力时内联关键门禁。示例里的 `<job_id>` 来自 `ccb ask` 输出中的 `accepted job=...`。

```bash
# 让 planner 出方案
ccb ask planner <<'EOF'
【身份设定】
你是资深技术方案架构师 / 资深产品技术设计顾问，本次以[任务领域]专家身份工作。
请按该领域的资深工程标准判断，不只完成表面角色动作。

【本次专业关注点】
- 需求边界
- 技术路径
- 影响面和验收标准

【角色规范】
本次执行角色：Planner
[按 .agents/agent-registry.md「动态角色规范解析」注入 Planner 的必读规范、必须门禁和禁止递归编排要求]

基于以下需求输出方案：[需求] [约束] [相关文件]
要求：
1. 先头脑风暴（3-5 个澄清问题）
2. 输出方案摘要、子任务拆解、影响面地图、验收标准
3. 标注可并行的子任务
EOF
ccb pend --watch <job_id>

# 让 reviewer 审查方案
ccb ask reviewer <<'EOF'
【身份设定】
你是资深代码审查专家 / 架构质量审查专家，本次以[任务领域]专家身份工作。
请按该领域的资深工程标准判断，不只完成表面角色动作。

【本次专业关注点】
- 遗漏场景
- 技术风险
- 边界条件和可维护性

【角色规范】
本次执行角色：Reviewer
[按 .agents/agent-registry.md「动态角色规范解析」注入 Reviewer 的必读规范、必须门禁和禁止递归编排要求]

请审查以下方案，重点关注遗漏场景和风险：
[方案摘要] [影响面] [验收标准]
EOF
ccb pend --watch <job_id>

# 让 developer 编码
ccb ask developer <<'EOF'
【身份设定】
你是资深任务领域工程师 / 高质量实现与调试专家，本次以[任务领域]专家身份工作。
请按该领域的资深工程标准判断，不只完成表面角色动作。

【本次专业关注点】
- 既有代码模式一致性
- 实现质量和可维护性
- 必要验证和回归风险

【角色规范】
本次执行角色：Developer
[按 .agents/agent-registry.md「动态角色规范解析」注入 Developer 的必读规范、必须门禁和禁止递归编排要求]

请按以下方案实现：
[方案详情] [规范文件路径] [需读取的文件]
EOF
ccb pend --watch <job_id>

# 让 reviewer 审查代码
ccb ask reviewer <<'EOF'
【身份设定】
你是资深代码审查专家 / 架构质量审查专家，本次以[任务领域]专家身份工作。
请按该领域的资深工程标准判断，不只完成表面角色动作。

【本次专业关注点】
- 缺陷和回归风险
- 规范一致性
- 实现质量和可维护性
- 既有项目模式一致性

【角色规范】
本次执行角色：Reviewer
[按 .agents/agent-registry.md「动态角色规范解析」注入 Reviewer 的必读规范、必须门禁和禁止递归编排要求]

请审查以下代码改动。功能实现只是最低要求；即使功能可用，也必须检查实现方式是否粗糙、是否破坏既有模式、是否难维护。

【已确认方案】
[方案摘要 / 验收标准]

【代码改动】
[diff 或文件路径列表]

【必须读取的规范】
- .agents/quality-checklist.md
- .agents/coding-standards.md
- [按任务补充]

请按 .agents/quality-checklist.md 的「Reviewer 实现质量门禁」输出结论，明确：
- 可合入：是 / 否
- CRITICAL / HIGH 阻断问题
- MEDIUM / LOW 非阻断建议
- 已检查但未发现问题的维度
- 剩余风险
EOF
ccb pend --watch <job_id>

# 让 tester 验证边界
ccb ask tester <<'EOF'
【身份设定】
你是资深测试工程师 / 质量保障与回归风险专家，本次以[任务领域]专家身份工作。
请按该领域的资深工程标准判断，不只完成表面角色动作。

【本次专业关注点】
- 验收标准覆盖
- 边界场景
- 回归风险和可复现验证
- 验证证据和未测风险

【角色规范】
本次执行角色：Tester
[按 .agents/agent-registry.md「动态角色规范解析」注入 Tester 的必读规范、必须门禁和禁止递归编排要求]

请验证以下改动。功能看起来能跑只是最低要求；即使主路径通过，也必须检查验收覆盖是否完整、验证是否真实执行、证据是否足以支撑结论。

【验收标准】
[验收标准]

【影响面】
[影响面]

【改动文件】
[改动文件列表]

【测试命令 / 手动验证入口】
[测试命令、页面路径、操作入口；没有则说明]

【必须读取的规范】
- .agents/testing-guidelines.md

请按 .agents/testing-guidelines.md 的「Tester 验证质量门禁」输出结论，明确：
- 可通过：是 / 否
- 覆盖矩阵
- CRITICAL / HIGH 阻断问题
- MEDIUM / LOW 非阻断建议
- 未验证 / 无法验证项
- 已执行命令 / 手动步骤
- 剩余风险
EOF
ccb pend --watch <job_id>

```

---

## 何时引入外部模型：四档决策

| 模式 | 外部模型介入 | 适用场景 | 相对成本 | 推荐 |
|:----:|:------------:|---------|:-------:|------|
| **A 纯 Agent** | 无 | 日常 bugfix、轻量任务 | **1×** | 默认 |
| **B 方案审查增强** | Phase 1 `reviewer` | 新功能、架构设计（方向比速度重要） | **1.3×** | 需求模糊时 |
| **C 执行增强** | Phase 2 `developer` + Phase 4 `tester` | 大量编码、复杂测试（体力活外包） | **2.5×** | ≥ 5 个文件时 |
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
| Phase 1 `reviewer` 审查方案 | 新功能 / 架构调整 / 需求模糊 / 历史有返工 | 单文件改动 / reviewer 未在 `ccb.config` 中配置 |
| Phase 2 `developer` 编码 | ≥ 5 个文件 / 纯实现类 / Orchestrator 疲劳 | 涉及核心 store / developer 未在 `ccb.config` 中配置 |
| Phase 4 `tester` 测试 | ≥ 10 用例 / 边界多 / 回归风险高 | 改动极小 / tester 未在 `ccb.config` 中配置 |

> agent 已配置但 `ccb ping` 离线不属于跳过条件 — 应优先执行 `ccb` 启动团队；仅单个 pane 异常时使用 `ccb restart <agent>`，恢复失败才降级（见降级决策流程）。

### Inspiration 弹性协作

`inspiration` 不是 B 模式默认参与者；默认在创新度高、方案方向不确定且用户确认需要发散视角时加入。用户明确要求多模型头脑风暴 / 一起想方案 / 全链路协作时，视为已确认。

`inspiration` 也可以协助其他模型，或在 `planner` / `developer` / `reviewer` / `tester` 异常时临时代执行对应角色。代执行时必须把 `【角色规范】` 的“本次执行角色”写成被替代角色，并按该角色的规范和门禁执行；采纳后若改变接口、数据流、任务拆分、文件影响面或技术路径，仍必须回传 Planner 定稿。

### 多模型头脑风暴预阶段

满足以下任一条件时，在正式方案定稿前增加 Phase 0：

- 用户明确说“多模型头脑风暴”“一起想方案”“多模型协作”“全链路协作”
- 用户点名 `planner` + `reviewer` / `inspiration` 等多个外部 agent
- D 全链路模式

目标：Phase 0 不是把多个模型的独立方案简单汇总，而是让各 agent 先独立提出观点，再看到彼此观点并相互挑战、补充，最后收敛为共识方案。

默认参与：`ccb.config` 中所有 AI agent 全部参与，并从各自角色视角产出：

| Agent | 角色视角 | 产出 |
|-------|---------|------|
| `planner` | 方案设计 | 主方案、任务拆解、影响面、验收标准草案 |
| `inspiration` | 弹性协作 | 替代方案、创新路径、容易被忽略的方向；必要时协助或代执行其他角色 |
| `developer` | 工程实现 | 技术可行性评估、实现风险、既有代码约束、工期预估 |
| `reviewer` | 质量审查 | 风险、反例、遗漏场景、约束冲突 |
| `tester` | 测试视角 | 可测试性评估、关键边界场景、回归风险预判 |

执行规则：

- 读取 `.ccb/ccb.config` 获取当前项目已配置的 AI agent 列表，首轮必须**全部并行提交**
- 每一轮 `ccb ask` 都必须在任务正文前注入 `【身份设定】` 与 `【角色规范】`，角色规范按 `.agents/agent-registry.md` 的「动态角色规范解析」由本次执行角色决定
- 记录每次 `ccb ask` 返回的 `job_id`，优先分别 `ccb pend --watch <job_id>`；复杂任务按预期耗时加 `--timeout <秒>`；只有明确符合当前 CCB target 语法时才使用 `ccb wait-*`
- 若某个 agent **未在 `ccb.config` 中配置**，只降级该视角；其余视角继续参与
- 若某个 agent **已配置但 `ccb ping` 离线**，优先尝试 `ccb` 启动团队；仅单个 pane 异常时使用 `ccb restart <agent>`，恢复失败才降级该视角
- 首轮完成后不得直接定稿；必须进入交叉挑战轮，让成功返回的 agent 看到其他 agent 的摘要观点
- 交叉挑战轮至少 1 轮，最多 3 轮；当连续一轮没有新增高价值分歧、阻断风险或可采纳补充时停止
- 每轮中每个 agent 必须明确回应其他观点：`支持 / 反对 / 补充 / 待验证`，并给出理由
- Orchestrator 每轮结束后只做主持和记录，不直接消解重大分歧；重大分歧必须在下一轮回传给相关 agent 或交用户裁决
- 达成共识后必须输出共识方案、少数意见、未决问题和采纳记录，再进入 Planner 定稿
- 若最终只成功调用到一个外部 agent，必须告知用户”多模型头脑风暴已降级为单外部视角 + 本地自检”

#### Phase 0 轮次协议

| 轮次 | 目的 | 输入 | 输出 |
|------|------|------|------|
| Round 1 独立发散 | 防止从众，收集不同角色的原始判断 | 需求、约束、相关文件 | 各 agent 的独立方案 / 风险 / 替代路径 / 验收关注点 |
| Round 2 交叉挑战 | 让各 agent 看到彼此观点并碰撞 | Round 1 摘要矩阵 | 每个 agent 对其他观点的支持、反对、补充、待验证项 |
| Round 3 收敛补强 | 消解关键分歧，形成可执行共识 | Round 2 分歧清单和候选共识 | 修订建议、保留意见、共识确认 |

Round 3 之后仍存在方向性分歧时，不继续无限循环；Orchestrator 输出分歧选项、各自代价和建议默认项，交用户确认。

#### 交叉挑战输入格式

```md
【身份设定】
[按 agent-registry.md 注入]

【角色规范】
[按本次执行角色注入]

【上一轮观点摘要】
- planner：[主张 / 关键理由 / 风险]
- inspiration：[主张 / 关键理由 / 风险]
- developer：[主张 / 关键理由 / 风险]
- reviewer：[主张 / 关键理由 / 风险]
- tester：[主张 / 关键理由 / 风险]

【请你回应】
1. 你支持哪些观点？为什么？
2. 你反对哪些观点？为什么？
3. 哪些遗漏点会改变方案？
4. 哪些风险必须在定稿前解决？
5. 你对共识方案的修订建议是什么？

请按以下格式输出：
- 支持：
- 反对：
- 补充：
- 待验证：
- 共识建议：
```

#### 共识输出格式

```md
## 多模型头脑风暴共识

### 共识方案
- [最终建议的目标、范围、技术路径、任务拆解、验收标准]

### 采纳记录
| 来源 | 观点 | 裁决 | 理由 |
|------|------|------|------|
| planner / inspiration / developer / reviewer / tester | | 采纳 / 部分采纳 / 不采纳 | |

### 少数意见
- [未采纳但值得保留的观点、适用条件、风险]

### 未决问题
- [需要用户确认或后续验证的问题；没有则写“无”]

### 定稿动作
回传 planner 定稿 / 本地 Planner 定稿 / 需要用户确认
```

### 按需状态检查

进入注入环节前先执行 `command -v ccb`；失败则跳过所有 CCB 注入并降级。CCB 可用时，只检查计划调用的 agent：

| 模式 / 条件 | 必查 agent |
|-------------|------------|
| B 方案审查增强 | `reviewer` |
| C 执行增强 | `developer`、`tester` |
| D 全链路 | 所有计划注入的 agent |
| 用户指定 agent | 用户指定的 agent |

**判断规则**：

- 目标 agent **未在 `ccb.config` 中配置** → 全局无该 agent，必须降级（P0 阻断）
- 目标 agent **已配置但 `ccb ping` 离线** → 优先尝试 `ccb` 启动团队；仅单个 pane 异常时使用 `ccb restart <agent>`，恢复失败才降级（P1 恢复）
- 若降级预案包含 `inspiration` 代执行，`inspiration` 也视为计划调用 agent，必须一并检查
- 未计划注入的 agent 离线不阻断
- `ccb doctor ps` / `ccb ps` 只用于诊断，不作为在线判断唯一依据

---

## 协作流程

决策顺序：先判断是否为开发任务，再按 `execution-mode-guidelines.md` 判断轻量 / 完整，最后决定是否注入 CCB。

### 完整模式

```text
Phase 0: ccb ask <全量 AI agent>（仅多模型头脑风暴 / D 全链路 / 用户点名多 agent 时）
Phase 1: Planner / ccb ask planner → 方案 → ccb ask reviewer（按需）→ 用户确认
Phase 2: ccb ask developer → 编码实现
Phase 3: ccb ask reviewer → 代码审查
Phase 4: ccb ask tester   → 测试验证
Phase 5: Orchestrator 汇总交付
```

### 审查-修复闭环（强制，P0）

审查和修复必须由不同 agent 完成，确保独立审查 + 独立修复。

**代码审查（Phase 3）不通过**：

1. Orchestrator 汇总 reviewer 的问题列表（不得修改或过滤）
2. Orchestrator 将问题列表 + 原始方案 + 改动文件路径传递给 developer：`ccb ask developer`
3. developer 修改代码并报告改动
4. Orchestrator 验证改动文件无误后，重新提交 reviewer 审查
5. 功能可用但存在 HIGH 级实现质量问题时，仍视为审查不通过，必须路由 developer 修复
6. 若修复后**仍存在同类问题**（第 2 轮审查），reviewer 必须给出**具体修复方案**，不得只描述问题：
   - 页面样式问题 → 给出具体的 CSS/组件结构调整方案
   - 功能逻辑问题 → 给出具体的代码修改建议或伪代码
   - 拆分/架构问题 → 给出具体的重构方向
7. 最多循环 2 次；超过 2 次 → 交用户决策

**测试验证（Phase 4）不通过**：

1. Orchestrator 汇总 tester 的失败用例和错误信息
2. Orchestrator 将失败用例传递给 developer：`ccb ask developer` + 测试报告
3. developer 修复后，Orchestrator 重新提交 tester 验证
4. 主路径通过但存在 HIGH 级覆盖缺口、无证据验证或关键未测风险时，仍视为测试不通过
5. 如果失败原因是验收标准缺失或影响面不完整，必须回传 planner 补齐后再测试
6. 最多循环 2 次；超过 2 次 → 交用户决策

**方案审查（Phase 1）不通过**：

1. Orchestrator 将 reviewer 的方案审查意见传递给 planner
2. planner 修改方案后回传
3. 方案变更涉及接口、数据流、任务拆分或技术路径时，必须 planner 定稿；Orchestrator 不得自行修改
4. 最多循环 2 次；超过 2 次 → 交用户决策

> 审查-修复闭环内的路由、修复、重新审查均为流程内标准动作，**无需用户确认**，Orchestrator 直接执行并同步告知进展。仅在超过 2 次循环或方案变更涉及接口/数据流/任务拆分时才请求用户决策。

**禁止行为**（违反即破坏多模型协作）：

- ❌ Orchestrator 直接修改代码以"修复" reviewer 发现的问题
- ❌ Orchestrator 直接修改代码以"通过" tester 的失败用例
- ❌ Orchestrator 直接修改方案以"解决" reviewer 的方案审查意见
- ❌ Orchestrator 修改 reviewer/tester 的反馈内容后再传递给 developer
- ❌ 跳过 developer/planner，自修后标记为"已解决"并继续流程

### 方案审查与定稿

- 外部 agent 只提供审查意见、替代建议和风险提示
- Orchestrator 负责汇总、裁决和回传，**不直接替 Planner 输出实质实现方案**
- 当 reviewer 提出方案问题时，Orchestrator 必须将问题路由回 planner 修改（见上方「审查-修复闭环」）；不得自行修改方案后标记为"已解决"
- 只补充边界、验收标准、风险说明，且不改变实现结构时，Orchestrator 可更新方案摘要并说明原因
- 改变接口、数据流、任务拆分、文件影响面或技术路径时，**必须回传 Planner 定稿**，Orchestrator 不得自行修改

### 信息传递原则

1. 无文件访问能力的 agent → **将上下文压缩为文本摘要**后传递，不可传文件路径
2. 有文件访问能力的 agent（Claude / Codex / Kimi 驱动的）→ 在消息中**写明文件路径**（如 `请审查 src/utils/xxx.ts`），agent 会自行读取
3. Orchestrator 是信息枢纽，负责在各 agent 间传递关键信息

---

### 轻量模式

- 默认不注入外部模型
- 边界多、回归风险高时，可选 `ccb ask tester`
- 轻量模式的本地执行与验证要求看 `workflow.md` 与 `AGENTS.md`

---

## 降级策略

### 触发条件

**P0 阻断（必须降级）**：

- `command -v ccb` 失败，说明 CCB 未安装或不在 `PATH`
- 目标 agent **不在 `.ccb/ccb.config` 中配置**（全局无该 agent，只能降级）
- 用户明确要求"不用多模型，直接做"

**P1 恢复（优先尝试启动，失败才降级）**：

- `ccb ping ccbd` 失败（CCB 守护进程未运行，尝试 `ccb`）
- `ccb ping <agent>` 失败但 agent **已在 `.ccb/ccb.config` 中配置**（agent 已注册但未启动，尝试 `ccb` 启动团队；仅单个 pane 异常时使用 `ccb restart <agent>`）
- `ccb ask` 提交失败，或 `ccb pend --watch <job_id>` / `ccb pend --watch --timeout <秒> <job_id>` 长时间无进展
- 模型返回质量明显异常

### 降级对应表

| 环节 | 多模型 | 降级 |
|------|--------|------|
| 方案设计 | `ccb ask planner` | `inspiration` 代执行 Planner / 本地 Planner 角色 |
| 方案审查 | `ccb ask reviewer` | `inspiration` 代执行 Reviewer / Orchestrator 自检 |
| 弹性协作 | `ccb ask inspiration` | 跳过发散视角、由 Orchestrator 补充备选方案，或按被替代角色规范代执行 |
| 开发 | `ccb ask developer` | `inspiration` 代执行 Developer / 本地 Developer 角色 |
| 代码审查 | `ccb ask reviewer` | `inspiration` 代执行 Reviewer / Orchestrator 自检 |
| 测试 | `ccb ask tester` | `inspiration` 代执行 Tester / 本地 Tester 角色 |

备用执行规则：

- 目标 agent 离线、超时或质量异常时，若 `inspiration` 已配置且可用，可先让 `inspiration` 代执行该角色，再决定是否降级到本地
- 代执行 prompt 的目标 agent 是 `inspiration`，但 `【角色规范】` 的“本次执行角色”必须写被替代角色
- 若被替代的是 reviewer / tester，`inspiration` 的结论必须按 Reviewer / Tester 门禁阻断或放行，不能按发散建议处理
- 若 `inspiration` 也不可用或不适合该任务，再按本地角色降级

### 降级决策流程

```text
准备调用外部模型
  ↓ 检查 command -v ccb
CCB 已安装？
  ├─ 否 → 降级到本地 Agent 框架；无子 Agent 能力时由主 Agent 执行对应角色自检
  └─ 是 → 检查 .ccb/ccb.config
目标 agent 在 ccb.config 中配置？
  ├─ 否 → 全局无该 agent，必须降级 + 告知用户「未配置该 agent」
  └─ 是 → 检查 ccb ping <agent>
目标 agent 在线？
  ├─ 是 → 正常调用
  └─ 否 → agent 已配置但未启动
      ├─ 尝试恢复 CCB（ccb；仅单 pane 异常时 ccb restart <agent>）
      │   ├─ 启动成功 → 正常调用
      │   └─ 启动失败 → 该环节是否关键？
      │       ├─ 是 → 若 inspiration 可用，按被替代角色规范代执行；否则降级 + 记录到 TASK_MEMORY.md
      │       └─ 否 → 直接降级，继续流程
```

> 重启命令按项目实际配置执行。

**降级后必须告知用户：**

> "⚠️ reviewer 方案审查因 [原因] 降级为 Orchestrator 自检，预计影响：[无 / 可能遗漏边界检查]"

---

## 故障排查

| 问题 | 原因 | 解决 |
|------|------|------|
| `reviewer` 返回质量不高 | 输入信息不够详细 | 补充方案摘要、影响面、验收标准 |
| `developer` 编码不符合规范 | 未传递规范文件路径 | 在 prompt 中明确列出规范文件路径 |
| `tester` 未真正运行测试 | 未提供具体测试命令 | 要求执行项目测试命令并输出结果 |
| agent 回复等待过长 | CCB 异步通信开销 | 检查 `ccb ping <agent>`、`ccb pend --watch --timeout <秒> <job_id>` 和 `ccb trace <job_id>`；必要时调大超时或拆分为小任务 |

> 项目测试命令按实际配置执行（如 `npm test`、`pnpm test:run` 等）。

---

## 使用流程总览

```text
用户提需求
  ↓
Orchestrator 模式判断（见 execution-mode-guidelines.md）
  ↓
本文量化评分 → A / B / C / D
  ↓
展示注入环节 + 预计耗时 + 降级预案 → 用户确认
  ↓
按模式执行（各 Phase 注入外部 agent 或走本地 Agent 框架）
  ↓
Orchestrator 汇总交付
```

---

## 相关文档

- [agent-registry.md](agent-registry.md) — 本地 Agent 角色索引
- [orchestrator.md](orchestrator.md) — Orchestrator 调度规范
- [workflow.md](workflow.md) — 本地执行方法
- [execution-mode-guidelines.md](execution-mode-guidelines.md) — 完整 / 轻量模式判断
