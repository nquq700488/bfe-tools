---
name: ccb-bridge
description: >
  CCB 通讯入口。当用户需要与 planner、reviewer、tester、
  inspiration、developer 等外部 agent 交互，或要求外部 AI 审查/测试/规划/生成内容时使用。
  本项目跨模型通讯必须统一走 ccb ask <agent>。
---

# CCB Bridge

> 本 skill 只负责一次 CCB 通讯；完整多模型流程使用 `multi-agent-orchestrate`。

## 必读规范

1. `AGENTS.md`
2. `.agents/collaboration.md`
3. `.agents/agent-registry.md`
4. `.ccb/ccb.config`

## 执行骨架

1. 识别目标 agent 和本次执行角色；可用 agent / provider 只看 `.ccb/ccb.config`，角色语义只看 `agent-registry.md`。
2. 执行 `command -v ccb`；不可用时按 `collaboration.md` 告知并降级。
3. 按 `collaboration.md` 选择 ask 模式：默认 `ccb ask <agent>` + `ccb pend --watch <job_id>`；默认等待不合适时用 `ccb pend --watch --timeout <秒> <job_id>`；链式委派、完成通知、静默发送按场景使用 `--callback` / `--notify-sender` / `--silence`。
4. 组织 prompt：注入 `【身份设定】`、专业关注点、按本次执行角色解析的 `【角色规范】`、任务上下文和必要规范路径；有文件能力传路径，无文件能力传摘要。
5. 发送后记录 `job_id`；需要结果驱动下一步时优先 `ccb pend --watch <job_id>`，并按任务预期耗时显式设置 `--timeout <秒>`。
6. 回传结论、风险和下一步；目标 agent 离线、超时或质量异常时按 `collaboration.md` 降级。

## 必守红线

- 禁止绕过 CCB 直接调用外部 AI CLI / API。
- 禁止把一次 CCB 通讯扩展成完整多模型开发流程。
- 禁止只按 agent 名、provider 或模型注入规范；必须按本次执行角色注入 `【角色规范】`。
- 禁止把 `【角色规范】` 占位原样发给 agent；有文件读取能力时可给规范索引 / 路径，无文件读取能力时必须内联关键门禁。
- 若用 `inspiration` 代执行其他角色，目标 agent 仍是 `inspiration`，但本次执行角色必须写被替代角色，并使用被替代角色门禁。
- 禁止向无文件能力的 agent 传文件路径。
- 活跃 CCB 任务内需要嵌套委派时，不用普通 `ccb ask`；按 `collaboration.md` 使用 `--callback` 或 `--notify-sender`。
