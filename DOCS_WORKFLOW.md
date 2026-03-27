# 🛠️ Mansion Protocol 开发工作流指南

> ⚠️ **更新 (2026-03-27)**: 数据系统已重构，请参考本文档最新结构。

---

## 1. 目录结构

游戏数据位于 `data/source/` 目录下，按**主题**组织：

```
PFMansion/
├── data/
│   └── source/
│       ├── index.ts              # 统一数据入口
│       ├── original/             # 原版主题
│       │   ├── characters/
│       │   ├── tiles/
│       │   ├── items/
│       │   ├── events/
│       │   ├── omens/
│       │   ├── scenarios/
│       │   └── skills/
│       └── volantis/             # 翁法罗斯主题
│           ├── characters/
│           ├── tiles/
│           ├── items/
│           ├── events/
│           ├── omens/
│           └── scenarios/
├── raw_data/                     # (已弃用) 旧版策划工作区
├── scripts/                      # 构建脚本
└── game/                         # 后端 Go 代码
```

### 主题说明

| 主题 | ID | 说明 |
|------|-----|------|
| 原版 | `original` | 经典山屋惊魂风格 |
| 翁法罗斯 | `volantis` | 崩坏星穹铁道 - 永恒之地 |

---

## 2. 添加新内容

### 2.1 角色
创建/编辑 `data/source/[主题]/characters/original.ts`：

```typescript
export const CHARACTERS_DATA = [
  {
    id: "char_new_character",
    name: "新角色名",
    description: "角色描述...",
    traits: ["特质1", "特质2"],
    attributes: {
      might: { current: 2, max: 6 },
      speed: { current: 2, max: 6 },
      sanity: { current: 3, max: 6 },
      knowledge: { current: 3, max: 6 }
    }
  }
];
```

### 2.2 道具
创建/编辑 `data/source/[主题]/items/original.ts`：

**数组格式** (推荐):
```typescript
export const ITEMS_DATA = [
  {
    id: "item_new_weapon",
    name: "新武器",
    type: "WEAPON",
    usage: {
      actionLabel: "使用",
      target: "OPPONENT",
      effects: [
        { type: "DAMAGE", target: { type: "SELECTED_PARTNER" }, amount: 2 }
      ]
    }
  }
];
```

### 2.3 事件
创建/编辑 `data/source/[主题]/events/original.ts`：

```typescript
export const EVENTS_DATA = [
  {
    id: "event_new_event",
    type: "EVENT",
    title: "新事件标题",
    description: "事件描述...",
    interaction: {
      type: "CHOICE", // 或 "ATTRIBUTE_CHECK"
      options: [
        {
          label: "选项1",
          effects: [
            { type: "MODIFY_STAT", target: { type: "SELF" }, stat: "might", amount: -1 }
          ]
        }
      ]
    }
  }
];
```

---

## 3. 代码规范

### 3.1 命名规范

| 类型 | 命名格式 | 示例 |
|------|----------|------|
| 角色ID | `char_[名称]` | `char_priest`, `char_vampire` |
| 道具ID | `item_[名称]` | `item_revolver`, `item_dagger` |
| 事件ID | `event_[名称]` | `event_mysterious_altar` |
| 剧本ID | `scenario_[名称]` | `scenario_haunted_mirror` |
| 翁法罗斯ID | `[前缀]_[类型]_[名称]` | `vol_weapon_spear_athena` |

### 3.2 数据格式

- **Characters**: 数组格式 ✅
- **Tiles**: 数组格式 ✅
- **Items**: 原版=对象, 翁法罗斯=数组
- **Events**: 原版=对象, 翁法罗斯=数组
- **Omens**: 原版=对象, 翁法罗斯=数组

---

## 4. 前后端数据流

```
data/source/
    │
    ├── frontend (React)
    │       └── import { CHARACTERS_DATA } from './data/source'
    │
    └── backend (Go)
            └── game/data.go (独立定义)
```

> ⚠️ 前后端数据结构独立定义，存在一定重复。长期规划使用 protobuf 或 JSON Schema 统一。

---

## 5. 脚本工具

### 5.1 数据同步脚本
位于 `scripts/` 目录：

| 脚本 | 说明 |
|------|------|
| `generate_assets.js` | 生成资源文件 (已弃用) |
| `generateDataIndex.js` | 生成数据索引 |
| `sync_data.cjs` | Node.js 数据同步 |
| `sync_data.py` | Python 数据同步 |

### 5.2 运行项目
```bash
# 前端开发
npm run dev

# 后端构建
go build -o mansion-server server.go

# 一键启动 (使用 start.sh)
./start.sh
```

---

## 6. 常见问题

### Q: 在哪里添加新角色？
A: 编辑对应主题的 `data/source/[theme]/characters/original.ts`

### Q: 道具格式应该用对象还是数组？
A: 
- 原版主题: 使用**对象格式** `{ "item_id": {...} }`
- 翁法罗斯主题: 使用**数组格式** `[{ id: "item_id", ... }]`

### Q: 如何添加新的主题？
A:
1. 在 `data/source/` 下创建新主题目录
2. 在 `data/source/index.ts` 中添加导入和导出
3. 在 `THEMES` 数组中注册主题

### Q: raw_data/ 目录还能用吗？
A: ❌ 已弃用。请直接编辑 `data/source/` 下的 TypeScript 文件。
