# 🎮 Mansion Protocol 游戏实现文档

> **目标**: 让开发人员可以参照本文档 review 代码实现程度
> **最后更新**: 2026-03-27

---

## 目录

1. [游戏阶段模型](#1-游戏阶段模型)
2. [游戏整体流程](#2-游戏整体流程)
3. [回合定义](#3-回合定义)
4. [操作序列图](#4-操作序列图)
5. [功能模块详解](#5-功能模块详解)
6. [状态同步机制](#6-状态同步机制)
7. [代码位置索引](#7-代码位置索引)

---

## 1. 游戏阶段模型

### 1.1 阶段枚举

```typescript
// types.ts
export enum GamePhase {
  Exploration = 'EXPLORATION',    // 探索阶段
  HauntRoll = 'HAUNT_ROLL',       // 作祟检定阶段
  HauntReveal = 'HAUNT_REVEAL',   // 作祟揭晓阶段
  Haunt = 'HAUNT',                // 作祟阶段（战斗）
  GameOver = 'GAME_OVER',         // 游戏结束
}
```

### 1.2 回合阶段 (TurnPhase)

```typescript
// types.ts
export type TurnPhase = 
  | 'MOVING'              // 移动阶段
  | 'EVENT_RESOLVING'     // 事件结算中
  | 'ATTRIBUTE_CHECK'      // 属性检定中
  | 'CHOICE'              // 选择中
  | 'COMBAT_ATTACK'       // 战斗中-攻击
  | 'COMBAT_DEFENSE'      // 战斗中-防御
  | 'DONE';               // 回合结束
```

### 1.3 阶段转换图

```
┌─────────────────────────────────────────────────────────────────────┐
│                         游戏开始                                    │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  EXPLORATION (探索阶段)                                              │
│  - 玩家轮流探索地图                                                  │
│  - 触发房间事件、拾取物品                                           │
│  - 每次揭示预兆时：立即进行作祟检定                                 │
│    - sum < OmenCount → 进入 HAUNT_REVEAL (作祟爆发)                 │
│    - sum >= OmenCount → 玩家获得预兆卡，继续探索                    │
└─────────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
         ┌──────────────────┐    ┌──────────────────┐
         │ 作祟检定成功      │    │ 作祟检定失败    │
         │ (骰子和 >= 预兆)  │    │ (骰子和 < 预兆)  │
         │ 玩家获得预兆卡    │    │ 进入 HAUNT_REVEAL│
         └──────────────────┘    └──────────────────┘
                    │                       │
                    ▼                       ▼
         ┌──────────────────┐    ┌──────────────────┐
         │ 留在 EXPLORATION  │    │ HAUNT_REVEAL    │
         │ (暂时安全)        │    │ - 分配叛徒      │
         │                   │    │ - 确定剧本      │
         └──────────────────┘    │ - 叛徒获得预兆  │
                                │ - 初始化目标    │
                                └──────────────────┘
                                        │
                                        ▼
                                ┌──────────────────┐
                                │ 进入 HAUNT       │
                                │ (作祟爆发)       │
                                └──────────────────┘
                                        │
                                        ▼
                            ┌──────────────────────┐
                            │ HAUNT (作祟阶段)     │
                            │ - 英雄 vs 叛徒       │
                            │ - 每回合检查胜利     │
                            │ - 目标进度更新       │
                            └──────────────────────┘
                                        │
                                        ▼
                            ┌──────────────────────┐
                            │ GAME_OVER           │
                            │ - 显示胜利者        │
                            └──────────────────────┘
```

---

## 2. 游戏整体流程

### 2.1 流程图

```
1. 房间创建/加入
   │
   ├── 创建房间 (create_room)
   │     └── 返回 roomId, playerId
   │
   └── 加入房间 (join_room)
         └── 返回 roomId, playerId, roomInfo

2. 等待玩家准备
   │
   ├── 设置准备状态 (set_ready)
   └── 房主开始游戏 (start_game)

3. 游戏初始化 (initializeGame)
   │
   ├── 创建起始房间 (0,0)
   ├── 初始化玩家属性
   ├── 洗牌 (tiles, events, items, omens)
   └── 设置 activePlayerId = playerIds[0]

4. 回合循环
   │
   ├── 当前玩家执行操作
   │     ├── movePlayer - 移动/探索
   │     ├── placeTile - 放置房间
   │     ├── pickupItem - 拾取物品
   │     ├── useItem - 使用物品
   │     ├── startCombat - 发起战斗
   │     └── endTurn - 结束回合
   │
   └── 切换到下一玩家 (nextTurn)
         └── 重复直到游戏结束

5. 游戏结束
   │
   └── 显示胜利者 (HERO 或 TRAITOR)
```

---

## 3. 回合定义

### 3.1 探索阶段回合 (Exploration Turn)

一个探索回合包含以下步骤：

```
┌─────────────────────────────────────────────────────────────┐
│ 回合开始 (Turn Start)                                        │
├─────────────────────────────────────────────────────────────┤
│ 1. 重置 MovesRemaining = Speed 属性当前值                    │
│ 2. 设置 TurnPhase = 'MOVING'                                 │
│ 3. 处理状态效果 (StatusEffects)                              │
│ 4. 添加回合开始日志                                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 移动阶段 (MOVING Phase)                                      │
├─────────────────────────────────────────────────────────────┤
│ 可执行操作：                                                 │
│ - movePlayer(direction) - 移动到相邻房间                      │
│ - placeTile(direction, rotation) - 放置新房间                │
│ - pickupItem(itemId) - 拾取地面物品                          │
│ - interactWithWall(direction) - 与墙壁互动                   │
│                                                              │
│ 移动消耗体力，每移动/放置一次 MovesRemaining--                 │
│                                                              │
│ 当 MovesRemaining = 0 或 玩家选择结束回合时：                 │
│ → 进入 DONE Phase                                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 事件处理阶段 (Event Resolving)                               │
├─────────────────────────────────────────────────────────────┤
│ 触发条件：                                                   │
│ - 进入带有 CardSymbol 的房间                                 │
│ - 放置带有 EventTrigger 的房间                               │
│                                                              │
│ 处理流程：                                                   │
│                                                              │
│ Case: ATTRIBUTE_CHECK (属性检定)                             │
│   1. 设置 PendingAction = { type: 'ATTRIBUTE_CHECK' }         │
│   2. 玩家投骰子 (roll_dice)                                  │
│   3. 后端返回 dice_result (sum, success)                     │
│   4. 根据成功/失败执行对应效果                                │
│   5. 清除 PendingAction                                      │
│                                                              │
│ Case: CHOICE (选择)                                          │
│   1. 设置 PendingAction = { type: 'CHOICE' }                 │
│   2. 玩家选择选项                                            │
│   3. 执行选项效果                                            │
│   4. 清除 PendingAction                                      │
│                                                              │
│ Case: ITEM (物品)                                            │
│   1. 从 ITEM 牌堆抽取一张                                    │
│   2. 放到地面 DroppedItems                                   │
│   3. 玩家可选择 pickupItem                                   │
│                                                              │
│ Case: OMEN (预兆)                                            │
│   1. 从 OMEN 牌堆抽取一张                                    │
│   2. 放到地面 DroppedItems                                   │
│   3. 玩家拾取时 OmenCount++                                  │
│   4. 如果 OmenCount >= 6 → 进入 HAUNT_ROLL                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 回合结束 (Turn End)                                          │
├─────────────────────────────────────────────────────────────┤
│ 执行 nextTurn:                                               │
│ 1. 处理当前玩家状态效果 (TurnEnd)                            │
│ 2. 检查死亡                                                  │
│ 3. 切换到下一存活玩家                                         │
│ 4. 新玩家回合开始处理 (TurnStart)                            │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 预兆揭示与作祟检定 (山屋惊魂核心机制)

> **重要**: 每次揭示预兆时，都立即进行作祟检定，不是等到 OmenCount >= 6！

```
┌─────────────────────────────────────────────────────────────┐
│ 触发条件: 玩家进入带有预兆卡(OMEN)的房间                      │
├─────────────────────────────────────────────────────────────┤
│ 1. 翻开预兆卡                                                │
│ 2. OmenCount++ (揭示即增加)                                 │
│ 3. 立即投 6 个骰子进行作祟检定                               │
│ 4. 比较 sum vs OmenCount                                     │
│                                                              │
│   sum >= OmenCount → 检定成功                                │
│     - 玩家获得预兆卡                                         │
│     - 继续当前回合                                           │
│                                                              │
│   sum < OmenCount  → 检定失败 → 作祟爆发                     │
│     - 进入 HAUNT_REVEAL                                       │
│     - 叛徒获得预兆卡                                         │
│     - 分配叛徒、确定剧本                                     │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 作祟揭晓回合 (HauntReveal Turn)

```
┌─────────────────────────────────────────────────────────────┐
│ 叛徒分配                                                    │
├─────────────────────────────────────────────────────────────┤
│ 1. 根据剧本规则 (TraitorRule) 确定叛徒:                      │
│   - TRIGGER_PLAYER: 触发作祟的玩家                           │
│   - HIGHEST_MIGHT: 力量最高者                               │
│   - LOWEST_SANITY: 理智最低者                                │
│   - SPECIFIC_CHAR_ID: 指定角色                               │
│                                                              │
│ 2. 更新玩家阵营                                              │
│   - 叛徒: Team = 'TRAITOR'                                  │
│   - 其他: Team = 'HERO'                                     │
│                                                              │
│ 3. 叛徒回复所有属性到最大值                                  │
│                                                              │
│ 4. 叛徒获得预兆卡                                            │
│                                                              │
│ 5. 初始化目标系统                                            │
│   - HeroObjectives                                           │
│   - TraitorObjectives                                        │
└─────────────────────────────────────────────────────────────┘
```

### 3.4 作祟阶段回合 (Haunt Turn)

```
┌─────────────────────────────────────────────────────────────┐
│ 与探索回合类似，但增加:                                       │
├─────────────────────────────────────────────────────────────┤
│ 1. 每回合 TurnsSinceHaunt++                                 │
│ 2. 检查目标进度                                              │
│ 3. 检查胜利条件                                              │
│                                                              │
│ 胜利条件:                                                    │
│ - 英雄胜利: 叛徒死亡                                         │
│ - 叛徒胜利:                                                  │
│   - 英雄全部死亡                                             │
│   - 叛徒目标达成 (Turns >= Required)                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. 操作序列图

### 4.1 移动操作 (Move)

```
前端                           后端                           其他玩家
  │                              │                               │
  │ movePlayer('N')              │                               │
  │ ───────────────────────────► │                               │
  │                              │                               │
  │                     ┌────────┴────────┐                     │
  │                     │ 验证:            │                     │
  │                     │ - 是当前玩家?    │                     │
  │                     │ - TurnPhase正确? │                     │
  │                     │ - 有体力?       │                     │
  │                     │ - 方向有门?     │                     │
  │                     └────────┬────────┘                     │
  │                              │                               │
  │                     ┌────────┴────────┐                     │
  │                     │ 更新状态:        │                     │
  │                     │ - player.position│                     │
  │                     │ - MovesRemaining │                     │
  │                     │ - 触发房间事件  │                     │
  │                     └────────┬────────┘                     │
  │                              │                               │
  │                              │ state_sync                    │
  │                              │ ─────────────────────────────►│
  │                              │                               │
  │ ◄── 操作结果 ─────────────────│                               │
  │ (MovesRemaining--)           │                               │
```

### 4.2 放置房间 (Place Tile)

```
前端                           后端
  │                              │
  │ 玩家移动到边缘                 │
  │ 发现没有房间                   │
  │                              │
  │ pendingTile = tileFromDeck    │
  │ 显示旋转/放置UI               │
  │                              │
  │ placeTile('N', 90)           │
  │ ───────────────────────────► │
  │                              │
  │                     ┌────────┴────────┐
  │                     │ 验证:           │
  │                     │ - 有pendingTile?│
  │                     │ - 方向匹配?    │
  │                     │ - 对面有门?    │
  │                     └────────┬────────┘
  │                              │
  │                     ┌────────┴────────┐
  │                     │ 执行:           │
  │                     │ - 创建TileInst  │
  │                     │ - 放置到map     │
  │                     │ - 触发房间事件  │
  │                     │ - 清除pending   │
  │                     └────────┬────────┘
  │                              │
  │ ◄── state_sync ──────────────│
```

### 4.3 属性检定 (Attribute Check)

```
前端                           后端
  │                              │
  │ 进入房间                      │
  │ 触发 ATTRIBUTE_CHECK          │
  │                              │
  │ ◄── state_sync ──────────────│
  │ (pendingAction 设置)          │
  │                              │
  │ 显示 DiceRoller UI            │
  │                              │
  │ 玩家点击投骰                  │
  │ roll_dice(numDice=2)         │
  │ ───────────────────────────► │
  │                              │
  │                     ┌────────┴────────┐
  │                     │ 后端生成骰子    │
  │                     │ (0,1,2 faces)   │
  │                     └────────┬────────┘
  │                              │
  │ ◄── dice_result ──────────── │
  │   { results, sum, success }  │
  │                              │
  │ 显示结果动画                  │
  │                              │
  │ ◄── state_sync ──────────────│
  │ (pendingAction 清除)         │
```

### 4.4 物品拾取 (Pickup Item)

```
前端                           后端
  │                              │
  │ 玩家在带有物品的房间          │
  │ 点击物品图标                  │
  │                              │
  │ pickupItem(itemId)           │
  │ ───────────────────────────► │
  │                              │
  │                     ┌────────┴────────┐
  │                     │ 验证:          │
  │                     │ - 物品在地面?  │
  │                     └────────┬────────┘
  │                              │
  │                     ┌────────┴────────┐
  │                     │ 执行:           │
  │                     │ - 物品移入player│
  │                     │ - 如果是OMEN:  │
  │                     │   OmenCount++   │
  │                     │ - 检查>=6触发  │
  │                     └────────┬────────┘
  │                              │
  │ ◄── state_sync ──────────────│
```

### 4.5 战斗 (Combat)

```
前端                           后端
  │                              │
  │ 玩家选择攻击目标              │
  │ startCombat(defenderId, attr)│
  │ ───────────────────────────► │
  │                              │
  │                     ┌────────┴────────┐
  │                     │ 设置战斗状态    │
  │                     │ activeCombat   │
  │                     └────────┬────────┘
  │                              │
  │ ◄── state_sync ──────────────│
  │ (显示战斗UI)                  │
  │                              │
  │ 双方各自投骰 (可选)           │
  │ resolveCombat()              │
  │ ───────────────────────────► │
  │                              │
  │                     ┌────────┴────────┐
  │                     │ 后端生成骰子   │
  │                     │ 计算伤害       │
  │                     │ 检查死亡       │
  │                     └────────┬────────┘
  │                              │
  │ ◄── state_sync ──────────────│
  │ (清除combat, 应用伤害)       │
```

---

## 5. 功能模块详解

### 5.1 房间与地图系统

#### 后端实现
| 文件 | 函数 | 说明 |
|------|------|------|
| `game/room.go` | `CreateRoom` | 创建房间 |
| `game/room.go` | `JoinRoom` | 加入房间 |
| `game/room.go` | `LeaveRoom` | 离开房间 |
| `game/room.go` | `ListRooms` | 列出房间 |
| `game/state.go` | `SyncStateJSON` | 状态序列化 |

#### 前端实现
| 文件 | 函数/组件 | 说明 |
|------|----------|------|
| `store/gameStore.ts` | `initializeGame` | 初始化游戏状态 |
| `components/MapGrid.tsx` | `MapGrid` | 地图网格组件 |
| `components/Tile.tsx` | `Tile` | 地块组件 |

#### 支持的数据
```typescript
// types.ts
interface TileInstance {
  instanceId: string;
  defId: string;
  x: number;
  y: number;
  rotation: number;       // 0, 90, 180, 270
  edges: DirectionalEdges;
  hasEventTriggered: boolean;
  visibility: 'HIDDEN' | 'FOG' | 'VISIBLE';
  droppedItems: Item[];
}

interface TileDef {
  id: string;
  name: string;
  description: string;
  floors: FloorLevel[];
  edges: DirectionalEdges;
  type: 'room' | 'corridor' | 'special';
  cardSymbol?: CardSymbol;   // 'EVENT' | 'ITEM' | 'OMEN' | 'NONE'
  eventTrigger?: string;
  onEnter?: TileTrigger;
  interact?: TileInteraction;
}
```

### 5.2 玩家系统

#### 后端实现
| 文件 | 函数 | 说明 |
|------|------|------|
| `game/state.go` | `AddPlayer` | 添加玩家 |
| `game/state.go` | `RemovePlayer` | 移除玩家 |
| `game/logic.go` | `getEffectiveSpeed` | 获取有效速度 |
| `game/logic.go` | `ProcessStatusEffectsOnTurnStart` | 回合开始状态处理 |
| `game/logic.go` | `ProcessStatusEffectsOnTurnEnd` | 回合结束状态处理 |

#### 前端实现
| 文件 | 函数/组件 | 说明 |
|------|----------|------|
| `store/gameStore.ts` | `handlePlayerDeath` | 处理玩家死亡 |
| `components/PlayerHUD.tsx` | `PlayerHUD` | 玩家信息HUD |
| `components/PlayerCard.tsx` | `PlayerCard` | 玩家卡片 |

#### 支持的数据
```typescript
// types.ts
interface Player {
  id: string;
  character: CharacterDef;
  position: { x: number; y: number };
  items: Item[];
  isDead: boolean;
  team: PlayerTeam;           // 'HERO' | 'TRAITOR' | 'UNASSIGNED'
  buffs: string[];
  skills: string[];
  statusEffects: StatusEffect[];
  personalLogs: LogEntry[];
  skillPoints: number;
  unlockedSkillNodes: string[];
}

interface CharacterDef {
  id: string;
  name: string;
  description: string;
  attributes: Record<AttributeName, Attribute>;
  traits: string[];
  initialSkills?: string[];
}

interface Attribute {
  current: number;
  base: number;
  floor: number;
  max: number;
  values: number[];
  index: number;
}
```

### 5.3 回合系统

#### 后端实现
| 文件 | 函数 | 说明 |
|------|------|------|
| `game/logic.go` | `NextTurn` | 公开的回合切换接口 |
| `game/logic.go` | `nextTurnInternal` | 内部回合切换逻辑 |
| `game/logic.go` | `EndTurn` | 结束回合 |
| `game/logic.go` | `processHauntRoll` | 处理作祟检定 |
| `game/logic.go` | `triggerHaunt` | 触发作祟 |

#### 前端实现
| 文件 | 函数 | 说明 |
|------|------|------|
| `store/gameStore.ts` | `nextTurn` | 发送结束回合请求 |
| `components/TurnControl.tsx` | `TurnControl` | 回合控制UI |

#### 回合流程状态机
```
MOVING ──────────────────────────► DONE
   │                                   ▲
   │                                   │
   │  ┌────────────────────────────────┘
   │  │
   │  ▼
   │ EVENT_RESOLVING (可选)
   │   │
   │   ├──► ATTRIBUTE_CHECK (可选)
   │   │        │
   │   │        └──────────────► DONE
   │   │
   │   ├──► CHOICE (可选)
   │   │        │
   │   │        └──────────────► DONE
   │   │
   │   └──► COMBAT (可选)
   │            │
   │            └──────────────► DONE
   │
   └──► 体力耗尽 ─────────────────► DONE
```

### 5.4 物品系统

#### 后端实现
| 文件 | 函数 | 说明 |
|------|------|------|
| `game/items.go` | `PickupItem` | 捡起物品 |
| `game/items.go` | `GiveItem` | 给予物品 |
| `game/items.go` | `DropItem` | 丢弃物品 |
| `game/items.go` | `UseItem` | 使用物品 |
| `game/items.go` | `EquipItem` | 装备物品 |
| `game/items.go` | `UnequipItem` | 卸下装备 |

#### 前端实现
| 文件 | 函数/组件 | 说明 |
|------|----------|------|
| `store/gameStore.ts` | `pickupItemFromTile` | 拾取物品 |
| `store/gameStore.ts` | `giveItem` | 给予物品 |
| `store/gameStore.ts` | `dropItem` | 丢弃物品 |
| `store/gameStore.ts` | `useItem` | 使用物品 |
| `components/Inventory.tsx` | `Inventory` | 背包组件 |
| `components/ItemSlot.tsx` | `ItemSlot` | 物品栏位 |

#### 物品类型
```typescript
// types.ts
type ItemType = 'WEAPON' | 'CONSUMABLE' | 'PASSIVE' | 'OMEN';

interface Item {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: ItemType;
  usage?: ItemUsage;          // 主动使用
  passiveEffects?: PassiveEffect[];  // 被动效果
  grantedSkills?: string[];   // 赋予的技能
}

interface ItemUsage {
  actionLabel?: string;
  isConsumable: boolean;
  target?: 'SELF' | 'OPPONENT' | 'TILE';
  effects: ScriptAction[];
}
```

### 5.5 战斗系统

#### 后端实现
| 文件 | 函数 | 说明 |
|------|------|------|
| `game/combat.go` | `StartCombat` | 开始战斗 |
| `game/combat.go` | `ResolveCombat` | 结算战斗 |
| `game/combat.go` | `CancelCombat` | 取消战斗 |

#### 前端实现
| 文件 | 函数/组件 | 说明 |
|------|----------|------|
| `store/gameStore.ts` | `startCombat` | 发起战斗 |
| `components/CombatModal.tsx` | `CombatModal` | 战斗弹窗 |
| `components/DiceRoller.tsx` | `DiceRoller` | 骰子组件 |

#### 战斗流程
```
1. StartCombat(attacker, defender, attribute)
   └── 设置 activeCombat

2. 双方投骰 (由后端统一生成)
   └── RollDice(1) × 2

3. 比较结果
   └── 点数低者受伤，差值为伤害

4. ResolveCombat
   └── 应用伤害到对应属性
   └── 检查死亡 (might <= floor)
   └── 清除 activeCombat

5. 广播 state_sync
```

### 5.6 事件与检定系统

#### 后端实现
| 文件 | 函数 | 说明 |
|------|------|------|
| `game/events.go` | `TriggerRoomEvent` | 触发房间事件 |
| `game/events.go` | `ResolveEventChoice` | 结算选择事件 |
| `game/events.go` | `RollDice` | 投骰子 (后端) |
| `game/events.go` | `ApplyEffect` | 应用效果 |
| `game/actions.go` | `TriggerRoomEvent` | 触发房间事件 |
| `game/actions.go` | `ModifyStat` | 修改属性 |

#### 前端实现
| 文件 | 函数/组件 | 说明 |
|------|----------|------|
| `store/gameStore.ts` | `resolveDiceRoll` | 处理骰子结果 |
| `store/gameStore.ts` | `resolveEventChoice` | 处理事件选择 |
| `components/DiceRoller.tsx` | `DiceRoller` | 骰子UI |
| `components/EventModal.tsx` | `EventModal` | 事件弹窗 |
| `components/InteractionModal.tsx` | `InteractionModal` | 交互弹窗 |

#### 事件类型
```typescript
// types.ts
type InteractionType = 
  | 'ATTRIBUTE_CHECK'   // 属性检定
  | 'CHOICE'            // 选择
  | 'NONE';             // 无交互

interface Interaction {
  type: InteractionType;
  attribute?: AttributeName;
  difficulty?: number;
  success?: ScriptAction[];   // 成功效果
  failure?: ScriptAction[];   // 失败效果
  options?: Choice[];         // CHOICE 选项
}

interface Choice {
  label: string;
  effects: ScriptAction[];
}
```

### 5.7 剧本与目标系统

#### 后端实现
| 文件 | 函数 | 说明 |
|------|------|------|
| `game/objectives.go` | `initializeObjectivesInternal` | 初始化目标 |
| `game/objectives.go` | `UpdateObjectives` | 更新目标 |
| `game/objectives.go` | `IncrementHauntTurns` | 增加作祟回合 |
| `game/objectives.go` | `checkVictoryInternal` | 检查胜利条件 |
| `game/logic.go` | `determineTraitor` | 确定叛徒 |

#### 前端实现
| 文件 | 函数/组件 | 说明 |
|------|----------|------|
| `store/gameStore.ts` | `startHaunt` | 开始作祟 |
| `store/gameStore.ts` | `debugForceHaunt` | 调试强制作祟 |
| `components/ScenarioPanel.tsx` | `ScenarioPanel` | 剧本面板 |

#### 剧本数据结构
```typescript
// types.ts
interface Scenario {
  id: string;
  name: string;
  introText: string;
  traitorRule: TraitorRule;
  traitorInfo: ScenarioSecrets;
  heroInfo: ScenarioSecrets;
}

interface ScenarioSecrets {
  objective: string;
  setupText: string;
  abilities?: string[];
  objectives?: ScenarioObjective[];
  victoryCondition?: ScenarioVictoryCondition;
}

interface ScenarioObjective {
  id: string;
  name: string;
  description: string;
  completed: boolean;
  progress: number;
  required: number;
}
```

### 5.8 状态效果系统

#### 后端实现
| 文件 | 函数 | 说明 |
|------|------|------|
| `game/logic.go` | `ProcessStatusEffectsOnTurnStart` | 回合开始处理 |
| `game/logic.go` | `ProcessStatusEffectsOnTurnEnd` | 回合结束处理 |
| `game/actions.go` | `ApplyStatusEffect` | 应用状态效果 |

#### 前端实现
| 文件 | 函数 | 说明 |
|------|------|------|
| `utils/statusEffects.ts` | `addStatusEffect` | 添加状态效果 |
| `utils/statusEffects.ts` | `decrementStatusEffects` | 递减状态 |
| `utils/statusEffects.ts` | `getStatusEffectModifiers` | 获取效果修正 |

#### 状态效果类型
```typescript
// types.ts
type StatusEffectType = 
  | 'INVISIBLE'      // 隐身
  | 'DISGUISED'      // 伪装
  | 'PETRIFIED'      // 石化
  | 'BURNING'        // 燃烧
  | 'CONFUSED'       // 混乱
  | 'STEALTH'        // 隐蔽
  | 'PHASING'        // 穿墙
  | 'BLESSED'        // 祝福
  | 'CURSED'         // 诅咒
  | 'MIRROR_REFLECT' // 镜反

interface StatusEffect {
  type: StatusEffectType;
  duration: number;     // -1 表示永久
  source?: string;
  damage?: number;      // 燃烧伤害
  faction?: string;     // 伪装阵营
  amount?: number;
}
```

### 5.9 NPC系统

#### 后端实现
| 文件 | 函数 | 说明 |
|------|------|------|
| `game/npc.go` | `SpawnNPC` | 生成NPC |
| `game/npc.go` | `MoveNPC` | NPC移动 |
| `game/npc.go` | `NPCAttack` | NPC攻击 |
| `game/npc.go` | `KillNPC` | 击杀NPC |

#### 前端实现
| 文件 | 组件 | 说明 |
|------|------|------|
| `components/NPCSprite.tsx` | `NPCSprite` | NPC精灵 |
| `components/NPCDialog.tsx` | `NPCDialog` | NPC对话 |

---

## 6. 状态同步机制

### 6.1 同步流程

```
┌─────────────────────────────────────────────────────────────┐
│ 后端状态变化                                                 │
├─────────────────────────────────────────────────────────────┤
│ 1. 玩家发送操作请求 (WebSocket)                              │
│ 2. 后端处理操作                                              │
│ 3. 后端更新 GameStateFull                                    │
│ 4. 后端调用 sendGameState()                                  │
│ 5. 广播 state_sync 到所有客户端                              │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│ 前端状态更新                                                 │
├─────────────────────────────────────────────────────────────┤
│ 1. ws/network.ts 收到 state_sync                            │
│ 2. handleStateSync 处理                                      │
│ 3. 合并 logs (去重)                                         │
│ 4. 合并 personalLogs (去重)                                 │
│ 5. 调用 store.setState()                                    │
│ 6. React 组件自动重新渲染                                    │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 关键同步字段

```typescript
// ws/network.ts - handleStateSync
interface SyncState {
  // 游戏状态
  phase: GamePhase;
  turnPhase: TurnPhase;
  turnIndex: number;
  activePlayerId: string;
  movesRemaining: number;
  
  // 玩家状态
  players: Record<string, Player>;
  
  // 地图状态
  map: Record<string, TileInstance>;
  tileDeck: TileDef[];
  
  // 事件状态
  activeCard: Card | Item | null;
  pendingAction: PendingAction | null;
  activeRoll: ActiveRoll | null;
  activeCombat: CombatState | null;
  
  // 作祟状态
  omenCount: number;
  isHauntActive: boolean;
  currentScenario: Scenario | null;
  traitorId: string | null;
  
  // 目标系统
  heroObjectives: Record<string, Objective>;
  traitorObjectives: Record<string, Objective>;
  turnsSinceHaunt: number;
  gameWinner: string | null;
  
  // 日志
  logs: LogEntry[];
}
```

### 6.3 PendingAction 结构

```typescript
// 后端 game/types.go
type PendingAction struct {
  Type      string                 // "ATTRIBUTE_CHECK" | "CHOICE" | "COMBAT"
  Target    string                 // 等待哪个玩家输入
  Data      map[string]interface{} // 额外数据
  CardID    string                // 关联的卡牌ID
  Message   string                // 显示给玩家的提示
}
```

---

## 7. 代码位置索引

### 7.1 后端 (Go)

| 模块 | 文件 | 主要函数 |
|------|------|---------|
| **房间管理** | `game/room.go` | CreateRoom, JoinRoom, LeaveRoom, GetRoom |
| **游戏状态** | `game/state.go` | SyncStateJSON, GetFullState |
| **游戏逻辑** | `game/logic.go` | NextTurn, EndTurn, ProcessMove |
| **玩家操作** | `game/actions.go` | Move, PlaceTile, PickupItem, GiveItem, DropItem |
| **战斗** | `game/combat.go` | StartCombat, ResolveCombat |
| **事件** | `game/events.go` | TriggerRoomEvent, ResolveEventChoice |
| **物品** | `game/items.go` | UseItem, EquipItem |
| **剧本目标** | `game/objectives.go` | InitializeObjectives, CheckVictory |
| **NPC** | `game/npc.go` | SpawnNPC, NPCAttack |
| **WebSocket** | `ws/hub.go` | HandleWebSocket, broadcastToRoom |

### 7.2 前端 (React/TypeScript)

| 模块 | 文件 | 主要函数/组件 |
|------|------|--------------|
| **状态管理** | `store/gameStore.ts` | initializeGame, nextTurn, movePlayer |
| **网络层** | `ws/network.ts` | sendMove, sendPlaceTile, handleStateSync |
| **地图组件** | `components/MapGrid.tsx` | MapGrid |
| **玩家HUD** | `components/PlayerHUD.tsx` | PlayerHUD |
| **骰子** | `components/DiceRoller.tsx` | DiceRoller |
| **事件弹窗** | `components/EventModal.tsx` | EventModal |
| **背包** | `components/Inventory.tsx` | Inventory |
| **战斗** | `components/CombatModal.tsx` | CombatModal |
| **网络界面** | `components/NetworkScreens.tsx` | LoginScreen, LobbyScreen |

### 7.3 数据定义

| 模块 | 文件 | 说明 |
|------|------|------|
| **类型定义** | `types.ts` | 所有接口定义 |
| **常量** | `constants.ts` | 游戏常量 |
| **事件数据** | `data/events.ts` | 事件定义 |
| **物品数据** | `data/items.ts` | 物品定义 |
| **剧本数据** | `data/scenarios.ts` | 剧本定义 |
| **技能树** | `data/skillTrees.ts` | 技能树定义 |

---

## 附录: 检定公式

### 属性检定
```
成功条件: sum >= difficulty

骰子点数分布:
- 0: 空白 (2/6)
- 1: 白点 (2/6)  
- 2: 绿点 (2/6)
```

### 作祟检定 (山屋惊魂核心机制)
```
成功条件: sum >= OmenCount

触发时机: 每次揭示预兆卡时立即检定
- 翻开预兆卡 → OmenCount++ → 投6个骰子 → 比较结果

检定成功 (sum >= OmenCount):
  - 玩家获得预兆卡
  - 继续当前回合

检定失败 (sum < OmenCount):
  - 作祟爆发！
  - 进入 HAUNT_REVEAL
  - 叛徒获得预兆卡
  - 分配叛徒、确定剧本
```

### 战斗结算
```
双方各投 1 个骰子
点数低者受伤，差值为伤害
平局则无人受伤
```
