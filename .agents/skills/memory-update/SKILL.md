---
name: memory-update
description: >
  更新项目记忆入口。当用户要求“记录一下”“更新记忆”“写入 TASK_MEMORY”
  “写入 AI_MEMORY”，或任务收尾时需要沉淀决策、风险、长期经验时使用。
  具体写入规则以 task-memory.md 和 ai-memory.md 为准。
---

# Memory Update

> 本 skill 只负责判断和执行记忆落盘；写入触发、格式、精简规则统一维护在 `.agents/task-memory.md` 与 `.agents/ai-memory.md`。

## 必读规范

1. `AGENTS.md`
2. `.agents/task-memory.md`
3. `.agents/ai-memory.md`

## 执行骨架

1. 判断用户要写入的是短期任务状态、跨会话恢复信息，还是长期工程经验。
2. 先检索 `TASK_MEMORY.md` / `AI_MEMORY.md` 是否已有同类内容，避免重复记录。
3. 短期任务状态、方案决策、当前风险写入 `TASK_MEMORY.md`。
4. 长期有效、可复用、已验证的工程规则写入 `AI_MEMORY.md`。
5. 按对应规范精简表达：只记录决策、风险、约束或长期规则，不写流水账。
6. 写入后向用户说明写入目标、标题或条目，以及未写入的原因。

## 必守红线

- 不把未验证猜测写入 `AI_MEMORY.md`。
- 不把单次任务流水、临时代码细节、大段代码片段写入记忆。
- 不重复写已有规则；已有内容需要补充时优先合并。
- 用户明确指定写入目标时仍需遵守对应文件格式。
- 不默认读取 `TASK_MEMORY.md`；只有用户要求、恢复上下文或本 skill 需要查重时读取。
