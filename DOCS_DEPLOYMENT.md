# 🚀 Mansion Protocol 部署与调试指南

## 1. 运行环境要求

### 1.1 联机运行
当前默认运行方式是前端路由页面 + Go 后端 + WebSocket 同步，没有旧的“切换到联机模式”入口。

*   **Go 1.22+**：需要 Go 1.22 或更高版本
*   **Node.js 20+**：用于运行 Vite 前端开发服务器
*   **端口**：默认 8080（可自定义）
*   **浏览器支持**：Chrome 110+, Edge 110+, Safari 16.4+

---

## 2. 快速启动

### 2.1 开发环境
```bash
# 1. 安装前端依赖
npm install

# 2. 启动前端开发服务器
npm run dev

# 3. 启动 Go 后端
go run server.go
```

前端默认地址通常为 `http://localhost:5173`，登录后进入大厅页面，再创建或加入房间。

### 2.2 一体化部署
```bash
# 1. 构建后端服务器
go build -o mansion-server server.go

# 2. 启动服务器
./mansion-server -port 8080

# 3. 访问游戏
# 浏览器打开 http://localhost:8080/login
```

---

## 3. 服务器配置

### 3.1 命令行参数
```bash
./mansion-server [选项]

选项:
  -port <端口>    服务器监听端口 (默认: 8080)
  -dir <目录>     静态文件目录 (默认: .)
```

### 3.2 示例
```bash
# 使用默认端口
./mansion-server

# 指定端口
./mansion-server -port 3000

# 指定静态文件目录
./mansion-server -port 8080 -dir ./dist
```

---

## 4. WebSocket API

### 4.1 连接地址
```
ws://localhost:8080/ws
```

### 4.2 消息协议

#### 客户端 → 服务器
```json
// 创建房间
{ "type": "create_room", "roomName": "房间名", "playerName": "玩家名" }

// 加入房间
{ "type": "join_room", "roomId": "房间号", "playerName": "玩家名" }

// 离开房间
{ "type": "leave_room" }

// 房间列表
{ "type": "list_rooms" }

// 设置准备
{ "type": "set_ready", "ready": true }

// 开始游戏
{ "type": "start_game" }

// 游戏操作
{ "type": "game_action", "action": { "actionType": "move", "direction": "N" } }
{ "type": "game_action", "action": { "actionType": "place_tile", "direction": "N" } }
{ "type": "game_action", "action": { "actionType": "end_turn" } }
{ "type": "game_action", "action": { "actionType": "roll_dice", "numDice": 2 } }

// 获取状态
{ "type": "get_state" }
```

#### 服务器 → 客户端
```json
// 房间创建成功
{ "type": "room_created", "roomId": "1234", "playerId": "p1", "isHost": true }

// 加入成功
{ "type": "room_joined", "roomId": "1234", "players": {...} }

// 玩家加入
{ "type": "player_joined", "playerId": "p2", "playerName": "Bob" }

// 游戏开始
{ "type": "game_started" }

// 状态同步
{ "type": "state_sync", "state": {...} }

// 骰子结果
{ "type": "dice_result", "results": [3, 5], "sum": 8 }

// 错误
{ "type": "error", "message": "错误信息" }
```

---

## 5. 调试工具与技巧

### 5.1 叙事日志 (Narrative Log)
HUD 右侧底部的"叙事日志"实时记录了游戏内的所有底层逻辑活动：
*   **[Info]**：回合切换、玩家移动、常规指令。
*   **[Alert]**：属性伤害、致命判定、作祟触发。
*   **[Logic]**：JSON-Logic DSL 引擎执行的每一步详情。

### 5.2 调试专用按钮
在页面左上角，项目内置了一个 **"调试: 触发作祟" (Debug: Force Haunt)** 按钮：
*   **功能**：无视预兆检定结果，强制中断探索阶段，直接根据当前最后一张预兆牌触发剧本分配逻辑。
*   **用途**：用于快速测试叛徒揭晓流程 (`HauntReveal`) 和剧本特定能力。

### 5.3 状态检查
由于使用了 **Zustand**，你可以在浏览器控制台中访问游戏状态：
```javascript
// 如果你已在 store 中导出 state 到 window (可选)
// 否则建议直接在 HUD 观察数值变化
```

---

## 6. 部署到生产环境

### 6.1 前端构建
```bash
# 构建生产版本
npm run build

# 这将生成 dist 目录
```

### 6.2 使用 Nginx 部署
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 静态文件
    location / {
        root /var/www/mansion-protocol/dist;
        index index.html;
    }

    # WebSocket 代理
    location /ws {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

### 6.3 使用 Docker（可选）
```dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY . .
RUN go build -o mansion-server server.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=builder /app/mansion-server .
COPY --from=builder /app/dist ./dist
EXPOSE 8080
CMD ["./mansion-server"]
```

---

## 7. 常见问题处理

### 7.1 地块重叠
移动逻辑已内置碰撞检测，如果发现地块重叠，请检查 `movePlayer` 中的 `targetKey` 生成逻辑。

### 7.2 资源加载
如果 Lucide 图标显示不全，请确保网络连接正常以访问 CDN。

### 7.3 WebSocket 连接失败
*   检查服务器是否运行：`curl http://localhost:8080`
*   检查端口是否被占用：`netstat -tulpn | grep 8080`
*   检查防火墙是否阻止连接

### 7.4 房间不存在
加入房间时提示"房间不存在"：
*   检查房间号是否正确
*   房间号每次游戏会变化，需要重新创建或获取

---

## 8. 开发相关

### 8.1 技术栈
*   **前端**：React 19, TypeScript, Zustand, Framer Motion
*   **后端**：Go 1.22+, gorilla/websocket
*   **通信**：WebSocket

### 8.2 项目结构
```
.
├── server.go           # Go 主服务器
├── game/
│   ├── state.go       # 房间/游戏状态管理
│   └── logic.go       # 游戏逻辑
├── ws/
│   └── hub.go         # WebSocket Hub
├── src/
│   ├── components/    # React 组件
│   ├── store/        # Zustand 状态
│   ├── hooks/        # React Hooks
│   └── ws/           # 前端网络层
└── dist/             # 构建产物
```
