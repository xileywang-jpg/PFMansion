# PFMansion 前端视效增强方案

> 版本：v0.2.0 | 分支：`feature/ui-visual-enhancement` | 状态：**P0 实现中**

---

## 1. 概述与目标

### 1.1 项目背景

PFMansion（冒险小屋）是一款类桌游游戏的前端项目，当前 UI 具备基础暗夜游戏风格（紫金配色、赛飞儿主题），但存在以下问题：

- **交互缺陷**：关键信息不可见（地块效果、墙壁可交互提示）
- **视效单一**：仅依赖 CSS 变量和基础过渡动画
- **资源零散**：无统一的图片资产管理结构
- **迭代困难**：样式与业务逻辑耦合，缺乏设计系统抽象

### 1.2 核心原则

**先好用，再好看。** 本次增强优先解决"看不见、找不到"的实用问题，确保游戏核心交互链路的可用性。

### 1.3 增强目标（优先级排序）

| 优先级 | 维度 | 目标 |
|--------|------|------|
| **P0** | 信息可见性 | 地块效果、角色属性始终可见 |
| **P0** | 交互发现性 | 墙壁交互、NPC 交互有视觉提示 |
| **P1** | 交互反馈 | 属性变化、物品获得有视觉反馈 |
| **P2** | 沉浸体验 | 粒子特效、卡牌动画、数字飘散 |
| **P3** | 美术资产 | 角色立绘、图标系统、场景图 |

### 1.2 增强目标

| 维度 | 当前状态 | 目标状态 |
|------|---------|---------|
| 视觉丰富度 | CSS 渐变 + 简单阴影 | 粒子动效、光晕、呼吸动画、微交互 |
| 资源管理 | 无结构 | 分类清晰、CDN/本地分层、自动化构建 |
| 组件抽象 | 散装组件 | 设计系统化、主题变量驱动 |
| 性能 | 未优化 | GPU 加速、按需加载、懒加载 |
| 可迭代性 | 高耦合 | 主题变量中心化、配置驱动 |

---

## 2. 资源管理方案

### 2.1 资源目录结构

```
src/assets/
├── images/
│   ├── characters/        # 人物卡面、立绘
│   │   ├── thumb/          # 缩略图 (128x128, WebP)
│   │   ├── card/           # 卡面大图 (512x768, WebP)
│   │   └── full/           # 完整立绘 (1920x1080, WebP)
│   ├── icons/
│   │   ├── flat/           # 扁平图标 (SVG)
│   │   ├── colored/        # 彩色图标 (SVG)
│   │   └── animated/       # 动画图标 (Lottie JSON / SVG CSS)
│   ├── backgrounds/
│   │   ├── textures/       # 背景纹理 (tileable SVG/PNG)
│   │   └── scenes/         # 场景大图 (1920x1200, WebP)
│   ├── effects/
│   │   ├── particles/       # 粒子序列帧 (PNG sprite)
│   │   ├── overlays/        # 叠加层 (PNG with alpha)
│   │   └── masks/           # SVG 遮罩
│   └── ui/
│       ├── buttons/        # 按钮状态图
│       ├── frames/         # 边框、装饰框
│       └── badges/          # 徽章、标签
├── audio/
│   ├── sfx/                # 音效 (MP3/OGG)
│   └── bgm/                # 背景音乐
└── data/
    └── assets-manifest.json # 资源清单（自动生成）
```

### 2.2 资源分类与加载策略

| 资源类型 | 加载策略 | 格式 | 单文件限制 |
|---------|---------|------|----------|
| 人物卡面 | 懒加载 + 预加载 | WebP, AVIF | < 200KB |
| 扁平图标 | 内联 / 同步 | SVG | < 5KB |
| 彩色图标 | 异步加载 | SVG | < 20KB |
| 动画图标 | 按需 | Lottie JSON | < 50KB |
| 背景纹理 | 预加载 | SVG tileable | < 30KB |
| 场景大图 | 懒加载 | WebP | < 500KB |
| 粒子特效 | 按需 | PNG sprite / Canvas | < 100KB |
| 音效 | 用户交互触发 | MP3 | < 500KB |
| BGM | 延迟加载 | OGG | < 2MB |

### 2.3 资源生命周期管理

```
[开发期]
  ↓
资源文件 → assets/原始文件
  ↓
构建脚本处理（见 2.4）
  ↓
[生产期]
  ↓
public/assets-build/ (构建产物)
  ↓ 或 CDN
```

### 2.4 自动化构建处理

在 `vite.config.ts` 中集成：

```typescript
// vite.config.ts
export default defineConfig({
  assetsInclude: ['**/*.webp', '**/*.avif'],
  // 资源内联阈值：8KB以下的图标内联
  build: {
    assetsInlineLimit: 8 * 1024,
  }
})
```

新增 `scripts/asset-process.ts`：

```typescript
// 资源处理脚本功能
// 1. 生成 assets-manifest.json（资源清单）
// 2. 生成 TypeScript 类型声明（资源引用）
// 3. 图片压缩（使用 sharp）
// 4. SVG 优化（使用 svgo）
```

### 2.5 资源引用规范

**规范：** 所有资源必须通过 TypeScript 常量引用，禁止硬编码路径。

```typescript
// src/constants/assets.ts

// ❌ 禁止
<img src="/assets/images/character1.webp" />

// ✅ 正确
import { CharacterImages } from '@/constants/assets';
<img src={CharacterImages.sifere.card} />
```

---

## 3. UI 增强方案

### 3.1 动画效果分级

根据前端技能规范，定义三层动画等级：

| 等级 | 适用场景 | 技术方案 | 性能目标 |
|------|---------|---------|---------|
| **L1 微交互** | 按钮悬停、输入框聚焦、切换状态 | CSS Transition + Framer Motion `whileHover/whileTap` | < 16ms |
| **L2 流畅过渡** | 页面进入/退出、模态框、卡片展开 | Framer Motion `AnimatePresence` + `layoutId` | < 16ms |
| **L3 沉浸特效** | 背景粒子、游戏结算、卡牌翻转 | GSAP ScrollTrigger / Canvas / R3F | 按需加载 |

### 3.2 登录页增强

**当前状态：** 基础居中卡片 + 简单渐变背景

**增强目标：**
- [ ] 背景粒子漂浮动效（Canvas 或 CSS）
- [ ] 登录卡片 3D 透视倾斜（鼠标跟随）
- [ ] 输入框聚焦时边框流光动画
- [ ] 按钮点击涟漪效果
- [ ] 成功登录时卡牌飞出动画

**实现规范：**

```tsx
// 背景粒子层（React.memo 隔离）
const ParticleBackground = React.memo(() => {
  // GPU 动画，仅 transform + opacity
  // 移动端禁用（prefers-reduced-motion）
  // 粒子数量：桌面 50，移动 20
});

// 卡片倾斜组件
const TiltCard = ({ children }) => {
  const ref = useRef(null);
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 50]);
  
  const x = useMotionValue(0);
  const y_ = useMotionValue(0);
  
  const mouseX = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseY = useSpring(y_, { stiffness: 150, damping: 20 });
  
  return (
    <motion.div
      style={{ rotateX: mouseY, rotateY: mouseX }}
      ref={ref}
    >
      {children}
    </motion.div>
  );
};
```

### 3.3 游戏选择页增强

**当前状态：** 网格卡片列表 + 基础悬停效果

**增强目标：**
- [ ] 卡片入场交错动画（stagger）
- [ ] 卡片悬停时微微上浮 + 光晕描边
- [ ] 背景动态渐变呼吸
- [ ] 选中主题的确认动画

**实现规范：**

```tsx
// 入场动画
<motion.div
  initial="hidden"
  animate="visible"
  variants={{
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }}
  transition={{ staggerChildren: 0.1 }}
>
  {games.map(game => (
    <motion.div
      key={game.id}
      variants={{
        hidden: { opacity: 0, scale: 0.95 },
        visible: { opacity: 1, scale: 1 }
      }}
      whileHover={{ y: -8, boxShadow: '0 20px 40px rgba(139, 92, 246, 0.3)' }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    />
  ))}
</motion.div>
```

### 3.4 游戏界面增强

**当前状态：** 基础 HUD + 地图网格

**增强目标：**
- [ ] 玩家头像边框流光（当前回合指示）
- [ ] 骰子滚动动画
- [ ] 事件卡揭幕动画（3D 翻牌效果）
- [ ] 战斗结算粒子爆发
- [ ] 地形格子悬停微光

**实现规范：**

```tsx
// 3D 卡牌翻转
const CardReveal = ({ isRevealed, children }) => (
  <motion.div
    initial={false}
    animate={{ rotateY: isRevealed ? 180 : 0 }}
    transition={{ duration: 0.6, ease: 'easeInOut' }}
    style={{ transformStyle: 'preserve-3d' }}
  >
    <motion.div style={{ backfaceVisibility: 'hidden' }}>
      {isRevealed ? null : children}
    </motion.div>
    <motion.div
      style={{
        backfaceVisibility: 'hidden',
        rotateY: 180,
        position: 'absolute',
        inset: 0
      }}
    >
      {isRevealed ? children : null}
    </motion.div>
  </motion.div>
);

// 粒子爆发效果（Canvas）
const ParticleBurst = ({ x, y, color, count = 30 }) => {
  // 使用 requestAnimationFrame
  // 粒子数上限：桌面 80，移动 30
};
```

### 3.5 主题系统增强

**当前结构：** CSS 变量覆盖

**增强目标：**
- [ ] 每个主题独立的粒子/动效配置
- [ ] 主题切换平滑过渡（不闪烁）
- [ ] 主题资源（背景、图标）按需加载

```typescript
// src/themes/types.ts
interface ThemeConfig {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    card: string;
    text: string;
  };
  effects: {
    particleEnabled: boolean;
    particleCount: number;
    particleColor: string;
    glowIntensity: 'none' | 'low' | 'high';
    animationLevel: 1 | 2 | 3;
  };
  assets: {
    background?: string;
    cardFrame?: string;
    iconSet: 'flat' | 'colored';
  };
}
```

---

## 4. UI 迭代方案（按 P0→P3 优先级）

> ⚠️ **执行顺序调整**：原 Phase 1-4 顺序已调整为**交互优先**。请先完成 P0 阶段再进入视效增强。

### 4.1 迭代原则

| 原则 | 说明 |
|------|------|
| **渐进增强** | 先保证功能可用，再叠加视效 |
| **降级兜底** | 无动画支持时保持功能完整 |
| **性能优先** | 动画必须 GPU 加速，禁止 layout thrashing |
| **可插拔** | 特效组件独立，不影响业务逻辑 |

### 4.2 迭代计划

#### Phase P0：交互基础（2-3天）⚠️ 优先执行
- [ ] **P0-1** 创建 `TileInfoBar` 组件（底部常驻地块效果栏）
- [ ] **P0-2** 地块信息始终可见（当前地块不受 hover 影响）
- [ ] **P0-3** 墙壁可交互视觉指示器（菱形发光点）
- [ ] **P0-4** PlayerHUD 头像点击打开角色详情
- [ ] **P0-5** 完善 NPC 悬停/点击交互（已有，但提示不够明显）

#### Phase P1：交互反馈（2-3天）
- [ ] **P1-1** 属性变化动画（数值弹跳 + 进度条过渡）
- [ ] **P1-2** 物品获得/使用弹出动画
- [ ] **P1-3** 技能树节点解锁爆发动画
- [ ] **P1-4** 伤害数字飘散效果
- [ ] **P1-5** 玩家头像边框呼吸光（当前回合指示）

#### Phase 1：基础设施（1-2天）（可与 P0 并行）
- [ ] 建立 `src/assets/` 目录结构
- [ ] 配置 Vite 资源处理
- [ ] 建立 `src/themes/` 主题配置中心
- [ ] 创建 `src/components/ui/` 基础 UI 组件库
- [ ] 编写资源引用规范文档

#### Phase 2：登录页增强（2-3天）
- [ ] 实现粒子背景
- [ ] 实现卡片 3D 倾斜
- [ ] 实现输入框流光效果
- [ ] 实现按钮涟漪效果
- [ ] 单页集成测试

#### Phase 3：游戏选择页增强（2-3天）
- [ ] 实现交错入场动画
- [ ] 实现卡片光晕悬停
- [ ] 实现背景呼吸渐变
- [ ] 主题切换动效

#### Phase 4：游戏界面增强（3-5天）
- [ ] 实现 HUD 流光边框
- [ ] 实现骰子滚动动画
- [ ] 实现 3D 卡牌翻转
- [ ] 实现粒子爆发效果
- [ ] 性能优化与移动端适配

### 4.3 验收标准

| 阶段 | 验收条件 |
|------|---------|
| Phase 1 | 资源目录就绪，构建无警告，主题切换无闪烁 |
| Phase 2 | 登录页 Lighthouse 性能 ≥ 80，无 layout shift |
| Phase 3 | 游戏选择页动画流畅（60fps），移动端降级正常 |
| Phase 4 | 游戏界面 80% 场景有动效，FPS 保持 ≥ 30（移动端） |

---

## 5. 技术实现规范（补充）

### 5.1 P0 核心组件设计

#### TileInfoBar 组件（底部常驻地块信息）

```tsx
// src/components/effects/TileInfoBar.tsx
interface TileInfoBarProps {
  // 从 gameStore 获取当前 activePlayer 的 position
  // 通过 map[position] 获取当前地块 instance
  // 通过 getTileById(instance.defId) 获取地块定义
  // 显示：图标 + 名称 + 描述 + 效果列表
}

const TileInfoBar: React.FC = () => {
  const { map, players, activePlayerId, getTileById } = useGameStore();
  const player = players[activePlayerId];
  
  // 计算当前地块
  const currentTile = player 
    ? map[`${player.position.x},${player.position.y}`] 
    : null;
  const tileDef = currentTile 
    ? getTileById(currentTile.defId) 
    : null;
  
  // 始终显示（不依赖 hover）
  if (!tileDef) return null;
  
  return (
    <motion.div 
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
    >
      {/* 显示地块信息 */}
    </motion.div>
  );
};
```

#### InteractiveWallIndicator 组件

```tsx
// 在 TileCard 的 renderEdge 中调用
// 当 hasActivePlayer && edgeType === 'WALL' 时渲染
// 显示一个脉冲发光的小菱形指示器
// 悬停时显示完整交互按钮
```

#### AttributeChangePopup 组件

```tsx
// src/components/effects/AttributeChangePopup.tsx
// 监听属性变化，显示 +1/-1 飘字
// 使用 Framer Motion 的 AnimatePresence + motion.div
// 向上飘散并淡出，持续 1.5s
```

### 5.2 现有组件改动清单

| 组件 | 改动点 |
|------|--------|
| `TileCard.tsx` | 增加墙壁可交互指示器 |
| `TileInspector.tsx` | 调整定位逻辑，确保当前地块始终可查看 |
| `PlayerHUD.tsx` | 头像 onClick 打开 PlayerInspectionModal |
| `MapGrid.tsx` | 确保 hover 区域不被其他元素遮挡 |
| `AttributeRow` (PlayerHUD内) | 增加数值变化动画 |
| `InventoryModal.tsx` | 增加物品获得/使用动画 |
| `SkillTreeModal.tsx` | 增加解锁节点粒子爆发 |

---

### 5.3 原有技术规范

### 5.1 依赖添加规则

```bash
# 必须使用前检查 package.json
# 动画库
npm install framer-motion  # 已安装 ✓

# 按需加载的重量级库
npm install gsap            # ScrollTrigger 需 lazy-load
npm install lottie-react     # 动画图标需 lazy-load
npm install three @react-three/fiber @react-three/drei  # 3D 需 lazy-load

# 图像处理
npm install sharp svgo       # 构建时资源处理
```

### 5.2 性能红线

| 禁止项 | 替代方案 |
|-------|---------|
| 动画 `width/height/margin/padding` | 使用 `transform: scale()` |
| 同步加载 3D 库 | 使用 `React.lazy` + `Suspense` |
| 超过 100 个同步粒子 | Canvas 渲染或降低数量 |
| 移动端启用 WebGL | 降级为 CSS 动画 |

### 5.3 目录规范

```
src/
├── assets/              # 静态资源源文件
├── components/
│   ├── ui/              # 基础 UI 组件（按钮、输入框、卡片）
│   ├── effects/         # 特效组件（粒子、动效）
│   │   ├── ParticleBackground.tsx
│   │   ├── CardReveal.tsx
│   │   ├── GlowBorder.tsx
│   │   └── ...
│   ├── layout/          # 布局组件
│   └── pages/           # 页面组件（原有）
├── hooks/
│   ├── useParticle.ts
│   ├── useMousePosition.ts
│   └── useReducedMotion.ts
├── themes/
│   ├── index.ts
│   ├── types.ts
│   ├── original.ts
│   ├── volantis.ts
│   └── dark.ts
├── constants/
│   └── assets.ts        # 资源引用常量（自动生成）
└── styles/
    └── global.css       # 全局样式（增强）
```

---

## 6. 交互增强专项分析

### 6.1 当前交互问题诊断

#### 问题分类图

```
游戏界面
├── 地图层 (MapGrid)
│   ├── 地块卡片 (TileCard)        ❓ 看不到效果描述
│   ├── 地块信息面板 (TileInspector)  ❌ 悬停才显示，当前地块反而看不到
│   ├── 墙壁交互按钮               ❓ 不够显眼
│   └── NPC 标记                  ⚠️ 可点击但视觉不够突出
│
├── 玩家HUD (PlayerHUD)
│   ├── 玩家头像    ❌ 无卡面立绘
│   ├── 属性条      ⚠️ 数值变化无动画
│   ├── 技能列表    ⚠️ 悬停反馈弱
│   └── 背包快捷    ⚠️ 新物品获取无提示
│
├── 弹窗系统
│   ├── TileInspector (地块详情)   ❌ 位置固定右侧，当前地块反而看不到
│   ├── PlayerInspectionModal      ⚠️ 入口太小（玩家头像点）
│   ├── InventoryModal             ⚠️ 物品使用/丢弃无视觉反馈
│   └── SkillTreeModal             ⚠️ 技能节点解锁无爆发动画
│
└── 全局反馈
    ├── FeedbackToast              ⚠️ 较弱
    ├── 回合切换全屏              ⚠️ 可以更震撼
    └── 伤害数字                  ❌ 静态显示，无飘散
```

#### 核心问题详解

---

##### 问题 A：地块效果"隐形"（最高优先级）

**现状：**
- `TileInspector` 组件负责显示地块的 description 和 effects
- 但它只在 **hover** 时显示，且位置固定在屏幕右侧
- 当玩家**站在**某地块上时，如果鼠标不在地块上，TileInspector 就显示"当前地块"之外的信息

**用户场景：**
```
玩家站在"图书馆"地块上
→ 想确认效果是什么（"在这里结束回合获得1点知识"）
→ 需要把鼠标移到地块上 → TileInspector 出现
→ 但鼠标移开后，TileCard 只有128x128px，无法显示完整信息
```

**根本原因：**
1. `TileCard` 太小（128x128），只显示 icon + name + edges
2. 当前地块信息没有独立的"常驻显示区"
3. hover 触发的是地图 wrapper 的 mouseEnter，容易被其他元素遮挡

**影响范围：** 所有地块，特别是有 buff/debuff/trigger 效果的房间

---

##### 问题 B：墙壁交互不直观

**现状：**
- 墙壁交互按钮（破坏墙壁）在 `TileCard` 的 `renderEdge` 中实现
- 按钮默认 `opacity-0`，hover 墙壁边缘时才出现
- 没有视觉线索告诉玩家"这里有墙可以交互"

**用户场景：**
```
玩家站在走廊里
→ 左边有一堵墙，可以破坏（需要镐或力量>5）
→ 但玩家不知道这堵墙可以交互
→ 除非鼠标精确悬停在墙壁那条细边上
```

**根本原因：**
- 没有"可交互墙"的视觉提示（dot、虚线、发光点）
- 按钮出现需要精确 hover，容易丢失

---

##### 问题 C：玩家 HUD 无角色立绘

**现状：**
- `PlayerHUD` 左侧头像是一个 `User` icon 的圆形容器
- 没有角色卡面/立绘的概念
- 单击头像也不会打开 `PlayerInspectionModal`

**用户场景：**
```
玩家想在游戏中看到自己角色的样子
→ 目前只能通过：
  a) 打开技能树（不显示立绘）
  b) 点击自己头像（PlayerHUD的不能点）
  c) 等待回合切换全屏动画
```

---

##### 问题 D：属性/技能变化无反馈

**现状：**
- 属性条（力量/速度/理智/知识）变化时，条长度直接跳变，无过渡动画
- 技能解锁时，节点直接变成"已解锁"状态，无动画
- 物品获得/丢失时，背包只显示数量变化

**影响：** 游戏反馈感弱，不够"爽"

---

##### 问题 E：伤害/检定结果不够震撼

**现状：**
- 骰子检定结果显示静态数字
- 战斗伤害只有数字，没有飘散动画
- 成功/失败只是简单的文字颜色变化

---

### 6.2 交互增强方案（按优先级排序）

#### Phase P0：修复"看不到"的核心问题

##### P0-1：TileCard 常驻信息显示

**目标：** 玩家当前所在地块的效果，必须随时可见

**方案 A：底部常驻信息栏（推荐）**
```
位置：屏幕底部中央（类似游戏 HUD）
内容：
  [地块图标] 图书馆
  "布满灰尘的书架上摆满了禁忌的知识。"
  📚 效果：如果你在这里结束回合，获得 1 点知识。
  
显示条件：只要有 activePlayer 且站在某地块上，就始终显示
交互：点击可打开完整 TileInspector（所有细节）
```

**方案 B：当前地块效果 Tooltip**
```
在玩家头像/回合指示器旁边增加一个小标签
"[地块名]: [效果描述摘要]"
悬停展开完整信息
```

##### P0-2：墙壁交互视觉提示

**目标：** 玩家站在地块上时，能一眼看出哪面墙可以交互

**方案：在 TileCard 边缘增加可交互墙指示器**

```tsx
// 改动 renderEdge，当玩家在当前地块且墙可破坏时：
{hasActivePlayer && edgeType === 'WALL' && (
  <div className={`absolute ${posClass} z-15`}>
    {/* 新增：常驻可交互指示 - 一个微微发光的小菱形 */}
    <div className="w-3 h-3 bg-amber-500/30 border border-amber-500 rotate-45 animate-pulse" />
  </div>
)}
```

这样玩家能看到"这里有东西可以交互"，悬停才显示完整按钮。

##### P0-3：点击 PlayerHUD 头像打开角色详情

**目标：** 让玩家能方便地查看自己角色的完整信息

**改动：** PlayerHUD 头像增加 `onClick` 打开 `PlayerInspectionModal`

---

#### Phase P1：增强交互反馈

##### P1-1：属性变化动画

```tsx
// AttributeRow 改动
// 数值变化时，数字有一个弹跳动画
// 进度条有一个平滑过渡（已有的 duration-500 保留）
// 新增：数值变化时有 +1/-1 的飘字提示
```

##### P1-2：物品获得/使用弹出提示

```tsx
// InventoryModal 或 useGameStore
// 新增物品时，右下角弹出一个图标飘入动画
// 使用物品时，物品图标向使用目标方向飘出
```

##### P1-3：技能树解锁动画

```tsx
// SkillTreeModal 改动
// 解锁节点时：节点发光 + 粒子爆发 + 连接线流光
```

---

#### Phase P2：体验优化

##### P2-1：伤害/检定数字飘散

```tsx
// CombatResolution 改动
// 伤害数字出现后向上飘散并淡出
// 数字有不同颜色（暴击=金，伤血=红，治疗=绿）
```

##### P2-2：骰子 3D 滚动动画增强

```tsx
// DiceRoller 改动
// 骰子有真实的 3D 旋转（而不只是随机数滚动）
// 0/1/2 面有不同光效（暗=0，微光=1，强光=2）
```

##### P2-3：回合切换全屏增强

```tsx
// FeedbackToast 改动
// 回合切换时：当前玩家头像从中心放大
// 背景有对应玩家颜色的光效渐变
```

---

### 6.3 新增组件清单

| 组件名 | 用途 | 优先级 |
|--------|------|--------|
| `TileInfoBar` | 底部常驻地块效果栏 | P0-1 |
| `InteractiveWallIndicator` | 可交互墙的视觉指示器 | P0-2 |
| `AttributeChangePopup` | 属性变化飘字 | P1-1 |
| `ItemGainPopup` | 物品获取/使用动画 | P1-2 |
| `SkillUnlockBurst` | 技能解锁粒子爆发 | P1-3 |
| `FloatingDamageNumber` | 伤害数字飘散 | P2-1 |
| `CharacterArtFrame` | 角色立绘展示框 | P0-3 |

---

### 6.4 资源需求

**美术资源（用户提供）：**
- 12 个角色的立绘/卡面（建议尺寸：512x768px，WebP 格式）
- 背景纹理图（可选，用于 HUD 区域）

**程序化替代方案（暂无素材时）：**
- 角色用程序生成的"卡面框"（CSS 实现，类似 tarot 卡样式）
- 使用 UI 样式的角色头像而不是写实图

---

## 7. 实现记录

### 7.1 P0 阶段已实现

| 任务 | 状态 | 组件 |
|------|------|------|
| P0-1 底部常驻地块信息栏 | ✅ 已实现 | `components/effects/TileInfoBar.tsx` |
| P0-2 地块信息始终可见 | ✅ 已实现 | TileInfoBar + TileInspector 协同 |
| P0-3 PlayerHUD 头像可点击 | ✅ 已实现 | `PlayerHUD.tsx` 头像 onClick |
| P0-4 图片占位符组件 | ✅ 已实现 | `components/effects/CardImage.tsx` |

### 7.2 新增组件说明

#### TileInfoBar（底部常驻地块信息栏）
- 位置：屏幕底部居中，z-index 45
- 显示：地块图标 + 名称 + 效果摘要（最多2项）
- 状态：高亮当前地块、悬停地块（pending/hover/current）
- 点击：聚焦到 TileInspector 显示完整详情

#### CardImage（图片占位符组件）
```tsx
// 三种尺寸
<CardImage src={url} size="portrait" />  // 288x432 角色立绘
<CardImage src={url} size="card" />      // 288x432 地块卡面
<CardImage src={url} size="thumbnail" /> // 128x128 缩略图

// 便捷组件
<CharacterPortrait src={character.portraitUrl} name={character.name} />
<TileCardImage src={tile.imageUrl} name={tile.name} />
<ThumbnailImage src={avatar} name="缩略图" rounded />
```

### 7.3 待实现 P0 任务

| 任务 | 状态 | 说明 |
|------|------|------|
| P0-5 墙壁可交互视觉指示器 | ⏳ 待实现 | 菱形发光点提示 |
| P0-6 完善 NPC 悬停/点击交互 | ⏳ 待实现 | 已有基础，增强提示 |

---

## 8. 待讨论事项

以下事项需要与你确认后再推进：

### 6.1 资源提供
- [ ] 人物卡面：你提到可以提供，具体是哪些角色？需要什么尺寸？
- [ ] 图标风格：扁平 or 彩色？是否有参考？
- [ ] 背景素材：是否需要程序化生成（如 CSS 渐变）作为临时替代？

### 6.2 技术选型
- [ ] Canvas vs CSS 粒子：Canvas 效果更好但实现复杂，优先哪种？
- [ ] GSAP vs Framer Motion：项目已装 Framer Motion，GSAP 是否需要引入？
- [ ] WebGL/Three.js：是否有 3D 场景需求？

### 6.3 优先级
- [ ] 三个页面（登录、游戏选择、游戏界面）优先级排序？
- [ ] 特效 vs 资源管理，哪个先做？

---

## 7. 文档更新记录

| 版本 | 日期 | 修改内容 | 作者 |
|------|------|---------|------|
| v0.1.0 | 2026-03-31 | 初始规划文档 | Sifere |
