# 变更目录（.changes/）

> 本目录存放**完整模式**下的活跃变更 Artifact。
> 轻量模式任务不需要创建变更目录。

---

## 目录结构

```text
.changes/
  ├── README.md              # 本文件
  ├── index.md               # 变更索引（活跃 + 近期完成）
  └── {feature-name}/        # 单个变更目录
       ├── proposal.md        # 提案：为什么做、改什么、非目标、影响面
       ├── specs.md           # 规范：需求场景、验收标准（单文件简化版；复杂项目可升级为 specs/ 目录，每场景一个文件）
       ├── design.md          # 设计：架构、组件、数据流、错误处理
       └── tasks.md           # 任务：实现清单、进度跟踪
```

---

## 变更目录生命周期

1. **创建**：`solution-brainstorm` skill 在用户确认方案后创建
2. **活跃**：开发过程中持续更新 `tasks.md` 进度
3. **完成**：任务完成后保留在 `.changes/` 下，`index.md` 更新状态为"已完成"
4. **清理**：保留最近 10 个已完成变更，更老的由用户手动决定是否删除

---

## 命名规范

变更目录名使用 kebab-case，描述功能：

```text
add-dark-mode
refactor-auth-flow
fix-memory-leak-in-canvas
migrate-to-vue-3
```

禁止：

- ❌ 日期前缀（日期记录在 index.md 和 proposal.md 中）
- ❌ 无意义编号（feature-001）
- ❌ 过长（超过 5 个单词）

---

## 与记忆文件的关系

| 文件 | 用途 | 与 .changes/ 的关系 |
|------|------|-------------------|
| `TASK_MEMORY.md` | 任务状态、关键决策、跨会话恢复 | 变更执行中的临时状态写入 TASK_MEMORY.md；变更完成后，TASK_MEMORY.md 中的相关条目可精简或删除 |
| `AI_MEMORY.md` | 长期经验、架构决策 | 变更中发现的长期规则写入 AI_MEMORY.md；变更目录本身不替代 AI_MEMORY.md |
| `.changes/{feature}/` | 单个变更的完整文档 | 变更级文档，便于回溯具体功能的设计和实施过程 |
