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

# 优先使用 Electron 桌面模式
if [ -f "node_modules/electron/dist/electron" ]; then
    echo "  启动桌面应用模式..."
    npx electron .
else
    echo "  Electron 未安装，使用浏览器模式..."
    node server/index.js
fi
