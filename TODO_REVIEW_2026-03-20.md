# PFMansion 代码修复计划

**创建日期**: 2026-03-20  
**审核范围**: 前端(React/Zustand) + 后端(Go) 游戏流程与状态同步  
**核心原则**: **后端为唯一真实数据源**，前端仅负责渲染和转发用户操作

---

## 一、架构原则（必须遵守）

### 1.1 数据权威
- 后端 `game/` 包中的 `GameStateFull` 是游戏状态的**唯一真实来源**
- 前端 `gameStore.ts` 的 Zustand Store 是**只读缓存**，通过 `state_sync` 被动更新
- 前端禁止自行计算游戏逻辑（移动、战斗、属性变化等）

### 1.2 消息流程
```
用户操作 → 前端发送 action 到后端 → 后端处理并更新状态 → 后端广播 state_sync → 前端用后端状态覆盖本地
```
**禁止**：前端在发送请求后自行修改状态（乐观更新除外，但需后端最终确认）

### 1.3 命名规范
- `LocalGame.tsx` 重命名为 `GameScreen.tsx`（消除"本地"误导）
- 后端 `game/` 包下的文件按功能单一职责划分

---

## 二、P0 问题（核心功能，必须修复）

### 2.1 移除前端本地模式回退

**问题描述**:
`store/gameStore.ts` 中大量方法包含 `if (network.isInNetworkMode()) {...} else { /* 本地处理 */ }` 分支。这导致 WebSocket 断开时游戏降级到单机模式，数据不会同步到后端和其他玩家。

**影响范围**:
- `startCombat` (L767)
- `useItem` (L1381)
- `drawCard` (L1262)
- `resolveEventChoice` (L1086)
- `executeLogicAction` (L1118)
- 以及其他所有带 `isInNetworkMode` 检查的方法

**修复方案**:
1. 移除所有 `else` 分支，本地模式直接返回或提示"网络未连接"
2. 添加网络状态检查：若 `isInNetworkMode() === false`，所有操作显示错误提示
3. 后续所有新增的方法不得包含本地回退逻辑

**验收标准**:
- WS 断开时点击任何游戏操作，显示"网络已断开，请检查网络连接"
- 游戏操作不会产生任何前端本地状态变化

---

### 2.2 后端技能效果实现

**问题描述**:
`game/actions.go` 中 `ExecuteSkill` 为空实现：
```go
func (g *GameManager) ExecuteSkill(roomID, playerID, skillID, targetID string) error {
    // TODO: 实现技能效果
    return nil
}
```

**修复方案**:
1. 定义技能效果注册表（参考 `data/events.go` 的 Effect 系统）
2. 实现技能效果应用函数（属性修改、buff 添加、状态效果等）
3. 技能解锁时记录到 `GamePlayer.Skills`，效果应用到角色状态

**验收标准**:
- 解锁技能后，技能效果真实反映在角色属性/buff 中
- 其他玩家能通过 `state_sync` 看到该玩家的技能效果

---

### 2.3 后端目标系统实现

**问题描述**:
后端 `GameStateFull` 定义了 `HeroObjectives`, `TraitorObjectives`, `TurnsSinceHaunt`, `GameWinner` 字段，但从未被赋值或检查。

**修复方案**:
1. 在 `game/types.go` 中定义 `Objective` 结构
```go
type Objective struct {
    ID          string `json:"id"`
    Type        string `json:"type"` // ELIMINATE, SURVIVE, COLLECT, REACH
    Target      string `json:"target,omitempty"`
    Progress    int    `json:"progress"`
    Required    int    `json:"required"`
    Completed   bool   `json:"completed"`
    TurnsLimit  int    `json:"turnsLimit,omitempty"`
}
```

2. 剧本初始化时设置目标到 `HeroObjectives[playerID]` 和 `TraitorObjectives[traitorID]`

3. 实现 `UpdateObjectiveProgress()` 和 `CheckVictory()` 函数

4. 在 `nextTurnInternal` 中检查目标进度

**验收标准**:
- 游戏开始后能看到英雄/叛徒目标
- 目标进度随游戏进程更新
- 满足胜利条件时游戏结束并显示胜利者

---

### 2.4 前端 nextTurn 改为纯接收模式

**问题描述**:
`gameStore.ts` 的 `nextTurn` 方法本地计算下一个玩家、状态效果递减、技能点获取，然后直接 `set()` 修改状态。这与后端 `state_sync` 冲突，导致状态闪烁或不一致。

**修复方案**:
1. 将 `nextTurn` 改为仅发送 `sendEndTurn()` 请求
2. 移除所有本地状态计算逻辑
3. UI 更新完全依赖 `handleStateSync` 收到后端状态后驱动

```typescript
nextTurn: () => {
    if (!network.isInNetworkMode()) {
        showFeedback("网络未连接", "error");
        return;
    }
    network.sendEndTurn();
}
```

**验收标准**:
- 点击结束回合，前端不会立即变化
- 等待后端 `state_sync` 后才切换到下一玩家
- 状态效果递减、buff 更新等由后端驱动

---

### 2.5 后端状态效果回合处理

**问题描述**:
后端 `GamePlayer.StatusEffects` 存在，但回合开始/结束时的处理仅前端实现。后端不会主动更新状态效果的 `duration` 或移除过期效果。

**修复方案**:
1. 在 `game/logic.go` 中实现 `ProcessStatusEffectsOnTurnStart()` 和 `ProcessStatusEffectsOnTurnEnd()`
2. 在 `nextTurnInternal` 调用这些函数
3. 效果变更后通过 `state_sync` 广播到所有客户端

**验收标准**:
- 状态效果的 duration 每回合正确递减
- duration 为 0 时效果自动移除
- 前端能正确显示状态效果的剩余回合

---

### 2.6 后端 pendingAction 与前端状态对齐

**问题描述**:
后端 `PendingAction` 结构用于控制玩家等待输入（属性检定、选择等），但前端 `activeRoll`、`eventOutcome`、`pendingAction` 并非严格对应。

**修复方案**:
1. 后端 `PendingAction` 定义为唯一的"等待玩家输入"状态
2. 前端 `activeRoll` 和 `activeCard` 应能完全从 `PendingAction` + `activeCard` 推导
3. 后端在设置 `PendingAction` 时同时设置 `ActiveCard`

```go
type PendingAction struct {
    Type      string                 `json:"type"`
    Target    string                 `json:"target"`
    Data      map[string]interface{} `json:"data"`
    CardID    string                `json:"cardId,omitempty"` // 关联的事件卡
}
```

**验收标准**:
- 后端设置的 `PendingAction` 能正确驱动前端 UI 显示（骰子界面、选择界面等）
- 玩家完成输入后，后端清除 `PendingAction` 并处理结果

---

## 三、P1 问题（影响多人体验）

### 3.1 前端 handleStateSync 字段对齐

**问题描述**:
`network.ts` 的 `handleStateSync` 未映射所有后端 `GameStateFull` 字段。

**缺失字段**:
- `heroObjectives` / `traitorObjectives`
- `turnsSinceHaunt`
- `gameWinner`
- `pendingAction` (完整映射)
- `lastTriggeredOmen` / `lastTriggeredTile`

**修复方案**:
在 `handleStateSync` 中补全所有字段映射：

```typescript
store.setState({
    // ... 现有字段
    heroObjectives: state.heroObjectives || {},
    traitorObjectives: state.traitorObjectives || {},
    turnsSinceHaunt: state.turnsSinceHaunt || 0,
    gameWinner: state.gameWinner || null,
    pendingAction: state.pendingAction || null,
    lastTriggeredOmen: state.lastTriggeredOmen || null,
    lastTriggeredTile: state.lastTriggeredTile || null,
});
```

**验收标准**:
- 前端 gameStore 包含与后端 `GameStateFull` 完全一致的字段
- 前端组件能访问所有后端同步过来的数据

---

### 3.2 作祟(Haunt)阶段玩法完善

**问题描述**:
`triggerHaunt` 只做了阵营分配和目标初始化，没有实际的 Haunt 阶段玩法。

**修复方案**:
1. 实现叛徒和英雄的特殊能力应用
2. 实现作祟阶段的回合逻辑（与探索阶段不同）
3. 作祟阶段每回合检查胜利条件

**验收标准**:
- 作祟触发后，叛徒和英雄获得各自剧本规定的能力
- 作祟阶段的回合流程与剧本设计一致

---

### 3.3 后端战斗系统完善

**问题描述**:
`game/combat.go` 的 `ResolveCombat` 中，后端骰子生成逻辑存在但可能被绕过。

**修复方案**:
确保所有战斗骰子由后端 `RollDice` 生成，前端传入的骰子结果（如果有）必须被忽略。

**验收标准**:
- 战斗骰子结果完全由后端决定
- 战斗结果通过 `combat_resolved` 消息和 `state_sync` 同步

---

### 3.4 后端房间管理完善

**问题描述**:
当前后端房间管理 (`ws/hub.go`) 的房间列表仅内存存储，服务器重启后丢失。

**修复方案**:
1. 添加 `roomManager` 用于持久化房间信息
2. 游戏中的房间每 30 秒自动保存状态
3. 支持服务器重启后房间恢复

**验收标准**:
- 服务器重启后，已创建的房间仍然存在（可选，取决于产品需求）

---

## 四、P2 问题（体验优化）

### 4.1 乐观更新支持

**问题描述**:
当前操作需要等待后端 `state_sync` 才能更新 UI，网络延迟大时体验差。

**修复方案**:
1. 允许前端在发送请求后**立即更新 UI** 显示操作进行中
2. 后端 `state_sync` 到达后用后端状态覆盖
3. 如果后端拒绝操作（如不是当前玩家），回滚并显示错误

**验收标准**:
- 操作反馈延迟 < 100ms（乐观更新）
- 后端拒绝时正确回滚

---

### 4.2 前端组件重命名

**问题描述**:
`LocalGame.tsx` 命名误导为单机游戏组件。

**修复方案**:
重命名为 `GameScreen.tsx`

---

### 4.3 统一前后端数据定义

**问题描述**:
后端 `game/data.go` 和前端 `types.ts`、`constants.ts`、`data/` 目录存在重复定义。

**修复方案**:
1. 考虑使用 protobuf 或 JSON Schema 定义共享数据结构
2. 临时方案：后端定义的数据文件 JSON 化，前端直接引用
3. 建立字段命名对照表确保一致

**验收标准**:
- 同一数据结构只有一份定义
- 字段命名完全一致

---

### 4.4 日志系统完善

**问题描述**:
后端有 `ActionHistory` 但前端无展示组件。

**修复方案**:
1. 前端 `PlayerHUD` 已有 `logs` 展示区域
2. 确保 `state_sync` 中的 `logs` 字段正确同步
3. 添加 `personalLogs` 的同步（目前后端未推送此项）

---

## 五、禁止事项（必须遵守）

1. **禁止**在 `gameStore.ts` 中实现游戏逻辑计算
2. **禁止**创建无实际功能的占位函数（空 `return nil` 或 `// TODO`）
3. **禁止**前端直接修改 `players`、`map`、`phase` 等核心状态
4. **禁止**后端函数返回错误但实际已执行成功
5. **禁止**在未同步状态下进行下一步操作

---

## 六、Phase 1 详细修改清单

Phase 1 包含 6 个子任务，需要按顺序执行。

---

### 6.1 移除前端本地模式回退（gameStore.ts）

**涉及文件**: `store/gameStore.ts`

**需要修改的方法**（共 5 处 `else` 分支）:

| 行号 | 方法名 | 当前逻辑 | 修复后逻辑 |
|------|--------|----------|------------|
| L767 | `startCombat` | 网络模式发请求，否则本地处理 | 仅检查网络状态，未连接则报错 |
| L1086 | `resolveEventChoice` | 网络模式发请求，否则本地处理 | 仅检查网络状态，未连接则报错 |
| L1118 | `executeLogicAction` | 网络模式发请求，否则本地处理 | 仅检查网络状态，未连接则报错 |
| L1262 | `drawCard` | 网络模式发请求，否则本地处理 | 仅检查网络状态，未连接则报错 |
| L1381 | `useItem` | 网络模式发请求，否则本地处理 | 仅检查网络状态，未连接则报错 |

**具体修改模板**:

```typescript
// 修改前:
startCombat: (attackerId, defenderId, attribute) => {
    if (network.isInNetworkMode()) {
        network.sendStartCombat(defenderId, attribute);
        return;
    }
    // 本地模式：直接处理
    const state = get();
    // ... 50+ 行本地逻辑
}

// 修改后:
startCombat: (attackerId, defenderId, attribute) => {
    if (!network.isInNetworkMode()) {
        showFeedback("网络未连接，无法发起战斗", "error");
        return;
    }
    network.sendStartCombat(defenderId, attribute);
}
```

**同时需要移除/简化的相关方法**（因为不再需要本地处理）:
- `resolveCombatDamage` - 战斗伤害结算完全由后端处理
- `resolveCombatSteal` - 战斗掠夺完全由后端处理
- `cancelCombat` - 取消战斗需要后端确认

**移除的本地逻辑依赖**（前端不再需要这些工具函数）:
- `getEffectiveAttributeValue` - 仅本地计算有效属性用
- `executeScript` - 仅本地执行效果用
- `decrementStatusEffects` - 仅本地处理状态效果用
- `applyStatusEffectOnTurnStart` - 仅本地处理状态效果用
- `parseAttributeFromText` - 仅本地解析属性用

---

### 6.2 后端 pendingAction 与前端状态对齐

**涉及文件**: 
- `game/types.go` - PendingAction 定义
- `game/actions.go` - pendingAction 设置逻辑
- `game/events.go` - 事件检定相关
- `game/combat.go` - 战斗相关
- `ws/hub.go` - 消息处理

**当前问题**:
- 后端 `PendingAction` 只有 `Type`, `Target`, `Data`
- 前端期望有 `CardID` 等额外信息
- 前端 `activeRoll` 和 `pendingAction` 关系不清晰

**修复方案**:

**Step 1**: 扩展 `PendingAction` 结构 (`game/types.go`)
```go
type PendingAction struct {
    Type      string                 `json:"type"`      // "ATTRIBUTE_CHECK", "CHOICE", "COMBAT"
    Target    string                 `json:"target"`    // 等待哪个玩家输入
    Data      map[string]interface{} `json:"data"`      // 额外数据
    CardID    string                `json:"cardId,omitempty"` // 关联的卡牌ID
    Message   string                `json:"message,omitempty"` // 显示给玩家的提示
}
```

**Step 2**: 前端添加网络状态专用的 pendingAction 映射 (`ws/network.ts`)

在后端 `handleStateSync` 中，添加：
```typescript
pendingAction: state.pendingAction ? {
    type: state.pendingAction.type,
    target: state.pendingAction.target,
    data: state.pendingAction.data,
    cardId: state.pendingAction.cardId,
    message: state.pendingAction.message,
} : null,
```

**Step 3**: 前端 `gameStore.ts` 添加 pendingAction 到 GameState 接口
```typescript
// 在 GameState 接口中添加:
pendingAction: {
    type: string;
    target: string;
    data?: Record<string, unknown>;
    cardId?: string;
    message?: string;
} | null;
```

**Step 4**: 前端组件根据 pendingAction 显示 UI

现有组件 `DiceRoller`, `EventModal`, `InteractionModal` 需要改造为：
- 检查 `store.pendingAction` 而非仅 `store.activeRoll`
- 当 `pendingAction.type === 'ATTRIBUTE_CHECK'` 时显示骰子界面
- 当 `pendingAction.type === 'CHOICE'` 时显示选项界面

---

### 6.3 后端状态效果回合处理

**涉及文件**:
- `game/logic.go` - 新增状态效果处理函数
- `game/types.go` - StatusEffect 定义
- `game/actions.go` - ApplyStatusEffect

**修复方案**:

**Step 1**: 在 `game/logic.go` 中添加状态效果处理函数

```go
// ProcessStatusEffectsOnTurnStart 回合开始时处理状态效果
func (g *GameManager) ProcessStatusEffectsOnTurnStart(player *GamePlayer) []string {
    var removed []string
    var remaining []StatusEffect
    
    for _, effect := range player.StatusEffects {
        // 每回合开始时 duration 递减
        if effect.Duration > 0 {
            effect.Duration--
        }
        
        // 燃烧效果每回合造成伤害
        if effect.Type == "BURNING" && effect.Damage > 0 {
            // 应用燃烧伤害到 might
            if attr, ok := player.Character.Attributes["might"]; ok {
                attr.Current -= effect.Damage
                if attr.Current < attr.Floor {
                    attr.Current = attr.Floor
                }
            }
        }
        
        if effect.Duration == 0 {
            removed = append(removed, effect.Type)
        } else {
            remaining = append(remaining, effect)
        }
    }
    
    player.StatusEffects = remaining
    return removed
}

// ProcessStatusEffectsOnTurnEnd 回合结束时处理状态效果
func (g *GameManager) ProcessStatusEffectsOnTurnEnd(player *GamePlayer) {
    // 目前主要用于石化状态检测
    for _, effect := range player.StatusEffects {
        if effect.Type == "PETRIFIED" {
            // 石化状态：跳过该玩家的回合（由 nextTurnInternal 处理）
            return
        }
    }
}
```

**Step 2**: 在 `nextTurnInternal` 中调用状态效果处理

```go
// 在 nextTurnInternal 开头，当前玩家回合结束时:
currentPlayer := state.FullState.Players[state.FullState.ActivePlayerID]
removedEffects := g.ProcessStatusEffectsOnTurnEnd(currentPlayer)
if len(removedEffects) > 0 {
    state.FullState.Logs = append(state.FullState.Logs, LogEntry{
        Text: fmt.Sprintf("%s 的状态效果结束: %v", currentPlayer.Character.Name, removedEffects),
        Type: "info",
    })
}

// 在切换到下一玩家后，新玩家回合开始时:
nextPlayer := state.FullState.Players[nextPlayerID]
removedEffects = g.ProcessStatusEffectsOnTurnStart(nextPlayer)
if len(removedEffects) > 0 {
    state.FullState.Logs = append(state.FullState.Logs, LogEntry{
        Text: fmt.Sprintf("%s 的状态效果结束: %v", nextPlayer.Character.Name, removedEffects),
        Type: "info",
    })
}
```

**Step 3**: 添加状态效果应用函数 (`game/actions.go`)

```go
// ApplyStatusEffect 应用状态效果到玩家
func (g *GameManager) ApplyStatusEffect(roomID, playerID string, effect StatusEffect) error {
    g.mu.Lock()
    defer g.mu.Unlock()

    room, ok := g.Rooms[roomID]
    if !ok {
        return errors.New("房间不存在")
    }

    state := room.GameState
    if state == nil || state.FullState == nil {
        return errors.New("游戏未开始")
    }

    player, ok := state.FullState.Players[playerID]
    if !ok {
        return errors.New("玩家不存在")
    }

    player.StatusEffects = append(player.StatusEffects, effect)
    return nil
}
```

---

### 6.4 前端 nextTurn 改为纯接收模式

**涉及文件**: `store/gameStore.ts`

**当前问题**:
`nextTurn` 方法包含大量本地逻辑（状态效果递减、技能点计算、下一玩家计算），与后端 state_sync 冲突。

**修复方案**:

```typescript
// 修改前 (~60行):
nextTurn: () => {
    const state = get();
    const currentIndex = state.playerIds.indexOf(state.activePlayerId);
    // ... 计算下一玩家
    // ... 状态效果递减
    // ... 技能点计算
    // ... set({ activePlayerId: nextId, ... })
}

// 修改后 (~5行):
nextTurn: () => {
    if (!network.isInNetworkMode()) {
        showFeedback("网络未连接", "error");
        return;
    }
    network.sendEndTurn();
}
```

**需要移除的导入/依赖**:
- `decrementStatusEffects`
- `applyStatusEffectOnTurnStart`
- `getEffectiveAttributeValue` (仅 nextTurn 使用的情况下)

**副作用**: `TurnControl.tsx` 中的 `nextTurn` 按钮直接调用此方法，修改后行为不变（只是发请求而非本地处理）。

---

### 6.5 后端技能效果实现

**涉及文件**:
- `game/actions.go` - ExecuteSkill
- `game/types.go` - SkillEffect 结构（新建）
- `game/data.go` - 技能数据

**当前问题**: `ExecuteSkill` 是空实现

**修复方案**:

**Step 1**: 定义技能效果结构 (`game/types.go`)

```go
// SkillEffect 技能效果
type SkillEffect struct {
    Type      string `json:"type"` // MODIFY_STAT, ADD_BUFF, ADD_STATUS, HEAL, DAMAGE
    Stat      string `json:"stat,omitempty"` // 属性名 (might, speed, etc)
    Amount    int    `json:"amount,omitempty"`
    BuffType  string `json:"buffType,omitempty"` // buff ID
    StatusType string `json:"statusType,omitempty"` // 状态效果类型
    Duration  int    `json:"duration,omitempty"`
    Message   string `json:"message,omitempty"`
}

// Skill 技能定义
type Skill struct {
    ID          string        `json:"id"`
    Name        string       `json:"name"`
    Description string       `json:"description"`
    Cost        int          `json:"cost"` // SP 消耗
    Cooldown    int          `json:"cooldown"` // 冷却回合
    Effects     []SkillEffect `json:"effects"`
}
```

**Step 2**: 实现 `ExecuteSkill` (`game/actions.go`)

```go
func (g *GameManager) ExecuteSkill(roomID, playerID, skillID, targetID string) error {
    g.mu.Lock()
    defer g.mu.Unlock()

    room, ok := g.Rooms[roomID]
    if !ok {
        return errors.New("房间不存在")
    }

    state := room.GameState
    if state == nil || state.FullState == nil {
        return errors.New("游戏未开始")
    }

    // 验证是否是当前玩家
    if state.FullState.ActivePlayerID != playerID {
        return errors.New("还没轮到你")
    }

    player, ok := state.FullState.Players[playerID]
    if !ok {
        return errors.New("玩家不存在")
    }

    // 查找技能定义
    skill := GetSkill(skillID)
    if skill == nil {
        return errors.New("技能不存在")
    }

    // 检查技能是否已解锁
    hasSkill := false
    for _, s := range player.Skills {
        if s == skillID {
            hasSkill = true
            break
        }
    }
    if !hasSkill {
        return errors.New("技能未解锁")
    }

    // 应用技能效果
    for _, effect := range skill.Effects {
        g.applySkillEffect(roomID, playerID, targetID, effect)
    }

    state.FullState.Logs = append(state.FullState.Logs, LogEntry{
        Text: fmt.Sprintf("%s 使用了技能: %s", player.Character.Name, skill.Name),
        Type: "info",
    })

    return nil
}

func (g *GameManager) applySkillEffect(roomID, playerID, targetID string, effect SkillEffect) {
    room := g.Rooms[roomID]
    state := room.GameState
    
    switch effect.Type {
    case "MODIFY_STAT":
        if attr, ok := state.FullState.Players[playerID].Character.Attributes[effect.Stat]; ok {
            attr.Current += effect.Amount
            // 边界检查...
        }
    case "ADD_BUFF":
        state.FullState.Players[playerID].Buffs = append(
            state.FullState.Players[playerID].Buffs, 
            effect.BuffType,
        )
    case "ADD_STATUS":
        state.FullState.Players[playerID].StatusEffects = append(
            state.FullState.Players[playerID].StatusEffects,
            StatusEffect{
                Type: effect.StatusType,
                Duration: effect.Duration,
            },
        )
    }
}
```

---

### 6.6 后端 applyEffect 完善（技能和事件共用的效果应用）

**涉及文件**: `game/actions.go` 或新建 `game/effects.go`

**当前问题**: `applyEffect` 函数可能不完整，缺少某些效果类型处理

**修复方案**:

需要实现的效果类型（参考前端 `executeScript` 和 `executeEffects`）:

| Effect Type | 说明 | 实现优先级 |
|-------------|------|-----------|
| `MODIFY_STAT` | 修改属性 | P0 |
| `DAMAGE` | 造成伤害 | P0 |
| `HEAL` | 治疗 | P0 |
| `DRAW_CARD` | 抽卡 | P0 |
| `ADD_ITEM` / `GAIN_ITEM` | 获得物品 | P0 |
| `MOVE_PLAYER` | 移动玩家 | P1 |
| `TELEPORT` | 传送 | P1 |
| `ADD_BUFF` | 添加buff | P0 |
| `REMOVE_BUFF` | 移除buff | P1 |
| `ADD_STATUS` | 添加状态效果 | P0 |
| `GAIN_SKILL` | 获得技能 | P0 |
| `REROLL` | 重投骰子 | P2 |

---

## 七、Phase 2: 目标系统详细修改清单

### 7.1 后端目标结构完善

**涉及文件**: `game/types.go`

**当前状态**: 
- `Objective` 结构已存在但字段不完整
- `HeroObjectives` / `TraitorObjectives` 是 `map[string]int`（只有进度值）

**修复方案**:

```go
// PlayerObjectiveProgress 玩家目标进度
type PlayerObjectiveProgress struct {
    ObjectiveID string `json:"objectiveId"`
    Progress    int    `json:"progress"`
    Required    int    `json:"required"`
    Completed   bool   `json:"completed"`
}

// GameStateFull 中:
HeroObjectives     map[string]*PlayerObjectiveProgress `json:"heroObjectives,omitempty"`
TraitorObjectives  map[string]*PlayerObjectiveProgress `json:"traitorObjectives,omitempty"`
```

### 7.2 剧本初始化时设置目标

**涉及文件**: `game/logic.go` - `triggerHaunt`

```go
func (g *GameManager) initializeObjectivesInternal(state *GameStateFull) {
    if state.CurrentScenario == nil {
        return
    }
    
    // 初始化英雄目标
    if state.CurrentScenario.HeroObjective != nil {
        for playerID, player := range state.Players {
            if player.Team == "HERO" {
                state.HeroObjectives[playerID] = &PlayerObjectiveProgress{
                    ObjectiveID: state.CurrentScenario.HeroObjective.Name,
                    Progress: 0,
                    Required: state.CurrentScenario.HeroObjective.Turns,
                    Completed: false,
                }
            }
        }
    }
    
    // 初始化叛徒目标
    if state.CurrentScenario.TraitorObjective != nil && state.TraitorID != "" {
        state.TraitorObjectives[state.TraitorID] = &PlayerObjectiveProgress{
            ObjectiveID: state.CurrentScenario.TraitorObjective.Name,
            Progress: 0,
            Required: state.CurrentScenario.TraitorObjective.Turns,
            Completed: false,
        }
    }
}
```

### 7.3 每回合更新目标进度

**涉及文件**: `game/logic.go` - `nextTurnInternal`

```go
// 在每回合切换时调用:
func (g *GameManager) UpdateObjectivesOnTurnEnd(state *GameStateFull) {
    if !state.IsHauntActive || state.GameWinner != "" {
        return
    }
    
    state.TurnsSinceHaunt++
    
    // 检查叛徒目标是否超时
    if traitorProgress, ok := state.TraitorObjectives[state.TraitorID]; ok {
        traitorProgress.Progress = state.TurnsSinceHaunt
        if traitorProgress.Progress >= traitorProgress.Required {
            traitorProgress.Completed = true
            state.GameWinner = "TRAITOR"
            state.Phase = GamePhaseGameOver
            g.addLog(...)
        }
    }
    
    // 检查英雄目标（通常是消灭叛徒）
    // 需要根据具体剧本目标类型处理
}
```

### 7.4 胜利条件检查

**涉及文件**: `game/logic.go` - `checkVictoryInternal`

```go
func (g *GameManager) checkVictoryInternal(state *GameStateFull) string {
    if state.GameWinner != "" {
        return state.GameWinner
    }
    
    // 检查叛徒是否死亡
    if traitor, ok := state.Players[state.TraitorID]; ok && traitor.IsDead {
        state.GameWinner = "HERO"
        state.Phase = GamePhaseGameOver
        return "HERO"
    }
    
    // 检查英雄是否全部死亡
    heroAlive := false
    for id, player := range state.Players {
        if id != state.TraitorID && !player.IsDead {
            heroAlive = true
            break
        }
    }
    if !heroAlive {
        state.GameWinner = "TRAITOR"
        state.Phase = GamePhaseGameOver
        return "TRAITOR"
    }
    
    // 检查目标超时（叛徒胜利）
    if traitorProgress, ok := state.TraitorObjectives[state.TraitorID]; ok {
        if traitorProgress.Completed || traitorProgress.Progress >= traitorProgress.Required {
            state.GameWinner = "TRAITOR"
            state.Phase = GamePhaseGameOver
            return "TRAITOR"
        }
    }
    
    return ""
}
```

---

## 八、Phase 3 & 4 概要

（待 Phase 1 & 2 完成后详细展开）

---

## 六、修复顺序

```
Phase 1: 止血 (P0) [本次]
├── 6.1 移除前端本地模式回退
├── 6.2 后端 pendingAction 与前端对齐
├── 6.3 后端状态效果回合处理
├── 6.4 前端 nextTurn 改为纯接收
├── 6.5 后端技能效果实现
└── 6.6 后端 applyEffect 完善

Phase 2: 目标系统 (P0)
├── 7.1 定义 Objective 结构
├── 7.2 剧本初始化目标
├── 7.3 实现目标进度更新
└── 7.4 实现胜利条件检查

Phase 3: 完善多人体验 (P1)
├── 8.1 handleStateSync 字段补全
├── 8.2 作祟阶段玩法完善
└── 8.3 战斗系统审计

Phase 4: 优化 (P2)
├── 9.1 乐观更新
├── 9.2 组件重命名
└── 9.3 数据定义统一
```

---

## 七、验收流程

每个 P0/P1 问题修复后，必须：
1. 启动后端服务器 `cd /root/.openclaw/workspace/PFMansion && ./start.sh`
2. 启动前端开发服务器 `npm run dev`
3. 创建/加入房间，进入游戏
4. 执行相关操作流程
5. 确认：
   - 后端日志无错误
   - 前端 console 无报错
   - 状态正确同步到其他客户端（如适用）
6. 记录测试结果到本文档的「测试记录」章节

---

## 八、测试记录

| 日期 | 修复项 | 测试结果 | 备注 |
|------|--------|----------|------|
| 2026-03-20 | - | - | 初始 review |
| 2026-03-24 | P0 6.1 移除前端本地模式回退 | ✅ 构建成功 | 修复了 movePlayer, pickupItemFromTile, giveItem, dropItem, interactWithWall, confirmTilePlacement |
| 2026-03-24 | P0 6.2 后端 pendingAction 对齐 | ✅ 已实现 | PendingAction 结构已对齐，handleStateSync 已映射 |
| 2026-03-24 | P0 6.3 后端状态效果回合处理 | ✅ 已实现 | ProcessStatusEffectsOnTurnEnd/Start 已实现 |
| 2026-03-24 | P0 6.4 前端 nextTurn 纯接收 | ✅ 已实现 | nextTurn 早已是纯发送模式 |
| 2026-03-24 | P0 6.5 后端技能效果实现 | ✅ 已实现 | ExecuteSkill 已完整实现 |
| 2026-03-24 | P0 6.6 后端 applyEffect 完善 | ✅ 构建成功 | applyEffect 已实现 13 种效果类型 |
