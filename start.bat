@echo off
chcp 65001 >nul 2>nul
setlocal

echo.
echo   🍅 Tomato - 启动中...
echo.

:: 检查是否已构建
if not exist "%~dp0dist\index.html" (
    echo   ⚠️  未检测到构建产物，正在首次构建...
    call npm install
    call npx vite build
    if %errorlevel% neq 0 (
        echo   ❌ 构建失败，请先运行 install.bat
        pause
        exit /b 1
    )
)

:: 启动服务
node "%~dp0server\index.js"

:: 如果服务异常退出
if %errorlevel% neq 0 (
    echo.
    echo   ❌ 启动失败，错误代码：%errorlevel%
    echo.
    pause
)
