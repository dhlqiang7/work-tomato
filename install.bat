@echo off
chcp 65001 >nul 2>nul
setlocal EnableDelayedExpansion

echo.
echo   ╔══════════════════════════════════════╗
echo   ║   🍅 Tomato - 个人工作助理           ║
echo   ║   安装向导                           ║
echo   ╚══════════════════════════════════════╝
echo.

:: ====== 1. 检查 Node.js ======
echo   [1/4] 检查 Node.js 环境...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo   ❌ 未检测到 Node.js
    echo.
    echo   请先安装 Node.js 18 或更高版本：
    echo   👉 https://nodejs.org/
    echo.
    echo   安装时请勾选 "Add to PATH" 选项。
    echo.
    pause
    exit /b 1
)

:: 检查 Node.js 版本
for /f "tokens=1 delims=." %%v in ('node -v 2^>nul') do set NODE_VER=%%v
set NODE_VER=%NODE_VER:v=%
if %NODE_VER% lss 18 (
    echo.
    echo   ❌ Node.js 版本过低：当前 v%NODE_VER%，需要 18+
    echo   请前往 https://nodejs.org/ 升级。
    echo.
    pause
    exit /b 1
)
for /f "delims=" %%v in ('node -v') do echo   ✅ Node.js %%v

:: ====== 2. 检查 npm ======
echo   [2/4] 检查 npm...
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo   ❌ 未检测到 npm
    pause
    exit /b 1
)
for /f "delims=" %%v in ('npm -v') do echo   ✅ npm %%v

:: ====== 3. 安装依赖 ======
echo.
echo   [3/4] 安装项目依赖...
call npm install
if %errorlevel% neq 0 (
    echo.
    echo   ❌ 依赖安装失败，请检查网络连接后重试。
    pause
    exit /b 1
)
echo   ✅ 依赖安装完成

:: ====== 4. 构建前端 ======
echo.
echo   [4/4] 构建前端资源...
call npx vite build
if %errorlevel% neq 0 (
    echo.
    echo   ❌ 构建失败，请检查错误信息。
    pause
    exit /b 1
)
echo   ✅ 构建完成

:: ====== 完成 ======
echo.
echo   ╔══════════════════════════════════════╗
echo   ║   ✅ 安装成功！                      ║
echo   ║                                      ║
echo   ║   运行 start.bat 启动应用            ║
echo   ╚══════════════════════════════════════╝
echo.
pause
