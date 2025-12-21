# 🚀 Mansion Protocol 部署与调试指南

## 1. 运行环境要求
本项目基于现代 ESM (ES Modules) 架构，无需复杂的构建步骤即可在浏览器中直接运行。

*   **浏览器支持**：Chrome 110+, Edge 110+, Safari 16.4+ (必须支持 `importmap`)。
*   **本地服务器**：由于浏览器安全限制（CORS），建议使用简单的静态服务器运行。
    *   VS Code 用户：安装 `Live Server` 扩展。
    *   Node.js 用户：执行 `npx serve .` 或 `npm install -g serve`。

## 2. 快速启动
1.  确保 `index.html`, `index.tsx`, `store/` 等文件处于同一根目录下。
2.  通过本地静态服务器打开 `index.html`。
3.  系统将自动通过 `importmap` 加载 React、Zustand 和 Framer Motion。

## 3. 调试工具与技巧

### 3.1 叙事日志 (Narrative Log)
HUD 右侧底部的“叙事日志”实时记录了游戏内的所有底层逻辑活动：
*   **[Info]**：回合切换、玩家移动、常规指令。
*   **[Alert]**：属性伤害、致命判定、作祟触发。
*   **[Logic]**：JSON-Logic DSL 引擎执行的每一步详情。

### 3.2 调试专用按钮
在页面左上角，项目内置了一个 **"调试: 触发作祟" (Debug: Force Haunt)** 按钮：
*   **功能**：无视预兆检定结果，强制中断探索阶段，直接根据当前最后一张预兆牌触发剧本分配逻辑。
*   **用途**：用于快速测试叛徒揭晓流程 (`HauntReveal`) 和剧本特定能力。

### 3.3 状态检查
由于使用了 **Zustand**，你可以在浏览器控制台中访问游戏状态：
```javascript
// 如果你已在 store 中导出 state 到 window (可选)
// 否则建议直接在 HUD 观察数值变化
```

## 4. 常见问题处理
*   **地块重叠**：移动逻辑已内置碰撞检测，如果发现地块重叠，请检查 `movePlayer` 中的 `targetKey` 生成逻辑。
*   **资源加载**：如果 Lucide 图标显示不全，请确保网络连接正常以访问 CDN。
