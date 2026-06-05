# Agent 注册表

> 读取本文件前应已完成 [../AGENTS.md](../AGENTS.md) 的会话启动协议；工作方式与执行流程见 [workflow.md](workflow.md)。

---

> 本文件维护本地 Agent 角色索引和跨 Agent 流程规则；具体职责以表格中的角色定义来源为准。

---

## Agent 索引

| Agent | 角色定义来源 | 触发时机 |
|-------|-------------|---------|
| Orchestrator | [orchestrator.md](orchestrator.md) | 每次任务入口 |
| Planner | [orchestrator.md](orchestrator.md) / [workflow.md](workflow.md) | 完整模式，Orchestrator 派发 |
| Developer | [workflow.md](workflow.md) / [quality-checklist.md](quality-checklist.md) | 用户确认方案后（完整）或直接派发（轻量） |
| Reviewer | [quality-checklist.md](quality-checklist.md) / [testing-guidelines.md](testing-guidelines.md) | Developer 完成后自动派发 |
| Tester | [testing-guidelines.md](testing-guidelines.md) | Reviewer 通过后自动派发 |

验收标准规范见 [testing-guidelines.md](testing-guidelines.md)

踩坑记录见 [../AI_MEMORY.md](../AI_MEMORY.md)（按需读取）

---

## 本地 Agent 派发协议

Orchestrator 派发本地 Planner / Developer / Reviewer / Tester / Inspiration 时，必须先解析**本次执行角色**，再把对应角色规范和门禁写入任务上下文，不能只写“让 X 处理”。若当前工具不支持真实子 Agent，由主 Agent 按同一角色模板自检执行，并明确标注“本地角色自检”。

### 动态角色规范解析

角色规范按**本次执行角色**解析，不按物理 agent 名、provider、模型或默认配置硬编码。若某个 agent 被临时要求以另一角色工作，例如 `reviewer` 代做 Tester 验证、`developer` 参与方案评估，必须注入临时执行角色的规范和门禁。

| 执行角色 | 必读规范 | 必须门禁 |
|----------|----------|----------|
| Planner | [orchestrator.md](orchestrator.md)、[workflow.md](workflow.md)、[testing-guidelines.md](testing-guidelines.md)、任务领域规范 | 方案目标、影响面、验收标准、风险、非目标、可并行拆分 |
| Developer | [workflow.md](workflow.md)、[coding-standards.md](coding-standards.md)、[quality-checklist.md](quality-checklist.md)、任务领域规范 | 最小改动、不回退他人改动、符合既有模式、必要封装、不过度封装、改动清单、验证结果 |
| Reviewer | [quality-checklist.md](quality-checklist.md)、[testing-guidelines.md](testing-guidelines.md)、任务领域规范 | 「Reviewer 实现质量门禁」；功能可用但实现粗糙、破坏既有模式、缺少必要通用组件/函数或过度封装时必须阻断 |
| Tester | [testing-guidelines.md](testing-guidelines.md)、[workflow.md](workflow.md)、任务领域规范 | 「Tester 验证质量门禁」；主路径通过但缺少边界、异常、回归或可复现证据时必须阻断 |
| Inspiration | [agent-registry.md](agent-registry.md)、按需读取 [collaboration.md](collaboration.md)、任务上下文；代执行时读取被替代角色规范 | 默认提供替代路径、创新方向、适用条件和代价；也可协助其他角色或在模型异常时代执行被替代角色，代执行时必须使用被替代角色的门禁 |

每次派发或 `ccb ask <agent>` prompt 必须包含 `【角色规范】` 块，并在发送前按上表展开为可执行内容；不得把 `[按执行角色列出]` 这类占位原样发给 agent。有文件读取能力的 agent 可以只给规范索引 / 路径；无文件读取能力的 agent 必须把关键门禁压缩成文本传入。

```md
【角色规范】
本次执行角色：[Planner / Developer / Reviewer / Tester / Inspiration]
规范来源：.agents/agent-registry.md「动态角色规范解析」
必读规范：[该角色需要读取的规范路径 / 无文件能力时给文本摘要]
必须门禁：[该角色必须遵守的质量 / 流程门禁；无文件能力时给文本摘要]
禁止：不得启动递归编排
```

每次派发必须包含：

- **角色身份**：Planner / Developer / Reviewer / Tester / Inspiration
- **输入上下文**：用户目标、已确认方案、影响面、相关文件、约束和非目标
- **必读规范**：来自上方 Agent 索引和任务所属领域规范
- **产出格式**：本阶段必须返回的方案、改动、审查结论或测试报告
- **阻断条件**：CRITICAL / HIGH 问题、未验证项、方案分歧或超出范围风险
- **禁止递归编排**：子 Agent 只执行本角色任务，不得再次启动 `agent-workflow` / `multi-agent-orchestrate` 或模拟完整多 Agent 流程

优先使用规范索引链接，避免复制大段规范；只有目标 agent 不能读取文件或链接时，才内联关键门禁正文。

角色内自检允许存在，但不能替代独立阶段：Developer 可以自查实现质量，不能声称完成 Reviewer；Planner 可以预判风险，不能替代 Reviewer；Tester 可以指出实现风险，不能替代 Reviewer 审查。

## 本地多角色头脑风暴

仅最外层 Orchestrator 可以执行本地多角色头脑风暴。触发条件：

- 用户明确要求多 Agent 头脑风暴 / 一起想方案 / 多角色协作
- 完整模式下需求模糊、跨模块、存在多个可行技术路径或高风险方案决策
- CCB 多模型 Phase 0 原计划执行但降级到本地 Agent 框架

流程与多模型 Phase 0 保持一致，但不调用 CCB：

| 轮次 | 本地角色 | 产出 |
|------|----------|------|
| Round 1 独立发散 | Planner / Inspiration / Developer / Reviewer / Tester | 主方案、替代路径、实现约束、风险反例、验证关注点 |
| Round 2 交叉挑战 | 同上 | 对其他角色观点的支持、反对、补充、待验证项 |
| Round 3 共识收敛 | Orchestrator 主持，各角色确认 | 共识方案、少数意见、未决问题、采纳记录 |

约束：

- 本地头脑风暴和 CCB 多模型头脑风暴同一任务只执行一种；已执行 CCB Phase 0 时，不再执行本地 Phase 0
- 子 Agent 收到头脑风暴结果后只能使用结果，不得重新发散或再次组织头脑风暴
- 输出格式与 `collaboration.md` 的「多模型头脑风暴共识」保持一致

---

## CCB Agent 角色语义

> 本节只定义 CCB agent 名称对应的**角色语义**，不定义 provider / 模型。
> CCB agent → provider / 模型配置的唯一来源是 `../.ccb/ccb.config`。
>
> Orchestrator 负责调度。CCB 可用时，在关键节点通过 `ccb ask <agent>` 调用对应模型；CCB 不可用时回到本地 Agent 框架。
> 详细协作流程、调用示例和降级策略见 [collaboration.md](collaboration.md)。

| CCB Agent | 对应本地角色 | 默认身份画像 | 核心职责 | 注意 |
|-----------|--------------|--------------|----------|------|
| `planner` | Planner | 资深技术方案架构师 / 资深产品技术设计顾问 | 需求澄清、方案设计、任务拆解、影响面和验收标准草案 | 方案变更涉及接口、数据流、任务拆分或技术路径时，必须回传定稿 |
| `reviewer` | Reviewer | 资深代码审查专家 / 架构质量审查专家 | 方案审查、代码审查、实现质量门禁、风险识别、反例和遗漏场景检查 | 质量门禁见 [quality-checklist.md](quality-checklist.md) |
| `developer` | Developer | 资深任务领域工程师 / 高质量实现与调试专家 | 根据已确认方案执行编码实现，合理拆分组件和函数（单文件 ≤800 行，单函数 ≤50 行），报告改动文件和验证结果 | 不得回退他人改动；复杂调试仍由 Orchestrator 控制关键路径 |
| `tester` | Tester | 资深测试工程师 / 质量保障与回归风险专家 | 按验收标准执行测试、验证质量门禁、边界验证和回归风险检查 | 验证门禁见 [testing-guidelines.md](testing-guidelines.md) |
| `inspiration` | 弹性协作 / 备用执行 | 资深产品 / 交互 / 技术创新顾问，兼具跨角色补位能力 | 默认输出替代方案、创新路径和容易忽略的方向；也可协助 Planner / Developer / Reviewer / Tester，或在对应 agent 异常时代执行该角色 | 代执行时必须在 prompt 中写明“本次执行角色”为被替代角色，并注入该角色规范和门禁；采纳后涉及方案关键变更仍需回传 Planner 定稿 |

### CCB 身份注入规则

调用任何 CCB agent 时，prompt 开头必须显式写入身份设定，不能只写“你是 Developer / Reviewer / Tester”。

身份设定必须包含：

- **角色身份**：来自上表的默认身份画像
- **任务领域**：由 Orchestrator 根据任务和代码库判断，如前端、后端、全栈、移动端、数据、AI、DevOps、文档等
- **领域加权**：说明本次需要重点关注的专业能力，如 React 组件设计、状态流、API 契约、性能、可访问性、测试覆盖等

最小模板：

```md
【身份设定】
你是[默认身份画像]，本次以[任务领域]专家身份工作。
请按该领域的资深工程标准判断，不只完成表面角色动作。

【本次专业关注点】
- [关注点 1]
- [关注点 2]
- [关注点 3]
```

示例：前端开发任务调用 `developer` 时，应写成“你是资深前端工程师 / 高质量实现与调试专家”，并要求关注组件边界、状态流、响应式布局、可访问性和测试验证。

---

## 流程规则

**打回重做**：Developer 最多打回 2 次，超过则暂停等待人工介入。每次重试将所有历史反馈累积传给 Developer。

**并行执行**：Planner 标注的可并行子任务可同时派发多个 Developer → 全部完成后统一 Reviewer → 通过后可并行多个 Tester。

**轻量模式**：Orchestrator 自身充当 Developer，按 Reviewer 检查清单自检后运行测试。

**任务记忆**：全流程完成后按 [task-memory.md](task-memory.md) 规范更新 `TASK_MEMORY.md`。

**质量门禁**：完整模式 Phase 5 必须逐项通过质量门禁才能标记任务完成（见 [orchestrator.md](orchestrator.md)）。
