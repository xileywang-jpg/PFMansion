# PFMansion UI 显示问题分析报告

**审查日期**: 2026-03-24  
**问题**: 骰子结果、全球叙事日志、个人日志、属性界面等显示与真实数据不一致

---

## 🔴 P0 - 核心 Bug

### Bug 1: personalLogs 未从后端同步

**位置**: `ws/network.ts` - `handleStateSync`

**问题描述**:
`handleStateSync` 设置了 `players: state.players || {}`，这会直接覆盖整个 players 对象。但是前端 store 中每个玩家的 `personalLogs` 是在本地初始化的，后端同步过来的 `personalLogs` 会被覆盖或丢失。

**代码问题**:
```typescript
// network.ts handleStateSync
players: state.players || {},  // 直接覆盖，不合并 personalLogs
```

**实际行为**:
1. 前端玩家初始化时有 `personalLogs`（如 "进入了大厦"）
2. 后端 `state_sync` 发送玩家的 `personalLogs`（可能为空或只有后端添加的日志）
3. 前端直接用后端的覆盖本地的，导致本地初始日志丢失

**修复方案**:
合并 personalLogs 而不是直接覆盖：
```typescript
// 在 handleStateSync 中
const newPlayers = state.players || {};
const oldPlayers = store.players || {};

// 合并每个玩家的 personalLogs
Object.keys(newPlayers).forEach(pid => {
  if (newPlayers[pid] && oldPlayers[pid]?.personalLogs) {
    // 合并日志，保留前端本地日志 + 添加后端新日志
    const oldLogIds = new Set(newPlayers[pid].personalLogs?.map((l: any) => l.id));
    const mergedLogs = [
      ...(newPlayers[pid].personalLogs || []),
      ...(oldPlayers[pid].personalLogs?.filter((l: any) => !oldLogIds.has(l.id)) || [])
    ];
    newPlayers[pid].personalLogs = mergedLogs;
  }
});

setState({ players: newPlayers });
```

---

### Bug 2: lastRollResult 后端未设置，导致 state_sync 后被重置为 null

**位置**: `game/types.go`, `ws/network.ts`

**问题描述**:
1. 后端 `GameStateFull` 定义了 `LastRollResult *int` 字段，但**从未设置它**
2. `handleStateSync` 执行 `lastRollResult: state.lastRollResult ?? null`，由于后端没设置，总是 `null`
3. `handleDiceResult` 设置了 `lastRollResult`，但随后的 `state_sync` 会把它重置为 `null`

**代码问题**:
```go
// game/types.go - 定义了但从未赋值
LastRollResult *int `json:"lastRollResult,omitempty"`
```

```typescript
// ws/network.ts - state_sync 总是设置为 null
lastRollResult: state.lastRollResult ?? null,  // 后端没设置，所以总是 null
```

**影响**:
- 骰子结果显示后，如果收到 `state_sync`，骰子结果会消失
- 玩家看到骰子结果后立即消失

**修复方案**:
1. **后端**: 在 `RollDice` 后保存结果到 `LastRollResult`
2. **前端**: 在 `handleStateSync` 中保留本地的 `lastRollResult`（如果后端没发）

---

### Bug 3: EventModal 错误地自行判断成功/失败

**位置**: `components/EventModal.tsx`

**问题描述**:
前端使用 `lastRollResult >= threshold` 来判断成功/失败，但：
1. 后端已经在 `actionResult.success` 中返回了正确的判定
2. 前端的计算可能与后端不一致（如后端有特殊规则）

**代码问题**:
```tsx
{lastRollResult >= (threshold || 0) ? '成功' : '失败'}
```

**修复方案**:
使用后端返回的 `actionResult.success`，而不是自行计算：
```tsx
{/* 从 handleDiceResult 收到的 actionResult.success */}
{/* 或者在 store 中保存 lastRollSuccess 状态 */}
```

---

## 🟡 P1 - 重要问题

### Issue 1: logs 完全替换而不是合并

**位置**: `ws/network.ts` - `handleStateSync`

**问题描述**:
`logs: state.logs || []` 完全替换日志列表。如果前端有任何本地日志（理论上不应该），它们会丢失。

**修复方案**:
合并日志：
```typescript
// 合并 logs
const currentLogs = store.logs || [];
const newLogs = state.logs || [];
const existingIds = new Set(newLogs.map((l: any) => l.id));
const mergedLogs = [
  ...newLogs,
  ...currentLogs.filter((l: any) => !existingIds.has(l.id))
];
```

---

### Issue 2: activeCard 在骰子投掷后可能未正确清除

**位置**: `components/EventModal.tsx`, `ws/network.ts`

**问题描述**:
当骰子投掷完成后：
1. `handleDiceResult` 清除 `activeRoll`
2. 但 `activeCard` 需要等 `state_sync` 到达后才清除
3. 如果 `state_sync` 延迟，`activeCard` 仍显示

**修复方案**:
在 `handleDiceResult` 中，除了清除 `activeRoll`，还应该清除 `activeCard`（如果事件已经解决的话）。

---

### Issue 3: 属性显示可能不同步

**位置**: `components/PlayerHUD.tsx`, `ws/network.ts`

**问题描述**:
玩家属性（如 might, speed, sanity, knowledge）通过 `handleStateSync` 同步。但如果：
1. 属性变化很快
2. `state_sync` 延迟

玩家可能看到过期的属性值。

**当前实现**:
```typescript
players: state.players || {},  // 直接替换
```

这应该是正确的，因为后端是唯一数据源。但需要确保 `players` 中的 `character.attributes` 完整同步。

---

## 🔍 问题根因分析

### 数据流问题

```
后端状态变化
    ↓
handleGameAction 处理
    ↓
修改 GameStateFull
    ↓
sendGameState 广播 state_sync
    ↓
handleStateSync 接收
    ↓
store.setState({ ... })  // 这里出问题
```

### 具体问题

1. **personalLogs**: 后端发送了，但前端直接覆盖丢失
2. **lastRollResult**: 后端从未设置，导致永远为 null
3. **logs**: 合并逻辑缺失

---

## ✅ 修复清单

| 优先级 | 问题 | 修复文件 | 预计工时 |
|-------|------|---------|---------|
| P0 | personalLogs 未同步 | ws/network.ts | 1h |
| P0 | lastRollResult 未设置 | game/*.go, ws/network.ts | 2h |
| P0 | EventModal 成功/失败判断错误 | ws/network.ts | 0.5h |
| P1 | logs 合并缺失 | ws/network.ts | 0.5h |
| P1 | activeCard 清除时机 | ws/network.ts | 0.5h |
| P2 | 属性同步验证 | - | 0.5h |

---

## 🧪 验证清单

修复后需要验证：

- [ ] 放置房间触发事件后，骰子界面正确显示
- [ ] 骰子结果正确显示成功/失败（而不是基于 threshold 计算）
- [ ] 骰子结果在 state_sync 后仍然保留
- [ ] 个人日志正确显示（前端 + 后端日志都可见）
- [ ] 全球日志正确显示所有日志
- [ ] 玩家属性正确同步

---

*审查完成时间: 2026-03-24 13:30 GMT+8*
