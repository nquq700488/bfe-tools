---
name: context-handoff
description: >
  长会话压缩和交接入口。当用户要求“压缩上下文”“整理交接”“生成恢复摘要”
  “准备下个会话继续”，或当前任务存在上下文丢失风险时使用。
  具体规则以 context-compression-guidelines.md 和 task-memory.md 为准。
---

# Context Handoff

> 本 skill 只负责生成可恢复的交接信息并按需落盘；上下文压缩规则统一维护在 `.agents/context-compression-guidelines.md`。

## 必读规范

1. `AGENTS.md`
2. `.agents/context-compression-guidelines.md`
3. `.agents/task-memory.md`
4. `.agents/ai-memory.md`（仅当交接中包含长期经验时读取）

## 执行骨架

1. 汇总当前目标、已确认方案、已完成工作、未完成工作、关键决策、阻塞和风险。
2. 检查是否需要写入 `TASK_MEMORY.md`；需要跨会话恢复时必须落盘。
3. 若产生长期有效工程经验，按 `ai-memory.md` 判断是否写入 `AI_MEMORY.md`。
4. 生成恢复摘要，包含继续任务所需的最小上下文和下一步动作。
5. 明确列出未验证项、不可丢失约束、相关文件路径和建议恢复入口。

## 输出要求

交接摘要必须包含：

- 当前目标
- 当前状态
- 已完成
- 待处理
- 关键决策
- 风险 / 阻塞
- 相关文件
- 下一步建议

## 必守红线

- 不凭记忆补全不确定内容；不确定时标记“待确认”。
- 不丢弃未完成项、失败验证、用户确认点或关键约束。
- 不把交接摘要写成执行流水账；只保留恢复任务需要的信息。
- 上下文压缩后继续工作前，必须重新读取交接中列出的关键文件。
