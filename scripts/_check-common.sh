#!/bin/bash
# 规范检查公共函数库
# 被 validate-spec.sh 和 spec-integrity.test 共享引用
#
# 用法：source "$(dirname "${BASH_SOURCE[0]}")/_check-common.sh"

set -euo pipefail

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 获取项目根目录
get_project_dir() {
  echo "$(cd "$(dirname "${BASH_SOURCE[1]}")/.." && pwd)"
}

resolve_markdown_ref() {
  local project_dir="$1"
  local source_file="$2"
  local ref="$3"
  local source_dir
  source_dir="$(dirname "$source_file")"

  if [[ "$ref" == ../* || "$ref" == ./* ]]; then
    echo "$source_dir/$ref"
  elif [[ "$ref" == .* ]]; then
    echo "$project_dir/$ref"
  elif [[ "$ref" == AGENTS.md || "$ref" == CLAUDE.md || "$ref" == AI_MEMORY.md || "$ref" == TASK_MEMORY.md ]]; then
    echo "$project_dir/$ref"
  elif [[ "$ref" == /* ]]; then
    echo "$ref"
  elif [[ -f "$source_dir/$ref" || -d "$source_dir/$ref" ]]; then
    echo "$source_dir/$ref"
  else
    echo "$project_dir/.agents/$ref"
  fi
}

is_template_ref() {
  local ref="$1"
  [[ "$ref" == *'{'* || "$ref" == *'}'* || "$ref" == *'['* || "$ref" == *']'* ]]
}

should_check_markdown_ref() {
  local project_dir="$1"
  local source_file="$2"
  local ref="$3"
  local source_dir
  source_dir="$(dirname "$source_file")"

  is_template_ref "$ref" && return 1
  [[ "$ref" == *[[:space:]]* || "$ref" == *'*'* ]] && return 1
  if [[ "$ref" == .* || "$ref" == /* || "$ref" == ../* || "$ref" == ./* ]]; then
    local first_segment="${ref#./}"
    first_segment="${first_segment%%/*}"
    [[ "$ref" == ../* || "$ref" == ./* || -e "$project_dir/$first_segment" ]] && return 0
    return 1
  fi
  [[ "$ref" == AGENTS.md || "$ref" == CLAUDE.md || "$ref" == AI_MEMORY.md || "$ref" == TASK_MEMORY.md ]] && return 0
  [[ "$ref" == skills/* ]] && return 0
  [[ -f "$source_dir/$ref" || -d "$source_dir/$ref" ]] && return 0
  [[ -f "$project_dir/.agents/$ref" || -d "$project_dir/.agents/$ref" ]] && return 0

  return 1
}

check_ref_exists() {
  local project_dir="$1"
  local source_file="$2"
  local ref="$3"
  local errors=0

  if is_template_ref "$ref"; then
    echo -e "  ${YELLOW}!${NC} $ref (模板占位符，跳过)"
    return 0
  fi

  local target
  target="$(resolve_markdown_ref "$project_dir" "$source_file" "$ref")"

  if [[ -f "$target" || -d "$target" ]]; then
    echo -e "  ${GREEN}✓${NC} $ref"
  else
    echo -e "  ${RED}✗${NC} $ref (引用目标不存在)"
    ((errors++)) || true
  fi

  return "$errors"
}

# --- 检查 1：核心规范文件存在性 ---
check_core_files() {
  local project_dir="$1"
  local -a CORE_FILES=(
    "AGENTS.md"
    "CLAUDE.md"
    "AI_MEMORY.md"
    "TASK_MEMORY.md"
    ".agents/workflow.md"
    ".agents/task-routing.md"
    ".agents/execution-mode-guidelines.md"
    ".agents/coding-standards.md"
    ".agents/coding-standards/common.md"
    ".agents/coding-standards/typescript.md"
    ".agents/git-workflow.md"
    ".agents/quality-checklist.md"
    ".agents/testing-guidelines.md"
    ".agents/collaboration.md"
    ".agents/orchestrator.md"
    ".agents/agent-registry.md"
    ".agents/skills.md"
    ".agents/spec-governance.md"
    ".agents/context-compression-guidelines.md"
  )

  local errors=0
  for file in "${CORE_FILES[@]}"; do
    if [[ -f "$project_dir/$file" ]]; then
      echo -e "  ${GREEN}✓${NC} $file"
    else
      echo -e "  ${RED}✗${NC} $file (缺失)"
      ((errors++)) || true
    fi
  done
  return "$errors"
}

# --- 检查 2：AGENTS.md 引用完整性 ---
check_agents_refs() {
  local project_dir="$1"
  local AGENTS_FILE="$project_dir/AGENTS.md"
  local errors=0

  if [[ ! -f "$AGENTS_FILE" ]]; then
    echo -e "  ${RED}✗${NC} AGENTS.md 不存在"
    return 1
  fi

  local -a REFS
  mapfile -t REFS < <(grep -oE '\`[^`]+\.md\`' "$AGENTS_FILE" | tr -d '\`' | sort -u)

  for ref in "${REFS[@]}"; do
    check_ref_exists "$project_dir" "$AGENTS_FILE" "$ref" || ((errors+= $?)) || true
  done
  return "$errors"
}

# --- 检查 3：全仓 Markdown 反引号引用完整性 ---
check_all_markdown_refs() {
  local project_dir="$1"
  local errors=0
  local -a files

  mapfile -t files < <(
    find "$project_dir" \
      -path "$project_dir/.git" -prune -o \
      -path "$project_dir/.ccb/agents" -prune -o \
      -path "$project_dir/.ccb/ccbd" -prune -o \
      -path "$project_dir/.ccb/runtime" -prune -o \
      -path "$project_dir/.ccb/shared-cache" -prune -o \
      -path "$project_dir/.ccb/state" -prune -o \
      -name '*.md' -type f -print | sort
  )

  for file in "${files[@]}"; do
    local -a refs
    mapfile -t refs < <(grep -oE '\`[^`]+\.md\`' "$file" | tr -d '\`' | sort -u || true)
    [[ "${#refs[@]}" -eq 0 ]] && continue

    local display_file="${file#$project_dir/}"
    echo "  $display_file"
    for ref in "${refs[@]}"; do
      should_check_markdown_ref "$project_dir" "$file" "$ref" || continue
      check_ref_exists "$project_dir" "$file" "$ref" || ((errors+= $?)) || true
    done
  done

  return "$errors"
}

# --- 检查 4：Skill 路由完整性 ---
check_skill_routes() {
  local project_dir="$1"
  local COMMANDS_DIR="$project_dir/.claude/commands"
  local errors=0

  if [[ ! -d "$COMMANDS_DIR" ]]; then
    echo -e "  ${YELLOW}!${NC} .claude/commands/ 目录不存在"
    return 0
  fi

  for cmd_file in "$COMMANDS_DIR"/*.md; do
    if [[ -f "$cmd_file" ]]; then
      local cmd_name=$(basename "$cmd_file" .md)
      local skill_ref=$(grep -oE 'skills/[^/]+/SKILL\.md' "$cmd_file" || true)
      if [[ -n "$skill_ref" ]]; then
        local skill_path="$project_dir/.agents/$skill_ref"
        if [[ -f "$skill_path" ]]; then
          echo -e "  ${GREEN}✓${NC} $cmd_name → $skill_ref"
        else
          echo -e "  ${RED}✗${NC} $cmd_name → $skill_ref (目标不存在)"
          ((errors++)) || true
        fi
      else
        echo -e "  ${YELLOW}!${NC} $cmd_name (未检测到 skill 路由)"
      fi
    fi
  done
  return "$errors"
}

# --- 检查 5：Skill 目录结构 ---
check_skill_dirs() {
  local project_dir="$1"
  local SKILLS_DIR="$project_dir/.agents/skills"
  local errors=0

  if [[ ! -d "$SKILLS_DIR" ]]; then
    echo -e "  ${YELLOW}!${NC} .agents/skills/ 目录不存在"
    return 0
  fi

  for skill_dir in "$SKILLS_DIR"/*/; do
    if [[ -d "$skill_dir" ]]; then
      local skill_name=$(basename "$skill_dir")
      local skill_md="$skill_dir/SKILL.md"
      if [[ -f "$skill_md" ]]; then
        echo -e "  ${GREEN}✓${NC} $skill_name/SKILL.md"
      else
        echo -e "  ${RED}✗${NC} $skill_name/ 缺少 SKILL.md"
        ((errors++)) || true
      fi
    fi
  done
  return "$errors"
}
