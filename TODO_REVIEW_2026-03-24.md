# PFMansion 代码审查报告

**审查日期**: 2026-03-24  
**审查范围**: 前端(React/Zustand) + 后端(Go) 状态同步与多人游戏逻辑  
**核心问题**: 玩家角色状态改变无法被后端感知与广播

---

## 🔴 P0 - 核心 Bug（必须立即修复）

### Bug 1: PlaceTile 返回后不广播状态，导致 PendingAction 丢失

**位置**: `game/actions.go` - `PlaceTile` 函数 + `game/events.go` - `TriggerRoomEvent`

**问题描述**:
当玩家放置带有 `ATTRIBUTE_CHECK` 或 `CHOICE` 事件的房间时，后端在 `TriggerRoomEvent` 中设置 `PendingAction` 后直接 `return`，不调用 `sendGameState`。前端不知道需要等待玩家输入。

**影响**:
- 玩家看到"正在放置房间..."后没有任何反应
- 前端 `activeRoll` / `pendingAction` 未被设置
- UI 无法正确显示骰子界面或选择界面

**复现路径**:
1. 玩家放置一个带有事件触发的房间（如图书馆）
2. 后端设置 `PendingAction` 并 return
3. 前端等待 `state_sync` 但从未收到（因为后端没发）
4. 玩家不知道要投骰子

**修复方案**:
在 `TriggerRoomEvent` 设置 `PendingAction` 后，也需要触发状态广播：

```go
// TriggerRoomEvent 中，设置 PendingAction 后
if event.Interaction != nil {
    state.FullState.PendingAction = &PendingAction{...}
    // ❌ 原来直接 return
    // ✅ 应该继续执行或显式发送状态
    // 方案1: 在 PlaceTile 中发送状态
    // 方案2: 在 TriggerRoomEvent 末尾发送状态（如果 PendingAction 被设置）
}
```

或在 `handleGameAction` 的 `place_tile` case 中，检查 `PendingAction` 是否被设置：

```go
case "place_tile":
    dir, _ := req.Action["direction"].(string)
    err = h.gameManager.PlaceTile(roomID, msg.client.playerID, dir)
    // PlaceTile 可能在内部设置 PendingAction 后 return
    // 需要在 return 前发送状态，或在 return 后检查并发送
```

---

### Bug 2: handleDiceResult 不使用 actionResult.success，导致 UI 状态错误

**位置**: `ws/network.ts` - `handleDiceResult`

**问题描述**:
后端在 `dice_result` 消息中返回了 `actionResult.success` 字段，指示属性检定的成功/失败。但前端 `handleDiceResult` 完全忽略了 `actionResult`，只使用骰子总和。

**影响**:
- 属性检定成功后/失败的反馈不正确
- 前端无法根据后端的判定结果显示不同 UI

**代码对比**:

后端发送 (`ws/hub.go`):
```go
actionResult = map[string]interface{}{
    "checkType":  "ATTRIBUTE_CHECK",
    "attribute":  pending.Data["attribute"],
    "difficulty": difficulty,
    "result":     sum,
    "success":    success,  // ✅ 后端计算了 success
}
// 发送给前端
h.broadcastToRoom(roomID, resp)
```

前端接收 (`ws/network.ts`):
```typescript
function handleDiceResult(msg: ServerMessage) {
    const result = (msg as any).actionResult;  // ✅ 收到了
    const sum = msg.sum as number;
    // ❌ 但没使用 result.success
    store.setState({
        lastRollResult: sum,
        activeRoll: null
    });
    // successText 永远基于骰子结果，不是后端判定
    const successText = result?.success ? '成功！' : '失败...';  // ❌ 这行存在但 successText 没被使用
    store.showFeedback(`骰子: ${results.join(', ')} = ${sum} (${successText})`, ...);
}
```

**修复方案**:
在 `handleDiceResult` 中使用 `actionResult.success` 来决定显示内容和后续 UI 状态：

```typescript
function handleDiceResult(msg: ServerMessage) {
    const result = (msg as any).actionResult;
    const sum = msg.sum as number;
    const results = msg.results as number[];
    const success = result?.success ?? (sum >= (result?.difficulty ?? 3));  // 回退逻辑

    store.setState({
        lastRollResult: sum,
        activeRoll: null,
        // 根据 success 决定后续状态
        // 如果是 ATTRIBUTE_CHECK，成功/失败有不同的后续
    });

    store.showFeedback(
        `骰子: ${results.join(', ')} = ${sum} (${success ? '成功！' : '失败...'})`,
        success ? 'turn' : 'info'
    );
}
```

---

### Bug 3: 多个前端函数修改状态但不通知后端

**位置**: `store/gameStore.ts`

**问题描述**:
以下函数在本地修改游戏状态，但不发送任何请求到后端，导致多人游戏时其他玩家无法感知变化：

| 函数 | 修改的状态 | 影响 |
|------|-----------|------|
| `startHaunt` | `phase`, `isHauntActive`, `players` team | 叛徒分配只有发起者看到 |
| `debugForceHaunt` | `phase`, `isHauntActive` | 调试功能影响所有玩家 |
| `executeScript` | `players[*].character.attributes` | 属性修改只有本地生效 |
| `handlePlayerDeath` | `players.isDead`, `map.droppedItems` | 玩家死亡只有本地生效 |

**代码示例**:
```typescript
// startHaunt - 直接修改状态，不通知后端
startHaunt: () => {
    set({
        phase: GamePhase.HauntReveal,
        currentScenario: selectedScenario,
        traitorId: traitorId,
        players: updatedPlayers,  // ❌ 没有发送任何网络请求
    });
}

// handlePlayerDeath - 直接修改状态
handlePlayerDeath: (playerId: string) => {
    // ... 修改 isDead, items, droppedItems
    set({ players: newPlayers, map: newMap });  // ❌ 没有通知后端
}
```

**修复方案**:
将这些函数改为发送请求到后端，由后端处理后广播 `state_sync`：

```typescript
// 修复后的 startHaunt
startHaunt: () => {
    if (!network.isInNetworkMode()) {
        showFeedback("网络未连接", "error");
        return;
    }
    // 不直接修改状态，而是请求后端执行
    // 后端 triggerHaunt 会设置 PendingAction 或直接进入 HAUNT_REVEAL
    // 前端通过 state_sync 收到更新
    network.requestHauntStart();  // 新增请求
}
```

---

## 🟡 P1 - 重要问题（影响多人体验）

### Issue 1: handleStateSync 中 PersonalLog 合并可能丢失日志

**位置**: `ws/network.ts` - `handleStateSync`

**问题描述**:
`handleStateSync` 对 `logs` 做合并，但 `personalLogs`（个人日志）没有合并逻辑。如果后端更新了某个玩家的 `personalLogs`，前端会直接覆盖而不是合并。

**代码**:
```typescript
// logs 有合并
if (state.logs && state.logs.length > 0) {
    const currentLogs = store.logs || [];
    const newLogs = state.logs.filter(
        (log: any) => !currentLogs.find((l: any) => l.id === log.id)
    );
    // 合并新日志...
}

// 但 personalLogs 没有合并！
// 直接 set({ logs: state.logs || [] })  // ❌ 可能丢失旧的个人日志
```

---

### Issue 2: wsClient 重连后 sessionID 丢失

**位置**: `ws/client.ts`

**问题描述**:
WebSocket 重连后，使用 `r.RemoteAddr` 作为 `sessionID`。但 `r.RemoteAddr` 在重连时可能变化，导致后端认为这是一个新的客户端。

**代码**:
```typescript
// HandleWebSocket 中
sessionID := r.RemoteAddr // 简单使用 RemoteAddr 作为 session ID

client := &Client{
    // ...
    sessionID: sessionID,
}
```

**修复方案**:
使用更稳定的 sessionID 生成策略，如在首次连接时生成 UUID 并通过 cookie/storage 持久化。

---

### Issue 3: 前端 handleStateSync 中 activeCombat 构造不完整

**位置**: `ws/network.ts` - `handleStateSync`

**问题描述**:
`handleStateSync` 手动构造 `activeCombat` 对象，但只复制了部分字段。如果后端 `CombatState` 有额外字段（如 `damage`），会被忽略。

```typescript
activeCombat: state.activeCombat ? {
    attackerId: state.activeCombat.attackerId,
    defenderId: state.activeCombat.defenderId,
    attribute: state.activeCombat.attribute,
    phase: state.activeCombat.phase,
    attackerRoll: state.activeCombat.attackerRoll,
    defenderRoll: state.activeCombat.defenderRoll,
} : null,
// ❌ 缺少其他可能存在的字段
```

**修复方案**:
直接使用后端传来的 `activeCombat`，或使用更安全的浅拷贝：

```typescript
activeCombat: state.activeCombat ? {
    ...state.activeCombat
} : null,
```

---

## 🟢 P2 - 优化建议

### Suggestion 1: 乐观更新支持

**问题**: 当前所有操作都等待后端 `state_sync` 才能更新 UI，网络延迟大时体验差。

**建议**:
1. 允许前端在发送请求后**立即更新 UI** 显示操作进行中
2. 后端 `state_sync` 到达后用后端状态覆盖
3. 如果后端拒绝操作，回滚并显示错误

---

### Suggestion 2: 后端缺少操作验证日志

**问题**: `handleGameAction` 中打印操作详情，但某些错误情况下日志不完整。

**建议**:
增加更多结构化日志，特别是在操作失败时记录完整上下文。

---

### Suggestion 3: 前后端数据结构重复定义

**问题**: `types.ts`、`constants.ts`、`data/` 和后端 `game/types.go`、`game/data.go` 存在重复定义。

**建议**:
考虑使用 JSON Schema 或 protobuf 定义共享数据结构。

---

## 📋 修复优先级清单

| 优先级 | 问题 | 预计工时 | 备注 |
|-------|------|---------|------|
| P0 | Bug 1: PlaceTile 不广播 PendingAction | 2h | 核心功能阻断 |
| P0 | Bug 2: handleDiceResult 忽略 success | 1h | UI 状态错误 |
| P0 | Bug 3: 前端函数不通知后端 | 4h | 多人游戏失效 |
| P1 | Issue 1: personalLogs 合并缺失 | 1h | 日志丢失 |
| P1 | Issue 2: sessionID 不稳定 | 2h | 重连失败 |
| P1 | Issue 3: activeCombat 构造不完整 | 0.5h | 潜在状态丢失 |
| P2 | Suggestion 1: 乐观更新 | 4h | 体验优化 |
| P2 | Suggestion 2: 操作日志 | 1h | 可观测性 |
| P2 | Suggestion 3: 数据结构统一 | 8h | 架构优化 |

---

## 🧪 测试验证清单

修复后需要验证：

### Bug 1 验证
- [ ] 放置带事件的房间后，前端立即显示等待骰子界面
- [ ] 其他玩家能看到当前玩家正在等待输入
- [ ] 骰子结果正确反映在所有玩家 UI

### Bug 2 验证
- [ ] 属性检定成功后，显示"成功"反馈
- [ ] 属性检定失败后，显示"失败"反馈
- [ ] 检定结果正确更新玩家属性

### Bug 3 验证
- [ ] 玩家 A 触发作祟，玩家 B 能看到相同剧本和叛徒
- [ ] 玩家死亡后，所有玩家看到该玩家标记为死亡
- [ ] 属性修改后，所有玩家看到相同属性值

---

## 📝 附录：关键代码路径

### 玩家放置房间流程
```
前端 confirmTilePlacement
  → network.sendPlaceTile(direction)
  → 后端 handleGameAction(place_tile)
    → PlaceTile
      → TriggerRoomEvent (设置 PendingAction 或 CardSymbol)
        → 如果是 ATTRIBUTE_CHECK: return (不发送 state_sync!)
      → 如果是 OMEN/ITEM: 继续执行
    → sendGameState (广播)
  → 前端 handleStateSync (更新状态)
```

### 骰子检定流程
```
后端 PlaceTile → TriggerRoomEvent (设置 PendingAction, return)
前端 等待...
前端 发送 roll_dice
后端 RollDice → ResolveEventChoice
  → 发送 dice_result (带 actionResult.success)
  → 发送 state_sync (PendingAction 已清除)
前端 handleDiceResult (收到 dice_result)
前端 handleStateSync (收到更新状态)
```

---

*审查完成时间: 2026-03-24 12:30 GMT+8*
