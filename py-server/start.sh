#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# 检查虚拟环境，不存在则自动创建
if [ ! -d ".venv" ]; then
  echo "📦 未找到 .venv，正在创建..."
  python3 -m venv .venv
fi

# 安装/同步依赖（pyproject.toml → uv.lock → .venv）
if command -v uv &>/dev/null; then
  uv sync --quiet
else
  echo "⚠️  未安装 uv，请先安装：curl -LsSf https://astral.sh/uv/install.sh | sh"
  exit 1
fi

echo "🚀 启动 bfe-tools 后端 → http://localhost:8000"
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000 --log-level info --reload --reload-dir app
