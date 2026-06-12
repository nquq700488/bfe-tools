# 任务记忆

> **上下文压缩防护**：对话过长时早期信息可能丢失，关键信息必须落盘。

<!-- 新增任务时复制此模板：
## 任务名称 [状态 日期]

目标：一句话描述

决策：
- 关键决策点

执行：
- 关键步骤

验证：
- 验证结果

遗留：
- 已知问题
-->

## 补全 AI_MEMORY.md [已完成 2026-06-12]

目标：将空的 `AI_MEMORY.md` 模板补全为一份可指导后续 AI 编码的项目共享认知文档。

决策：
- 基于 `README.md`、根 `package.json` 和源码探索结果生成内容，不引入新的架构假设。
- 采用 `AI_MEMORY.md` 模板原有结构：项目概览、工程基线、架构地图、关键业务链路、高风险区域、长期有效规则、观察中模式、读取建议、维护规则。
- 架构地图按"页面层 → 业务状态层 → 核心领域层 → 基础设施层"分层描述。
- 关键链路优先描述高频/高风险流程：后端任务通用流程、工具注册与发现、桌面端启动与安全、Bun 服务代理。

执行：
- 读取 `README.md`、根 `package.json`、`AI_MEMORY.md` 模板、`TASK_MEMORY.md` 模板、`.markdownlint.json`。
- 启动 `explore` agent（thoroughness: medium）调研 `web/`、`py-server/`、`bun-server/`、`desktop/` 的目录结构、引擎列表、关键文件、高风险区域。
- 综合调研结果，生成 232 行的 `AI_MEMORY.md`，覆盖 25+ 工具、12 个 Python 引擎、3 个 Bun 端点、Tauri 桌面壳、8 个分类。
- 在"观察中模式"中记录本次任务发现的早期信号：BackendJobToolPanel 复杂度高、新增后端引擎涉及跨运行时改动、AI_MEMORY 长期未落盘。

验证：
- `AI_MEMORY.md` 成功写入磁盘，大小约 15 KB，共 232 行。
- 尝试运行 `markdownlint`，但项目未安装 markdownlint CLI，已跳过。

遗留：
- 随着新增工具、引擎或架构变更，需要定期更新 `AI_MEMORY.md` 中的"架构地图"、"高风险区域"和"长期有效规则"。
- 观察中模式达到阈值后，应按 `.agents/continuous-learning.md` 流程处理。
