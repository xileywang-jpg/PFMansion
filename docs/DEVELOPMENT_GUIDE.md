# 开发指引

## 1. 本地开发

### 前端

```bash
npm install
npm run dev
```

### 后端

```bash
go run server.go
```

默认开发地址：

- 前端: http://localhost:5173
- 后端: http://localhost:8080

## 2. 常用验证命令

### 前端构建

```bash
npm run build
```

### 后端测试

```bash
go test ./game ./ws
```

### 变更后最低验证要求

- 改前端类型或 UI：至少跑 npm run build
- 改后端规则、loader、ws handler：至少跑 go test ./game ./ws
- 改配置层 schema：除上述命令外，要确认加载链没有因坏引用或字段缺失而失效

## 3. 数据与脚本工作流

### 当前事实

- raw_data 是正在收口中的原始编辑源
- game/data 是后端运行时嵌入数据
- data/source 仍保留部分前端静态数据入口

### 现有脚本

- npm run build: 前端构建
- npm run sync:scenarios: 运行 scripts/sync_scenarios.cjs
- scripts/generate_assets.js: 从 raw_data 生成前端资源文件
- scripts/generateDataIndex.js: 生成前端数据索引
- scripts/sync_data.cjs: 数据同步脚本

### 当前建议

- 新内容优先先确定 raw_data 是否已有对应编辑源
- 若需要新增运行时能力，先补 loader 与 schema，再补内容数据
- 不要再新增“只在前端静态文件存在、后端不认识”的运行时配置

## 4. 开发约束

### 前端

- 不本地推进规则流程
- 不根据中文描述二次推导后端已提供的规则结果
- 新展示字段优先来自后端同步或静态 API，而不是组件内硬编码常量

### 后端

- 新规则优先走结构化 schema
- 新数据能力先补 fail-fast 校验，再补内容
- 不要继续把内容数据硬编码在 handler、interaction 或 scenario 逻辑里

## 5. 调试建议

### 联机链路

- 检查 WebSocket game_action 是否发出
- 检查 ws/hub.go 是否命中对应 handler
- 检查 state_sync 是否回写到前端 store

### 配置层链路

- 检查 game/data_loader.go 是否已加载对应 JSON
- 检查 loader 的 normalize / compile 阶段是否包含新字段
- 检查是否把内容误塞进普通牌堆或错误主题

## 6. 文档维护规则

- 长期文档只维护在 docs/
- 根目录 README 只做入口，不再承担完整手册功能
- 阶段性问题单、一次性 review 报告、临时方案文档不再保留为长期入口
- 若某项能力已经迁移完成，应优先更新 docs/TODO.md，而不是新建单独进度文档