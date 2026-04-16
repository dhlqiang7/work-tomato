#!/bin/bash
# Node.js 环境安装脚本 (Linux/macOS)
# 仅安装 Node.js 和 npm，不涉及本项目代码
# 适用于完全没有开发环境的用户

set -e

echo ""
echo "  ┌────────────────────────────────────┐"
echo "  │  Node.js 环境安装                   │"
echo "  │  本脚本仅安装 Node.js 22 LTS        │"
echo "  │  安装完成后请运行 ./install.sh      │"
echo "  └────────────────────────────────────┘"
echo ""

# 已安装则跳过
if command -v node &>/dev/null; then
    NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
    if [ "$NODE_VER" -ge 18 ]; then
        echo "  ✅ Node.js $(node -v) 已安装，无需操作"
        echo "  请直接运行 ./install.sh 安装项目"
        exit 0
    else
        echo "  ⚠️  Node.js $(node -v) 版本过低（需要 >= 18）"
    fi
fi

echo "  正在安装 Node.js 22 LTS ..."
echo ""

if [ "$(uname)" = "Darwin" ]; then
    # macOS
    if command -v brew &>/dev/null; then
        brew install node@22
    else
        echo "  ❌ 未检测到 Homebrew"
        echo ""
        echo "  请先安装 Homebrew："
        echo "    /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        echo ""
        echo "  或直接下载 Node.js："
        echo "    👉 https://nodejs.org/"
        exit 1
    fi

elif command -v apt-get &>/dev/null; then
    # Debian / Ubuntu
    sudo apt-get update -qq
    sudo apt-get install -y -qq curl
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y -qq nodejs

elif command -v yum &>/dev/null; then
    # CentOS / RHEL
    sudo yum install -y curl
    curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
    sudo yum install -y nodejs

elif command -v dnf &>/dev/null; then
    # Fedora
    sudo dnf install -y nodejs

elif command -v pacman &>/dev/null; then
    # Arch Linux
    sudo pacman -S --noconfirm nodejs npm

else
    echo "  ❌ 无法识别的系统，请手动安装 Node.js 18+"
    echo "  👉 https://nodejs.org/"
    exit 1
fi

# 验证
echo ""
if command -v node &>/dev/null; then
    echo "  ✅ Node.js $(node -v)"
    echo "  ✅ npm $(npm -v)"
    echo ""
    echo "  环境安装完成，请运行 ./install.sh 安装项目"
else
    echo "  ❌ 安装失败，请手动安装：👉 https://nodejs.org/"
    exit 1
fi
