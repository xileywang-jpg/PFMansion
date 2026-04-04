# 解耦架构

## 总览

项目当前的主链已经收口为：Go 后端权威规则执行 + JSON 运行时数据 + React 前端展示与输入。

```text
raw_data/
        |
        |      scripts/runtime_data_pipeline.json
        +---------> game/data/*.json ----------+
                                           |
                                 game/data_loader.go
                         normalize + validate + compile index
                                           |
                   /api/game/data/*   ws game_action/state_sync
                           |                  |
                           +------- 前端 store/UI
```

对 MVP 而言，干净闭环的含义是：

- 运行时事实源只以 game/data 为准
- 后端在启动时 fail-fast 拒绝坏数据
- 前端只消费后端同步状态和静态 API，不自行解释规则文本
- 设计层写入的逻辑字段必须是后端真实可读取、可校验、可执行的字段

## 1. 分层与职责

### 1.1 Authoring 层

- raw_data: 首选编辑源，承载原始设计数据
- scripts: 通过 npm run compile:runtime-data 和 scripts/runtime_data_pipeline.json 管理 runtime 编译入口与 ownership

当前状态：runtime 编译入口已经收口为 npm run compile:runtime-data；game/data 下全部运行时 JSON 都由 raw_data 下的权威源单向生成。scenarios、config、characters、skillTrees、events、tiles、items 已回到对应 raw_data 目录；其中 characters、events、skills、tiles 已统一为目录下按主题文件拆分，items.json 则由 raw_data/items/base_items.json、raw_data/items/reward_items.json 与 raw_data/skills 目录共同编译生成。compile 入口在生成后会立即复用 Go loader 做 authoring schema / 引用校验，把坏内容前移拦下。

### 1.2 Runtime Data 层

后端运行时事实源是 game/data 下的 JSON：

- game/data/config.json
- game/data/tiles.json
- game/data/events.json
- game/data/items.json
- game/data/scenarios.json
- game/data/characters.json
- game/data/skillTrees.json

server.go 启动时会调用 LoadData；加载失败时直接退出，而不是带坏数据继续运行。

### 1.3 Validation / Compile 层

game/data_loader.go 当前承担三类职责：

- normalize: 归一化 effect.type、deck、location、trigger 等字段
- validate: 启动期校验引用和 schema，坏配置直接失败
- compile: 编译 cardPools、namedLocations 等运行时索引

这一层已经是目前“数据与逻辑解耦”的关键闸门。设计数据不是直接裸读执行，而是先经过后端显式校验和索引编译。校验关口现在不只发生在 server.go 启动时，也发生在 compile:runtime-data 的 authoring 链路中。

### 1.4 Runtime Logic 层

规则执行主链位于 game/：

- ws/hub.go: game_action 分发入口
- game/actions.go: 玩家动作与抽牌主链
- game/interactions.go: 地块互动主链
- game/items.go: effect 应用、被动效果应用/移除
- game/effect_handlers.go: 核心 effect handler
- game/combat.go: 战斗与部分 combat passive 执行
- game/objectives.go: 目标更新与胜负判定

原则：

- 规则推进以后端为准
- 前端不应本地结算战斗、目标、作祟、互动
- 新能力优先新增结构化 schema + handler，不再通过 message/text 文本约定隐式语义

### 1.5 Frontend 层

前端职责已经收口为：

- 发起用户输入
- 展示后端同步状态
- 通过 /api/game/data/all 等静态 API 读取展示所需内容
- 保存局部 UI 状态

前端不应承担：

- 规则解释器
- 本地补偿式回合推进
- 通过中文文案或任何已退役静态包装层二次推导规则

## 2. 当前已闭环的数据空间

### 2.1 全局配置空间

config.json 当前承载：

- themes
- cardPools
- namedLocations

已收口点：

- 主题事实源已统一到 game/data/config.json
- MOVE_PLAYER 命名位置已统一到 namedLocations
- 命名奖励池已统一到 cardPools

### 2.2 卡牌内容空间

events/items/omens/skills 统一使用 Card 结构，后端真实可读字段包括：

- id
- type
- name
- title
- description
- flavorText
- icon
- triggerType
- interaction
- usage
- passiveEffects
- cardSymbol

其中：

- interaction 用于事件卡等交互型内容
- usage 用于主动使用类物品/技能
- passiveEffects 用于被动物品/预兆等常驻效果

### 2.3 地块逻辑空间

TileDef 当前已配置化的逻辑入口包括：

- effects
- onEnter
- onLeave
- onEnterEffects
- onExitEffects
- interact
- eventTrigger
- cardSymbol

地块互动与触发已经不需要前端硬编码解释，主链由后端执行。

### 2.4 技能树空间

技能树节点当前通过 grantsEffects 和 grantsSkillId 驱动。

已收口点：

- grantsBuff 兼容已删除
- 技能树前端运行时展示已切到后端静态 API

### 2.5 剧本目标空间

Scenario 的 heroObjective / traitorObjective 现统一使用：

- type
- params

其中 params 当前真实承载：

- eventType
- target
- turns
- required
- customId

已收口点：

- 顶层 legacy target/turns/customId 已移除
- runtime_scenarios 已收口为 params-only
- DataLoader 启动期拒绝旧 objective JSON

## 3. 当前已闭环的执行空间

### 3.1 Effect 空间

当前运行时主链明确支持并执行的 effect.type 包括：

- MODIFY_STAT
- DAMAGE
- HEAL
- DRAW_CARD
- MOVE_PLAYER
- LOG
- IF
- GIVE_ITEM
- GIVE_SKILL
- ROLL
- ADD_STATUS
- ADD_BUFF
- REMOVE_BUFF
- REVEAL_MAP
- REVEAL_TRAIL
- CLEAR_LAST_ROLL
- REVEAL_NEXT_EVENT
- SPAWN_NPC
- ATTACK_NPC

其中关键收口已完成：

- GIVE_ITEM / GIVE_SKILL 必须显式 itemId / skillId
- ADD_STATUS 必须显式 statusType
- ADD_BUFF / REMOVE_BUFF 必须显式 buff
- teleport / narrative_log / gain_item alias 已拒绝

### 3.2 Passive 空间

PassiveEffect 当前支持的类型：

- buff
- debuff
- skill
- special
- combat_buff
- combat_modifier
- combat_damage_bonus

当前真实执行模型：

- buff / debuff: 使用 stat + amount，可选 trigger
- skill: 使用 skillId
- special: 使用 specialKey
- combat_*: 战斗阶段按 trigger / stat / npcTypes 参与计算

已收口点：

- text-only buff/debuff 不再执行
- skill text fallback 已移除
- special text fallback 已移除
- 不会执行的 legacy passive 文案由 DataLoader fail-fast 拒绝

### 3.3 Objective 空间

Objective 已完成“参数入口 + 事件模型”收口，运行时主链已不再依赖按 type 推导 eventType 或松散 `map[string]interface{}` 载荷。

已完成：

- params 成为唯一运行时参数入口
- eventType 已成为唯一事件入口，不再从 objective.type fallback
- PLAYER_DEATH / TILE_REACHED / ITEM_COLLECTED / TURNS_SURVIVED 等事件已接入进度链
- objectives.go 已把事件匹配、progress map 写入、完成判定与 turn-limit 判定收成统一 helper，减少了 hero/traitor 两侧的重复分支
- runtime 内部 objective 事件已收口为强类型结构，而不是 `eventType + map[string]interface{}`
- required 现在只允许来自显式 params.required 或 PLAYER_DEATH + ALL_HEROES/ALL_ENEMIES 的运行时人数推导

未完成：

- 复合 objective（AND/OR、多阶段、多计数器）仍未进入 schema

这意味着 objective 的 MVP 主链已经闭环，但高级表达能力仍有后续扩展空间。

## 4. 边界规则

### 4.1 哪些字段是逻辑字段

以下字段会被后端当作逻辑输入读取：

- effect.type 及其专属字段
- passiveEffects.type 及其专属字段
- objective.type 与 params
- interaction.type / condition / cost / success / failure / effects
- tile trigger 的 type / attribute / difficulty / success / failure / possibilities / effects
- config 中的 cardPools / namedLocations / themes

### 4.2 哪些字段只是展示字段

以下字段通常只用于展示，不应承载新规则语义：

- name
- title
- description
- flavorText
- icon
- message
- successMessage
- failureMessage
- text

说明：

- message 和 text 仍可作为日志/展示文本
- 但它们不再是业务 ID、status、buff、skill、special 或 objective 参数的兼容入口

### 4.3 前端禁止越界

- 不重新引入任何已移除的历史静态数据目录作为运行时业务事实源
- 不根据中文文案推导 buff、目标或互动效果
- 不在组件中补规则 fallback

## 5. 剩余收口项与必要性

### 5.1 对 MVP 可后置

- passive 多条件组合触发
- narrative / system strings 模板化
- Go / TS 共享 schema 或代码生成
- 更复杂的 objective AND/OR 组合规则

## 6. 当前结论

项目已经不再是“前端静态数据 + 后端补几条规则”的松散结构，而是基本形成了：

- runtime 数据由 game/data 收口
- 后端启动期做 fail-fast 校验
- 前端通过 API 和 state_sync 消费后端事实
- effect / passive / objective 参数入口已经大幅结构化

MVP 意义上的“干净闭环架构”当前已经满足：

- compile:runtime-data 负责从 raw_data 生成 runtime JSON
- Go loader 负责在生成阶段和启动阶段共同 fail-fast 校验 schema 与引用
- runtime boundary 脚本继续阻止前端/运行时代码回流依赖已退役静态包装层