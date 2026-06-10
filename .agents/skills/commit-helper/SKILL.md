---
name: commit-helper
description: >
  按项目 Git 规范执行提交。当用户说"提交代码"、"commit"、"提交更改"、
  "提交修改"等时使用。详细提交类型、分支规则、拆分规则以 git-workflow.md 为准。
---

# Commit Helper

> 本 skill 只负责执行提交流程；提交规范、拆分规则和质量门禁统一维护在 `.agents/git-workflow.md`。

## 必读规范

1. `AGENTS.md`
2. `.agents/git-workflow.md`
3. `.agents/quality-checklist.md`

涉及特定领域时，按 `.agents/task-routing.md` 补读对应规范。

## 执行骨架

1. 检查完整工作区：`git status --short --untracked-files=all`、`git diff --stat`、`git diff --cached --stat`、`git ls-files --others --exclude-standard`，必要时读取 diff 理解变更目的。
2. 按 `git-workflow.md` 做变更拆分分析；需要多次提交时先让用户确认分组。
3. 按项目实际配置运行 lint、typecheck、必要测试；没有可运行命令时说明原因。
4. 根据当前提交组推断 Conventional Commit type，生成 50 字以内中文 description。
5. 精确暂存当前提交组文件，禁止 `git add .`。
6. 提交前复核 staged 内容：`git diff --cached --stat`，必要时读取 `git diff --cached`，确认只包含当前提交组。
7. 执行 `git commit -m "<type>: <description>"`，禁止 `--no-verify`。
8. 多提交组按组重复 4-7；每组单独 stage、单独复核、单独 commit。若中途修改文件或提交组之间有依赖，重跑相关验证。
9. 提交后输出 commit hash、提交信息、验证结果和剩余工作区状态。

## 必守红线

- 禁止提交未通过质量验证的代码；验证不可执行时必须说明原因。
- 禁止把多个无关目的塞进一次提交。
- 禁止暂存无关文件、临时文件或用户未确认的变更。
- 禁止漏掉未跟踪文件；提交前必须显式检查 untracked 列表。
- 禁止 `git add .`、`git commit --no-verify`、直接推送 `main` / `develop`。
- 禁止提交业务代码中的 `console.log`、mock 兜底或临时测试数据。
- 提交前必须复核 staged diff，确认没有敏感信息、临时调试、无关文件或错误分组。
- 暂存范围不清时先确认，不猜。
