#!/bin/bash
# Tomato 打包脚本 (Linux/macOS)

set -e
cd "$(dirname "$0")"

echo ""
echo "  🍅 Tomato - 打包桌面应用"
echo ""

# 检查 Node.js
command -v node &>/dev/null || { echo "  ❌ 未检测到 Node.js"; exit 1; }

# 安装依赖
if [ ! -d "node_modules/electron" ]; then
    echo "  [1/3] 安装依赖..."
    npm install
else
    echo "  [1/3] 依赖已就绪 ✓"
fi

# 构建前端
echo "  [2/3] 构建前端资源..."
rm -rf dist/ dist-electron/
npx vite build
echo "  ✅ 前端构建完成"

# 打包
echo "  [3/3] 打包 Electron 应用..."
OS_FLAG=""
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS_FLAG="--mac"
else
    OS_FLAG="--linux"
fi

npx electron-builder $OS_FLAG

echo ""
echo "  ✅ 打包成功！安装包在 dist-electron/ 目录"
echo ""
