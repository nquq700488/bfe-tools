#!/bin/bash
# 一键启动所有开发服务（支持复用已运行的服务）
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

BE_PORT=8000
FE_PORT_BASE=5173

# 检测端口是否已被监听
port_listening() {
  lsof -nP -i:"$1" 2>/dev/null | grep -q LISTEN
}

# ── 后端 ──
BE_REUSED=false
if port_listening $BE_PORT; then
  echo "♻️  后端已运行 (:$BE_PORT)，复用"
  BE_REUSED=true
else
  echo "🔵 启动后端 → http://localhost:$BE_PORT"
  cd "$ROOT/server" && bash start.sh &
  SERVER_PID=$!
  sleep 2
fi

# ── 前端（扫描 5173-5179）──
FE_REUSED=false
FE_PORT=$FE_PORT_BASE
for port in $(seq 5173 5179); do
  if port_listening $port; then
    FE_PORT=$port
    FE_REUSED=true
    break
  fi
done

if [ "$FE_REUSED" = true ]; then
  echo "♻️  前端已运行 (:$FE_PORT)，复用"
else
  echo "🟢 启动前端 → http://localhost:$FE_PORT_BASE"
  cd "$ROOT/web" && pnpm dev &
  WEB_PID=$!
  FE_PORT=$FE_PORT_BASE
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  后端: http://localhost:$BE_PORT"
echo "  前端: http://localhost:$FE_PORT"
echo "  Ctrl+C 关闭所有服务"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 全是复用的，无需 trap
if [ "$BE_REUSED" = true ] && [ "$FE_REUSED" = true ]; then
  echo ""
  echo "💡 所有服务均为复用，无需管理。使用 pnpm kill 关闭。"
  exit 0
fi

cleanup() {
  echo ""
  echo "🛑 正在关闭..."
  [ "$BE_REUSED" = false ] && [ -n "${SERVER_PID:-}" ] && kill $SERVER_PID 2>/dev/null || true
  [ "$FE_REUSED" = false ] && [ -n "${WEB_PID:-}" ] && kill $WEB_PID 2>/dev/null || true
  wait 2>/dev/null || true
  echo "✅ 已关闭"
}
trap cleanup EXIT INT TERM

# 等待新启动的进程
PIDS=()
[ "$BE_REUSED" = false ] && [ -n "${SERVER_PID:-}" ] && PIDS+=($SERVER_PID)
[ "$FE_REUSED" = false ] && [ -n "${WEB_PID:-}" ] && PIDS+=($WEB_PID)
[ ${#PIDS[@]} -gt 0 ] && wait ${PIDS[@]}
