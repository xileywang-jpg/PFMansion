# 翁法罗斯主题 - 剩余待实现功能清单

> 更新于 2026-03-30：`onEnter`、`onLeave`、`interact` 已完成接线并由后端权威执行。本文档以下仅保留尚未完成或仍需扩展的能力。

---

## 地图卡 (Tiles) - 当前状态

### 检定与互动系统

| 功能 | 描述 | 优先级 |
|------|------|--------|
| `onEnter` | 进入地块时触发检定 | 已实现 |
| `onLeave` | 离开地块时触发检定 | 已实现 |
| `interact` | 交互式地块（交易、锻造、占卜等） | 已实现 |

### 检定效果

| 效果 | 描述 | 状态 |
|------|------|------|
| `DRAW_CARD` | 抽指定类型卡牌 | 中 |
| `RANDOM_EVENT` | 随机事件 | 中 |
| `TELEPORT` | 传送至任意已揭示区域 | 已实现 |
| `REVEAL_MAP` | 揭示全图 | 中 |
| `DIVINATION` | 预知下一个事件 | 低 |
| `MIRROR` | 镜面交互 | 低 |
| `TIME_REWIND` | 时间回溯 | 低 |
| `FORGE` | 锻造系统 | 低 |

---

## 物品卡 (Items) - 待实现

### 特殊能力

| 功能 | 描述 | 优先级 |
|------|------|--------|
| `disguise` | 伪装成其他阵营 | 中 |
| `detect_disguise` | 看破伪装 | 中 |
| `pass_wall` | 无条件穿墙 | 中 |
| `invisible` | 隐身状态 | 中 |
| `reveal_all` | 揭示所有隐藏内容 | 中 |
| `reveal_next_event` | 预知下一事件 | 低 |
| `copy_ability` | 复制敌人能力 | 低 |
| `petrify` | 石化和冻结 | 低 |
| `burn` | 灼烧效果 | 低 |
| `confuse` | 迷惑效果 | 低 |

### 行动系统

| 功能 | 描述 | 优先级 |
|------|------|--------|
| `grantedActions` | 物品赋予的主动行动 | 高 |
| `cooldown` | 技能冷却 | 中 |
| `cost` | 行动消耗 | 已实现部分 |

---

## 灾祸卡 (Omens) - 待实现

### 触发机制

| 功能 | 描述 | 优先级 |
|------|------|--------|
| `onTurnStart` | 回合开始时触发 | 高 |
| `onTurnEnd` | 回合结束时触发 | 高 |
| `onDeath` | 死亡时触发（复活） | 中 |
| `onAttack` | 攻击时触发 | 中 |
| `onReceiveDamage` | 受伤时触发 | 中 |
| `onEnemyAttack` | 敌人攻击时触发 | 中 |
| `onEnterTile` | 进入地块时自动触发 | 高 |

### 特殊效果

| 效果 | 描述 | 状态 |
|------|------|------|
| `lose_game` | 判定失败 | 已实现 |
| `revive` | 复活 | 已实现 |
| `add_effect` | 添加状态效果 | 中 |
| `reduce` | 伤害减免 | 中 |
| `roll_chance` | 概率判定 | 中 |
| `auto_reveal` | 自动揭示 | 中 |

---

## 事件/剧本 - 待实现

### 剧本结构扩展

| 功能 | 描述 | 优先级 |
|------|------|--------|
| `objectives` | 多阶段目标系统 | 高 |
| `traitorAbilities` | 叛徒特殊能力 | 中 |
| `victoryConditions` | 胜利条件细分 | 高 |

---

## 已实现功能 (参考)

以下是当前规则引擎已支持的功能：

### 目标选择器
- `SELF` - 自己
- `ALL_OTHERS` - 所有其他人
- `NEAREST_ENEMY` - 最近敌人
- `SELECTED_PARTNER` - 已选目标
- `TILE_AT` - 方向地块

### 条件判断
- `GT` / `LT` / `EQ` - 属性比较
- `HAS_ITEM` - 持有物品
- `IS_TRAITOR` - 是叛徒
- `IS_ALIVE` - 存活
- `AND` / `OR` - 逻辑运算符

### 执行效果
- `MODIFY_STAT` - 修改属性
- `DAMAGE` - 伤害
- `HEAL` - 治疗
- `MOVE` - 移动
- `TELEPORT` - 传送
- `ADD_ITEM` / `REMOVE_ITEM` - 物品操作
- `DRAW_CARD` - 抽牌
- `LOG` - 日志输出
- `IF` - 条件分支

---

*最后更新：2026-03-12*
