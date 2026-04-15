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

:: Launch Electron (fully detached - safe to close this window)
if exist "%~dp0node_modules\electron\dist\electron.exe" (
    echo   Launching desktop app...
    powershell -Command "Start-Process -FilePath '%~dp0node_modules\electron\dist\electron.exe' -ArgumentList '.' -WorkingDirectory '%~dp0'" >nul 2>nul
    if !errorlevel! neq 0 (
        start "" "%~dp0node_modules\electron\dist\electron.exe" .
    )
    echo   Tomato is running. You can close this window.
    timeout /t 3 >nul
) else (
    echo   Electron not found, browser mode...
    node "%~dp0server\index.js"
)

if %errorlevel% neq 0 (
    echo.
    echo   [ERROR] Failed to start
    pause
)
