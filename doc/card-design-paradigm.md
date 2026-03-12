# PF 项目卡牌设计范式

> 本文档详细介绍 PF 项目中各类卡牌的设计规范与能力扩展选项。
> 适用于设计师进行新内容的自定义开发，无需编程经验即可参照编写。

---

## 目录

1. [卡牌类型总览](#1-卡牌类型总览)
2. [人物卡 (Character)](#2-人物卡-character)
3. [物品卡 (Item)](#3-物品卡-item)
4. [地图卡 (Tile)](#4-地图卡-tile)
5. [事件卡 (Event)](#5-事件卡-event)
6. [灾祸卡 (Omen)](#6-灾祸卡-omen)
7. [技能系统 (Skill)](#7-技能系统-skill)
8. [剧本系统 (Scenario)](#8-剧本系统-scenario)
9. [技能树 (Skill Tree)](#9-技能树-skill-tree)

---

## 1. 卡牌类型总览

PF 项目目前支持以下卡牌类型：

| 类型 | 文件位置 | 说明 |
|------|----------|------|
| 人物卡 | `data/source/characters.ts` | 可选角色及其属性成长 |
| 物品卡 | `data/source/items.ts` | 武器、消耗品、被动物品 |
| 地图卡 | `data/source/tiles.ts` | 房间、走廊等地图地块 |
| 事件卡 | `data/source/events.ts` | 探索时触发的随机事件 |
| 灾祸卡 | `data/source/omens.ts` | 特殊物品/诅咒物品 |
| 技能 | `data/source/skills.ts` | 主动技能定义 |
| 剧本 | `data/source/scenarios.ts` | 闹鬼事件剧本 |
| 技能树 | `data/skillTrees.ts` | 角色成长树 |

---

## 2. 人物卡 (Character)

人物卡定义游戏中可选择的角色及其属性。

### 2.1 设计结构

```typescript
{
  "id": "char_1",
  "name": "莱因哈特神父",
  "description": "一位有着黑暗过去、对神秘学极有研究的神职人员。",
  "traits": ["受祝福"],           // 特质
  "attributes": {                  // 四维属性
    "might": { "values": [1, 2, 2, 4, 4, 5, 5, 7], "startIndex": 2 },
    "speed": { "values": [2, 3, 3, 4, 5, 6, 7, 7], "startIndex": 2 },
    "sanity": { "values": [3, 4, 5, 5, 6, 7, 7, 8], "startIndex": 4 },
    "knowledge": { "values": [1, 3, 3, 4, 5, 6, 6, 8], "startIndex": 3 }
  }
}
```

### 2.2 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | 唯一标识符，建议格式：`char_序号` |
| `name` | string | ✅ | 显示名称 |
| `description` | string | ✅ | 角色背景介绍 |
| `traits` | string[] | ✅ | 特质列表，影响技能树解锁 |
| `attributes` | object | ✅ | 四维属性配置 |

### 2.3 属性系统详解

每个属性包含 `values` 数组和 `startIndex`：

- **`values`**：8 个等级的属性值列表（等级 1-8）
- **`startIndex`**：游戏开始时的属性等级（对应 values 数组索引）

**属性类型：**

| 属性 | 说明 | 影响 |
|------|------|------|
| `might` | 力量 | 物理攻击、力量检定 |
| `speed` | 速度 | 闪避、速度检定、移动力 |
| `sanity` | 理智 | 精神抵抗、恐惧检定 |
| `knowledge` | 知识 | 发现线索、认知检定 |

### 2.4 特质系统

可用特质（影响技能树解锁）：

| 特质 | 说明 |
|------|------|
| `强壮` | 可解锁特定力量系技能节点 |
| `敏捷` | 可解锁特定速度系技能节点 |
| `睿智` | 可解锁特定知识系技能节点 |
| `受祝福` | 可解锁神秘学系技能节点 |

### 2.5 扩展建议

- 新增角色时，确保四个属性的 values 数组长度为 8
- 合理分配 startIndex，使角色有明确的定位（如高力量角色 startIndex 偏向前几个高值）
- 描述文本控制在 30-50 字为宜

---

## 3. 物品卡 (Item)

物品卡定义玩家可获得、使用的道具。

### 3.1 设计结构

```typescript
{
  "id": "item_revolver",
  "name": "生锈的左轮手枪",
  "description": "一把旧式勤务武器。握在手里沉稳可靠。",
  "icon": "Crosshair",
  "type": "WEAPON",
  "usage": {
    "actionLabel": "开火",
    "isConsumable": false,
    "target": "OPPONENT",
    "effects": [
      { "type": "DAMAGE", "target": { "type": "SELECTED_PARTNER" }, "amount": 2 },
      { "type": "LOG", "message": "砰！你的左轮手枪喷出了火舌。", "style": "alert" }
    ]
  },
  "passiveEffects": [{ "type": "buff", "text": "攻击时力量 +2" }]
}
```

### 3.2 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | 唯一标识符，建议格式：`item_名称` |
| `name` | string | ✅ | 显示名称 |
| `description` | string | ✅ | 物品描述 |
| `icon` | string | ✅ | 图标标识（对应 UI 图标） |
| `type` | string | ✅ | 物品类型 |
| `usage` | object | ❌ | 使用效果（消耗品/武器需要） |
| `passiveEffects` | object[] | ❌ | 被动效果 |
| `grantedSkills` | string[] | ❌ | 赋予的技能 ID |

### 3.3 物品类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `WEAPON` | 武器，可主动使用 | 左轮手枪、祭祀匕首 |
| `CONSUMABLE` | 消耗品，使用后消失 | 肾上腺素针剂 |
| `PASSIVE` | 被动物品，无需使用 | 神圣护身符 |
| `OMEN` | 灾祸物品，特殊效果 | 诅咒戒指 |

### 3.4 主动使用 (usage)

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `actionLabel` | string | ✅ | 按钮显示文本 |
| `isConsumable` | boolean | ✅ | 是否消耗 |
| `target` | string | ✅ | 目标类型：SELF/OPPONENT/TILE |
| `effects` | Effect[] | ✅ | 使用时触发的效果列表 |

### 3.5 被动效果 (passiveEffects)

```typescript
// 增益/减益效果
{ "type": "buff", "text": "攻击时力量 +2" }
{ "type": "debuff", "text": "进入时理智 -1" }

// 触发型效果
{ "type": "trigger", "text": "必须通过力量 3+ 检定才能打开宝箱。" }

// 物品获得
{ "type": "item", "text": "获得一张物品卡" }
```

### 3.6 完整示例

#### 示例：祭祀匕首

```typescript
{
  "id": "item_dagger",
  "name": "祭祀匕首",
  "description": "刀刃上刻有奇怪的凹槽，似乎渴望着鲜血。",
  "icon": "Sword",
  "type": "WEAPON",
  "grantedSkills": ["skill_vampiric_strike"],  // 赋予嗜血打击技能
  "passiveEffects": [{ "type": "buff", "text": "获得技能：嗜血打击" }]
}
```

#### 示例：肾上腺素针剂

```typescript
{
  "id": "item_adrenaline",
  "name": "肾上腺素针剂",
  "description": "紧急医疗兴奋剂。请谨慎使用。",
  "icon": "Syringe",
  "type": "CONSUMABLE",
  "usage": {
    "actionLabel": "注射",
    "isConsumable": true,
    "target": "SELF",
    "effects": [
      { "type": "MODIFY_STAT", "target": { "type": "SELF" }, "stat": "speed", "amount": 2 },
      { "type": "MODIFY_STAT", "target": { "type": "SELF" }, "stat": "might", "amount": 1 },
      { "type": "LOG", "message": "你感到一股力量涌遍全身！", "style": "success" }
    ]
  }
}
```

---

## 4. 地图卡 (Tile)

地图卡定义大地图上的地块（房间、走廊等）。

### 4.1 设计结构

```typescript
{
  "id": "tile_library",
  "name": "布满灰尘的图书馆",
  "description": "这里的书架上摆满了禁忌的知识。",
  "type": "room",
  "floors": ["GROUND", "UPPER"],
  "edges": { "N": "WALL", "S": "OPEN", "E": "OPEN", "W": "WALL" },
  "icon": "Book",
  "cardSymbol": "OMEN",
  "effects": [
    { "type": "buff", "text": "如果你在这里结束回合，获得 1 点知识。" }
  ]
}
```

### 4.2 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | 唯一标识符，建议格式：`tile_名称` |
| `name` | string | ✅ | 显示名称 |
| `description` | string | ✅ | 地块描述 |
| `type` | string | ✅ | 地块类型 |
| `floors` | string[] | ✅ | 所在楼层 |
| `edges` | object | ✅ | 四个方向的连通性 |
| `icon` | string | ✅ | 图标标识 |
| `cardSymbol` | string | ❌ | 触发卡牌类型 |
| `effects` | object[] | ❌ | 地块特殊效果 |
| `eventTrigger` | string | ❌ | 触发的事件 ID |

### 4.3 地块类型

| 类型 | 说明 |
|------|------|
| `room` | 房间 |
| `corridor` | 走廊 |
| `special` | 特殊地块（如入口、楼梯） |

### 4.4 楼层系统

| 楼层 | 说明 |
|------|------|
| `BASEMENT` | 地下室 |
| `GROUND` | 一楼 |
| `UPPER` | 二楼 |

### 4.5 边缘连接 (edges)

定义四个方向的连通性：

| 类型 | 说明 |
|------|------|
| `OPEN` | 开放，可通行 |
| `WALL` | 墙壁，不可通行 |
| `RUBBLE` | 碎石，需清理 |
| `SECRET_DOOR` | 暗门 |

```typescript
// 北侧开放，东侧墙壁，南侧开放，西侧暗门
{ "N": "OPEN", "E": "WALL", "S": "OPEN", "W": "SECRET_DOOR" }
```

### 4.6 触发卡牌 (cardSymbol)

进入地块时可能触发的事件类型：

| 类型 | 说明 |
|------|------|
| `EVENT` | 触发随机事件 |
| `ITEM` | 触发物品事件 |
| `OMEN` | 触发灾祸事件 |

### 4.7 地块效果 (effects)

与物品被动效果相同，支持 `buff`、`debuff`、`trigger`、`item` 类型。

---

## 5. 事件卡 (Event)

事件卡定义玩家探索时触发的随机事件。

### 5.1 设计结构

```typescript
{
  "id": "event_burning_man",
  "type": "EVENT",
  "title": "燃烧之人",
  "description": "一个被火焰包围的鬼魅人影在你面前无声地尖叫。",
  "flavorText": "这火焰虽是幻象，但恐惧却真实无比。",
  "icon": "Flame",
  "triggerType": "ON_ENTER",
  "interaction": {
    "type": "ATTRIBUTE_CHECK",
    "attribute": "sanity",
    "difficulty": 4,
    "success": [
      { "type": "modify_stat", "attribute": "knowledge", "amount": 1 },
      { "type": "narrative_log", "message": "火焰如同出现时一样迅速熄灭了。" }
    ],
    "failure": [
      { "type": "modify_stat", "attribute": "sanity", "amount": -1 },
      { "type": "narrative_log", "message": "你惊恐地逃离现场。" }
    ]
  }
}
```

### 5.2 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | 唯一标识符 |
| `type` | string | ✅ | 固定为 `EVENT` |
| `title` | string | ✅ | 事件标题 |
| `description` | string | ✅ | 事件描述 |
| `flavorText` | string | ❌ | 补充描述/氛围文本 |
| `icon` | string | ✅ | 图标标识 |
| `triggerType` | string | ❌ | 触发类型（目前仅 `ON_ENTER`） |
| `interaction` | object | ✅ | 交互定义 |

### 5.3 交互类型

#### 5.3.1 属性检定 (ATTRIBUTE_CHECK)

```typescript
{
  "type": "ATTRIBUTE_CHECK",
  "attribute": "sanity",     // 检定属性
  "difficulty": 4,           // 难度
  "success": [/* 成功效果 */],
  "failure": [/* 失败效果 */]
}
```

#### 5.3.2 选择分支 (CHOICE)

```typescript
{
  "type": "CHOICE",
  "options": [
    {
      "label": "选项名称",
      "effects": [/* 效果列表 */]
    },
    // ... 更多选项
  ]
}
```

### 5.4 完整示例

#### 示例：腐烂的地板

```typescript
{
  "id": "event_creaky_floor",
  "type": "EVENT",
  "title": "腐烂的地板",
  "description": "脚下的木头伴随着刺耳的断裂声突然崩塌。",
  "flavorText": "下方的黑暗在等待着你。",
  "icon": "ArrowDown",
  "triggerType": "ON_ENTER",
  "interaction": {
    "type": "ATTRIBUTE_CHECK",
    "attribute": "speed",
    "difficulty": 3,
    "success": [
      { "type": "narrative_log", "message": "你千钧一发之际跳到了安全地带。" }
    ],
    "failure": [
      { "type": "move_player", "location": "basement" },
      { "type": "modify_stat", "attribute": "might", "amount": -1 },
      { "type": "narrative_log", "message": "你重重地摔在冰冷的石板地上。" }
    ]
  }
}
```

#### 示例：漆黑棺材（多分支）

```typescript
{
  "id": "event_coffin",
  "type": "EVENT",
  "title": "漆黑的棺材",
  "description": "你发现了一个打开的棺材...",
  "icon": "Moon",
  "triggerType": "ON_ENTER",
  "interaction": {
    "type": "CHOICE",
    "options": [
      {
        "label": "打入木桩 (需要匕首)",
        "effects": [
          {
            "type": "IF",
            "condition": { "op": "HAS_ITEM", "itemId": "item_dagger" },
            "then": [
              { "type": "LOG", "message": "怪物在尖叫中化为灰烬！", "style": "success" },
              { "type": "MODIFY_STAT", "target": { "type": "SELF" }, "stat": "might", "amount": 1 }
            ],
            "else": [
              { "type": "LOG", "message": "你手里没有合适的武器！", "style": "alert" },
              { "type": "MODIFY_STAT", "target": { "type": "SELF" }, "stat": "might", "amount": -2 }
            ]
          }
        ]
      },
      {
        "label": "搜身",
        "effects": [
          { "type": "LOG", "message": "你忍着恐惧搜寻了一番。", "style": "info" },
          { "type": "DRAW_CARD", "deck": "ITEM" }
        ]
      },
      {
        "label": "悄悄离开",
        "effects": [
          { "type": "LOG", "message": "你屏住呼吸离开了房间。", "style": "narrative" }
        ]
      }
    ]
  }
}
```

---

## 6. 灾祸卡 (Omen)

灾祸卡是特殊的物品卡，通常带有负面效果或高风险高回报的特性。

> 当前灾祸卡数据存储在 `omens.json` 中，结构与物品卡相同，使用 `type: "OMEN"`。

---

## 7. 技能系统 (Skill)

技能是玩家可以主动触发的特殊能力。

### 7.1 设计结构

```typescript
{
  "id": "skill_vampiric_strike",
  "name": "嗜血打击",
  "description": "只有持有匕首时可用。对最近的敌人造成 2 点物理伤害，若成功伤害则回复 1 点力量。",
  "condition": {
    "op": "HAS_ITEM",
    "itemId": "item_dagger"
  },
  "effects": [
    { "type": "MODIFY_STAT", "target": { "type": "NEAREST_ENEMY' }, "stat": "might", "amount": -2 },
    {
      "type": "IF",
      "condition": { "op": "GT", "stat": "might", "value": 0 },
      "then": [
        { "type": "MODIFY_STAT", "target": { "type": "SELF" }, "stat": "might", "amount": 1 }
      ]
    }
  ]
}
```

### 7.2 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | 唯一标识符 |
| `name` | string | ✅ | 技能名称 |
| `description` | string | ✅ | 技能描述 |
| `condition` | Condition | ❌ | 触发条件 |
| `effects` | Effect[] | ✅ | 技能效果列表 |

### 7.3 技能获取方式

1. **角色初始技能**：`CharacterDef.initialSkills`
2. **物品赋予**：`Item.grantedSkills`
3. **技能树解锁**：`SkillNode.grantsSkillId`

---

## 8. 剧本系统 (Scenario)

剧本定义"闹鬼事件"的规则和胜利条件。

### 8.1 设计结构

```typescript
{
  "id": "haunt_01",
  "name": "丧尸崛起",
  "introText": "水晶球中浮现出腐烂的面孔...",
  "traitorRule": "TRIGGER_PLAYER",
  "traitorInfo": {
    "objective": "大快朵颐。杀死所有英雄。",
    "setupText": "你现在可以指挥丧尸（暂时由叙事决定）。",
    "abilities": ["死灵领主：你的攻击可以从相邻房间发起。", "不死之身：首次致死伤害不会让你阵亡，而是将所有属性重置为 3。"]
  },
  "heroInfo": {
    "objective": "摧毁图腾。找到分布在大厦中的"仪式图腾"并将其摧毁。",
    "setupText": "图腾散发着绿色的幽光，摧毁它们需要通过力量 4+ 检定。"
  }
}
```

### 8.2 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | 唯一标识符 |
| `name` | string | ✅ | 剧本名称 |
| `introText` | string | ✅ | 开场介绍文本 |
| `traitorRule` | string | ✅ | 叛徒决定规则 |
| `traitorInfo` | object | ✅ | 叛徒信息 |
| `heroInfo` | object | ✅ | 英雄信息 |

### 8.3 叛徒决定规则 (traitorRule)

| 规则 | 说明 |
|------|------|
| `TRIGGER_PLAYER` | 触发事件的玩家成为叛徒 |
| `HIGHEST_MIGHT` | 力量最高的玩家成为叛徒 |
| `LOWEST_SANITY` | 理智最低的玩家成为叛徒 |
| `SPECIFIC_CHAR_ID` | 指定角色 ID 成为叛徒（需配合 `traitorRuleValue`） |

---

## 9. 技能树 (Skill Tree)

技能树提供角色成长的路径选择。

### 9.1 设计结构

```typescript
{
  "id": "tree_survival",
  "name": "生存本能",
  "description": "在恶劣环境中存活的技巧。强调移动力和物理抵抗。",
  "nodes": [
    {
      "id": "node_runner",
      "name": "跑者",
      "description": "基础移动速度 +1 (被动)",
      "cost": 1,
      "icon": "Wind",
      "grantsBuff": "移动速度 +1",
      "position": { "row": 0, "col": 1 }
    },
    {
      "id": "node_sprint",
      "name": "爆发",
      "description": "获得主动技能：消耗理智换取爆发移动。",
      "cost": 2,
      "icon": "Zap",
      "prerequisites": ["node_runner"],      // 前置节点
      "grantsSkillId": "skill_sprint",
      "position": { "row": 1, "col": 0 }
    }
  ]
}
```

### 9.2 节点字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | 节点 ID |
| `name` | string | ✅ | 节点名称 |
| `description` | string | ✅ | 描述 |
| `cost` | number | ✅ | 花费的技能点 |
| `icon` | string | ✅ | 图标 |
| `prerequisites` | string[] | ❌ | 前置节点 ID |
| `requiredTrait` | string | ❌ | 需要的人物特质 |
| `grantsSkillId` | string | ❌ | 解锁的技能 ID |
| `grantsBuff` | string | ❌ | 获得的被动效果文本 |
| `position` | object | ✅ | 界面布局位置 |

### 9.3 技能点系统

玩家通过游戏进程获得技能点，用于解锁技能树节点。每个节点有对应的花费（cost）。

---

## 附录：可用图标一览

| 图标 ID | 说明 |
|---------|------|
| `Crosshair` | 瞄准 |
| `Sword` | 剑/武器 |
| `Gem` | 宝石/护身符 |
| `Syringe` | 注射器/药物 |
| `Hammer` | 锤子/镐 |
| `Footprints` | 脚印/走廊 |
| `Book` | 书籍/图书馆 |
| `Trees` | 植物/温室 |
| `Utensils` | 餐具/厨房 |
| `Church` | 教堂 |
| `Dumbbell` | 哑铃/体育馆 |
| `Lock` | 锁/金库 |
| `ArrowDown` | 向下/楼梯 |
| `Flame` | 火焰 |
| `Ghost` | 幽灵 |
| `Moon` | 月亮/棺材 |
| `Wind` | 风/速度 |
| `Zap` | 闪电/爆发 |
| `Shield` | 盾牌/防御 |
| `Heart` | 心/生命 |
| `Cross` | 十字/驱魔 |

---

*文档版本：1.0*
*最后更新：2026-03-12*
