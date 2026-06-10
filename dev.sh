#!/bin/bash
# 一键启动所有开发服务（支持复用已运行的服务，自动检测 bun / pnpm）
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

# 自动选择 JS 包管理器
if command -v bun &>/dev/null; then
  PKG_MGR="bun"
  PKG_RUN="bun run"
elif command -v pnpm &>/dev/null; then
  PKG_MGR="pnpm"
  PKG_RUN="pnpm"
else
  PKG_MGR="npm"
  PKG_RUN="npm run"
fi

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
  cd "$ROOT/py-server" && bash start.sh &
  SERVER_PID=$!
  # 等待后端就绪（最长 60s，torch/easyocr 首次加载需 30s+）
  for i in $(seq 1 60); do
    if curl -s http://localhost:$BE_PORT/openapi.json > /dev/null 2>&1; then
      echo "   ✅ 后端就绪 (${i}s)"
      break
    fi
    sleep 1
  done
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
  echo "🟢 启动前端 → http://localhost:$FE_PORT_BASE ($PKG_MGR)"
  cd "$ROOT/web" && $PKG_MGR dev &
  WEB_PID=$!
  FE_PORT=$FE_PORT_BASE
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  后端: http://localhost:$BE_PORT"
echo "  前端: http://localhost:$FE_PORT"
[ "$BUN_REUSED" = true ] || [ -n "${BUN_PID:-}" ] && echo "  Bun:   http://localhost:$BUN_PORT"
echo "  Ctrl+C 关闭所有服务"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

BUN_PORT=3999

# ── Bun 服务 ──
BUN_REUSED=false
if port_listening $BUN_PORT; then
  echo "♻️  Bun 服务已运行 (:$BUN_PORT)，复用"
  BUN_REUSED=true
elif command -v bun &>/dev/null; then
  echo "🟡 启动 Bun 服务 → http://localhost:$BUN_PORT"
  cd "$ROOT/bun-server" && bun dev &
  BUN_PID=$!
else
  echo "⚠️  未安装 bun，跳过 Bun 服务（API 测试/HTML CSS 工具需要）"
fi

# 全是复用的，无需 trap
if [ "$BE_REUSED" = true ] && [ "$FE_REUSED" = true ] && [ "$BUN_REUSED" = true ]; then
  echo ""
  echo "all services reused, use: pnpm kill"
  exit 0
fi

cleanup() {
  echo ""
  echo "🛑 正在关闭..."
  [ "$BE_REUSED" = false ] && [ -n "${SERVER_PID:-}" ] && kill $SERVER_PID 2>/dev/null || true
  [ "$FE_REUSED" = false ] && [ -n "${WEB_PID:-}" ] && kill $WEB_PID 2>/dev/null || true
  [ "$BUN_REUSED" = false ] && [ -n "${BUN_PID:-}" ] && kill $BUN_PID 2>/dev/null || true
  wait 2>/dev/null || true
  echo "✅ 已关闭"
}
trap cleanup EXIT INT TERM

# 等待新启动的进程
PIDS=()
[ "$BE_REUSED" = false ] && [ -n "${SERVER_PID:-}" ] && PIDS+=($SERVER_PID)
[ "$FE_REUSED" = false ] && [ -n "${WEB_PID:-}" ] && PIDS+=($WEB_PID)
[ "$BUN_REUSED" = false ] && [ -n "${BUN_PID:-}" ] && PIDS+=($BUN_PID)
[ ${#PIDS[@]} -gt 0 ] && wait ${PIDS[@]}
