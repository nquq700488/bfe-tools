# CCB 配置说明

> CCB（Collaborative Code Bridge）是一个多 AI Agent CLI 协作平台，基于 tmux 终端多路复用器。
> 源码：[github.com/nquq700488/claude_code_bridge](https://github.com/nquq700488/claude_code_bridge)
> 完整安装指南与详细配置语法见 [CCB 安装指南](https://github.com/nquq700488/claude_code_bridge/blob/main/CCB_INSTALL_GUIDE.md)。

---

## 本项目 Agent 团队

编辑 `.ccb/ccb.config` 配置：

```toml
(planner:codex; inspiration:opencode), (developer:claude; reviewer:codex; tester:kimi)
```

| Agent | Provider | 角色 |
|-------|----------|------|
| `planner` | Codex | Planner（方案设计） |
| `inspiration` | OpenCode | 弹性协作（头脑风暴 / 协助 / 备用执行） |
| `developer` | Claude | Developer（编码实现） |
| `reviewer` | Codex | 方案审查 + 代码审查 |
| `tester` | Kimi | 测试验证 |

详细角色映射见 `.agents/agent-registry.md`，provider / model 配置见 `.ccb/ccb.config`，协作流程见 `.agents/collaboration.md`。

---

## v7.1+ 核心特性

- **Agent Sidebar**：每个 tmux 窗口左侧原生 TUI，实时显示所有 Agent 状态，支持点击切换焦点
- **多窗口拓扑**：一个项目可配置多个 tmux 窗口，每个窗口有独立布局和 Sidebar
- **Dynamic Reload（v7.1.0+）**：编辑 `ccb.config` 后无需重启整个项目，通过 `ccb reload` 动态应用配置变更
- **Provider Activity 追踪（v7.0.11+）**：通过 provider-native hook 精确识别 Agent active/pending/idle/failed 状态
- **Sidebar 面板高度可配置（v7.1.1+）**：Tree/Agent、Comms、Tips 三个面板高度支持自定义
- **Role Packs（v7.2.0+）**：可复用的 Agent 角色模板，支持 `ccb roles add/update/install`
- **托管工具 Window（v7.2.0+）**：CCB 管理的非 Agent tmux 窗口，内置 Neovim 托管工具（`ccb tools install neovim`）

---

## 多模型协作命令速查

> 详细协作规则、降级策略和调用示例见 [`.agents/collaboration.md`](../.agents/collaboration.md)。

| 协作场景 | 命令 | 说明 |
|---------|------|------|
| 首次向 Agent 发任务 | `ccb ask <agent>` | 提交异步任务，记录返回的 `job_id` |
| 发任务后等待结果 | `ccb pend --watch <job_id>` | 流式观察直到完成（优先用 `job_id`，避免混入该 Agent 的其他任务） |
| Agent 内部需要结果继续处理 | `ccb ask --callback <agent>` | 链式委派，子任务完成后自动回传（Claude / Codex 支持；Kimi pane-log 模式不支持持续 watch） |
| 只需完成通知、不依赖回传 | `ccb ask --notify-sender <agent>` | 任务完成后向 sender inbox 发系统 notice（v7.0.9+；适合所有 provider，包括 Kimi） |
| 静默发送、不等待结果 | `ccb ask --silence <agent>` | 用户明确说"不用等回复"时用 |
| 多个 Agent 并行等全部结果 | `ccb wait-all <agent>...` | 头脑风暴、多视角审查时用 |
| 多个 Agent 等任意一个结果 | `ccb wait-any <agent>...` | 多方案竞争、先出先用时用 |
| 等 N 个 Agent 回复（法定多数）| `ccb wait-quorum <N> <agent>...` | 多数决策场景 |
| 检查 Agent 是否在线 | `ccb ping <agent>` | 注入前判断可用性 |
| 查看 Agent 收件箱通知 | `ccb inbox <agent>` | 查看 `--notify-sender` 通知和其他系统消息 |

---

## 完整命令列表

```bash
# 启动与停止
ccb              # 启动 Agent 团队
ccb -s           # 安全启动（禁用 CLI 自动权限覆盖）
ccb -n           # 重建运行时状态（保留配置）
ccb kill         # 停止项目运行时
ccb kill -f      # 强制清理运行时残留
ccb restart      # 重启所有 Agent pane
ccb restart <agent>  # 重启指定 Agent pane
ccb reload       # 动态应用支持的配置变更（v7.1.0+）
ccb reload --dry-run  # 预览 reload 计划（v7.1.0+）

# Agent 间通信
ccb ask <agent>                    # 向指定 Agent 委派任务（异步）
ccb ask --callback <agent>         # 链式委派（Agent 内部使用）
ccb ask --notify-sender <agent>    # 任务完成后通知发送方（v7.0.9+）
ccb ask --silence <agent>          # 静默发送，不等待结果

# 查看回复与状态
ccb pend <agent>                   # 查看 Agent 最新回复
ccb pend --watch <agent|job_id>    # 流式观察（优先传 job_id）
ccb watch <agent|job_id>           # 实时流式查看（兼容入口）
ccb inbox <agent>                  # 查看 Agent 收件箱
ccb mailbox_head <agent>           # 查看 Agent 邮箱头部（v6.2.x+）
ccb ping <agent|ccbd>              # 检查 Agent 或控制平面健康

# 等待与观察（v6.2.x+）
ccb wait-any <agent>...            # 等待任意 Agent 回复
ccb wait-all <agent>...            # 等待所有 Agent 回复
ccb wait-quorum <N> <agent>...     # 等待 N 个 Agent 回复

# Role Packs 与托管工具（v7.2.0+）
ccb roles add <role>                # 将 role 绑定到项目
ccb roles install <role>            # 安装 role 资产和依赖
ccb roles update <role>             # 刷新 role 资产
ccb tools install <tool>            # 安装托管工具
ccb tools doctor <tool>             # 诊断托管工具健康状态

# 诊断与调试
ccb doctor                         # 项目诊断
ccb doctor --output                # 导出诊断支持包
ccb ps                             # 运行时清单
ccb logs <agent>                   # 查看 Agent 日志
ccb queue                          # 查看任务队列状态
ccb queue --detail                 # 查看详细队列状态（v6.2.x+）
ccb config validate                # 验证 ccb.config
ccb cancel <job_id>                # 取消任务
ccb trace <id>                     # 查看任务/消息/回复的完整 lineage
ccb repair ack <agent>             # 确认 Agent 的回复/收件箱进度
ccb repair retry <id>              # 重试失败的任务
ccb clear [agent...]               # 发送 /clear 到 Agent pane
```

---

## 启动脚本

- `start.sh` — 启动 CCB
- `stop.sh` — 停止 CCB
- `restart.sh` — 重启 CCB
