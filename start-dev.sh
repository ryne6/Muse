#!/bin/bash

# Muse 开发环境启动脚本

echo "🚀 Starting Muse Development Environment..."
echo ""

# 检查依赖
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed. Please install Bun first:"
    echo "   curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# 检查 node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed"
    echo ""
fi

# 杀掉可能存在的旧进程
echo "🧹 Cleaning up old processes..."
pkill -9 -f "bun.*api" 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null
sleep 1
echo "✅ Cleanup complete"
echo ""

# 启动 API Server
echo "🌐 Starting API Server..."
bun src/api/index.ts > /tmp/muse-api.log 2>&1 &
API_PID=$!

# 等待 API Server 启动
sleep 3

# 检查 API Server 是否成功启动
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ API Server running at http://localhost:3000"
else
    echo "❌ Failed to start API Server. Check /tmp/muse-api.log for details."
    kill $API_PID 2>/dev/null
    exit 1
fi

echo ""
echo "🖥️  Starting Electron App..."
echo ""

# 启动 Electron
npm run dev

# 清理
echo ""
echo "🧹 Shutting down..."
kill $API_PID 2>/dev/null
echo "✅ Cleanup complete"
