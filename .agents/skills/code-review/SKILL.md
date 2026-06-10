---
name: code-review
description: >
  独立代码审查入口。当完成任务、实现功能、合并前需要验证代码质量时使用，
  不依赖完整 agent-workflow。强制执行两阶段审查（spec 合规 → 代码质量）。
  详细门禁以 quality-checklist.md 为准。
---

# Code Review

> 本 skill 提供独立可调用的代码审查，不要求走完整 Plan→Dev→Review→Test→Deliver 流程。
> 完整多 Agent 流程中的审查阶段见 `agent-workflow`。

## 铁律

```text
审查不只看功能是否跑通，必须审查实现方式是否值得合入
```

功能跑通只是最低要求。代码写得差但功能可用 = 审查不通过。

## 必读规范

1. `AGENTS.md`
2. `.agents/quality-checklist.md`
3. `.agents/coding-standards.md`
4. `.agents/testing-guidelines.md`（涉及测试代码时）

## 使用场景

- 单文件或少量文件改动，需要快速审查
- 用户说"review 一下"、"审查这个改动"、"帮我看看这段代码"
- 在完整 workflow 之外独立进行代码审查

## 执行骨架

### 1. 获取变更范围

```bash
git status --short --untracked-files=all
git diff --stat
git diff --cached --stat
git ls-files --others --exclude-standard
```

确定涉及的文件列表和变更量。若用户指定 base/head，再使用对应 commit range；否则默认审查当前工作区，包括未暂存、已暂存和未跟踪文件。

### 2. 逐文件读取变更

读取每个变更文件的 diff（不是凭印象），了解改动内容和上下文。

### 3. 两阶段审查（强制顺序）

**Stage 1：Spec/需求合规** — 先确认「做对了事」

- 改动与用户意图/需求一致吗？
- 有缺失的需求吗？
- 有不应出现的多余实现吗？
- 有对需求的误解吗？

❌ 未通过 → 列出具体问题，回到开发者修复

**Stage 2：代码质量** — 再确认「把事做对了」

- 方案一致性、既有模式一致性
- 可维护性（长函数/长文件/重复/嵌套/隐式副作用）
- 抽象与封装（遗漏提取/过度封装/过早抽象）
- 可读性、类型安全、错误处理、最小改动、可测试性

⚠️ 仅在 Stage 1 通过后才执行 Stage 2。

### 4. 输出审查结论

```md
## Reviewer 结论

可合入：是 / 否
Stage 1 Spec 合规：✅ / ❌
Stage 2 代码质量：✅ / ❌
总体评价：[评价实现质量，不只功能正确性]

### 阻断问题
- [CRITICAL/HIGH] 文件:行 — 问题、原因、建议修复方向

### 非阻断建议
- [MEDIUM/LOW] 文件:行 — 问题、原因、建议

### 已检查但未发现问题
- [方案一致性 / 既有模式 / 可维护性 / 抽象封装 / 类型边界 / 测试性 / 最小改动]

### 剩余风险
- [无则写"无"]
```

### 5. 判定规则

| 级别 | 标准 | 处理 |
|------|------|------|
| CRITICAL | 破坏功能、数据安全、核心契约 | 阻断 |
| HIGH | 功能可用但实现粗糙，破坏可维护性/既有模式 | 阻断 |
| MEDIUM | 局部质量问题，不阻断当前合入 | 记录 |
| LOW | 命名、注释、风格细节 | 建议 |

## 如需 CCB 多模型审查

用户要求外部模型审查时，通过 `ccb-bridge` 或直接按 `collaboration.md` 调用：

```bash
ccb ask reviewer <<'EOF'
【身份设定】你是资深代码审查专家，本次以[领域]专家身份工作。
【角色规范】
本次执行角色：Reviewer
规范来源：.agents/agent-registry.md「动态角色规范解析」
必读规范：.agents/quality-checklist.md、.agents/coding-standards.md
必须门禁：Stage 1 spec 合规（确认做对了事）→ Stage 2 代码质量（确认把事做对了），顺序强制。不信任 Developer 汇报，必须读代码核实。功能可用但实现粗糙必须阻断为 HIGH。

【已确认方案】[方案摘要]
【代码改动】[diff 或文件路径]
请按 quality-checklist.md「Reviewer 实现质量门禁」输出结论。
EOF
ccb pend --watch <job_id>
```

## 必守红线

- 两阶段审查顺序强制，不可跳过或颠倒。
- 不信任变更描述：必须读代码核实，不只看 commit message 或开发者汇报。
- 功能可用但写得差 → 至少 HIGH，必须阻断。
- 不写 "LGTM" 或无实质内容的审查结论。
- 不跳过审查因为"改动太小"——小改动也能引入大问题。
