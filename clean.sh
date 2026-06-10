#!/bin/bash
# bfe-tools 清理脚本
#   - 运行时数据：自动清理
#   - 缓存文件（模型缓存等）：交互确认

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_DIR="$SCRIPT_DIR/py-server"
WEB_DIR="$SCRIPT_DIR/web"
DESKTOP_DIR="$SCRIPT_DIR/desktop"

echo "
 清理 bfe-tools"
echo ""

# ================================
# 一、运行时数据（自动清理，无需确认）
# ================================

echo "┌─ 运行时数据 ──────────────────────────────"

# data 目录
if [ -d "$SERVER_DIR/data" ]; then
    for subdir in uploads results temp; do
        if [ -d "$SERVER_DIR/data/$subdir" ]; then
            SIZE=$(du -sh "$SERVER_DIR/data/$subdir" 2>/dev/null | cut -f1)
            rm -rf "$SERVER_DIR/data/$subdir"/*
            echo "│  ✅ data/$subdir/ — $SIZE"
        fi
    done
    mkdir -p "$SERVER_DIR/data/uploads" "$SERVER_DIR/data/results" "$SERVER_DIR/data/temp"
fi

# Python 编译缓存
find "$SERVER_DIR" -name "__pycache__" -type d -not -path "*.venv*" -exec rm -rf {} + 2>/dev/null
find "$SERVER_DIR" -name "*.pyc" -type f   -not -path "*.venv*" -delete 2>/dev/null
echo "│  ✅ __pycache__ / *.pyc"

# Vite 编译缓存
if [ -d "$WEB_DIR/node_modules/.vite" ]; then
    rm -rf "$WEB_DIR/node_modules/.vite"
    echo "│  ✅ node_modules/.vite"

	# 桌面端旧数据目录（之前版本使用，现已迁移到共享 server/data/）
	if [ -d "$HOME/Library/Application Support/com.bfe.tools" ]; then
	    SIZE=$(du -sh "$HOME/Library/Application Support/com.bfe.tools" 2>/dev/null | cut -f1)
	    rm -rf "$HOME/Library/Application Support/com.bfe.tools"
	    echo "│  ✅ 桌面端旧数据目录 — $SIZE"
	fi

fi

# 前端 dist
if [ -d "$WEB_DIR/dist" ]; then
    SIZE=$(du -sh "$WEB_DIR/dist" 2>/dev/null | cut -f1)
    rm -rf "$WEB_DIR/dist"
    echo "│  ✅ dist/ — $SIZE"
fi

# 桌面端 Tauri 构建产物
if [ -d "$DESKTOP_DIR/src-tauri/target" ]; then
    SIZE=$(du -sh "$DESKTOP_DIR/src-tauri/target" 2>/dev/null | cut -f1)
    rm -rf "$DESKTOP_DIR/src-tauri/target"
    echo "│  ✅ desktop/src-tauri/target/ — $SIZE"
fi

echo "└────────────────────────────────────────────"
echo ""

# ================================
# 二、缓存文件（交互确认）
# ================================

echo "┌─ 模型缓存文件 ────────────────────────────"

# 收集现有缓存信息
CACHE_ITEMS=()

if [ -d "$HOME/.EasyOCR" ]; then
    SIZE=$(du -sh "$HOME/.EasyOCR" 2>/dev/null | cut -f1)
    CACHE_ITEMS+=("  easyocr 模型 → $HOME/.EasyOCR ($SIZE)")
fi

if [ -d "$HOME/.cache/huggingface" ]; then
    SIZE=$(du -sh "$HOME/.cache/huggingface" 2>/dev/null | cut -f1)
    # 列出子目录
    for d in "$HOME/.cache/huggingface/hub"/models--*/; do
        [ -d "$d" ] || continue
        SUB_SIZE=$(du -sh "$d" 2>/dev/null | cut -f1)
        BASENAME=$(basename "$d")
        echo "│  📦 $BASENAME ($SUB_SIZE)"
    done
    CACHE_ITEMS+=("  HuggingFace 全部 → $HOME/.cache/huggingface ($SIZE)")
fi

if [ -d "$HOME/.cache/modelscope" ]; then
    SIZE=$(du -sh "$HOME/.cache/modelscope" 2>/dev/null | cut -f1)
    CACHE_ITEMS+=("  modelscope 全部 → $HOME/.cache/modelscope ($SIZE)")
fi

if [ ${#CACHE_ITEMS[@]} -eq 0 ]; then
    echo "│  （无模型缓存文件）"
    echo "└────────────────────────────────────────────"
else
    echo "└────────────────────────────────────────────"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  以上缓存文件删除后需重新下载，可能较慢"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    read -r -p "是否删除这些缓存文件？[y/N] " DELETE_CACHE
    echo ""

    if [ "$DELETE_CACHE" = "y" ] || [ "$DELETE_CACHE" = "Y" ]; then
        [ -d "$HOME/.EasyOCR" ]            && rm -rf "$HOME/.EasyOCR"            && echo "  ✅ easyocr 模型缓存已删除"
        [ -d "$HOME/.cache/huggingface" ]  && rm -rf "$HOME/.cache/huggingface"  && echo "  ✅ HuggingFace 缓存已删除"
        [ -d "$HOME/.cache/modelscope" ]   && rm -rf "$HOME/.cache/modelscope"   && echo "  ✅ modelscope 缓存已删除"
        echo ""
    else
        echo "  跳过"
        echo ""
    fi
fi

echo " 清理完成"
