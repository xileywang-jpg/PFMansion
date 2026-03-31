# PFMansion UI 资源与展示逻辑文档

> 版本：v0.2.0 | 分支：`feature/ui-visual-enhancement` | 状态：**P0 实现中**

---

## 1. 核心命名规范

### 1.1 命名原则

每个游戏对象（角色、地块、物品等）都有**两种展示形态**：

| 形态 | 用途 | 典型尺寸 | 显示位置 |
|------|------|---------|---------|
| **缩略 UI** | 地图/列表中的小尺寸展示，快速识别 | ≤128px | 地图格子、玩家标记、卡片列表 |
| **详情 UI** | 独立面板/弹窗，完整信息展示 | 全屏/大面板 | 侧边栏、弹窗、点击展开 |

### 1.2 角色对象命名

```
角色对象 (Character)
├── 角色缩略 UI（角色微缩卡）
│   ├── 地图标记：玩家头像圆点（当前 24x24px）
│   ├── HUD 头像：PlayerHUD 左侧（当前 48x48px）
│   ├── 回合指示：TurnControl 中的名字标签
│   └── 列表项：玩家列表、交易对象选择
│
└── 角色详情 UI（角色完整卡面）
    ├── 角色面板：PlayerHUD 左侧区域（不点击，只看）
    ├── 角色检查弹窗：PlayerInspectionModal（点击头像打开）
    └── 未来：角色立绘大图（用户提供）

当前问题：
- 缩略 UI：仅有 lucide User icon + 颜色区分，无角色特征
- 详情 UI：PlayerInspectionModal 显示完整属性/技能，但无角色立绘
```

### 1.3 地块对象命名

```
地块对象 (Tile)
├── 地块缩略 UI（地块微缩卡）
│   ├── 地图卡片：TileCard 组件（128x128px），显示 icon + name + edges
│   ├── 地块放置预览：MapGrid 中的 ghost 地块（半透明）
│   └── 当前地块指示：玩家脚下地块的高亮边框
│
└── 地块详情 UI（地块完整卡面）
    ├── 地块信息面板：TileInspector（屏幕右侧，hover 触发）
    ├── 地块常驻信息栏：建议新增（屏幕底部，始终可见）
    └── 未来：地块场景大图（用户提供）

当前问题：
- 缩略 UI：看不到效果描述
- 详情 UI：TileInspector hover 触发不够直观，且当前地块反而看不到
```

### 1.4 物品对象命名（补充说明）

```
物品对象 (Item)
├── 物品缩略 UI
│   ├── 背包网格：InventoryModal 中的 4 列网格（56x56px/格）
│   ├── HUD 快捷栏：PlayerHUD 中的前 3 个物品
│   └── 交易面板：TradeModal 中的物品选择格
│
└── 物品详情 UI
    ├── 物品详情面板：InventoryModal 右侧（选中物品后）
    └── 物品 tooltip：hover 显示简要描述
```

### 1.5 NPC 对象命名

```
NPC 对象 (GameNPC)
├── NPC 缩略 UI
│   └── 地图标记：MapGrid 中的 NPC 圆形图标（32x32px）
│
└── NPC 详情 UI
    └── 悬停提示：title 属性显示 "名称 (HP/MP)"
    └── 未来：NPC 详情弹窗（点击打开）
```

---

## 2. 现有 UI 组件清单

### 2.1 组件分类表

| 组件名 | 类型 | 展示对象 | 所在区域 | 触发方式 |
|--------|------|---------|---------|---------|
| `TileCard` | 缩略 UI | 地块 | 地图（MapGrid 内） | 始终显示 |
| `TileInspector` | 详情 UI | 地块 | 地图右侧浮动 | hover 地块 |
| `TileInfoBar` | 详情 UI（建议新增） | 地块 | 屏幕底部中央 | **始终显示** |
| `PlayerHUD` | 混合 | 玩家 | 屏幕右侧边栏 | - |
| `PlayerInspectionModal` | 详情 UI | 玩家 | 全屏遮罩弹窗 | 点击其他玩家头像 |
| `TurnControl` | 交互 HUD | - | 屏幕底部 | - |
| `InventoryModal` | 详情 UI | 物品 | 全屏遮罩弹窗 | HUD 按钮 |
| `TradeModal` | 详情 UI | 物品/玩家 | 全屏遮罩弹窗 | InteractionModal |
| `SkillTreeModal` | 详情 UI | 技能 | 全屏遮罩弹窗 | HUD 按钮 |
| `InteractionModal` | 详情 UI | 互动 | 全屏遮罩弹窗 | 站在互动地块上 |
| `TeleportModal` | 详情 UI | 传送 | InteractionModal 内 | 传送互动 |
| `DivinationModal` | 详情 UI | 占卜 | InteractionModal 内 | 占卜互动 |
| `HauntRollModal` | 详情 UI | 作祟骰 | 全屏遮罩 | 作祟触发 |
| `HauntReveal` | 详情 UI | 剧本揭示 | 全屏遮罩 | 作祟开始 |
| `EventModal` | 详情 UI | 事件卡 | 全屏遮罩 | 事件触发 |
| `DiceRoller` | 详情 UI | 骰子 | 全屏遮罩 | 检定触发 |
| `CombatResolution` | 详情 UI | 战斗 | 全屏遮罩 | 战斗结算 |
| `FeedbackToast` | 反馈 | - | 屏幕顶部居中 | 事件触发 |
| `NetworkScreens` | 页面 | - | 独立页面 | 路由 |
| `LoginPage` | 页面 | - | 独立页面 | 路由 |
| `GamesPage` | 页面 | - | 独立页面 | 路由 |

### 2.2 缩略 UI 详细规格

#### 2.2.1 地块缩略卡（TileCard）

```
位置：MapGrid 内，每个地块实例一个
尺寸：128x128px（CSS: w-32 h-32）
内部结构：
  - 背景：bg-gradient-to-br from-zinc-900 to-zinc-950
  - 图标区：center，lucide icon，24px
  - 名称区：底部，text-[10px]，最多显示 2 行
  - 边缘指示：东/南/西/北 四个方向的内容
  - 玩家标记：中央，覆盖层，彩色圆点 16x16px
  - 掉落物品：左上角，小图标 + 数量角标
  - 事件指示：右上角，脉冲圆点 8x8px
  - 悬停效果：scale 1.03，border 高亮

当前问题：
  ❌ 看不到效果描述（只显示 icon + name）
  ⚠️ 悬停才能看到完整信息
```

#### 2.2.2 玩家缩略标记（PlayerHUD 内 + TileCard 内）

```
位置 A：TileCard 中央（站在该地块的玩家头像）
尺寸：16x16px（w-4 h-4）
样式：圆点 + 玩家颜色 + 死亡时叠加骷髅
触发：玩家站在该地块时显示

位置 B：PlayerHUD 左侧头像
尺寸：48x48px（w-12 h-12）
样式：圆形 + 玩家颜色边框 + User icon
触发：始终显示（当前玩家）

位置 C：TurnControl 底部名字标签
尺寸：文字标签
样式：圆点 + 玩家名 + 回合阶段

当前问题：
  ❌ PlayerHUD 头像点不了（无 onClick）
  ❌ 头像只是纯色圆形 + User icon，无法识别角色
```

#### 2.2.3 物品缩略格（InventoryModal 内）

```
位置：InventoryModal 左侧 4 列网格
尺寸：56x56px（grid col 每个格子）
样式：图标居中（24px lucide icon）+ 选中高亮
类型颜色：
  - WEAPON: text-zinc-300
  - CONSUMABLE: text-zinc-300
  - OMEN: text-emerald-500
  - PASSIVE: text-zinc-300
```

### 2.3 详情 UI 详细规格

#### 2.3.1 地块详情面板（TileInspector）

```
位置：屏幕右侧，top-6 right-80（固定偏移）
尺寸：w-72（288px 宽）
内部结构：
  - 头部：h-32，图标 48px + 坐标标签
  - 名称：text-xl
  - 描述：text-xs italic，引号包裹
  - 边缘指示：出口方向（N/S/E/W）
  - 效果列表：每个 effect 一个 p-3 小块
  - 事件触发指示：已触发/待触发

触发条件：
  - pendingTile 存在时显示（地块放置模式）
  - 或 hoveredTileId 存在时显示（hover 地图地块）
  - 或当前玩家所在地块

问题：
  ❌ 当前地块（无 hover）看不到详情
  ❌ 位置在屏幕右侧，远离地图操作区
  ❌ hover 触发容易被其他元素遮挡
```

#### 2.3.2 玩家详情弹窗（PlayerInspectionModal）

```
位置：全屏遮罩居中
尺寸：max-w-lg（~512px 宽），max-h-[85vh]
内部结构：
  - Header：头像 64x64 + 名字 + 描述 + 特质标签
  - 属性区：2 列 grid，4 项属性
  - 技能区：已习得技能列表
  - 状态区：当前 buff 列表
  - 隐私提示：背包不可见

触发条件：
  - inspectPlayerId 不为 null（openInspection 调用）

打开方式：
  - 点击 TileCard 上的玩家标记（当前唯一方式）
  - ❌ PlayerHUD 头像点击无反应

当前问题：
  ❌ 无法快速查看自己（当前玩家）的完整信息
  ❌ 无角色立绘，只有 User icon
```

#### 2.3.3 角色面板（PlayerHUD 内）

```
位置：PlayerHUD 顶部区块
尺寸：占满 HUD 宽度，padding p-6
内部结构：
  - 头像区：w-12 h-12 圆形，User icon
  - 名字：text-xl serif-display
  - 描述：text-xs italic
  - 特质标签：一行小标签
  - 团队标识（作祟阶段）：叛徒/英雄 标签

问题：
  ❌ 头像无法点击
  ❌ 无角色立绘
  ❌ 只显示当前玩家（activePlayerId）
```

---

## 3. 数据结构分析

### 3.1 角色相关字段

```typescript
// types.ts - CharacterDef
interface CharacterDef {
  id: string;
  name: string;
  description: string;
  portraitUrl?: string;        // ✅ 角色立绘大图（未使用）
  attributes: Record<AttributeName, Attribute>;
  traits: string[];            // 特质标签
  initialSkills?: string[];    // 初始技能
}

// types.ts - Player
interface Player {
  id: string;
  character: CharacterDef;     // 角色定义引用
  position: { x: number; y: number };
  items: Item[];
  isDead: boolean;
  team: PlayerTeam;
  buffs: string[];
  skills: string[];
  skillPoints: number;
  unlockedSkillNodes: string[];
  personalLogs: LogEntry[];
}

// ✅ portraitUrl 字段已存在，但：
// 1. 前端未使用此字段渲染任何内容
// 2. 后端数据可能未填充此字段
// 3. 缺少 thumbnailUrl（缩略图）
```

### 3.2 地块相关字段

```typescript
// types.ts - TileDef
interface TileDef {
  id: string;
  name: string;
  description: string;         // ✅ 描述（当前不显示）
  floors: FloorLevel[];
  edges: DirectionalEdges;      // ✅ 边缘状态（显示）
  type: 'room' | 'corridor' | 'special';
  cardSymbol?: CardSymbol;     // 事件/物品/预兆 符号
  eventTrigger?: string;
  icon?: string;               // ⚠️ lucide-react 图标名，非 URL
  effects?: TileEffect[];      // ✅ 效果列表（TileInspector 显示）
  onEnter?: TileTrigger;
  onLeave?: TileTrigger;
  interact?: TileInteraction;
}

// types.ts - TileInstance
interface TileInstance {
  instanceId: string;
  defId: string;               // 指向 TileDef
  x: number;
  y: number;
  rotation: number;
  edges: DirectionalEdges;
  hasEventTriggered: boolean;
  visibility: 'HIDDEN' | 'FOG' | 'VISIBLE';
  droppedItems: Item[];
}

// ❌ TileDef 和 TileInstance 都缺少：
// - imageUrl（地块场景大图）
// - thumbnailUrl（地块缩略图）
// - cardImageUrl（地块卡面图）
```

### 3.3 物品相关字段

```typescript
// types.ts - Item
interface Item {
  id: string;
  name: string;
  description: string;
  icon: string;                // ⚠️ lucide-react 图标名，非 URL
  type: ItemType;
  usage?: ItemUsage;
  passiveEffects?: PassiveEffect[];
  grantedSkills?: string[];
}

// ❌ Item 缺少：
// - imageUrl（物品大图）
// - thumbnailUrl（物品小图）
```

### 3.4 资源缺口总结

| 对象 | 已有字段 | 缺失字段 | 状态 |
|------|---------|---------|------|
| CharacterDef | `portraitUrl` | `thumbnailUrl`, `iconUrl` | portraitUrl 未使用 |
| TileDef | `icon` (lucide名) | `imageUrl`, `cardImageUrl` | 无图片资源 |
| TileInstance | 无图片字段 | `thumbnailUrl` | 无 |
| Item | `icon` (lucide名) | `imageUrl` | 无图片资源 |

---

## 4. 展示逻辑分析

### 4.1 地图视图（MapGrid）显示逻辑

```
地图加载时：
  for each TileInstance in map:
    → 渲染 TileCard（128x128px）
    → 显示：icon + name + edges + 玩家标记

玩家移动时：
  → 移动动画（Framer Motion layoutId）
  → 地块上的玩家标记重新渲染

Hover 地块时：
  → setHoveredTileId → TileInspector 显示该地块详情
  → TileInspector 优先级：pendingTile > hoveredTileId > 当前玩家地块

NPC 渲染：
  → 每个 NPC 在 MapGrid 中独立定位
  → 点击 → sendAttackNPC（网络模式）
```

### 4.2 玩家 HUD 显示逻辑

```
PlayerHUD 始终显示 activePlayerId 对应的玩家信息：
  - 头像 + 名字 + 描述 + 特质
  - 4 项属性（力量/速度/理智/知识）
  - 技能列表（前 5 个）
  - 背包物品（前 3 个）
  - 日志区（全球/个人切换）

打开详情弹窗：
  → 点击 TileCard 上的玩家头像圆点
  → openInspection(playerId) → set inspectPlayerId
  → PlayerInspectionModal 显示

打开背包：
  → 点击"打开背包"按钮 → toggleInventory
  → InventoryModal 显示
```

### 4.3 弹窗显示层级

```
z-index 层级（从低到高）：
  30  TileInspector（地块详情，地图内浮动）
  40  TurnControl（回合控制，底部居中）
  50  InteractionModal / TradeModal / InventoryModal / SkillTreeModal
 100 HauntReveal（全屏序列帧）
 150 EventModal（事件卡）
 200 FeedbackToast（顶部提示）
 250 PlayerInspectionModal（玩家详情）
 300 DiceRoller（骰子）
 400 CombatResolution（战斗）
 500 HauntRollModal（作祟骰）
```

### 4.4 交互触发条件表

| 交互 | 触发条件 | 显示组件 |
|------|---------|---------|
| 查看地块详情 | hover TileCard | TileInspector（右侧浮动） |
| 破坏墙壁 | hover 墙壁边缘 + hasActivePlayer | 交互按钮（opacity-0 → hover 显示） |
| 查看玩家详情 | 点击 TileCard 上玩家头像 | PlayerInspectionModal |
| 打开背包 | 点击"打开背包"按钮 | InventoryModal |
| 交易物品 | 触发 TRADE 互动 | TradeModal |
| 使用技能 | 点击技能按钮 | 执行技能逻辑 |
| 查看技能树 | 点击"技能树"按钮 | SkillTreeModal |
| 投掷骰子 | 检定触发 | DiceRoller |
| 触发事件 | 进入事件地块 | EventModal |
| 攻击 NPC | 点击 NPC 标记 | 发送网络请求 |

---

## 5. 布局结构分析

### 5.1 游戏主界面（GameScreen）布局

```
┌─────────────────────────────────────────────────────────────────┐
│  [Title: MANSION PROTOCOL]              [Omens: 3] [Leave] │
│                                                                  │
│  ┌──────────────────────────────────────────────┐  ┌─────────┐ │
│  │                                              │  │         │ │
│  │                                              │  │         │ │
│  │              MapGrid                         │  │  HUD    │ │
│  │         (地块地图，可缩放/移动)              │  │  玩家   │ │
│  │                                              │  │  属性   │ │
│  │                                              │  │  技能   │ │
│  │   [TileCard] [TileCard]                      │  │  背包   │ │
│  │                   ↗ TileInspector(右侧悬浮)   │  │  日志   │ │
│  │                                              │  │         │ │
│  └──────────────────────────────────────────────┘  └─────────┘ │
│                                                                  │
│                    ┌──────────────────┐                          │
│                    │  TurnControl     │                          │
│                    │  [玩家名] [移动力] │                          │
│                    │  [结束回合按钮]    │                          │
│                    └──────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘

覆盖层（Overlay）：
  - FeedbackToast: 顶部居中，固定
  - EventModal: 全屏遮罩居中
  - DiceRoller: 全屏遮罩居中
  - CombatResolution: 全屏遮罩居中
  - HauntReveal: 全屏无遮罩（背景模糊）
```

### 5.2 HUD（PlayerHUD）内部布局

```
┌─────────────────────────────┐
│ [头像] 莱因哈特神父         │  ← 角色区
│ "一位有着黑暗过去..."        │
│ [受祝福]                    │
├─────────────────────────────┤
│ 剧本任务（作祟阶段展开）    │  ← 任务区（仅作祟）
├─────────────────────────────┤
│ 技能序列         [技能树]   │  ← 技能区
│ [技能1] [技能2] ...         │
├─────────────────────────────┤
│ 角色属性           [交互]   │  ← 属性区
│ 力量 ████░░░ 4/8           │
│ 速度 █████░░ 5/8           │
│ ...                        │
├─────────────────────────────┤
│ 随身道具        [打开背包]  │  ← 背包区
│ [物品1] [物品2] [物品3]     │
├─────────────────────────────┤
│ [全球叙事] [个人履历]       │  ← 日志区
│ 16:42 你获得了道具         │
│ 16:41 莱因哈特走进了走廊   │
└─────────────────────────────┘
```

### 5.3 地图地块（TileCard）内部布局

```
┌─────────────┐
│         [事件│  ← 右上角：事件未触发指示（脉冲点）
│            │
│    [门]    │  ← 北/南/东/西边缘（墙/门/碎石/密道）
│  [Icon]    │  ← 中央：lucide icon，24px
│  [名称]    │  ← 底部：地块名称，10px
│            │
│ [掉落物+]  │  ← 左上角：掉落物品图标
│ ●●●        │  ← 中央覆盖：玩家头像圆点（最多4个）
└─────────────┘
```

---

## 6. 待确认事项

### 6.1 资源方案决策（已确认）

| 资源 | 决策 | 规格 | 状态 |
|------|------|------|------|
| 角色立绘 | 占位符 + 区域标定 | 288x432px（portrait） | ✅ CardImage 组件已实现 |
| 角色缩略图 | 占位符 + 区域标定 | 128x128px（thumbnail） | ✅ CardImage 组件已实现 |
| 地块卡面 | 占位符 + 区域标定 | 288x432px（card） | ✅ CardImage 组件已实现 |
| 物品图片 | 保持 lucide icon | N/A | 无需改动 |

### 6.2 组件实现状态

| 组件 | 路径 | 用途 |
|------|------|------|
| `CardImage` | `components/effects/CardImage.tsx` | 通用图片占位符，支持 portrait/card/thumbnail 三种尺寸 |
| `CharacterPortrait` | `CardImage.tsx` 内导出 | 角色立绘便捷组件 |
| `TileCardImage` | `CardImage.tsx` 内导出 | 地块卡面便捷组件 |
| `ThumbnailImage` | `CardImage.tsx` 内导出 | 缩略图便捷组件（圆形） |
| `TileInfoBar` | `components/effects/TileInfoBar.tsx` | 底部常驻地块信息栏 |

### 6.2 交互逻辑决策（已确认）

- **地块详情**：方案 C
  - 保留 TileInspector（右侧悬浮，hover 触发）
  - 新增 TileInfoBar（底部常驻栏，显示当前地块摘要）
  - 点击地块打开完整详情弹窗（可选增强）

- **角色详情**：
  - PlayerHUD 头像增加 onClick → 打开 PlayerInspectionModal
  - 头像区显示占位符（带尺寸标注），未来替换为真实立绘

---

## 7. 文档更新记录

| 版本 | 日期 | 修改内容 | 作者 |
|------|------|---------|------|
| v0.1.0 | 2026-03-31 | 初始文档：UI 资源、命名规范、显示逻辑、布局结构 | Sifere |
| v0.2.0 | 2026-03-31 | 实现 TileInfoBar、CardImage 占位符组件、PlayerHUD 头像可点击 | Sifere |
