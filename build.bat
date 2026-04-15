@echo off
chcp 65001 >/dev/null 2>nul
setlocal EnableDelayedExpansion

echo.
echo   Tomato - 打包为 EXE
echo.

:: 检查 Node.js
where node >/dev/null 2>nul
if %errorlevel% neq 0 (
    echo   未检测到 Node.js，请先安装 Node.js 18+
    pause
    exit /b 1
)

:: 检查是否已安装依赖
if not exist "%~dp0node_modules\electron" (
    echo   [1/3] 安装依赖...
    call npm install
    if %errorlevel% neq 0 (
        echo   依赖安装失败
        pause
        exit /b 1
    )
) else (
    echo   [1/3] 依赖已就绪
)

:: 清理旧构建
if exist "%~dp0dist" (
    echo   清理旧构建...
    rd /s /q "%~dp0dist"
)
if exist "%~dp0dist-electron" (
    rd /s /q "%~dp0dist-electron"
)

:: 构建前端
echo   [2/3] 构建前端资源...
call npx vite build
if %errorlevel% neq 0 (
    echo   前端构建失败
    pause
    exit /b 1
)
echo   前端构建完成

:: 打包 Electron
echo   [3/3] 打包 Electron 应用...
echo   （首次打包会下载 Electron 二进制，请耐心等待）
call npx electron-builder --win
if %errorlevel% neq 0 (
    echo.
    echo   打包失败
    echo   如果是网络问题，可尝试设置国内镜像：
    echo   set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
    echo   然后重新运行此脚本
    pause
    exit /b 1
)

echo.
echo   打包成功！
echo.
echo   安装包位置：
for %%f in (dist-electron\*.exe) do echo   %%f
echo.
echo   可直接双击 exe 文件安装使用。
echo.
pause
