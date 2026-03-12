# 翁法罗斯主题 - 实现Plan

> 卡片正确装载 + TODO功能实现

---

## 当前问题

1. **类型定义缺失** - `onEnter`、`onLeave`、`interact` 等新字段未在类型中定义
2. **数据聚合问题** - 目前 `constants.ts` 直接引用 `data/source/xxx`，未包含所有主题
3. **引擎功能缺失** - 很多特殊效果未实现

---

## Phase 1: 类型定义与卡片装载 ✅

### 1.1 扩展类型定义

**文件**: `types.ts`

```typescript
// 地图卡扩展
export interface TileDef {
  // ... 现有字段
  onEnter?: TileTrigger;      // 进入时检定
  onLeave?: TileTrigger;      // 离开时检定
  interact?: TileInteraction; // 互动
}

export interface TileTrigger {
  type: 'ATTRIBUTE_CHECK' | 'DRAW_CARD' | 'RANDOM_EVENT';
  attribute?: AttributeName;
  difficulty?: number;
  success?: Effect[];
  failure?: Effect[];
}

export interface TileInteraction {
  type: 'TRADE' | 'FORGE' | 'DIVINATION' | 'HEAL' | 'TELEPORT' | 'MIRROR' | 'REVEAL_MAP' | 'TIME_REWIND' | 'CROSS';
  description: string;
  condition?: Condition;
  effects?: Effect[];
  cost?: { type: string; amount: number };
}
```

### 1.2 数据聚合层

**文件**: `data/source/index.ts` (新建)

```typescript
// 统一聚合入口
import { CHARACTERS_DATA as original_chars } from './original/characters';
import { CHARACTERS_DATA as volantis_chars } from './volantis/characters';
// ... 其他数据类型

export const ALL_CHARACTERS = [...original_chars, ...volantis_chars];
export const ALL_TILES = [...original_tiles, ...volantis_tiles];
// ...
```

### 1.3 常量更新

**文件**: `constants.ts`

```typescript
// 修改导入
import { ALL_CHARACTERS } from './data/source';
import { ALL_TILES } from './data/source';
// ...
```

---

## Phase 2: 地图卡功能实现 (高优先级)

### 2.1 进入/离开检定

**文件**: `utils/logicEngine.ts`

```typescript
// 新增处理函数
export function handleTileTrigger(
  trigger: TileTrigger,
  context: GameContext
): EffectResult[] {
  if (trigger.type === 'ATTRIBUTE_CHECK') {
    const value = context.state.players[context.activePlayerId]
      .attributes[trigger.attribute!];
    const roll = rollDice(6);
    
    if (roll + value >= trigger.difficulty!) {
      return executeEffects(trigger.success, context);
    } else {
      return executeEffects(trigger.failure, context);
    }
  }
  // ... 其他类型
}
```

### 2.2 互动系统

**文件**: `components/TileInteraction.tsx` (新建)

- 检测玩家点击交互式地块
- 显示交互选项UI
- 执行对应效果

---

## Phase 3: 物品/灾祸特殊能力 (中优先级)

### 3.1 状态效果系统

**文件**: `types.ts`

```typescript
export type StatusEffect = 
  | { type: 'INVISIBLE'; duration: number }
  | { type: 'DISGUISED'; duration: number; faction: string }
  | { type: 'PETRIFIED'; duration: number }
  | { type: 'BURNING'; damage: number; duration: number }
  | { type: 'CONFUSED'; duration: number }
  | { type: 'STEALTH'; amount: number };

export interface Player {
  // ... existing
  statusEffects: StatusEffect[];
}
```

### 3.2 效果处理

**文件**: `utils/statusEffects.ts` (新建)

```typescript
export function applyStatusEffect(
  player: Player,
  effect: StatusEffect
): void {
  switch (effect.type) {
    case 'INVISIBLE':
      // 敌人无法主动攻击
      break;
    case 'DISGUISED':
      // 被视为中立/敌人
      break;
    // ...
  }
}
```

### 3.3 物品赋予行动

**文件**: `store/gameStore.ts`

```typescript
// 物品装备时赋予行动
const equipItem = (playerId: string, item: Item) => {
  if (item.grantedActions) {
    // 添加到玩家的可用行动列表
  }
};
```

---

## Phase 4: 回合触发系统 (高优先级)

### 4.1 触发器注册

**文件**: `store/gameStore.ts`

```typescript
// 回合开始/结束时触发
const endTurn = (playerId: string) => {
  // 检查灾祸卡触发
  const omenCards = getPlayerOmenCards(playerId);
  omenCards.forEach(omen => {
    if (omen.onTurnEnd) {
      executeTileTrigger(omen.onTurnEnd, context);
    }
  });
  
  // 减少状态效果持续时间
  decrementStatusEffects(playerId);
};
```

---

## Phase 5: 剧本系统扩展 (中优先级)

### 5.1 目标追踪

**文件**: `types.ts`

```typescript
export interface ScenarioObjective {
  id: string;
  description: string;
  completed: boolean;
  progress: number;
  required: number;
}

export interface Scenario {
  // ... existing
  objectives?: ScenarioObjective[];
  traitorAbilities?: string[];
}
```

---

## 实现顺序

| 阶段 | 内容 | 预计工作量 |
|------|------|-----------|
| 1 | 类型定义 + 聚合层 | 2h |
| 2 | 地图卡检定/互动 | 4h |
| 3 | 状态效果系统 | 4h |
| 4 | 回合触发 | 2h |
| 5 | 剧本扩展 | 2h |

---

## 文件清单

### 新增文件
- `data/source/index.ts` - 统一聚合
- `utils/statusEffects.ts` - 状态效果
- `components/TileInteraction.tsx` - 互动UI

### 修改文件
- `types.ts` - 扩展类型
- `constants.ts` - 更新导入
- `store/gameStore.ts` - 回合触发、装备系统
- `utils/logicEngine.ts` - 地块触发器
- `components/Tile.tsx` - 互动检测

---

*最后更新：2026-03-12*
