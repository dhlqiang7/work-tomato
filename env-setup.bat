@echo off
chcp 65001 >nul 2>nul
setlocal EnableDelayedExpansion

echo.
echo   ┌────────────────────────────────────┐
echo   │  Node.js 环境安装                   │
echo   │  本脚本仅安装 Node.js 22 LTS        │
echo   │  安装完成后请运行 install.bat       │
echo   └────────────────────────────────────┘
echo.

:: ====== 检测是否已安装 ======
where node >nul 2>nul
if %errorlevel% equ 0 (
    for /f "tokens=1 delims=." %%v in ('node -v 2^>nul') do set NODE_VER=%%v
    set NODE_VER=!NODE_VER:v=!
    if !NODE_VER! geq 18 (
        for /f "delims=" %%v in ('node -v') do echo   ✅ Node.js %%v 已安装，无需操作
        echo   请直接运行 install.bat 安装项目
        pause
        exit /b 0
    )
    echo   ⚠️  Node.js 版本过低，将升级
)

:: ====== 下载并安装 ======
echo   正在下载 Node.js 22 LTS ...
echo.

set NODE_MSI=node-v22.14.0-x64.msi
set NODE_URL=https://mirrors.huaweicloud.com/nodejs/v22.14.0/%NODE_MSI%

echo   下载: %NODE_URL%
powershell -Command "[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; Invoke-WebRequest '%NODE_URL%' -OutFile '%TEMP%\%NODE_MSI%'"

if not exist "%TEMP%\%NODE_MSI%" (
    echo.
    echo   ❌ 下载失败，请手动下载安装：
    echo   👉 https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo   正在安装（请按提示完成）...
echo   ⚠️  请勾选 "Add to PATH"
echo.
msiexec /i "%TEMP%\%NODE_MSI%" /passive ADDLOCAL=ALL

:: 刷新 PATH
set "PATH=%PATH%;C:\Program Files\nodejs"

:: 验证
echo.
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo   ✅ 安装完成，但需要重启命令行窗口
    echo   请关闭此窗口，打开新命令行后运行 install.bat
) else (
    for /f "delims=" %%v in ('node -v') do echo   ✅ Node.js %%v
    for /f "delims=" %%v in ('npm -v') do echo   ✅ npm %%v
    echo.
    echo   环境安装完成，请运行 install.bat 安装项目
)
echo.
pause
