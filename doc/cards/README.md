# PF 项目卡牌设计文档

> 本目录用于管理 PF 项目的各种卡牌设计主题。

---

## 目录结构

```
doc/cards/
├── README.md              # 本文件
├── original/              # 原版主题（测试版）
│   ├── characters.ts      # 人物卡
│   ├── items.ts           # 物品卡
│   ├── tiles.ts           # 地图卡
│   ├── events.ts          # 事件卡
│   ├── omens.ts           # 灾祸卡
│   ├── skills.ts          # 技能定义
│   ├── scenarios.ts       # 剧本定义
│   └── skillTrees.ts     # 技能树
├── theme_example/         # 主题示例（未来）
│   └── ...
└── ...
```

---

## 主题说明

### original - 原版主题

当前测试版本使用的主题，模仿经典桌游《山屋惊魂》(Betrayal at House on the Hill) 的基础设定。

**包含内容：**
- 4 名可选角色
- 基础物品与武器
- 大宅地图地块
- 随机事件
- 4 个剧本（闹鬼事件）
- 2 个技能树

---

## 如何添加新主题

1. 在 `doc/cards/` 下创建新主题目录，如 `theme_xxx/`
2. 复制 `original/` 中的文件作为模板
3. 根据设计需求修改内容
4. 在项目中更新数据引用

---

## 主题设计规范

详见上级目录的文档：
- [卡牌设计范式](../card-design-paradigm.md)
- [规则引擎能力](../logic-engine-capabilities.md)

---

*最后更新：2026-03-12*
