
# 🛠️ Mansion Protocol 策划工作流指南

本文档介绍如何使用 `raw_data` 系统来管理和扩展游戏内容。

## 1. 架构说明

为了支持多人协作和模块化设计，我们将游戏数据（角色、物品、事件等）从代码中剥离，存放在 `raw_data/` 目录下。
通过运行 `scripts/generate_assets.js` 脚本，这些分散的 JSON 文件会被自动合并并编译为前端代码 (`data/source/*.ts`)。

*   **raw_data/**: 策划工作区。你可以创建任意多个 JSON 文件，脚本会自动扫描。
*   **data/source/**: 自动生成的代码文件。**请勿手动修改此文件夹下的文件**，因为它们会在下次构建时被覆盖。

## 2. 目录结构

```
raw_data/
├── characters/     (存放角色定义，数组格式)
│   ├── base_characters.json
│   ├── dlc_vampires.json
│   └── ...
├── items/          (存放物品定义，对象格式 key-value)
│   ├── base_items.json
│   ├── weapons.json
│   └── ...
├── tiles/          (地图块)
├── events/         (随机事件)
├── skills/         (技能逻辑)
└── scenarios/      (剧本)
```

## 3. 如何添加新内容

假设你想添加一把新武器：

1.  进入 `raw_data/items/` 目录。
2.  你可以直接修改 `base_items.json`，或者创建一个新文件（例如 `my_new_weapons.json`）。
3.  在新文件中遵循 JSON 格式编写内容：
    ```json
    {
      "item_laser_gun": {
        "id": "item_laser_gun",
        "name": "激光枪",
        "type": "WEAPON",
        ...
      }
    }
    ```
4.  保存文件。

## 4. 应用更改 (编译)

在终端中运行以下命令来应用你的更改：

```bash
node scripts/generate_assets.js
```

如果看到以下输出，说明操作成功：
```
--- Starting Asset Generation ---
[INFO] Reading 2 files from items...
[SUCCESS] Generated items.ts
...
--- Generation Complete ---
```

现在，刷新浏览器，你的新内容已经生效了！

## 5. 合并规则

*   **数组类型 (Array)**: 角色 (`characters`) 和 地图块 (`tiles`)。
    *   所有文件中的数组会被连接在一起 (`[...FileA, ...FileB]`)。
*   **对象类型 (Object)**: 物品、事件、技能、剧本。
    *   所有文件中的对象属性会被合并 (`{...FileA, ...FileB}`)。
    *   **注意**：如果有相同的 ID (Key)，后加载的文件会覆盖先加载的文件。

## 6. 常见错误

*   **JSON 语法错误**：如果在运行脚本时报错 `SyntaxError`，请检查 JSON 文件是否遗漏了逗号或引号。
*   **类型不匹配**：不要在 `characters/` 目录下放置 Object 格式的 JSON，也不要在 `items/` 下放置 Array 格式的 JSON。脚本会跳过格式错误的文件并发出警告。
