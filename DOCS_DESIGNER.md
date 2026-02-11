
# 📐 Mansion Protocol 策划配置指南

本文档旨在指导游戏策划和设计人员如何通过编辑 `data/source/*.json` 文件来添加游戏内容。

系统目前存在两套逻辑处理方式，请根据使用场景选择：
1.  **ScriptAction (简单脚本)**: 主要用于旧版事件 (`ATTRIBUTE_CHECK`) 的成功/失败结果。
2.  **Logic DSL (逻辑引擎)**: 用于**技能**、**道具主动使用**以及**新版事件 (`CHOICE`)**。功能更强大，支持条件判断。

---

## 1. 基础配置模块

### 1.1 角色 (Characters)
*文件路径*: `data/source/characters.json`

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | string | 唯一标识符，如 `char_priest` |
| `name` | string | 角色显示名称 |
| `description` | string | 角色背景描述 |
| `traits` | array | 特质标签，用于技能树判定，如 `["强壮", "神圣"]` |
| `attributes` | object | 四维属性定义 (might, speed, sanity, knowledge) |

### 1.2 道具 (Items)
*文件路径*: `data/source/items.json`

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `type` | string | `WEAPON`, `CONSUMABLE`, `PASSIVE`, `OMEN` |
| `usage` | object | (可选) 主动使用效果。 **使用 Logic DSL**。 |
| `usage.target`| string | `SELF` (自己), `OPPONENT` (需选择同房间目标) |
| `usage.effects`| array | Logic DSL 效果列表 |
| `passiveEffects`| array | 简单的被动文本描述 |

### 1.3 地图块 (Tiles)
*文件路径*: `data/source/tiles.json`

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `type` | string | `room`, `corridor`, `special` |
| `floors` | array | `GROUND`, `BASEMENT`, `UPPER` |
| `edges` | object | `N`, `S`, `E`, `W` 的开口: `OPEN`, `WALL` |
| `eventTrigger` | string | (可选) 强制触发的事件 ID |

---

## 2. 逻辑脚本引擎 (Logic DSL)

**适用范围**: 技能 (`skills.json`)、道具主动效果 (`items.json` -> `usage`)、选择型事件 (`events.json` -> `CHOICE`).

### 2.1 目标选择器 (Target Selector)
用于指定动作的接收者。

*   `"type": "SELF"`: 自己。
*   `"type": "SELECTED_PARTNER"`: 在交互界面选中的目标（用于道具/技能）。
*   `"type": "NEAREST_ENEMY"`: 距离最近的敌人（曼哈顿距离）。
*   `"type": "ALL_OTHERS"`: 除自己外的所有存活玩家。
*   `"type": "TILE_AT", "direction": "N"`: 指定方向相邻地块上的玩家。

### 2.2 条件判定 (Condition)
用于 `IF` 语句或技能使用门槛。

*   `{ "op": "GT", "stat": "might", "value": 4 }` (属性 >)
*   `{ "op": "HAS_ITEM", "itemId": "item_dagger" }` (持有物品)
*   `{ "op": "IS_TRAITOR" }` (是叛徒)
*   `{ "op": "IS_ALIVE" }` (存活)
*   `{ "op": "AND", "conditions": [...] }`

### 2.3 执行效果 (Effect)

| 类型 | 参数 | 说明 |
| :--- | :--- | :--- |
| **LOG** | `message` (string), `style` (string) | 显示日志。style: `info`, `success`, `alert`, `narrative` |
| **MODIFY_STAT** | `target`, `stat`, `amount` | 修改属性值 (可为负数) |
| **DAMAGE** | `target`, `amount`, `damageType` | 造成伤害 (通常扣除力量，会有受击反馈) |
| **HEAL** | `target`, `stat`, `amount` | 恢复属性 (不超过上限) |
| **ADD_ITEM** | `target`, `itemId` | 给予目标指定物品 |
| **REMOVE_ITEM** | `target`, `itemId` | 移除目标指定物品 |
| **TELEPORT** | `target`, `location` | 传送。location: `BASEMENT`, `ENTRANCE` |
| **DRAW_CARD** | `deck` | 抽卡 (`EVENT`, `ITEM`) |
| **IF** | `condition`, `then` (array), `else` (array) | 条件分支 |

---

## 3. 全集配置示例

### 3.1 复杂事件 (选择题 + 逻辑判断)
*data/source/events.json*

```json
{
  "event_mysterious_altar": {
    "id": "event_mysterious_altar",
    "type": "EVENT",
    "title": "神秘祭坛",
    "description": "一座染血的祭坛，上面刻着一行小字：『献祭力量，换取真理。』",
    "triggerType": "ON_ENTER",
    "interaction": {
      "type": "CHOICE",
      "options": [
        {
          "label": "献祭 (力量 -1)",
          "effects": [
            { "type": "DAMAGE", "target": { "type": "SELF" }, "amount": 1 },
            { "type": "MODIFY_STAT", "target": { "type": "SELF" }, "stat": "knowledge", "amount": 2 },
            { "type": "LOG", "message": "剧痛换来了前所未有的清醒！", "style": "success" }
          ]
        },
        {
          "label": "摧毁祭坛 (需要: 锤子)",
          "effects": [
            {
              "type": "IF",
              "condition": { "op": "HAS_ITEM", "itemId": "item_hammer" },
              "then": [
                { "type": "LOG", "message": "你砸碎了祭坛，发现里面藏着东西。", "style": "success" },
                { "type": "ADD_ITEM", "target": { "type": "SELF" }, "itemId": "item_ancient_rune" }
              ],
              "else": [
                { "type": "LOG", "message": "你徒手尝试破坏，结果弄伤了自己。", "style": "alert" },
                { "type": "DAMAGE", "target": { "type": "SELF" }, "amount": 1 }
              ]
            }
          ]
        },
        {
          "label": "离开",
          "effects": [
            { "type": "LOG", "message": "你决定不惹麻烦。", "style": "info" }
          ]
        }
      ]
    }
  }
}
```

### 3.2 战斗道具 (指定目标)
*data/source/items.json*

```json
{
  "item_taser": {
    "id": "item_taser",
    "name": "电击枪",
    "type": "WEAPON",
    "usage": {
      "actionLabel": "电击",
      "target": "OPPONENT", 
      "isConsumable": true,
      "effects": [
        { "type": "DAMAGE", "target": { "type": "SELECTED_PARTNER" }, "amount": 1 },
        { "type": "MODIFY_STAT", "target": { "type": "SELECTED_PARTNER" }, "stat": "speed", "amount": -2 },
        { "type": "LOG", "message": "目标被电击麻痹了！", "style": "alert" }
      ]
    }
  }
}
```
