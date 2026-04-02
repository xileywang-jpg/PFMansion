# 实现架构

## 总览

项目当前采用“Go 后端权威状态机 + React 前端展示层 + JSON 驱动内容”的结构。

```text
用户输入 -> 前端发送 game_action -> ws/hub.go 分发 -> game/* 执行规则
      <- 前端接收 state_sync / dice_result / 反馈 <- 后端广播最新状态
```

## 1. 后端权威模型

### 规则执行

- 核心规则位于 game/ 目录
- WebSocket 动作入口位于 [ws/hub.go](../ws/hub.go)
- 游戏状态以 GameStateFull 为中心，由后端负责推进与广播

### 明确约束

- 前端不应本地结算检定、战斗、作祟、地块互动或目标进度
- 所有 PendingAction、InteractionState、CombatResult 都以后端同步值为准
- 新规则入口优先通过独立 handler 注册到 hub，而不是继续扩一个大 switch

## 2. 交互状态

当前交互状态由两层共同承载：

- PendingAction: 后端执行中的阻塞式动作
- InteractionState: 面向前端消费的显式交互视图

已明确接入的交互包括：

- 属性检定
- 事件选择
- 战斗
- 作祟检定
- 地块放置

这意味着前端组件应优先消费 interactionState，而不是自行从 phase、pendingAction、activeCombat、局部 UI 状态拼语义。

## 3. 数据加载链

### 当前目录职责

- raw_data/: 原始编辑源，正在持续收口为主要内容输入
- game/data/: 后端运行时嵌入 JSON
- data/source/: 前端静态数据源，仍有部分历史入口尚未完全移除
- scripts/: 数据生成与同步桥接脚本

### 当前运行链路

1. 后端通过 [game/data_loader.go](../game/data_loader.go) 读取并归一化 game/data 下的 JSON
2. game/data_loader.go 在启动期编译运行时索引，例如：
   - cardPools
   - namedLocations
   - skill tree grantsEffects
3. 前端通过 [src/services/gameData.ts](../src/services/gameData.ts) 从 /api/game/data/all 拉取静态游戏数据

### 当前仍未完全收口的点

- 技能树前端展示仍有静态 data/source 入口
- raw_data 与 game/data 之间还缺统一的单向编译约束
- 启动期校验与构建期校验仍需继续增强

## 4. 当前 effect / 内容配置能力

### 已落地

- Tile interact 读取 poolId 访问 cardPools
- MOVE_PLAYER 通过 namedLocations 解析命名位置
- Skill tree passive rewards 使用 grantsEffects
- GIVE_ITEM / GIVE_SKILL 使用显式 itemId / skillId
- 非普通牌堆奖励内容进入 rewardItems，避免污染 ITEM 抽牌池

### 仍建议继续收口

- passiveEffects 结构化
- ADD_STATUS / ADD_BUFF / REMOVE_BUFF 的显式 schema
- scenario / objectives 参数化
- 系统 narrative 文案模板化

## 5. 当前前端职责

- 展示后端同步状态
- 发起用户输入
- 通过 store 保存本地 UI 状态
- 通过 API 加载静态游戏数据

前端不应承担：

- 规则解释器主链
- 本地状态补偿式回合推进
- 基于字符串的二次规则推导

## 6. 推荐演进方向

### 短期

- 继续把 effect schema 中的隐式复用字段拆开
- 让技能树等残留静态数据入口切到后端 API
- 增加更多 fail-fast 校验

### 中期

- 建立 raw schema -> validate -> compile-to-runtime 的更明确层次
- 收口 scenario / objective / system strings 的配置边界

### 长期

- 若 Go / TS schema 漂移仍频繁，再评估共享 schema 或代码生成