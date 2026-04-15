#!/bin/bash
# Tomato 安装脚本 (Linux/macOS)

set -e

echo ""
echo "  🍅 Tomato - 安装向导"
echo ""

# 检查 Node.js
echo "  [1/4] 检查 Node.js..."
if ! command -v node &>/dev/null; then
    echo "  ❌ 未检测到 Node.js，请先安装 Node.js 18+"
    echo "  👉 https://nodejs.org/"
    exit 1
fi
NODE_VER=$(node -v | cut -d. -f1 | tr -d 'v')
if [ "$NODE_VER" -lt 18 ]; then
    echo "  ❌ Node.js 版本过低：$(node -v)，需要 v18+"
    exit 1
fi
echo "  ✅ Node.js $(node -v)"

# 检查 npm
echo "  [2/4] 检查 npm..."
command -v npm &>/dev/null || { echo "  ❌ 未检测到 npm"; exit 1; }
echo "  ✅ npm $(npm -v)"

# 安装依赖
echo "  [3/4] 安装项目依赖..."
npm install
echo "  ✅ 依赖安装完成"

# 构建
echo "  [4/4] 构建前端资源..."
npx vite build
echo "  ✅ 构建完成"

echo ""
echo "  ✅ 安装成功！运行 ./start.sh 启动应用"
echo ""
