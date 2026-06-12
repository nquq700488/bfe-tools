#!/bin/bash
# 规范完整性验证脚本
# 用途：检查 AGENTS.md 引用的所有规范文件是否存在，交叉引用是否断裂

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
AGENTS_FILE="$PROJECT_DIR/AGENTS.md"

# 加载公共检查函数
source "$SCRIPT_DIR/_check-common.sh"

ERRORS=0
WARNINGS=0

echo "========================================"
echo "  规范完整性验证"
echo "  项目目录: $PROJECT_DIR"
echo "========================================"
echo ""

# 检查 AGENTS.md 是否存在
if [[ ! -f "$AGENTS_FILE" ]]; then
    echo -e "${RED}错误: AGENTS.md 不存在${NC}"
    exit 1
fi

# ---------- [1/6] AGENTS.md 引用完整性 ----------
echo "[1/6] 检查 AGENTS.md 引用完整性..."
check_agents_refs "$PROJECT_DIR" || ((ERRORS+= $?)) || true
echo ""

# ---------- [2/6] 全仓 Markdown 引用完整性 ----------
echo "[2/6] 检查全仓 Markdown 引用完整性..."
check_all_markdown_refs "$PROJECT_DIR" || ((ERRORS+= $?)) || true
echo ""

# ---------- [3/6] 核心文件存在性 ----------
echo "[3/6] 检查核心规范文件..."
check_core_files "$PROJECT_DIR" || ((ERRORS+= $?)) || true
echo ""

# ---------- [4/6] Skill 路由完整性 ----------
echo "[4/6] 检查 .claude/commands/ 路由文件..."
check_skill_routes "$PROJECT_DIR" || ((ERRORS+= $?)) || true
echo ""

# ---------- [5/6] Skill 目录结构 ----------
echo "[5/6] 检查 .agents/skills/ 目录..."
skill_count=$(find "$PROJECT_DIR/.agents/skills" -maxdepth 1 -type d 2>/dev/null | wc -l)
skill_count=$((skill_count - 1))
echo "  发现 $skill_count 个 skill 目录"
check_skill_dirs "$PROJECT_DIR" || ((ERRORS+= $?)) || true
echo ""

# ---------- [6/6] CCB 配置 ----------
echo "[6/6] 检查 .ccb/ 配置..."
CCB_CONFIG="$PROJECT_DIR/.ccb/ccb.config"
if [[ -f "$CCB_CONFIG" ]]; then
    echo -e "  ${GREEN}✓${NC} .ccb/ccb.config 存在"
    agent_count=$(grep -cE '^\s*\(' "$CCB_CONFIG" || true)
    if [[ "$agent_count" -gt 0 ]]; then
        echo "  发现 $agent_count 个 agent 配置组"
    fi
else
    echo -e "  ${YELLOW}!${NC} .ccb/ccb.config 不存在（若无 CCB 可忽略）"
fi

echo ""
echo "========================================"
echo "  验证结果"
echo "========================================"
if [[ $ERRORS -eq 0 ]]; then
    echo -e "  ${GREEN}错误: 0${NC}"
else
    echo -e "  ${RED}错误: $ERRORS${NC}"
fi
echo "  警告: $WARNINGS"
echo ""

if [[ $ERRORS -gt 0 ]]; then
    echo -e "${RED}验证失败，请修复上述错误${NC}"
    exit 1
else
    echo -e "${GREEN}验证通过 ✓${NC}"
    exit 0
fi
