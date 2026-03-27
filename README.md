# 🎮 Mansion Protocol

一个数据驱动的氛围探索桌游，支持单机和多人联机模式。

## Features

- 🌟 **探索阶段** - 动态地图生成，随机房间事件
- 👻 **作祟阶段** - 6 预兆触发，剧本系统
- 🎭 **叛徒模式** - 4 人联机，对抗与合作
- 🎨 **精美 UI** - 深色主题，流畅动画
- 🏛️ **双主题支持** - 原版 + 翁法罗斯 (崩坏星穹铁道)

## Quick Start

### 前端开发
```bash
npm install
npm run dev
```

### 后端服务
```bash
# 构建
go build -o mansion-server server.go

# 启动 (默认端口 8080)
./mansion-server -port 8080

# 或使用一键启动
./start.sh
```

### 访问游戏
- 前端: http://localhost:5173 (开发模式)
- 后端: http://localhost:8080 (生产模式)

## 项目结构

```
PFMansion/
├── src/                    # React 前端源码
├── components/             # React 组件
├── store/                  # Zustand 状态管理
├── hooks/                  # React Hooks
├── ws/                     # 前端 WebSocket 层
├── game/                   # Go 后端游戏逻辑
├── ws/                     # Go 后端 WebSocket Hub
├── data/source/            # 游戏数据
│   ├── original/          # 原版主题
│   └── volantis/          # 翁法罗斯主题
├── auth-service/           # 鉴权服务
└── scripts/                # 构建脚本
```

## 文档

| 文档 | 说明 |
|------|------|
| [架构设计](DOCS_ARCHITECTURE.md) | 技术架构 |
| [部署指南](DOCS_DEPLOYMENT.md) | 部署与配置 |
| [测试指南](DOCS_TESTING.md) | 测试用例 |
| [策划指南](DOCS_DESIGNER.md) | 内容配置 |
| [工作流](DOCS_WORKFLOW.md) | 开发流程 |
| [功能概览](DOCS_FEATURES.md) | 核心功能 |
| [开发进度](PROGRESS.md) | 开发里程碑 |

## Tech Stack

- **前端**: React 19, TypeScript, Zustand, Framer Motion, TailwindCSS
- **后端**: Go 1.22+, gorilla/websocket
- **通信**: WebSocket

## License

MIT
