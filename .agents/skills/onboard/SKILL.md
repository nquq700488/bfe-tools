---
name: onboard
description: >
  新项目初始化入口。当项目首次接入本规范体系、或用户说"初始化项目"、
  "接入 AI 规范"、"onboard"时使用。生成项目必需的初始配置文件，
  并帮助 Agent 快速建立项目心智模型。
---

# 项目初始化（Onboard）

> 本 skill 负责项目首次接入规范体系时的初始化工作。
> 不替代 `solution-brainstorm` 的功能设计；只生成规范框架和初始记忆。

---

## 执行卡片

必须：
- 检查现有规范文件是否存在
- 不覆盖已有用户文件
- 缺失项只记录并在报告中提示
- 基于实际项目结构生成 `AI_MEMORY.md` 初稿

禁止：
- 自动复制模板覆盖项目文件
- 猜测业务逻辑或架构细节
- 执行 git commit

输出：
- 输出已存在、已创建、缺失待补齐三类清单

---

## 触发时机

- 用户说"初始化项目"、"接入 AI 规范"、"onboard"、"设置项目"
- 新项目首次使用本规范体系
- 现有项目规范文件缺失或损坏需要重建

---

## 必读规范

1. `AGENTS.md`
2. `.agents/task-routing.md`
3. `.agents/ai-memory.md`（记忆写入规则）

---

## 执行骨架

### 步骤 1：检查现有规范完整性

检查以下文件是否已存在：

```
AGENTS.md
CLAUDE.md
AI_MEMORY.md
TASK_MEMORY.md
.agents/workflow.md
.agents/task-routing.md
.agents/execution-mode-guidelines.md
.agents/coding-standards/common.md
.agents/git-workflow.md
.agents/quality-checklist.md
.agents/testing-guidelines.md
```

- **已存在** → 跳过，不覆盖
- **不存在** → 记录为缺失项，在初始化报告中提示用户补齐；不自动复制模板

### 步骤 2：生成 AI_MEMORY.md 初稿

基于项目代码结构，生成 `AI_MEMORY.md` 初稿：

```markdown
# AI_MEMORY.md — 项目共享认知入口

## 项目概览

- 业务：[一句话描述]
- 技术栈：[语言 + 框架 + 构建工具 + 包管理器]
- 代码主入口：[入口文件路径]

## 工程基线

- Node：[版本]
- 包管理：[pnpm / yarn / npm]
- 常用验证命令：[lint / type-check / test]

## 架构地图

<!-- 根据实际代码结构生成，每个模块 1-2 句话 -->

### 页面层

### 业务状态层

### 核心领域层

### 基础设施层

## 关键业务链路

<!-- 待填充 -->

## 高风险区域

<!-- 待填充 -->

## 长期有效规则

<!-- 待填充 -->
```

### 步骤 3：检查 CCB 配置

若项目计划使用 CCB 多模型协作：

- 检查 `.ccb/ccb.config` 是否存在
- 不存在 → 创建模板：
  ```toml
  (planner:codex; inspiration:opencode), (developer:claude; reviewer:codex; tester:kimi)
  ```
- 检查 `.ccb/README.md` 是否存在

### 步骤 4：初始化 .changes/ 目录

确保 `.changes/` 目录存在且包含：
- `.changes/README.md`
- `.changes/index.md`

### 步骤 5：检查 .claude/commands/

确保 `.claude/commands/` 目录存在，且包含所有 skill 的路由文件。

### 步骤 6：输出初始化报告

```text
【项目初始化完成】

已检查/创建的文件：
✅ AGENTS.md（已存在 / 已创建）
✅ AI_MEMORY.md（已生成初稿 / 已存在）
...

待用户手动填充：
- AI_MEMORY.md「项目概览」和「架构地图」
- 技术栈具体的编码规范（如 vue.md、api-guidelines.md 等）
- CCB agent 配置（如使用多模型协作）

建议下一步：
- 运行 `bash scripts/validate-spec.sh` 验证规范完整性
- 让 AI 读取 AI_MEMORY.md 并帮助完善架构地图
```

---

## 必守红线

- 不覆盖已存在的用户自定义文件（询问用户是否覆盖）
- 不替代 `solution-brainstorm` 的设计工作
- 只生成框架，不猜测业务逻辑或架构细节
- 不执行 git commit（初始化完成后由用户决定是否提交）
