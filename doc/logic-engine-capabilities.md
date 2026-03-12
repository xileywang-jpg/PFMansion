# Mansion Protocol 规则引擎能力详解

> 本文档详细介绍 PF 项目规则引擎（Mansion Protocol）支持的所有自定义操作能力。
> 适用于设计师和开发者进行技能、事件、剧本的逻辑编写。

---

## 目录

1. [目标选择器 (Target Selector)](#1-目标选择器-target-selector)
2. [条件判断 (Condition)](#2-条件判断-condition)
3. [执行效果 (Effect)](#3-执行效果-effect)
4. [逻辑运算符](#4-逻辑运算符)
5. [完整 DSL 示例](#5-完整-dsl-示例)

---

## 1. 目标选择器 (Target Selector)

目标选择器用于确定逻辑效果将作用于哪个玩家或实体。

| 类型 | 标识 | 说明 | 示例 |
|------|------|------|------|
| 自己 | `SELF` | 当前执行技能/动作的玩家 | 恢复自己的生命 |
| 所有其他人 | `ALL_OTHERS` | 除自己外的所有存活玩家 | 对所有人造成伤害 |
| 最近敌人 | `NEAREST_ENEMY` | 距离自己最近的敌人（曼哈顿距离） | 攻击最近的威胁 |
| 已选伙伴 | `SELECTED_PARTNER` | 当前交互面板中选中的玩家 | 指定目标 |
| 方向地块 | `TILE_AT` | 特定方向的地块上的玩家 | 北侧房间的玩家 |

### 方向修饰符

与 `TILE_AT` 配合使用：

```typescript
{ type: 'TILE_AT', direction: 'N' }  // 北侧
{ type: 'TILE_AT', direction: 'S' }  // 南侧
{ type: 'TILE_AT', direction: 'E' }  // 东侧
{ type: 'TILE_AT', direction: 'W' }  // 西侧
```

---

## 2. 条件判断 (Condition)

条件用于判断某个状态是否满足，是触发技能或分支逻辑的基础。

### 2.1 基础属性条件

| 操作符 | 说明 | 示例 |
|--------|------|------|
| `GT` | 大于 | 力量 > 5 时触发 |
| `LT` | 小于 | 理智 < 3 时触发 |
| `EQ` | 等于 | 速度 = 4 时触发 |

```typescript
// 力量大于 3
{ op: 'GT', stat: 'might', value: 3 }

// 理智小于等于 2
{ op: 'LT', stat: 'sanity', value: 2 }

// 知识等于 6
{ op: 'EQ', stat: 'knowledge', value: 6 }
```

### 2.2 物品条件

| 操作符 | 说明 | 示例 |
|--------|------|------|
| `HAS_ITEM` | 持有指定物品 | 持有匕首时可用 |

```typescript
// 持有祭祀匕首
{ op: 'HAS_ITEM', itemId: 'item_dagger' }
```

### 2.3 身份状态

| 操作符 | 说明 | 示例 |
|--------|------|------|
| `IS_TRAITOR` | 是叛徒 | 叛徒专属技能 |
| `IS_ALIVE` | 存活 | 亡者不可被选为目标 |

```typescript
// 目标是叛徒
{ op: 'IS_TRAITOR' }

// 目标存活
{ op: 'IS_ALIVE' }
```

### 2.4 可用属性名称

| 属性名 | 说明 | 中文名 |
|--------|------|--------|
| `might` | 力量/体力 | 力量 |
| `speed` | 速度/敏捷 | 速度 |
| `sanity` | 理智/精神 | 理智 |
| `knowledge` | 知识/智慧 | 知识 |

---

## 3. 执行效果 (Effect)

效果是对游戏状态产生的实际改变。

### 3.1 属性操作

#### 3.1.1 修改属性 (MODIFY_STAT)

```typescript
{
  type: 'MODIFY_STAT',
  target: { type: 'SELF' },
  stat: 'might',
  amount: 2
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `target` | TargetSelector | ✅ | 目标选择器 |
| `stat` | string | ✅ | 属性名 (might/speed/sanity/knowledge) |
| `amount` | number | ✅ | 变化量 (正数增加，负数减少) |

#### 3.1.2 伤害 (DAMAGE)

```typescript
{
  type: 'DAMAGE',
  target: { type: 'NEAREST_ENEMY' },
  amount: 2,
  damageType: 'PHYSICAL'  // 可选：PHYSICAL 或 MENTAL
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `target` | TargetSelector | ✅ | 目标选择器 |
| `amount` | number | ✅ | 伤害数值 |
| `damageType` | string | ❌ | 伤害类型（暂未完全实装） |

#### 3.1.3 治疗 (HEAL)

```typescript
{
  type: 'HEAL',
  target: { type: 'SELF' },
  stat: 'sanity',
  amount: 1
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `target` | TargetSelector | ✅ | 目标选择器 |
| `stat` | string | ✅ | 要恢复的属性 |
| `amount` | number | ✅ | 恢复数值 |

---

### 3.2 移动与传送

#### 3.2.1 移动 (MOVE)

```typescript
{
  type: 'MOVE',
  target: { type: 'SELF' },
  steps: 2
}
```

> ⚠️ **注意**：物理移动功能暂未完全实装，目前仅作日志记录。

#### 3.2.2 传送 (TELEPORT)

```typescript
{
  type: 'TELEPORT',
  target: { type: 'SELF' },
  location: 'BASEMENT'  // 或 'ENTRANCE'
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `target` | TargetSelector | ✅ | 目标选择器 |
| `location` | string | ✅ | 目标位置：BASEMENT（地下室）或 ENTRANCE（入口） |

---

### 3.3 物品操作

#### 3.3.1 添加物品 (ADD_ITEM)

```typescript
{
  type: 'ADD_ITEM',
  target: { type: 'SELF' },
  itemId: 'item_revolver'
}
```

#### 3.3.2 移除物品 (REMOVE_ITEM)

```typescript
{
  type: 'REMOVE_ITEM',
  target: { type: 'SELF' },
  itemId: 'item_amulet'
}
```

> ⚠️ **注意**：移除物品功能需扩展底层支持。

---

### 3.4 卡牌操作

#### 3.4.1 抽牌 (DRAW_CARD)

```typescript
{
  type: 'DRAW_CARD',
  deck: 'EVENT'  // 或 'ITEM'
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `deck` | string | ✅ | 卡牌堆：EVENT（事件）或 ITEM（物品） |

---

### 3.5 叙事与日志

#### 3.5.1 日志输出 (LOG)

```typescript
{
  type: 'LOG',
  message: '你感到一股力量涌遍全身！',
  style: 'success'  // info/alert/success/narrative
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `message` | string | ✅ | 日志内容 |
| `style` | string | ❌ | 日志样式：info（默认）、alert（警告）、success（成功）、narrative（叙事） |

---

### 3.6 场景与召唤

#### 3.6.1 生成令牌 (SPAWN_TOKEN)

```typescript
{
  type: 'SPAWN_TOKEN',
  tokenId: 'token_zombie',
  location: { type: 'TILE_AT', direction: 'N' }
}
```

> ⚠️ **注意**：令牌生成功能暂未完全实装。

---

### 3.7 条件分支 (IF)

支持 if-then-else 逻辑：

```typescript
{
  type: 'IF',
  condition: { op: 'HAS_ITEM', itemId: 'item_dagger' },
  then: [
    // 条件满足时执行
    { type: 'LOG', message: '你刺出了致命一刀！', style: 'success' },
    { type: 'MODIFY_STAT', target: { type: 'NEAREST_ENEMY' }, stat: 'might', amount: -3 }
  ],
  else: [
    // 条件不满足时执行
    { type: 'LOG', message: '你手里没有武器！', style: 'alert' },
    { type: 'MODIFY_STAT', target: { type: 'NEAREST_ENEMY' }, stat: 'might', amount: -1 }
  ]
}
```

---

## 4. 逻辑运算符

### 4.1 AND（与）

所有条件都满足才返回 true：

```typescript
{
  op: 'AND',
  conditions: [
    { op: 'GT', stat: 'might', value: 3 },
    { op: 'IS_ALIVE' }
  ]
}
```

### 4.2 OR（或）

任一条件满足即返回 true：

```typescript
{
  op: 'OR',
  conditions: [
    { op: 'HAS_ITEM', itemId: 'item_dagger' },
    { op: 'HAS_ITEM', itemId: 'item_revolver' }
  ]
}
```

---

## 5. 完整 DSL 示例

### 示例 1：嗜血打击技能

```typescript
{
  id: 'skill_vampiric_strike',
  name: '嗜血打击',
  description: '只有持有匕首时可用。对最近的敌人造成 2 点物理伤害，若成功伤害则回复 1 点力量。',
  condition: {
    op: 'HAS_ITEM',
    itemId: 'item_dagger'
  },
  effects: [
    // 对最近敌人造成 2 点伤害
    {
      type: 'MODIFY_STAT',
      target: { type: 'NEAREST_ENEMY' },
      stat: 'might',
      amount: -2
    },
    // 如果敌人还活着，回复 1 点力量
    {
      type: 'IF',
      condition: {
        op: 'GT',
        stat: 'might',
        value: 0
      },
      then: [
        {
          type: 'MODIFY_STAT',
          target: { type: 'SELF' },
          stat: 'might',
          amount: 1
        }
      ]
    }
  ]
}
```

### 示例 2：冥想技能

```typescript
{
  id: 'skill_meditate',
  name: '冥想',
  description: '在原地休息，恢复 1 点理智。',
  effects: [
    {
      type: 'MODIFY_STAT',
      target: { type: 'SELF' },
      stat: 'sanity',
      amount: 1
    }
  ]
}
```

### 示例 3：肾上腺素爆发

```typescript
{
  id: 'skill_sprint',
  name: '肾上腺素爆发',
  description: '消耗 1 点理智，换取 3 点临时移动力。',
  condition: {
    op: 'GT',
    stat: 'sanity',
    value: 1  // 至少需要 2 点理智
  },
  effects: [
    { type: 'MODIFY_STAT', target: { type: 'SELF' }, stat: 'sanity', amount: -1 },
    { type: 'MODIFY_STAT', target: { type: 'SELF' }, stat: 'speed', amount: 3 }
  ]
}
```

### 示例 4：事件分支选择

```typescript
{
  id: 'event_coffin',
  type: 'EVENT',
  title: '漆黑的棺材',
  interaction: {
    type: 'CHOICE',
    options: [
      {
        label: '打入木桩 (需要匕首)',
        effects: [
          {
            type: 'IF',
            condition: { op: 'HAS_ITEM', itemId: 'item_dagger' },
            then: [
              { type: 'LOG', message: '怪物在尖叫中化为灰烬！', style: 'success' },
              { type: 'MODIFY_STAT', target: { type: 'SELF' }, stat: 'might', amount: 1 }
            ],
            else: [
              { type: 'LOG', message: '你手里没有合适的武器！', style: 'alert' },
              { type: 'MODIFY_STAT', target: { type: 'SELF' }, stat: 'might', amount: -2 }
            ]
          }
        ]
      },
      {
        label: '搜身',
        effects: [
          { type: 'LOG', message: '你发现了一些有用的东西。', style: 'info' },
          { type: 'DRAW_CARD', deck: 'ITEM' }
        ]
      },
      {
        label: '悄悄离开',
        effects: [
          { type: 'LOG', message: '你屏住呼吸离开了房间。', style: 'narrative' }
        ]
      }
    ]
  }
}
```

---

## 附录：可用属性一览

| 属性 | 说明 | 典型用途 |
|------|------|----------|
| `might` | 力量/体力 | 物理攻击、力量检定 |
| `speed` | 速度/敏捷 | 闪避、速度检定 |
| `sanity` | 理智/精神 | 抵抗恐惧、精神攻击 |
| `knowledge` | 知识/智慧 | 认知检定、发现线索 |

---

*文档版本：1.0*
*最后更新：2026-03-12*
