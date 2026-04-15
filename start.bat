@echo off
chcp 65001 >nul 2>nul
setlocal

echo.
echo   Tomato - Starting...
echo.

:: Build if needed
if not exist "%~dp0dist\index.html" (
    echo   First run, building...
    call npm install
    call npx vite build
    if %errorlevel% neq 0 (
        echo   [ERROR] Build failed, run install.bat first
        pause
        exit /b 1
    )
)

:: Launch Electron (detached via VBS - safe to close this window)
if exist "%~dp0node_modules\electron\dist\electron.exe" (
    echo   Launching desktop app...
    wscript "%~dp0start.vbs"
    echo   Tomato is running. You can close this window.
    timeout /t 3 >nul
) else (
    echo   Electron not found, browser mode...
    if not exist "%~dp0dist\index.html" (
        echo   [ERROR] No build found. Run install.bat first.
        pause
        exit /b 1
    )
    node "%~dp0server\index.js"
)

if %errorlevel% neq 0 (
    echo.
    echo   [ERROR] Failed to start
    pause
)
