@echo off
chcp 65001 >nul 2>nul
setlocal EnableDelayedExpansion

set ELECTRON_MIRROR=https://mirrors.huaweicloud.com/electron/
set ELECTRON_BUILDER_BINARIES_MIRROR=https://mirrors.huaweicloud.com/electron-builder-binaries/

:: Pre-load vendor binaries to electron-builder cache
set "EB_CACHE=%LOCALAPPDATA%\electron-builder\Cache"
if exist "%~dp0vendor\*.7z" (
    echo   Pre-loading vendor binaries to cache...
    if not exist "%EB_CACHE%\winCodeSign\winCodeSign-2.6.0" mkdir "%EB_CACHE%\winCodeSign\winCodeSign-2.6.0"
    if not exist "%EB_CACHE%\nsis\nsis-3.0.4.1" mkdir "%EB_CACHE%\nsis\nsis-3.0.4.1"
    if not exist "%EB_CACHE%\nsis-resources\nsis-resources-3.4.1" mkdir "%EB_CACHE%\nsis-resources\nsis-resources-3.4.1"
    copy /Y "%~dp0vendor\winCodeSign-2.6.0.7z" "%EB_CACHE%\winCodeSign\winCodeSign-2.6.0\" >nul 2>nul
    copy /Y "%~dp0vendor\nsis-3.0.4.1.7z" "%EB_CACHE%\nsis\nsis-3.0.4.1\" >nul 2>nul
    copy /Y "%~dp0vendor\nsis-resources-3.4.1.7z" "%EB_CACHE%\nsis-resources\nsis-resources-3.4.1\" >nul 2>nul
    echo   Vendor binaries loaded.
)

echo.
echo   Tomato - Build EXE
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo   [ERROR] Node.js not found, please install Node.js 18+
    pause
    exit /b 1
)

if not exist "%~dp0node_modules\electron" (
    echo   [1/3] Installing dependencies...
    call npm install
    if !errorlevel! neq 0 (
        echo   [ERROR] npm install failed
        pause
        exit /b 1
    )
) else (
    echo   [1/3] Dependencies OK
)

if exist "%~dp0dist" (
    echo   Cleaning old build...
    rd /s /q "%~dp0dist" 2>nul
)
if exist "%~dp0dist-electron" (
    rd /s /q "%~dp0dist-electron" 2>nul
)

echo   [2/3] Building frontend...
call npx vite build
if !errorlevel! neq 0 (
    echo   [ERROR] Frontend build failed
    pause
    exit /b 1
)
echo   Frontend build done

echo   [3/3] Packaging Electron app...
call npx electron-builder --win
if !errorlevel! neq 0 (
    echo.
    echo   [ERROR] Packaging failed
    echo   Solutions:
    echo   1. Set mirror manually:
    echo      set ELECTRON_BUILDER_BINARIES_MIRROR=https://mirrors.huaweicloud.com/electron-builder-binaries/
    echo   2. Download winCodeSign/nsis *.7z to vendor/ folder and retry
    echo      See vendor/README.txt for download links
    pause
    exit /b 1
)

echo.
echo   Build SUCCESS!
echo.
if exist "%~dp0dist-electron" (
    echo   Output:
    for %%%%f in ("%~dp0dist-electron\*.exe") do echo   %%%%f
) else (
    echo   No output found
)
echo.
pause
