# 策划与配置手册

## 适用对象

这份手册面向非程序人员以及需要编辑配置层内容的设计、策划与数值同学。目标是回答三件事：

- 哪些内容已经可以通过配置编辑
- 这些配置应该写在哪里
- 哪些能力仍需要程序配合，不应直接在数据里假设可用

## 1. 当前数据目录职责

### 编辑源

- raw_data/characters
- raw_data/events
- raw_data/items
- raw_data/scenarios
- raw_data/skills
- raw_data/tiles

这些目录用于承载原始编辑数据，是内容层未来的主输入。

### 运行时产物

- game/data/config.json
- game/data/tiles.json
- game/data/events.json
- game/data/items.json
- game/data/scenarios.json
- game/data/characters.json
- game/data/skillTrees.json

这些文件是后端运行时实际加载的内容。

### 注意

data/source 目前仍有历史用途，尤其是部分前端静态显示数据；新增内容时不应默认把它视为唯一事实源。

## 2. 当前已经可配置的能力

### 地块

- onEnter
- onLeave
- interact
- eventTrigger
- cardSymbol

### 配置级运行时索引

- cardPools: 命名奖励池
- namedLocations: 命名位置

### 奖励与特殊内容

- rewardItems: 非普通 ITEM 牌堆的奖励内容

### 技能树

- grantsSkillId
- grantsEffects

grantsEffects 当前推荐使用：

- MODIFY_ATTRIBUTE
- ADD_BUFF

### effect 字段

当前新配置应优先使用这些显式字段：

- itemId: GIVE_ITEM
- skillId: GIVE_SKILL
- poolId: TileInteraction 奖励池引用
- location: MOVE_PLAYER 的命名位置或 random

## 3. 当前不建议再新增的旧写法

- 不再新增依赖 grantsBuff 文本解析的技能树节点
- 不再把 GIVE_ITEM / GIVE_SKILL 的业务 ID 写进 message
- 不再把特殊奖励直接塞进普通 items 牌堆
- 不再假设前端会本地解释互动或事件规则

## 4. 内容编写建议

### 地块互动

- 如果互动奖励来自固定池，使用 poolId 引用命名卡池
- 如果互动消耗属性，显式写 cost
- 如果互动有条件，显式写 condition

### 奖励物品

- 普通探索可抽取的物品进入 items
- 仅供锻造、特殊事件、剧本奖励使用的内容进入 rewardItems

### 命名位置

- 需要固定坐标别名时，先在 config.json 定义 namedLocations
- 不要再假设后端会识别新的硬编码位置关键字

### 技能树被动节点

- 使用 grantsEffects 描述奖励
- 优先写 description，便于前端直接展示

## 5. 仍需程序支持的能力

以下能力当前不应仅靠配置假设已完全可用：

- passiveEffects 全量结构化
- 更复杂的状态效果 schema
- 剧本目标规则的大规模参数化
- 系统叙事模板化
- 完整的 raw_data 单向编译链收口

如果策划需要这类能力，应先提出 schema 扩展需求，而不是在现有 message 或 description 字段里约定隐式语义。

## 6. 提交前检查

- 引用的 itemId / skillId / scenarioId / poolId 必须存在
- 新增命名位置必须先入 config
- 奖励内容不要误放入普通牌堆
- 若新增字段属于运行时逻辑，请确认后端 loader 已支持