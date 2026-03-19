# 📐 Mansion Protocol 技术设计文档

## 1. 系统架构

### 1.1 整体架构
```
┌─────────────────────────────────────────────────────────────┐
│                     客户端 (浏览器)                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │  React UI   │  │ WebSocket   │  │  Zustand   │       │
│  │  组件层     │  │  客户端     │  │  状态管理   │       │
│  └─────────────┘  └─────────────┘  └─────────────┘       │
│         │                │                │                 │
│         └────────────────┼────────────────┘                 │
│                          ▼                                  │
│                   ┌─────────────┐                          │
│                   │  操作拦截器  │                          │
│                   └─────────────┘                          │
└──────────────────────────┼──────────────────────────────────┘
                           │ HTTP/WebSocket
┌──────────────────────────┼──────────────────────────────────┐
│                     服务器 (Go)                             │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   HTTP     │  │ WebSocket   │  │  游戏逻辑   │     │
│  │  服务器    │  │    Hub      │  │   引擎      │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│         │                │                │                 │
│         └────────────────┼────────────────┘                 │
│                          ▼                                  │
│                   ┌─────────────┐                          │
│                   │  游戏状态   │                          │
│                   │  管理器     │                          │
│                   └─────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 前后端交互流程
```
用户操作 ──▶ 前端拦截 ──▶ WebSocket 发送 ──▶ 服务器处理
                              ▲                            │
                              │                            ▼
                     状态同步 ◀── WebSocket 广播 ◀── 游戏逻辑
```

---

## 2. 核心技术

### 2.1 前端技术栈
| 技术 | 用途 | 版本 |
|------|------|------|
| React | UI 框架 | 19.x |
| TypeScript | 类型安全 | 5.8.x |
| Zustand | 状态管理 | 5.x |
| Framer Motion | 动画效果 | 12.x |
| TailwindCSS | 样式框架 | - |

### 2.2 后端技术栈
| 技术 | 用途 | 版本 |
|------|------|------|
| Go | 服务器语言 | 1.22+ |
| gorilla/websocket | WebSocket | 1.5.x |
| 标准库 | HTTP/JSON | - |

---

## 3. 数据结构设计

### 3.1 房间状态 (Room)
```typescript
interface Room {
  id: string;           // 房间ID (4位数字)
  name: string;          // 房间名称
  players: Player[];     // 玩家列表
  gameState: RoomGameState;
  createdAt: Date;
}
```

### 3.2 玩家 (Player)
```typescript
interface Player {
  id: string;           // 玩家ID
  name: string;        // 玩家名称
  sessionID: string;    // WebSocket会话ID
  isHost: boolean;     // 是否房主
  isReady: boolean;   // 是否准备
  team: string;        // 阵营 (HERO/TRAITOR)
  isDead: boolean;     // 是否死亡
}
```

### 3.3 游戏状态 (GameState)
```typescript
interface GameState {
  phase: GamePhase;           // EXPLORATION/HAUNT_ROLL/HAUNT/GAME_OVER
  turnPhase: TurnPhase;      // MOVING/EVENT_RESOLVING/DONE
  turnIndex: number;          // 回合数
  players: Map<string, Player>;  // 玩家字典
  playerIds: string[];        // 玩家ID列表
  activePlayerId: string;     // 当前玩家
  map: Map<string, Tile>;    // 地图
  tileDeck: Tile[];          // 房间牌堆
  omenCount: number;         // 预兆数
  isHauntActive: boolean;    // 是否作祟阶段
  logs: LogEntry[];          // 游戏日志
}
```

---

## 4. 消息协议

### 4.1 消息类型

| 消息类型 | 方向 | 说明 |
|---------|------|------|
| `create_room` | C→S | 创建房间 |
| `join_room` | C→S | 加入房间 |
| `leave_room` | C→S | 离开房间 |
| `list_rooms` | C→S | 获取房间列表 |
| `set_ready` | C→S | 设置准备状态 |
| `start_game` | C→S | 开始游戏 |
| `game_action` | C→S | 游戏操作 |
| `get_state` | C→S | 获取状态 |

| 消息类型 | 方向 | 说明 |
|---------|------|------|
| `room_created` | S→C | 房间创建成功 |
| `room_joined` | S→C | 加入房间成功 |
| `player_joined` | S→C | 玩家加入广播 |
| `player_left` | S→C | 玩家离开广播 |
| `game_started` | S→C | 游戏开始广播 |
| `state_sync` | S→C | 状态同步 |
| `dice_result` | S→C | 骰子结果 |
| `error` | S→C | 错误信息 |

### 4.2 游戏操作
```typescript
type GameAction = 
  | { actionType: 'move'; direction: 'N' | 'E' | 'S' | 'W' }
  | { actionType: 'place_tile'; direction: 'N' | 'E' | 'S' | 'W' }
  | { actionType: 'end_turn' }
  | { actionType: 'roll_dice'; numDice: number }
  | { actionType: 'modify_stat'; attribute: string; amount: number };
```

---

## 5. 游戏逻辑设计

### 5.1 骰子系统

#### 骰子类型
使用山屋惊魂经典版规则：骰子点数为 **0、1、2** 三种：
- **0 点**：空白面（2/6 概率）
- **1 点**：白点（2/6 概率）
- **2 点**：绿点（2/6 概率）

#### 前后端分工 (2026-03-15 已统一)

| 场景 | 前端 | 后端 | 说明 |
|------|------|------|------|
| **属性检定** | ✅ 伪动画 + 接收结果 | ✅ 生成 0,1,2 | WebSocket 通信 |
| **战斗** | ✅ 伪动画 + 接收结果 | ✅ 生成 0,1,2 | WebSocket 通信 |
| **作祟检定** | ✅ 伪动画 + 接收结果 | ✅ 生成 0,1,2 | WebSocket 通信 |

#### 交互流程（统一后）
```
用户点击投掷
    │
    ▼
前端：发送 roll_dice (WebSocket) + 开始伪动画 (随机切换 0,1,2)
    │
    ▼
后端：生成真实骰子结果 → 返回 dice_result
    │
    ▼
前端：收到结果 → 停止伪动画 → 显示真实结果 → onComplete(sum) 回调
```

#### 超时处理
- 前端设置 5 秒超时
- 超时后停止动画，允许用户重试

#### 代码位置
- 前端骰子：`utils/dice.ts` (DIE_FACES = [0, 0, 1, 1, 2, 2])
- 后端骰子：`game/actions.go` (RollDice 函数，已修复为 0,1,2)
- 骰子组件：`components/DiceRoller.tsx`
- 网络层：`ws/network.ts` (sendRollDice)

### 5.2 主题数据格式

#### 数据格式规范
所有主题数据（characters, tiles, items, events, omens）统一使用**数组格式**：

```typescript
// ✅ 正确格式
export const ITEMS_DATA = [
  { id: "item_1", name: "物品1", ... },
  { id: "item_2", name: "物品2", ... },
];

// ❌ 错误格式（会导致牌组为空）
export const ITEMS_DATA = {
  "item_1": { name: "物品1", ... },
  "item_2": { name: "物品2", ... },
};
```

#### 数据文件位置
| 主题 | Characters | Tiles | Items | Events | Omens |
|------|------------|-------|-------|--------|-------|
| 原版 | ✅ 数组 | ✅ 数组 | ✅ 对象 | ✅ 对象 | ✅ 对象 |
| 翁法罗斯 | ✅ 数组 | ✅ 数组 | ✅ 数组 | ✅ 数组 | ✅ 数组 |

#### 修改记录
- **2026-03-15**: 翁法罗斯主题的 items/events/omens 从对象转换为数组格式

---

## 6. 回合流程

### 5.1 回合流程
```
1. 回合开始
   ├── 重置体力 (速度属性)
   └── 设置阶段为 MOVING

2. 玩家行动
   ├── 移动到相邻房间 (消耗体力)
   ├── 放置新房间 (消耗体力)
   ├── 与环境交互
   └── 使用道具/技能

3. 回合结束
   ├── 玩家手动结束
   └── 体力耗尽自动结束

4. 回合切换
   ├── 检查作祟 (预兆>=6)
   ├── 切换到下一玩家
   └── 重复流程
```

### 5.2 作祟系统
```
触发条件: 预兆数 >= 6

作祟检定:
- 投6个骰子
- 如果 sum < 预兆数 → 作祟爆发
- 否则 → 暂时安全

剧本判定:
- 根据最后触发房间类型
- 从剧本矩阵确定剧本ID

叛徒分配规则:
- TRIGGER_PLAYER: 触发作祟的玩家
- HIGHEST_MIGHT: 力量最高者
- LOWEST_SANITY: 理智最低者
```

---

## 6. 安全性设计

### 6.1 当前安全措施
- [x] 服务器端权威状态
- [x] 随机数服务器生成
- [x] 操作验证 (回合验证)

### 6.2 待增强
- [ ] 玩家认证 (Token)
- [ ] 操作签名
- [ ] 房间密码
- [ ] 反作弊检测

---

## 7. 性能优化

### 7.1 当前实现
- 内存存储房间状态
- 状态全量同步
- 简单广播机制

### 7.2 优化方向
- Redis 存储 (v2)
- 增量状态同步
- 消息压缩
- 连接池复用

---

## 8. 文件结构

```
PFMansion/
├── server.go              # 主入口
├── game/
│   ├── state.go          # 房间/游戏状态管理
│   └── logic.go          # 游戏逻辑
├── ws/
│   └── hub.go            # WebSocket Hub
├── components/            # React 组件
│   ├── MapGrid.tsx      # 地图网格
│   ├── PlayerHUD.tsx    # 玩家信息
│   ├── NetworkScreens.tsx # 登录/大厅
│   └── LocalGame.tsx    # 本地游戏
├── store/
│   └── gameStore.ts     # Zustand 状态
├── hooks/                # React Hooks
├── ws/                  # 前端网络
│   ├── client.ts        # WebSocket 客户端
│   ├── network.ts      # 网络层封装
│   └── adapter.ts      # 操作适配器
├── data/                # 游戏数据
│   ├── source/         # 原始数据
│   └── *.ts            # 数据导出
├── DOCS_*.md           # 文档
└── PROGRESS.md          # 开发进度
```

---

## 9. 扩展性设计

### 9.1 未来功能
- [ ] 房间密码
- [ ] 观战模式
- [ ] AI 对手
- [ ] 录像回放
- [ ] 成就系统

### 9.2 可扩展点
- 事件系统 → 添加新事件类型
- 剧本系统 → 添加新剧本
- 技能树 → 添加新技能
- 房间类型 → 添加新房间

---

## 10. 参考资料

- [gorilla/websocket](https://github.com/gorilla/websocket)
- [Zustand](https://github.com/pmndrs/zustand)
- [React](https://react.dev)
- [Go](https://go.dev)
