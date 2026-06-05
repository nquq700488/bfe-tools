#!/bin/bash
# 一键启动所有开发服务
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

cleanup() {
  echo ""
  echo "🛑 正在关闭..."
  kill $SERVER_PID $WEB_PID 2>/dev/null
  wait $SERVER_PID $WEB_PID 2>/dev/null
  echo "✅ 已关闭"
}
trap cleanup EXIT INT TERM

# 启动后端
echo "🔵 启动后端 → http://localhost:8000"
cd "$ROOT/server" && bash start.sh &
SERVER_PID=$!

# 等后端就绪
sleep 2

# 启动前端
echo "🟢 启动前端 → http://localhost:5173"
cd "$ROOT/web" && pnpm dev &
WEB_PID=$!

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  后端: http://localhost:8000"
echo "  前端: http://localhost:5173"
echo "  Ctrl+C 关闭所有服务"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

wait
