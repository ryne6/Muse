@echo off
REM Muse 开发环境启动脚本 (Windows)

echo 🚀 Starting Muse Development Environment...
echo.

REM 检查依赖
where bun >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Bun is not installed. Please install Bun first:
    echo    https://bun.sh
    exit /b 1
)

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    exit /b 1
)

REM 检查 node_modules
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    call npm install
    echo ✅ Dependencies installed
    echo.
)

REM 杀掉可能存在的旧进程
echo 🧹 Cleaning up old processes...
taskkill /F /IM bun.exe /T >nul 2>nul
timeout /t 1 /nobreak >nul
echo ✅ Cleanup complete
echo.

REM 启动 API Server
echo 🌐 Starting API Server...
start /B bun src/api/index.ts > muse-api.log 2>&1

REM 等待 API Server 启动
timeout /t 3 /nobreak >nul

REM 检查 API Server 是否成功启动
curl -s http://localhost:3000/health >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo ✅ API Server running at http://localhost:3000
) else (
    echo ❌ Failed to start API Server. Check muse-api.log for details.
    taskkill /F /IM bun.exe /T >nul 2>nul
    exit /b 1
)

echo.
echo 🖥️  Starting Electron App...
echo.

REM 启动 Electron
call npm run dev

REM 清理
echo.
echo 🧹 Shutting down...
taskkill /F /IM bun.exe /T >nul 2>nul
echo ✅ Cleanup complete
