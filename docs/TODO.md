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
- 技能树前端主链（store + modal）已切到后端静态数据 API，不再直连 data/source/skillTrees
- 玩家技能展示链路（HUD/Inspection）已切到 store getSkillById，不再直连 SKILLS_DB
- Effect 的 ADD_STATUS / ADD_BUFF / REMOVE_BUFF 已支持显式字段（statusType/duration/buff 等），并保留兼容 fallback
- 后端加载链新增 effect fail-fast 校验（坏引用/缺字段启动即失败）
- constants 已移除未使用的 MOCK_CHARACTERS/TILE_DECK 静态装载逻辑，不再依赖 data/source
- passiveEffects 已支持结构化字段（stat/amount/skillId/specialKey）并保持文本兼容
- loader 已新增 passiveEffects 类型/引用合法性校验
- passiveEffects 条件触发（trigger）与战斗型被动（combat_*）已完成统一 schema（角色/属性过滤 + 兼容触发归一化）
- 主题配置已收口到 game/data/config.json；游戏静态数据 API、大厅主题选择与 auth-service /api/themes 现复用同一事实源
- 已删除无运行时引用的 data/* 静态包装层（items/events/skills/scenarios/hauntMatrix）与悬空 config/themes.ts，减少对历史静态事实源的误导
- loader 已新增 passive trigger 与 combat stat 合法性校验
- objective 已新增结构化 params 入口（target/turns/required/customId），运行逻辑优先读取 params 并兼容旧字段
- loader 已新增 scenario objective fail-fast 校验（type/turns/required/target/customId）
- objective 已新增 eventType 映射层（支持 params.eventType 覆盖），OPEN_GATE 已接入进度与胜利判定链路

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

- 继续排查并移除除技能树外的 data/source 直连入口
- 继续区分可删除的历史静态包装层与仍承担 authoring/生成职责的 data/source 管线

## 3. 待规划

### 配置层继续升级

- passiveEffects 结构化
- passiveEffects 高级触发器（多条件组合）
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
- 技能树前端静态入口移除（业务链路）
- 玩家技能展示入口移除 SKILLS_DB 静态查表
- effect 显式状态/增益字段收口（第一阶段）
- loader 启动期 effect 引用与字段校验
- constants 静态数据依赖清理（仅保留颜色与起始地块常量）
- passiveEffects 结构化收口（第一阶段）
- passiveEffects trigger/combat 统一 schema（第二阶段）
- 主题事实源统一（game backend + GamesPage + NetworkScreens + auth-service）
- objective 参数化第一阶段（params 兼容层 + 运行时优先读取）
- objective 事件映射收口（第二阶段：eventType 默认映射 + 覆盖）

### 下一批建议切片

- 场景目标与特例参数的配置化
- objective 事件类型与条件模型统一（PLAYER_AT/COLLECT_COUNT/TURN_SURVIVE 等）
- objective 多条件组合（AND/OR/阈值）与复合计数器

### 剩余高风险硬编码/耦合点

- 仍依赖文本解析的被动效果（主要是复杂触发描述与 legacy 文案）
- 剧本与目标规则中的特例参数
- objective 仍有类型分支硬编码（仅参数读取已收口，条件类型尚未完全配置化）
- scenario 数据尚未全面迁移到 params.eventType/required（当前以兼容层运行）
- 多处并存的数据源边界
- auth-service 与前端主题选择链的主题配置分叉已收口，剩余多事实源重点转向 data/source 历史管线
- 启动期与构建期校验覆盖仍不足