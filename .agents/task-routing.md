# 任务路由（Task Routing）

> 本文件回答一个问题：**当前任务最少要读哪些规范？**
> 通用入口永远先读：`AGENTS.md`。
> `TASK_MEMORY.md` 默认不读，只有用户明确要求或上下文恢复时才读。

## 1. 纯咨询 / 解释 / 方案讨论

**适用**：

- 代码解释
- 架构讨论
- 规范咨询
- 先出方案、不立即编码

**最小必读**：

- `AGENTS.md`

**按需补读**：

- `AI_MEMORY.md`
- 对应领域规范

**说明**：

- 不进入编码流程
- 不强制走模式判断

## 2. 单文件轻改（≤ 5 行且非核心逻辑）

**适用**：

- 文案微调
- 样式微调
- 明确的小 bug 修复
- 类型补充、命名修正

**最小必读**：

- `AGENTS.md`

**按需补读**：

- 对应文件所属领域规范
- 用户明确要求时读 `TASK_MEMORY.md`

**说明**：

- 可以直接执行
- 仍需遵守铁律与验证要求

## 3. 组件修改（Vue SFC）

**最小必读**：

- `AGENTS.md`
- `coding-standards.md`

**涉及样式时补读**：

- `styling-guidelines.md`（若存在）
- `ui-design-spec.md`（若存在）

**项目存在时补读**：

- `component-guidelines.md`

**涉及组件交互复杂度较高时补读**：

- `workflow.md`
- `execution-mode-guidelines.md`

## 4. Store / 状态流修改

**最小必读**：

- `AGENTS.md`
- `coding-standards.md`

**项目存在时补读**：

- `state-management-guidelines.md`

**涉及数据流变化时补读**：

- `execution-mode-guidelines.md`
- `workflow.md`

**涉及历史状态坑位时建议补读**：

- `AI_MEMORY.md`
- 用户明确要求时读 `TASK_MEMORY.md`

## 5. API / 网络请求修改

**最小必读**：

- `AGENTS.md`
- `coding-standards.md`

**项目存在时补读**：

- `api-guidelines.md`

**涉及提交链路 / loading / 异常处理时建议补读**：

- `AI_MEMORY.md`
- 用户明确要求时读 `TASK_MEMORY.md`

## 6. Composable / Utils 修改

**最小必读**：

- `AGENTS.md`
- `coding-standards.md`

**项目存在时补读**：

- `utils-guidelines.md`

**涉及公共接口新增时补读**：

- `execution-mode-guidelines.md`

## 7. 画布 / 涂鸦 / Fabric 工具系统

**最小必读**：

- `AGENTS.md`
- `coding-standards.md`

**项目存在时补读**：

- `tool-system-guidelines.md`

**强烈建议补读**：

- `AI_MEMORY.md` 中相关经验区
- 用户明确要求时读 `TASK_MEMORY.md`

**说明**：

- 该领域历史坑位多、时序敏感
- 不要只凭当前文件局部逻辑下结论

## 8. 原生桥接 / JSBridge

**最小必读**：

- `AGENTS.md`
- `coding-standards.md`

**项目存在时补读**：

- `native-bridge-guidelines.md`

**强烈建议补读**：

- `AI_MEMORY.md` 中录音 / 原生交互相关经验
- 用户明确要求时读 `TASK_MEMORY.md`

## 9. UI / 样式细节调整

**最小必读**：

- `AGENTS.md`

**涉及视觉规范时补读**：

- `ui-design-spec.md`（若存在）

**涉及组件结构改动时补读**：

- `component-guidelines.md`（若存在）

**项目存在时补读**：

- `styling-guidelines.md`

## 10. 测试代码编写 / 修改

**最小必读**：

- `AGENTS.md`
- `coding-standards.md`
- `testing-guidelines.md`

**涉及复杂验证策略时补读**：

- `workflow.md`

## 11. Git 提交 / PR 相关

**最小必读**：

- `AGENTS.md`
- `git-workflow.md`

**说明**：

- 禁止 `--no-verify`
- 提交前默认已完成类型、lint、必要测试验证

## 12. 多模型 / 多 Agent / CCB 协作

**触发条件**：

- 用户提到 `planner` / `reviewer` / `developer` / `tester` / `inspiration`
- 用户明确要求多 Agent 协作
- 任务需要按 CCB 流程分工执行

**触发 `/multi-agent-orchestrate` 的条件**：

- 用户明确说"多模型协作"、"全链路协作"、"多模型头脑风暴"、"一起想方案"、"让 reviewer/tester/planner 参与"
- 任务已按 `execution-mode-guidelines.md` 判定为完整模式，且存在高风险、高复杂度或跨模块决策
- 用户要求多个外部 agent 共同参与一个开发流程

**不触发 `/multi-agent-orchestrate`**：

- 普通"实现 xxx"、"开发 xxx"，但未命中完整模式或高风险条件
- 单文件 bugfix、纯咨询、代码解释
- 用户明确说"直接做"、"不用多模型"、"本地执行"

**最小必读**：

- `AGENTS.md`
- `collaboration.md`
- `agent-registry.md`
- `.ccb/ccb.config`

**涉及完整执行流程时补读**：

- `workflow.md`
- `execution-mode-guidelines.md`

**说明**：

- 所有跨模型调用统一走 `ccb ask <agent>`
- `collaboration.md` 是协作机制入口
- `.ccb/ccb.config` 是 CCB agent → provider / 模型配置的唯一来源
- `agent-registry.md` 定义 CCB agent 名称对应的角色语义
- 不得绕过 CCB 直接调用外部 AI CLI / API

## 13. 何时补读 `AI_MEMORY.md`

以下情况建议主动补读：

- 当前问题在历史上反复出现
- 涉及画布、痕迹、切图、录音、提交链路等高时序风险区域
- 代码现象和表面逻辑对不上，怀疑有架构性坑位
- 需要理解项目历史设计决策，而不是只改眼前代码

补读优先顺序：

- 先读 `AI_MEMORY.md` 的「项目概览 / 架构地图 / 关键链路」
- 再读「长期有效规则 / 高价值坑位附录」
- 仅在必要时再进入具体代码文件核对实现细节

## 14. 何时进入完整模式

满足以下任一趋势时，不要只按轻量方式处理：

- 跨职责边界
- 改变公共契约
- 改变数据流 / 状态流
- 存在独立决策面

详细判断见 `execution-mode-guidelines.md`。
