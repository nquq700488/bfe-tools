# Agent 注册表

> 读取本文件前应已完成 `AGENTS.md` 的会话启动协议；工作方式与执行流程见 `workflow.md`。

---

## Agent 索引

| Agent | 角色定义来源 | 触发时机 |
|-------|-------------|---------|
| Orchestrator | `orchestrator.md` | 每次任务入口 |
| Planner | `orchestrator.md` / `workflow.md` | 完整模式，Orchestrator 派发 |
| Developer | `workflow.md` / `quality-checklist.md` | 用户确认方案后（完整）或直接派发（轻量） |
| Reviewer | `quality-checklist.md` / `testing-guidelines.md` | Developer 完成后自动派发 |
| Tester | `testing-guidelines.md` | Reviewer 通过后自动派发 |

---

## 本地 Agent 派发协议

Orchestrator 派发本地角色时，必须先解析**本次执行角色**，再把对应角色规范和门禁写入任务上下文。若当前工具不支持真实子 Agent，由主 Agent 按同一角色模板自检执行，并标注"本地角色自检"。

### 派发通用要求

每次派发必须包含：

- **角色身份**：Planner / Developer / Reviewer / Tester / Inspiration
- **输入上下文**：用户目标、已确认方案、影响面、相关文件、约束和非目标
- **必读规范**：来自 Agent 索引和任务所属领域规范
- **产出格式**：本阶段必须返回的方案、改动、审查结论或测试报告
- **阻断条件**：CRITICAL / HIGH 问题、未验证项、方案分歧或超出范围风险
- **禁止递归编排**：子 Agent 只执行本角色任务
- **上下文隔离**：不传递会话历史，仅提供精确构建的输入

优先使用规范索引链接，避免复制大段规范；只有目标 agent 不能读取文件或链接时，才内联关键门禁正文。

### 动态角色规范解析

角色规范按**本次执行角色**解析，不按物理 agent 名、provider、模型硬编码。

| 执行角色 | 必读规范 | 必须门禁 |
|----------|----------|----------|
| **Planner** | `orchestrator.md`、`workflow.md`、`testing-guidelines.md`、任务领域规范 | 方案目标、影响面、验收标准、风险、非目标、可并行拆分 |
| **Developer** | `workflow.md`、`coding-standards.md`、`quality-checklist.md`、任务领域规范 | 最小改动、不回退他人改动、符合既有模式、必要封装不过度封装、改动清单、验证结果。**四态报告**：完成后必须报告 DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED |
| **Reviewer** | `quality-checklist.md`、`testing-guidelines.md`、任务领域规范 | **两阶段审查（强制）**：Stage 1 spec 合规（先确认做对了事）通过后，Stage 2 代码质量（再确认把事做对了）。不得跳过或颠倒。不信任 Developer 汇报，必须读代码核实。功能可用但实现粗糙必须阻断 |
| **Tester** | `testing-guidelines.md`、`workflow.md`、任务领域规范 | 「Tester 验证质量门禁」；主路径通过但缺少边界、异常、回归或可复现证据时必须阻断 |
| **Inspiration** | `agent-registry.md`、按需 `collaboration.md`、任务上下文；代执行时读取被替代角色规范 | 默认提供替代路径、创新方向、适用条件和代价。代执行时使用被替代角色的门禁，不可替代正式结论 |

### 派发模板

```md
【角色规范】
本次执行角色：[Planner / Developer / Reviewer / Tester / Inspiration]
规范来源：.agents/agent-registry.md「动态角色规范解析」
必读规范：[规范路径 / 无文件能力时给文本摘要]
必须门禁：[该角色必须遵守的门禁]
禁止：不得启动递归编排
```

---

## Developer 四态处理

Developer 完成后必须报告以下四种状态之一：

| 状态 | 含义 | 后续动作 |
|------|------|---------|
| `DONE` | 全部完成 | 进入审查 |
| `DONE_WITH_CONCERNS` | 完成但有疑虑 | 先读疑虑。涉及正确性/范围 → 解决后审查；仅观察性备注 → 记录后审查 |
| `NEEDS_CONTEXT` | 缺少信息 | 补充上下文后重新派发 |
| `BLOCKED` | 无法完成 | 缺上下文→补充重试；需更强推理→换模型；任务太大→拆分；方案有误→上报用户 |

Orchestrator 不得忽略 `DONE_WITH_CONCERNS` 或 `BLOCKED` 信号，不得用同一模型无变更重试。

---

## 本地多角色头脑风暴

仅最外层 Orchestrator 可执行。触发条件：

- 用户明确要求多 Agent 头脑风暴 / 一起想方案
- 完整模式下需求模糊、跨模块、多个可行路径或高风险方案决策
- CCB 多模型 Phase 0 降级到本地

流程与多模型 Phase 0 一致（不调用 CCB）：

| 轮次 | 本地角色 | 产出 |
|------|----------|------|
| Round 1 | Planner / Inspiration / Developer / Reviewer / Tester | 独立方案、替代路径、约束、风险、验证关注点 |
| Round 2 | 同上 | 对其他观点的支持、反对、补充、待验证 |
| Round 3 | Orchestrator 主持，各角色确认 | 共识方案、少数意见、未决问题、采纳记录 |

约束：

- 与 CCB 多模型 Phase 0 同一任务只执行一种
- 子 Agent 收到结果后只能使用，不得重新发散
- 输出格式与 `collaboration.md`「多模型头脑风暴共识」一致

---

## CCB Agent 角色语义

> CCB agent → provider / 模型配置的唯一来源是 `../.ccb/ccb.config`。
> 详细协作流程、调用示例和降级策略见 `collaboration.md`。

| CCB Agent | 本地角色 | 默认身份画像 | 核心职责 | 注意 |
|-----------|----------|-------------|----------|------|
| `planner` | Planner | 资深技术方案架构师 | 需求澄清、方案设计、任务拆解、影响面和验收标准 | 方案变更涉及接口/数据流/任务拆分时，必须回传定稿 |
| `reviewer` | Reviewer | 资深代码审查专家 | 方案审查、代码审查、**两阶段审查（spec→quality）**、风险识别 | 质量门禁见 `quality-checklist.md` |
| `developer` | Developer | 资深工程师 | 按确认方案执行编码，合理拆分，报告改动和验证结果 | 必须报告四态；不得回退他人改动 |
| `tester` | Tester | 资深测试工程师 | 按验收标准执行测试、验证质量门禁、回归风险检查 | 门禁见 `testing-guidelines.md` |
| `inspiration` | 弹性协作 | 资深产品/交互/技术创新顾问 | 替代方案、创新路径；协助其他角色或代执行 | 代执行时写被替代角色并使用被替代角色门禁 |

### CCB 身份注入模板

```md
【身份设定】
你是[默认身份画像]，本次以[任务领域]专家身份工作。
请按该领域的资深工程标准判断，不只完成表面角色动作。

【本次专业关注点】
- [关注点 1]
- [关注点 2]
- [关注点 3]
```

调用任何 CCB agent 时必须注入身份设定 + 角色规范（按上表展开）。

---

## 流程规则

- **打回重做**：最多 2 次，超过暂停等人工。每次重试累积历史反馈传给 Developer。
- **并行执行**：Planner 标注的可并行子任务可同时派发多个 Developer → 全部完成后统一 Reviewer → 通过后并行多个 Tester。
- **轻量模式**：Orchestrator 自身充当 Developer，按 Reviewer 检查清单自检后运行测试。
- **任务记忆**：全流程完成后按 `task-memory.md` 更新 `TASK_MEMORY.md`。
