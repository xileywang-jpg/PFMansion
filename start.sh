#!/bin/bash
# PFMansion 服务启动脚本 (安全版)
# 启动: 鉴权服务(5000) + 前端(3000) + 后端(8080)
# 所有敏感服务仅监听 127.0.0.1

echo "🐱 正在启动 PFMansion 服务..."

# 杀掉已有进程
pkill -f "node.*auth-service" 2>/dev/null
pkill -f "vite" 2>/dev/null
pkill -f "mansion-server" 2>/dev/null

sleep 1

# 启动鉴权服务 (5000)
echo "🎭 启动鉴权服务 (5000)..."
cd /root/.openclaw/workspace/PFMansion/auth-service
node server.js &
AUTH_PID=$!

# 等待鉴权服务启动
sleep 2

# 启动前端 (3000) - 仅监听 localhost
echo "🎨 启动前端 (3000)..."
cd /root/.openclaw/workspace/PFMansion
npm run dev &
DEV_PID=$!

# 等待前端启动
sleep 3

# 启动游戏后端 (8080) - 仅监听 localhost
echo "🎮 启动游戏后端 (8080)..."
cd /root/.openclaw/workspace/PFMansion
./mansion-server -port 8080 -addr 127.0.0.1 &
GAME_PID=$!

echo ""
echo "========================================"
echo "🎉 所有服务已启动！"
echo "========================================"
echo "🌐 访问地址: http://localhost"
echo "🔑 鉴权服务: 127.0.0.1:5000 (仅内网)"
echo "🎮 游戏后端: 127.0.0.1:8080 (仅内网)"
echo ""
echo "测试账号: sifere / meow123"
echo "========================================"
echo ""
echo "按 Ctrl+C 停止所有服务"
echo "PIDs: $AUTH_PID $DEV_PID $GAME_PID"

# 等待中断
trap "kill $AUTH_PID $DEV_PID $GAME_PID 2>/dev/null; exit" INT TERM

wait
