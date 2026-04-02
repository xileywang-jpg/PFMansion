# Mansion Protocol

Mansion Protocol 是一个以后端权威状态推进为核心、以配置化内容驱动为目标的多人桌游项目。

当前代码基线已经完成以下关键收口：
- 游戏规则、回合推进、检定、战斗和地块互动由 Go 后端权威执行
- 前端通过 WebSocket 接收 state_sync 与交互结果，只做展示与输入
- 运行时内容通过 game/data 下的 JSON 嵌入后端，原始编辑数据逐步向 raw_data 收口
- 数据配置化改造正在持续推进，已落地 cardPools、namedLocations、rewardItems、skill tree grantsEffects、Effect.itemId / skillId 等结构化能力

## 快速启动

### 前端
```bash
npm install
npm run dev
```

### 后端
```bash
go run server.go
```

默认开发访问地址：
- 前端: http://localhost:5173
- 后端: http://localhost:8080

## 项目结构

```text
PFMansion/
├── components/          React 组件
├── game/                Go 后端规则与状态引擎
├── raw_data/            原始内容编辑源（持续收口中）
├── game/data/           后端运行时嵌入 JSON
├── src/                 前端页面与服务层
├── store/               Zustand 状态容器
├── ws/                  WebSocket 协议与同步层
├── scripts/             数据生成与同步脚本
└── docs/                长期维护文档
```

## 文档导航

- [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md): 产品目标、核心玩法循环与内容设计原则
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): 当前真实生效的实现架构与数据流
- [docs/DEVELOPMENT_GUIDE.md](docs/DEVELOPMENT_GUIDE.md): 本地开发、测试、调试、脚本与提交流程
- [docs/CONTENT_GUIDE.md](docs/CONTENT_GUIDE.md): 面向策划/设计的配置层编辑手册
- [docs/TODO.md](docs/TODO.md): 统一待办、技术债、已完成与失效项清单

## 当前原则

- 后端是唯一规则权威，前端不应本地推进游戏流程
- 新数据能力优先结构化，不再新增依赖中文文案解析的逻辑字段
- 内容迁移遵循“先配置化、后删除硬编码 fallback”的顺序
- 文档只在 docs/ 目录维护，根目录不再保留平行 DOCS 文件
