# 统一待办清单

本文件是项目唯一的长期待办、技术债与进度收口点。旧的阶段性 review、历史 bug 清单和专题 todo 已合并到这里。

## 1. 已完成

### 架构与同步

- 后端权威状态推进已成为主链
- interactionState 已接入检定、作祟、战斗、地块放置等核心交互
- WebSocket game_action 已收口到 handler 注册表模式

### 数据配置化

- 地块 onEnter / onLeave / interact 已配置化
- 锻造奖励已迁移为 cardPools + rewardItems
- MOVE_PLAYER 的命名位置已迁移为 namedLocations
- 技能树被动节点已迁移为 grantsEffects
- GIVE_ITEM / GIVE_SKILL 已支持显式 itemId / skillId

### 近期问题修复

- 多项 2026-03-24 的状态同步与骰子链路问题已修复
- 前端本地模式回退已移除
- 战斗结果与互动状态已进一步显式化

## 2. 进行中

### 文档体系收口

- 用 docs/ 目录替换分散的根目录 DOCS 与 doc/ 历史文档
- 统一 README、架构手册、开发手册、策划手册、todo 清单

### 数据配置化改造

- 收口 raw_data -> game/data 的单向事实源
- 补全 raw schema -> validate -> runtime compile 的治理边界
- 减少 data/source 这类前端静态数据入口对运行时事实的影响

### 前端数据入口收口

- 技能树等残留静态入口仍需切到后端 API

## 3. 待规划

### 配置层继续升级

- passiveEffects 结构化
- ADD_STATUS / ADD_BUFF / REMOVE_BUFF 的显式 schema
- scenario / objectives 参数化
- narrative / system strings 模板化

### 规则与内容扩展

- grantedActions 与更多状态触发器能力补完
- 特殊能力与状态系统的更完整结构化表达
- 更强的配置校验与坏引用 fail-fast

### 工具链

- 若后续 Go / TS schema 继续漂移，再评估共享 schema 或代码生成

## 4. 已失效或不再单独追踪

以下内容不再保留为独立文档或独立入口：

- 2026-03-24 的阶段性 review / UI bug 清单
- 旧的 implementation-plan 与 effect completion 报告
- 旧的视效增强方案文档
- 根目录分散的 DOCS_*.md 平行入口

## 5. 数据配置化改造进度

### 已完成切片

- 命名奖励池
- 奖励物品注册表
- 命名位置
- 技能树结构化被动奖励
- effect 显式 itemId / skillId

### 下一批建议切片

- passiveEffects 结构化
- ADD_STATUS / ADD_BUFF / REMOVE_BUFF 的显式字段收口
- 技能树前端静态数据入口移除
- 场景目标与特例参数的配置化

### 剩余高风险硬编码/耦合点

- 仍依赖文本解析的被动效果
- 剧本与目标规则中的特例参数
- 多处并存的数据源边界
- 启动期与构建期校验覆盖仍不足