#!/bin/bash
# 项目诊断脚本
# 用途：诊断 CCB 配置、规范完整性、Agent 在线状态

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

ERRORS=0
WARNINGS=0

echo "========================================"
echo "  AI 规范体系诊断 (doctor)"
echo "  项目: $(basename "$PROJECT_DIR")"
echo "========================================"
echo ""

# ---------- 1. CCB 环境检查 ----------
echo "[1/5] CCB 环境检查..."

if command -v ccb &> /dev/null; then
  echo "  ✓ ccb 命令已安装"
  
  # 检查控制平面
  if ccb ping ccbd &> /dev/null; then
    echo "  ✓ ccbd 控制平面在线"
  else
    echo "  ! ccbd 控制平面未响应（尝试启动...）"
    if command -v ccb &> /dev/null; then
      echo "    可运行 'ccb' 启动控制平面"
    fi
    ((WARNINGS++)) || true
  fi
  
  # 检查 ccb.config
  CCB_CONFIG="$PROJECT_DIR/.ccb/ccb.config"
  if [[ -f "$CCB_CONFIG" ]]; then
    echo "  ✓ .ccb/ccb.config 存在"
    
    # 检查各 agent 是否在线
    if ccb ping ccbd &> /dev/null; then
      echo "  检查已配置 agent..."
      # 简单解析 ccb.config 中的 agent 名
      mapfile -t AGENTS < <(grep -oE '[a-zA-Z0-9_-]+:' "$CCB_CONFIG" | tr -d ':' | sort -u)
      for agent in "${AGENTS[@]}"; do
        if ccb ping "$agent" &> /dev/null; then
          echo "    ✓ $agent 在线"
        else
          echo "    ! $agent 离线或未配置"
          ((WARNINGS++)) || true
        fi
      done
    fi
  else
    echo "  ! .ccb/ccb.config 不存在（若无 CCB 可忽略）"
    ((WARNINGS++)) || true
  fi
else
  echo "  ! ccb 命令未找到（若无 CCB 可忽略）"
  ((WARNINGS++)) || true
fi

# ---------- 2. 规范完整性检查 ----------
echo ""
echo "[2/5] 规范完整性检查..."

if ! bash "$SCRIPT_DIR/validate-spec.sh"; then
    ((ERRORS++))
  fi

# ---------- 3. Git 工作区检查 ----------
echo ""
echo "[3/5] Git 工作区检查..."

if git -C "$PROJECT_DIR" rev-parse --git-dir &> /dev/null; then
  echo "  ✓ Git 仓库已初始化"
  
  # 检查未提交变更
  if [[ -n $(git -C "$PROJECT_DIR" status --short) ]]; then
    echo "  ! 工作区存在未提交变更："
    git -C "$PROJECT_DIR" status --short | sed 's/^/    /'
    ((WARNINGS++)) || true
  else
    echo "  ✓ 工作区干净"
  fi
  
  # 检查当前分支
  CURRENT_BRANCH=$(git -C "$PROJECT_DIR" branch --show-current)
  echo "  当前分支: $CURRENT_BRANCH"
  
  if [[ "$CURRENT_BRANCH" == "main" || "$CURRENT_BRANCH" == "master" ]]; then
    echo "  ⚠  当前在 main/master 分支，注意保护分支规范"
    ((WARNINGS++)) || true
  fi
else
  echo "  ! 未找到 Git 仓库"
fi

# ---------- 4. 记忆文件状态 ----------
echo ""
echo "[4/5] 记忆文件状态..."

AI_MEMORY="$PROJECT_DIR/AI_MEMORY.md"
TASK_MEMORY="$PROJECT_DIR/TASK_MEMORY.md"

if [[ -f "$AI_MEMORY" ]]; then
  AI_LINES=$(wc -l < "$AI_MEMORY")
  echo "  ✓ AI_MEMORY.md ($AI_LINES 行)"
else
  echo "  ! AI_MEMORY.md 不存在"
fi

if [[ -f "$TASK_MEMORY" ]]; then
  TASK_LINES=$(wc -l < "$TASK_MEMORY")
  echo "  ✓ TASK_MEMORY.md ($TASK_LINES 行)"
else
  echo "  ! TASK_MEMORY.md 不存在"
fi

# ---------- 5. 环境依赖检查 ----------
echo ""
echo "[5/5] 环境依赖检查..."

# Node.js
if command -v node &> /dev/null; then
  NODE_VERSION=$(node --version)
  echo "  ✓ Node.js $NODE_VERSION"
else
  echo "  ! Node.js 未安装"
fi

# 包管理器
for pm in pnpm yarn npm bun; do
  if command -v "$pm" &> /dev/null; then
    PM_VERSION=$($pm --version 2>/dev/null || echo "unknown")
    echo "  ✓ $pm $PM_VERSION"
    break
  fi
done

# ---------- 结果汇总 ----------
echo ""
echo "========================================"
echo "  诊断结果"
echo "========================================"

echo "  错误: $ERRORS"
echo "  警告: $WARNINGS"
echo ""

if [[ $ERRORS -gt 0 ]]; then
  echo "  发现错误，建议立即修复 ✗"
  exit 1
elif [[ $WARNINGS -gt 0 ]]; then
  echo "  有警告，但核心功能正常 ⚠"
  exit 0
else
  echo "  一切正常 ✓"
  exit 0
fi
