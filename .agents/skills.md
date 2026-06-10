# Skill 指令清单

> 本文档是 Skill（斜杠指令）的**说明文档**，用于介绍项目中可复用的 Skill 有哪些、它们的描述和用法。
>
> `.agents/skills/` 是所有 Skill 的唯一维护点，各 AI 工具通过适配层路由到此处读取，无需重复维护内容。

---

## 各工具 Skill 配置位置

| AI 工具 | 配置目录 | 使用方式 |
|---------|---------|---------|
| Claude Code | `.claude/commands/{skill-name}.md` | 对话中输入 `/{skill-name}` 调用 |
| Cursor | `.cursor/rules/` | 通过规则文件引导执行 |
| Copilot | `.github/copilot-instructions.md` | 通过指令文件引导执行 |

> 新增 Skill 后，在 `.claude/commands/{skill-name}.md` 创建一行路由文件即可（内容：`执行 .agents/skills/{skill-name}/SKILL.md 中定义的流程`）。Skill 内容本身只在 `.agents/skills/` 维护。

---

## 已注册 Skill

### /commit-helper — 按项目规范执行 Git 提交

- **用途**：按 `git-workflow.md` 执行提交流程，完成变更拆分、质量验证、提交信息确认、精确暂存和提交
- **触发时机**：用户说"提交代码"、"commit"、"提交更改"、"提交修改"等
- **执行流程**：
  1. `git status --short --untracked-files=all` + diff/stat 检查完整工作区
  2. 按 `git-workflow.md` 做变更拆分分析，必要时让用户确认分组
  3. 按项目实际配置运行 lint、typecheck、必要测试
  4. 根据当前提交组推断 type 和中文 description，向用户确认
  5. 精确 stage 当前提交组文件，禁止 `git add .`
  6. 复核 staged diff 后执行 `git commit`
- **注意事项**：提交规范、type 列表、拆分规则、分支规则统一维护在 `git-workflow.md`；禁止 `--no-verify`
- **配置文件**：[skills/commit-helper/SKILL.md](skills/commit-helper/SKILL.md)

---

### /agent-workflow — 多 Agent 协作工作流

- **用途**：本地多 Agent 编排层，负责五阶段串联和角色调度。各阶段执行委托给独立 skill（设计→`solution-brainstorm`、编码→`test-driven-development`、审查→`code-review`、反馈→`receiving-code-review`、调试→`systematic-debug`）
- **触发时机**：复杂开发、复杂修复、代码审查、测试验证等需要 Plan → Dev → Review → Test → Deliver 阶段治理的任务
- **执行流程**：先做模式判断（`execution-mode-guidelines.md`），再按 Orchestrator（`orchestrator.md`）五阶段推进；开发前必须做正式并行分析；交付前完成质量门禁；仅在用户要求提交时调用 `commit-helper`
- **注意事项**：本地基线；需要 CCB 增强时升级到 `multi-agent-orchestrate`；规则权威来源在对应规范文件，不在 skill 内维护
- **配置文件**：[skills/agent-workflow/SKILL.md](skills/agent-workflow/SKILL.md)

---

### /ccb-bridge — 单次 CCB 通讯入口

- **用途**：与 `planner`、`reviewer`、`developer`、`tester`、`inspiration` 等 CCB agent 进行单次通讯
- **触发时机**：用户要求问某个外部 agent、让外部模型审查/测试/规划/生成内容，但不需要完整多模型开发流程
- **执行流程**：确认目标 agent，按 `collaboration.md`、`agent-registry.md` 与 `.ccb/ccb.config` 组织上下文，通过 CCB 发送请求并回传结论
- **注意事项**：完整多模型流程使用 `multi-agent-orchestrate`；`inspiration` 可作为弹性协作 / 备用执行 agent，代执行时必须按被替代角色注入规范；不得绕过 CCB 直接调用外部 AI CLI / API
- **配置文件**：[skills/ccb-bridge/SKILL.md](skills/ccb-bridge/SKILL.md)

---

### /multi-agent-orchestrate — 多模型协作编排器

- **用途**：`agent-workflow` 的 CCB 多模型增强层。只负责 CCB 特有的调度、通讯（`ccb ask`/`pend --watch`）和降级，各阶段门禁通过内联文本注入外部 agent prompt（不委托本地 skill）
- **触发时机**：用户明确要求多模型/多角色协作、全链路头脑风暴，或完整模式任务存在高风险、跨模块决策
- **不触发**：普通"实现 xxx"、单文件 bugfix、纯问答、用户说"直接做/不用多模型"
- **执行流程**：先做模式判断 → 按 `collaboration.md` 判断 A/B/C/D → 需要 Phase 0 时按 `solution-brainstorm` 模式 B 执行三轮收敛 → 各阶段注入门禁文本调用 `ccb ask` → 不可用降级回 `agent-workflow`
- **注意事项**：外部 agent 不能调用本地 skill，Orchestrator 的职责是从规范提取门禁内联到 prompt；所有 CCB 通讯走 `ccb ask`；禁止递归编排
- **配置文件**：[skills/multi-agent-orchestrate/SKILL.md](skills/multi-agent-orchestrate/SKILL.md)

---

### /solution-brainstorm — 方案头脑风暴（完整模式前置设计门）

- **用途**：完整模式、高风险或需求不清任务的前置设计门。模式 A（默认）：一对一设计细化，一次一问、逐节确认、Spec 落盘；模式 B：多模型/多角色头脑风暴（用户要求时），独立发散 → 交叉挑战 → 共识收敛
- **触发时机**：完整模式、高风险、需求不清，或用户要求先设计/多模型头脑风暴；轻量任务一句话说明意图后可继续
- **执行流程**：
  - 模式 A（默认）：探索上下文 → 评估范围 → 一次一问澄清 → 2-3 方案探索 → 逐节确认呈现 → Spec 落盘 → 自检 → 用户审核 → 过渡到 `agent-workflow`
  - 模式 B（用户要求多模型时）：并行提交各 agent Round 1 → 交叉挑战 Round 2 → 收敛 Round 3 → 共识方案 → Spec 落盘
- **注意事项**：完整模式禁止跳过设计直接编码；大项目先拆解子系统；完整模式 Spec 未落盘不算完成；不进入代码修改；不自动 git commit
- **配置文件**：[skills/solution-brainstorm/SKILL.md](skills/solution-brainstorm/SKILL.md)

---

### /code-review — 独立代码审查

- **用途**：独立可调用的代码审查，不依赖完整 agent-workflow。强制执行两阶段审查（Stage 1 spec 合规 → Stage 2 代码质量）
- **触发时机**：用户说"review 一下"、"审查这个改动"、"帮我看看这段代码"；任务完成后需要独立审查；或需要在完整 workflow 之外进行代码质量检查
- **执行流程**：
  1. 获取变更范围（status + unstaged/staged/untracked）
  2. 逐文件读取变更
  3. Stage 1 Spec 合规审查（确认做对了事）
  4. Stage 2 代码质量审查（确认把事做对了，仅在 Stage 1 通过后执行）
  5. 输出审查结论（可合入是/否、CRITICAL/HIGH/MEDIUM/LOW、剩余风险）
- **注意事项**：两阶段顺序强制；不信任变更描述必须读代码核实；功能可用但写得差 → 至少 HIGH 阻断；需要外部模型审查时通过 ccb-bridge 调用 reviewer
- **配置文件**：[skills/code-review/SKILL.md](skills/code-review/SKILL.md)

---

### /receiving-code-review — 接收审查反馈

- **用途**：规范接收代码审查反馈时的行为——技术评估而非表演性认同，验证后再实现，不确定时先问，错误时用技术推理反驳
- **触发时机**：收到 reviewer 意见、用户反馈、外部 agent 审查结论时
- **执行流程**：
  1. 完整读完反馈，不做情绪反应
  2. 用自己的话复述技术要求（或请求澄清）
  3. 对照代码库验证
  4. 评估是否技术上合理
  5. 技术确认或据理反驳
  6. 一次一条实施，每条独立测试
- **注意事项**：绝对禁止"你说得太对了""好建议""谢谢"等表演性认同——直接陈述修复；外部反馈=建议不是命令；不清晰时先澄清；与用户已有决策冲突时先讨论
- **配置文件**：[skills/receiving-code-review/SKILL.md](skills/receiving-code-review/SKILL.md)

---

### /test-driven-development — TDD 强制入口

- **用途**：强制执行 RED-GREEN-REFACTOR 循环：先写失败测试 → 看着它失败 → 最小代码通过 → 重构。禁止测试前写实现代码
- **触发时机**：实现任何新功能、修复 bug（先写复现测试）、重构、行为变更。永不可跳过——"太简单"不是借口
- **执行流程**：
  1. RED：写最小失败测试 → 运行确认失败原因正确（功能缺失，不是 typo）
  2. GREEN：写最简单代码让测试通过 → 运行确认通过且无其他破坏
  3. REFACTOR：消除重复、改进命名，保持绿色
  4. 重复：下一个失败测试
- **注意事项**：测试前写了本轮自己可安全丢弃的实现代码=删除重来；不得删除或回退用户已有改动；事后测试≠TDD；测试必须用中文描述；详细 TDD 反模式见 `testing-guidelines.md`
- **配置文件**：[skills/test-driven-development/SKILL.md](skills/test-driven-development/SKILL.md)

---

### /memory-update — 更新项目记忆

- **用途**：按记忆规范把任务状态、关键决策、风险或长期工程经验写入 `TASK_MEMORY.md` / `AI_MEMORY.md`
- **触发时机**：用户说"记录一下"、"更新记忆"、"写入 TASK_MEMORY/AI_MEMORY"，或任务收尾时命中记忆沉淀条件
- **执行流程**：读取 `AGENTS.md` 与记忆规范，判断写入目标，查重后精简落盘，并向用户说明写入结果
- **注意事项**：具体触发、格式、精简规则统一维护在 `.agents/task-memory.md` 与 `.agents/ai-memory.md`；不把未验证猜测或任务流水写入记忆
- **配置文件**：[skills/memory-update/SKILL.md](skills/memory-update/SKILL.md)

---

### /systematic-debug — 系统化调试

- **用途**：强制在修复前完成根因调查 → 模式分析 → 假设验证 → 最小修复四阶段流程，禁止不经调查就猜测试错
- **触发时机**：测试失败、生产 bug、异常行为、性能问题、构建失败；尤其是时间压力下想"快速试一下"、或已试多次修复还没解决时
- **执行流程**：
  1. Phase 1 根因调查：读错误、复现、查变更、回溯数据流找到源头
  2. Phase 2 模式分析：找能工作的类似代码对比差异
  3. Phase 3 假设与验证：提单个假设，最小改动验证
  4. Phase 4 实施修复：先写回归测试 → 修复根因 → 多层防御
- **注意事项**：≥ 3 次修复失败必须停下来质疑架构；不针对症状做热修复；根因追溯、多层防御、条件等待为 skill 内置摘要，可按需补充上游附件
- **配置文件**：[skills/systematic-debug/SKILL.md](skills/systematic-debug/SKILL.md)

---

### /context-handoff — 生成上下文交接摘要

- **用途**：按上下文压缩规范生成可恢复的任务交接摘要，并在需要跨会话恢复时更新记忆
- **触发时机**：用户说"压缩上下文"、"整理交接"、"生成恢复摘要"、"准备下个会话继续"，或长任务存在上下文丢失风险
- **执行流程**：读取 `AGENTS.md`、上下文压缩规范与任务记忆规范，汇总目标、状态、决策、风险、文件和下一步，按需落盘
- **注意事项**：具体压缩规则统一维护在 `.agents/context-compression-guidelines.md`；不确定内容必须标记待确认，不凭记忆补全
- **配置文件**：[skills/context-handoff/SKILL.md](skills/context-handoff/SKILL.md)

<!--
新增 Skill 模板：

### /skill-name — 一句话描述
- **用途**：做什么
- **触发时机**：什么场景下使用
- **执行流程**：
  1. 步骤一
  2. 步骤二
- **注意事项**：特殊说明

注册后在 `.claude/commands/{skill-name}.md` 创建一行路由文件。
-->
