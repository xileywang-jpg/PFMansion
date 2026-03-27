# 📐 Mansion Protocol 策划配置指南

> ⚠️ **更新 (2026-03-27)**: 数据系统已重构，请参考本文档最新结构。

---

## 1. 数据目录结构

游戏数据位于 `data/source/` 目录下，按**主题**组织：

```
data/source/
├── original/          # 原版主题（山屋惊魂风格）
│   ├── characters/
│   ├── tiles/
│   ├── items/
│   ├── events/
│   ├── omens/
│   ├── scenarios/
│   └── skills/
└── volantis/          # 翁法罗斯主题（崩坏星穹铁道风格）
    ├── characters/
    ├── tiles/
    ├── items/
    ├── events/
    ├── omens/
    └── scenarios/
```

### 主题配置文件
```typescript
// data/source/index.ts
export const THEMES = [
  { id: 'original', name: '原版', description: '经典山屋惊魂' },
  { id: 'volantis', name: '翁法罗斯', description: '崩坏星穹铁道 - 永恒之地' }
];
```

---

## 2. 数据格式规范

### 2.1 角色 (Characters)
**文件**: `data/source/[theme]/characters/original.ts`

```typescript
export const CHARACTERS_DATA = [
  {
    id: "char_1",
    name: "莱因哈特神父",
    description: "一位有着黑暗过去、对神秘学极有研究的神职人员。",
    traits: ["受祝福"],
    attributes: {
      might: { current: 2, max: 6 },
      speed: { current: 2, max: 6 },
      sanity: { current: 3, max: 6 },
      knowledge: { current: 3, max: 6 }
    }
  }
];
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 唯一标识符，如 `char_priest` |
| `name` | string | 角色显示名称 |
| `description` | string | 角色背景描述 |
| `traits` | array | 特质标签，用于技能树判定，如 `["强壮", "神圣"]` |
| `attributes` | object | 四维属性定义 (might, speed, sanity, knowledge) |

### 2.2 道具 (Items)
**文件**: `data/source/[theme]/items/original.ts`

> **注意**: 原版主题使用**对象格式** (key-value)，翁法罗斯主题使用**数组格式**。

#### 对象格式 (original)
```typescript
export const ITEMS_DATA = {
  "item_revolver": {
    id: "item_revolver",
    name: "生锈的左轮手枪",
    type: "WEAPON",
    usage: {
      actionLabel: "开火",
      target: "OPPONENT",
      effects: [...]
    },
    passiveEffects: ["攻击时力量 +2"]
  }
};
```

#### 数组格式 (volantis)
```typescript
export const ITEMS_DATA = [
  {
    id: "vol_weapon_spear_athena",
    name: "雅典娜的长矛",
    type: "WEAPON",
    usage: {
      actionLabel: "投掷",
      target: "OPPONENT",
      effects: [...]
    },
    passiveEffects: ["力量+1"]
  }
];
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `type` | string | `WEAPON`, `CONSUMABLE`, `PASSIVE`, `OMEN` |
| `usage` | object | (可选) 主动使用效果。使用 Logic DSL |
| `usage.target` | string | `SELF` (自己), `OPPONENT` (需选择同房间目标) |
| `usage.effects` | array | Logic DSL 效果列表 |
| `passiveEffects` | array | 被动效果文本描述 |

### 2.3 地图块 (Tiles)
**文件**: `data/source/[theme]/tiles/original.ts`

| 字段 | 类型 | 说明 |
|------|------|------|
| `type` | string | `room`, `corridor`, `special` |
| `floors` | array | `GROUND`, `BASEMENT`, `UPPER` |
| `edges` | object | `N`, `S`, `E`, `W` 的开口: `OPEN`, `WALL` |
| `eventTrigger` | string | (可选) 强制触发的事件 ID |

### 2.4 事件 (Events)
**文件**: `data/source/[theme]/events/original.ts`

支持两种交互类型：
- `ATTRIBUTE_CHECK` - 属性检定（简单）
- `CHOICE` - 选择题（复杂，使用 Logic DSL）

### 2.5 剧本 (Scenarios)
**文件**: `data/source/[theme]/scenarios/original.ts`

---

## 3. 逻辑脚本引擎 (Logic DSL)

**适用范围**: 技能、道具主动效果、选择型事件

### 3.1 目标选择器 (Target Selector)

| 类型 | 说明 |
|------|------|
| `SELF` | 自己 |
| `SELECTED_PARTNER` | 在交互界面选中的目标 |
| `NEAREST_ENEMY` | 距离最近的敌人（曼哈顿距离） |
| `ALL_OTHERS` | 除自己外的所有存活玩家 |
| `TILE_AT` + `direction` | 指定方向相邻地块上的玩家 |

### 3.2 条件判定 (Condition)

| 条件 | 说明 |
|------|------|
| `{ "op": "GT", "stat": "might", "value": 4 }` | 属性 > |
| `{ "op": "HAS_ITEM", "itemId": "item_dagger" }` | 持有物品 |
| `{ "op": "IS_TRAITOR" }` | 是叛徒 |
| `{ "op": "IS_ALIVE" }` | 存活 |
| `{ "op": "AND", "conditions": [...] }` | 复合条件 |

### 3.3 执行效果 (Effect)

| 类型 | 参数 | 说明 |
|------|------|------|
| `LOG` | `message`, `style` | 显示日志 |
| `MODIFY_STAT` | `target`, `stat`, `amount` | 修改属性值 |
| `DAMAGE` | `target`, `amount`, `damageType` | 造成伤害 |
| `HEAL` | `target`, `stat`, `amount` | 恢复属性 |
| `ADD_ITEM` | `target`, `itemId` | 获得物品 |
| `REMOVE_ITEM` | `target`, `itemId` | 移除物品 |
| `TELEPORT` | `target`, `location` | 传送 |
| `DRAW_CARD` | `deck` | 抽卡 |
| `IF` | `condition`, `then`, `else` | 条件分支 |

---

## 4. 配置示例

### 4.1 事件 - 选择题
```typescript
{
  id: "event_mysterious_altar",
  type: "EVENT",
  title: "神秘祭坛",
  interaction: {
    type: "CHOICE",
    options: [
      {
        label: "献祭 (力量 -1)",
        effects: [
          { type: "DAMAGE", target: { type: "SELF" }, amount: 1 },
          { type: "MODIFY_STAT", target: { type: "SELF" }, stat: "knowledge", amount: 2 }
        ]
      }
    ]
  }
}
```

### 4.2 道具 - 战斗武器
```typescript
{
  id: "item_taser",
  name: "电击枪",
  type: "WEAPON",
  usage: {
    actionLabel: "电击",
    target: "OPPONENT",
    isConsumable: true,
    effects: [
      { type: "DAMAGE", target: { type: "SELECTED_PARTNER" }, amount: 1 },
      { type: "MODIFY_STAT", target: { type: "SELECTED_PARTNER" }, stat: "speed", amount: -2 }
    ]
  }
}
```
