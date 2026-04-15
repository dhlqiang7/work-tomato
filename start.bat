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

:: 优先使用 Electron 桌面模式
where npx >nul 2>nul
if exist "%~dp0node_modules\electron\dist\electron.exe" (
    echo   启动桌面应用模式...
    npx electron .
) else (
    echo   Electron 未安装，使用浏览器模式...
    node "%~dp0server\index.js"
)

if %errorlevel% neq 0 (
    echo.
    echo   ❌ 启动失败，错误代码：%errorlevel%
    pause
)
