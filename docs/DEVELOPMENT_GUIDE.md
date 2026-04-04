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

Windows PowerShell 如果被脚本策略拦截，使用：

```bash
npm.cmd run build
```

### 后端测试

```bash
go test ./game ./ws
```

### 运行时边界校验

```bash
npm run validate:runtime-data-boundaries
```

### Authoring 数据校验

```bash
npm run validate:authoring-data
```

### 变更后最低验证要求

- 改前端类型或 UI：至少跑 npm run build
- 改后端规则、loader、ws handler：至少跑 go test ./game ./ws
- 改配置层 schema：至少跑 npm run compile:runtime-data、go test ./game ./ws 和 npm.cmd run build，并确认 authoring 校验没有因坏引用或缺字段失败

## 3. 数据与脚本工作流

### 当前事实

- raw_data 是 authoring 首选编辑源
- game/data 是后端运行时嵌入数据
- npm run compile:runtime-data 是唯一 runtime 编译入口，source/target ownership 记录在 scripts/runtime_data_pipeline.json
- raw_data/runtime 已退出 active authority；config / characters / skillTrees / events / tiles / items 已回到对应 raw_data 目录。允许继续细化 authoring schema，但不允许回到 game/data 直改

### 现有脚本

- npm run compile:runtime-data: 执行 runtime 编译入口，生成当前 manifest 中声明的 runtime 产物
- npm run compile:runtime-data: 执行 runtime 编译入口，并在生成后复用 Go loader 做 authoring schema / 引用校验
- npm run validate:authoring-data: 单独执行 authoring schema / 引用校验，适合在只改 loader 或排查坏内容时快速复跑
- npm run validate:runtime-data-boundaries: 校验运行时代码未重新依赖已移除的静态包装层
- npm run build: 前端构建
- npm run sync:scenarios: scenario 的定向 builder；正常情况下由 compile:runtime-data 统一调用

### 当前建议

- 新内容优先先确定 raw_data 是否已有对应编辑源，并同步登记到 scripts/runtime_data_pipeline.json
- 若需要新增运行时能力，先补 loader 与 schema，再补内容数据
- 不要再新增“只在前端静态文件存在、后端不认识”的运行时配置
- 不要绕过 compile:runtime-data 直接把生成逻辑散落到多个脚本入口
- 若暂时还没有细颗粒 authoring schema，可短暂使用过渡 bundle；但一旦 dedicated source 可修复，就优先切回 dedicated raw_data 文件，而不是长期保留 bundle
- 若 build 因 runtime-data-boundaries 失败，优先把引用改到 /api/game/data 或后端同步链，而不是恢复已移除的静态包装层

## 4. 开发约束

### 前端

- 不本地推进规则流程
- 不根据中文描述二次推导后端已提供的规则结果
- 新展示字段优先来自后端同步或静态 API，而不是组件内硬编码常量

### 后端

- 新规则优先走结构化 schema
- 新数据能力先补 fail-fast 校验，再补内容
- 不要继续把内容数据硬编码在 handler、interaction 或 scenario 逻辑里

### 文档同步

- 改架构边界或事实源时，同步更新 docs/ARCHITECTURE.md
- 改设计 JSON schema 或可读字段时，同步更新 docs/CONTENT_GUIDE.md
- 改剩余收口范围时，同步更新 docs/TODO.md

## 5. 调试建议

### 联机链路

- 检查 WebSocket game_action 是否发出
- 检查 ws/hub.go 是否命中对应 handler
- 检查 state_sync 是否回写到前端 store

### 配置层链路

- 检查 game/data_loader.go 是否已加载对应 JSON
- 检查 loader 的 normalize / validate / compile 阶段是否包含新字段
- 检查是否把内容误塞进普通牌堆、错误主题或任何退役静态入口
- 检查 scripts/runtime_data_pipeline.json 中是否已声明该 runtime 文件的 authority

## 6. 文档维护规则

- 长期文档只维护在 docs/
- 根目录 README 只做入口，不再承担完整手册功能
- 阶段性问题单、一次性 review 报告、临时方案文档不再保留为长期入口
- docs/TODO.md 只保留未完成项，已完成项直接清出