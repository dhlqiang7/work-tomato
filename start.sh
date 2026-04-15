#!/bin/bash
# Tomato 启动脚本 (Linux/macOS)

set -e
cd "$(dirname "$0")"

echo ""
echo "  🍅 Tomato - 启动中..."
echo ""

# 检查是否已构建
if [ ! -f "dist/index.html" ]; then
    echo "  ⚠️  未检测到构建产物，正在首次构建..."
    npm install
    npx vite build
fi

# 启动
node server/index.js
