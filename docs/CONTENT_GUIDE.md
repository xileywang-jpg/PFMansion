# 设计 JSON 编写指南

## 适用范围

本指南面向策划、设计、内容和数值同学，目标是回答两件事：

- 当前哪些 JSON 字段会被后端真实读取
- 这些字段应该如何写，哪些旧写法已经不允许继续新增

原则只有一条：只写“后端已支持并会校验”的结构化字段，不再通过 message、text、description 约定隐式规则。

## 1. 目录与事实源

### 编辑源

- raw_data/config
- raw_data/characters
- raw_data/events
- raw_data/items
- raw_data/scenarios
- raw_data/skills
- raw_data/skillTrees
- raw_data/tiles

说明：

- config、characters、skillTrees 当前已经各自回到对应 raw_data 目录维护
- events 当前由 raw_data/events/original_events.json、raw_data/events/volantis_events.json 维护
- tiles 当前由 raw_data/tiles/original_tiles.json、raw_data/tiles/volantis_tiles.json 维护
- items 当前由 raw_data/items/base_items.json、raw_data/items/reward_items.json 维护
- skills 当前由 raw_data/skills/original_skills.json、raw_data/skills/volantis_skills.json 维护

### 运行时事实源

- game/data/config.json
- game/data/tiles.json
- game/data/events.json
- game/data/items.json
- game/data/scenarios.json
- game/data/characters.json
- game/data/skillTrees.json

## 2. 通用取值与命名规则

### 常用属性名

- might
- speed
- sanity
- knowledge

### 常用目标

- SELF
- OPPONENT
- SELECTED_PARTNER

### 常用牌堆

- EVENT
- ITEM
- OMEN

### Passive trigger

- ATTACK
- DEFENSE
- END_TURN
- ENTER_ROOM

### Objective eventType

- PLAYER_DEATH
- TILE_REACHED
- ITEM_COLLECTED
- RITUAL_COMPLETED
- TURNS_SURVIVED
- OMEN_USED
- ROOM_EXPLORED

### Tile interaction 条件操作

- GT
- LT
- EQ

### IF condition.op

- HAS_ITEM
- HAS_SKILL

## 3. 顶层数据空间

### 3.1 config.json

后端当前会读取：

- themes
- cardPools
- namedLocations

#### themes

用于主题选择与大厅展示。

#### cardPools

结构：

- id
- cardIds

用途：命名奖励池、锻造池等。

#### namedLocations

结构：

- id
- x
- y

用途：MOVE_PLAYER 使用的命名位置别名。

### 3.2 characters.json

角色当前可读字段：

- id
- name
- description
- traits
- attributes

attributes 下每个属性包含：

- values
- startIndex

### 3.3 skillTrees.json

技能树分类字段：

- id
- name
- description
- nodes

节点字段：

- id
- name
- description
- cost
- icon
- prerequisites
- requiredTrait
- grantsSkillId
- grantsEffects
- position.row
- position.col

grantsEffects 当前仅支持：

- MODIFY_ATTRIBUTE: 需要 stat + amount，可选 description
- ADD_BUFF: 需要 buff，可选 description

grantsBuff 已废弃，不要再写。

## 4. 卡牌内容空间

events/items/omens/skills 当前统一使用 Card 结构。后端可读取字段：

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

说明：

- name / title / description / flavorText / icon 主要是展示字段
- interaction / usage / passiveEffects 才是规则入口

### 4.1 interaction

当前支持的 interaction.type：

- ATTRIBUTE_CHECK
- CHOICE

interaction 可读字段：

- type
- attribute
- difficulty
- success
- failure
- options

CHOICE 的 options 字段：

- label
- effects

### 4.2 usage

当前可读字段：

- actionLabel
- isConsumable
- target
- effects

### 4.3 passiveEffects

当前支持的 passiveEffects.type：

- buff
- debuff
- skill
- special
- combat_buff
- combat_modifier
- combat_damage_bonus

PassiveEffect 可读字段全集：

- type
- text
- stat
- amount
- skillId
- specialKey
- trigger
- modifier
- npcTypes

写法规则：

#### buff / debuff

必须写：

- type
- stat
- amount

可选：

- trigger
- text

说明：

- text 可以保留为展示文案
- 但 text-only 已不再执行
- debuff 的 amount 写正数即可，运行时会按 debuff 语义处理

#### skill

必须写：

- type
- skillId

可选：

- text

#### special

必须写：

- type
- specialKey

可选：

- text

#### combat_buff / combat_modifier

必须写：

- type
- modifier

可选：

- trigger
- stat
- npcTypes
- text

#### combat_damage_bonus

必须写：

- type
- amount

可选：

- trigger
- stat
- npcTypes
- text

## 5. Effect 空间

Effect 是当前最核心的逻辑空间。后端可读取字段全集如下：

- type
- stat
- amount
- target
- deck
- itemId
- skillId
- statusType
- duration
- buff
- source
- faction
- damage
- statusAmount
- message
- style
- location
- x
- y
- condition
- then
- else
- attribute
- difficulty
- npcDefId
- npcInstanceId

### 5.1 当前支持的 effect.type

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

### 5.2 按 effect.type 说明必填字段

#### MODIFY_STAT

常用字段：

- stat
- amount
- target
- message

#### DAMAGE

常用字段：

- stat
- amount
- target

#### HEAL

常用字段：

- stat
- amount
- target

#### DRAW_CARD

常用字段：

- deck

#### MOVE_PLAYER

至少使用一种：

- location
- x + y

说明：

- location 可以是 namedLocations 中的 id
- location 也可以是 random

#### LOG

常用字段：

- message
- style

#### IF

字段：

- condition
- then
- else

condition 当前支持：

- HAS_ITEM: 需要 itemId
- HAS_SKILL: 需要 skillId

#### GIVE_ITEM

必须写：

- itemId

可选：

- message

说明：

- message 不再作为 itemId fallback

#### GIVE_SKILL

必须写：

- skillId

可选：

- message

#### ROLL

常用字段：

- attribute 或 stat
- difficulty

#### ADD_STATUS

必须写：

- statusType

可选：

- duration
- source
- faction
- damage
- statusAmount

说明：

- attribute / message / amount 不再作为 statusType 或其他逻辑字段 fallback

#### ADD_BUFF / REMOVE_BUFF

必须写：

- buff

说明：

- message 不再作为 buff fallback

#### SPAWN_NPC

常用字段：

- npcDefId

#### ATTACK_NPC

常用字段：

- npcInstanceId

## 6. Tile 逻辑空间

TileDef 当前可读字段：

- id
- name
- description
- type
- floors
- edges
- cardSymbol
- eventTrigger
- icon
- effects
- onEnter
- onLeave
- onEnterEffects
- onExitEffects
- interact

### 6.1 TileTrigger

onEnter / onLeave 当前可读字段：

- type
- attribute
- difficulty
- success
- failure
- message
- deck
- count
- possibilities
- effects

possibilities 中每项字段：

- Effect 全字段
- weight

### 6.2 TileInteraction

TileInteraction 当前可读字段：

- type
- description
- condition
- effects
- cost
- poolId
- difficulty
- attribute
- success
- failure
- successMessage
- failureMessage
- destination
- divinationPosition
- mirrorDuration

当前执行层已支持的 interaction.type：

- HEAL
- REVEAL_MAP
- MIRROR
- FORGE
- CROSS
- TIME_REWIND
- TELEPORT
- DIVINATION

condition 字段：

- op
- stat
- value

cost 字段：

- type
- amount

写法建议：

- FORGE 使用 poolId 引用 cardPools
- CROSS 使用 attribute + difficulty + success/failure
- TELEPORT 由专用互动流程执行，不要混淆为 effect.type
- DIVINATION 由专用互动流程执行，额外效果写在 effects

## 7. Objective 逻辑空间

Scenario 当前可读字段：

- id
- name
- introText
- traitorRule
- heroInfo
- traitorInfo
- heroObjective
- traitorObjective

heroInfo / traitorInfo 可读字段：

- objective
- setupText
- abilities

Objective 当前可读字段：

- name
- description
- type
- params

### 7.1 当前支持的 objective.type

- ELIMINATE
- SURVIVE
- REACH
- COLLECT
- CONVERT
- CUSTOM
- OPEN_GATE
- USE_OMEN
- EXPLORE

### 7.2 params 当前真实可读键

- eventType
- target
- turns
- required
- customId

当前规则：

- params 必填
- eventType 必填
- turns 必须大于 0
- required 必须大于 0；只有 PLAYER_DEATH + ALL_HEROES/ALL_ENEMIES 可以省略并由运行时按阵营人数推导
- PLAYER_DEATH / TILE_REACHED / ITEM_COLLECTED 需要 target
- RITUAL_COMPLETED 如需限定特定仪式，再写 customId

说明：

- target/turns/customId 顶层旧字段已废弃且会被 loader 拒绝
- objective 不再从 type fallback 到 eventType
- objective 不再从 turns 或 type fallback 到 required
- 运行时内部 objective 事件已是强类型结构，不再依赖松散 map 载荷

## 8. 不允许继续新增的旧写法

- 不再写 teleport / narrative_log / gain_item 这类 effect alias
- 不再把 itemId / skillId 写进 message
- 不再把 statusType / buff / specialKey / skillId 省略成文本兼容
- 不再写 text-only passive buff/debuff
- 不再写 grantsBuff
- 不再给 objective 写顶层 target / turns / customId
- 不再假设前端会解释任何已移除静态包装层或中文文案中的规则语义

## 9. 提交前检查

- itemId / skillId / npcDefId / poolId / named location 必须存在
- passive buff/debuff 必须写 stat + amount
- special 必须写 specialKey
- skill passive 必须写 skillId
- objective 必须写 params.eventType，并按事件契约补齐 target / required / customId
- TileInteraction 和 Effect 只使用当前执行层真实支持的 type

如果需要新的表达能力，先提 schema 扩展，不要继续借用 message、text、description 做隐式规则。