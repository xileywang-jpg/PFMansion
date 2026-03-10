<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 🎮 Mansion Protocol

一个数据驱动的氛围探索桌游，支持单机和多人联机模式。

## Features

- 🌟 **探索阶段** - 动态地图生成，随机房间事件
- 👻 **作祟阶段** - 6 预兆触发，剧本系统
- 🎭 **叛徒模式** - 4 人联机，对抗与合作
- 🎨 **精美 UI** - 深色主题，流畅动画

## Quick Start

### 单机模式
```bash
npm install
npm run dev
```

### 联机模式
```bash
# 1. 构建后端
go build -o mansion-server server.go

# 2. 启动服务器
./mansion-server -port 8080

# 3. 浏览器访问
http://localhost:8080

# 4. 切换到联机模式
```

详细文档: [DOCS_DEPLOYMENT.md](DOCS_DEPLOYMENT.md)

## Documentation

| 文档 | 说明 |
|------|------|
| [部署指南](DOCS_DEPLOYMENT.md) | 部署与配置 |
| [测试指南](DOCS_TESTING.md) | 测试用例 |
| [架构设计](DOCS_ARCHITECTURE.md) | 技术架构 |
| [开发进度](PROGRESS.md) | 开发里程碑 |

## Tech Stack

- **前端**: React 19, TypeScript, Zustand, Framer Motion
- **后端**: Go 1.22+, gorilla/websocket
- **通信**: WebSocket

## License

MIT
