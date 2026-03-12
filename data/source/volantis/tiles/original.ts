// 翁法罗斯主题 - 地图卡数据 (迭代版)
// 新增：进入/离开检定、互动效果
// Volantis Map Cards

export const TILES_DATA = [
  // ==================== 奥赫玛城区 ====================
  {
    "id": "vol_tile_auremae_plaza",
    "name": "奥赫玛中心广场",
    "description": "黄金裔的骄傲，永恒之地最繁华的广场。中央矗立着创世之碑。",
    "type": "room",
    "floors": ["GROUND"],
    "edges": { "N": "OPEN", "S": "OPEN", "E": "OPEN", "W": "OPEN" },
    "icon": "Crown",
    "cardSymbol": "NONE",
    "effects": [
      { "type": "buff", "text": "所有属性+1" }
    ]
  },
  {
    "id": "vol_tile_golden_gate",
    "name": "黄金门",
    "description": "通往奥赫玛的宏伟入口，门上镶嵌着永恒的黄金。",
    "type": "room",
    "floors": ["GROUND"],
    "edges": { "N": "OPEN", "S": "WALL", "E": "OPEN", "W": "OPEN" },
    "icon": "Gate",
    "cardSymbol": "NONE",
    "effects": [
      { "type": "buff", "text": "力量+1" }
    ]
  },
  {
    "id": "vol_tile_temple_light",
    "name": "光辉神庙",
    "description": "供奉黄金裔诸神的圣地，沐浴在永恒的光辉中。",
    "type": "room",
    "floors": ["GROUND"],
    "edges": { "N": "WALL", "S": "OPEN", "E": "WALL", "W": "OPEN" },
    "icon": "Temple",
    "cardSymbol": "OMEN",
    "onEnter": {
      "type": "ATTRIBUTE_CHECK",
      "attribute": "knowledge",
      "difficulty": 3,
      "success": [
        { "type": "modify_stat", "attribute": "knowledge", "amount": 1, "message": "你获得了神的启示！" }
      ],
      "failure": []
    }
  },
  {
    "id": "vol_tile_market_square",
    "name": "集市广场",
    "description": "商贩云集的热闹场所，你可以在这里交易物品。",
    "type": "room",
    "floors": ["GROUND"],
    "edges": { "N": "OPEN", "S": "OPEN", "E": "OPEN", "W": "WALL" },
    "icon": "Store",
    "cardSymbol": "NONE",
    "interact": {
      "type": "TRADE",
      "description": "与任意玩家交换1件物品"
    }
  },
  {
    "id": "vol_tile_guild_hall",
    "name": "冒险者公会",
    "description": "佣兵与冒险者聚集的地方，任务公告板贴满了委托。",
    "type": "room",
    "floors": ["GROUND", "UPPER"],
    "edges": { "N": "OPEN", "S": "WALL", "E": "OPEN", "W": "OPEN" },
    "icon": "Scroll",
    "cardSymbol": "NONE",
    "onEnter": {
      "type": "DRAW_CARD",
      "deck": "SKILL",
      "message": "你获得了一张技能卡！"
    }
  },
  {
    "id": "vol_tile_narrow_alley",
    "name": "狭窄巷弄",
    "description": "奥赫玛错综复杂的小巷，是盗贼的藏身之所。",
    "type": "corridor",
    "floors": ["GROUND"],
    "edges": { "N": "OPEN", "S": "WALL", "E": "OPEN", "W": "OPEN" },
    "icon": "Dagger",
    "cardSymbol": "NONE",
    "onEnter": {
      "type": "ATTRIBUTE_CHECK",
      "attribute": "speed",
      "difficulty": 3,
      "success": [],
      "failure": [
        { "type": "modify_stat", "attribute": "speed", "amount": -1, "message": "你被陷阱绊倒，速度降低！" }
      ]
    }
  },
  {
    "id": "vol_tile_warehouse",
    "name": "仓库区",
    "description": "堆满货物与箱子的Storage区域，偶尔有珍贵物品。",
    "type": "room",
    "floors": ["GROUND"],
    "edges": { "N": "OPEN", "S": "OPEN", "E": "WALL", "W": "WALL" },
    "icon": "Box",
    "cardSymbol": "ITEM",
    "effects": []
  },

  // ==================== 永火试炼 ====================
  {
    "id": "vol_tile_eternal_flame",
    "name": "永恒烈焰",
    "description": "永不熄灭的神圣火焰，据说蕴含创世之力。",
    "type": "room",
    "floors": ["GROUND"],
    "edges": { "N": "OPEN", "S": "WALL", "E": "OPEN", "W": "OPEN" },
    "icon": "Flame",
    "cardSymbol": "OMEN",
    "onEnter": {
      "type": "ATTRIBUTE_CHECK",
      "attribute": "sanity",
      "difficulty": 4,
      "success": [
        { "type": "modify_stat", "attribute": "might", "amount": 2, "message": "火焰之力与你共鸣！" }
      ],
      "failure": [
        { "type": "modify_stat", "attribute": "sanity", "amount": -2, "message": "火焰灼烧着你的理智！" }
      ]
    }
  },
  {
    "id": "vol_tile_phoenix_nest",
    "name": "凤凰巢穴",
    "description": "神鸟凤凰的栖息地，充满了生命的火焰。",
    "type": "room",
    "floors": ["GROUND"],
    "edges": { "N": "OPEN", "S": "OPEN", "E": "WALL", "W": "WALL" },
    "icon": "Phoenix",
    "cardSymbol": "OMEN",
    "onEnter": {
      "type": "ATTRIBUTE_CHECK",
      "attribute": "sanity",
      "difficulty": 5,
      "success": [
        { "type": "heal", "amount": 999, "message": "你获得了凤凰的祝福，完全恢复！" }
      ],
      "failure": [
        { "type": "modify_stat", "attribute": "sanity", "amount": -1, "message": "你被火焰灼伤！" }
      ]
    },
    "onLeave": {
      "type": "ATTRIBUTE_CHECK",
      "attribute": "speed",
      "difficulty": 4,
      "success": [],
      "failure": [
        { "type": "damage", "amount": 1, "message": "凤凰之火在你离开时灼伤了你！" }
      ]
    }
  },
  {
    "id": "vol_tile_molten_river",
    "name": "熔岩河流",
    "description": "炽热的熔岩流动形成的河流，温度足以融化金属。",
    "type": "corridor",
    "floors": ["GROUND"],
    "edges": { "N": "WALL", "S": "OPEN", "E": "OPEN", "W": "OPEN" },
    "icon": "Lava",
    "cardSymbol": "OMEN",
    "effects": [],
    "interact": {
      "type": "CROSS",
      "difficulty": 4,
      "attribute": "speed",
      "successMessage": "你轻盈地跳过熔岩！",
      "failureMessage": "你被烫伤了！"
    }
  },

  // ==================== 冥潭 ====================
  {
    "id": "vol_tile_river_styx",
    "name": "冥河斯堤克斯",
    "description": "连接生与死的河流，据说渡过此河将遗忘一切。",
    "type": "corridor",
    "floors": ["GROUND"],
    "edges": { "N": "OPEN", "S": "OPEN", "E": "WALL", "W": "WALL" },
    "icon": "River",
    "cardSymbol": "OMEN",
    "onEnter": {
      "type": "ATTRIBUTE_CHECK",
      "attribute": "sanity",
      "difficulty": 5,
      "success": [
        { "type": "special", "effect": "communicate_ghost", "message": "你听见了亡者的低语！" }
      ],
      "failure": [
        { "type": "modify_stat", "attribute": "sanity", "amount": -2, "message": "河水带走了你的记忆！" }
      ]
    }
  },
  {
    "id": "vol_tile_shadow_realm",
    "name": "暗影领域",
    "description": "永远被黑暗笼罩的区域，视线所及只有阴影。",
    "type": "room",
    "floors": ["GROUND"],
    "edges": { "N": "OPEN", "S": "OPEN", "E": "OPEN", "W": "WALL" },
    "icon": "Moon",
    "cardSymbol": "OMEN",
    "onEnter": {
      "type": "ATTRIBUTE_CHECK",
      "attribute": "sanity",
      "difficulty": 4,
      "success": [
        { "type": "special", "effect": "stealth", "amount": 2, "message": "你融入了黑暗！" }
      ],
      "failure": [
        { "type": "modify_stat", "attribute": "speed", "amount": -2, "message": "黑暗让你迷失了方向！" }
      ]
    }
  },
  {
    "id": "vol_tile_crypt",
    "name": "地下墓穴",
    "description": "安葬亡者的墓穴，墙壁上刻满了往者的名讳。",
    "type": "room",
    "floors": ["GROUND", "UPPER"],
    "edges": { "N": "WALL", "S": "OPEN", "E": "OPEN", "W": "OPEN" },
    "icon": "Tomb",
    "cardSymbol": "OMEN",
    "onEnter": {
      "type": "DRAW_CARD",
      "deck": "OMEN",
      "message": "你在墓穴中发现了一张灾祸卡！"
    }
  },
  {
    "id": "vol_tile_lake_mirror",
    "name": "镜之湖",
    "description": "平静如镜的湖面，能映照出人内心最深处的恐惧。",
    "type": "room",
    "floors": ["GROUND"],
    "edges": { "N": "OPEN", "S": "OPEN", "E": "OPEN", "W": "OPEN" },
    "icon": "Mirror",
    "cardSymbol": "OMEN",
    "interact": {
      "type": "MIRROR",
      "description": "投入湖中查看自己的命运",
      "effects": [
        { "type": "reveal_trail" },
        { "type": "modify_stat", "attribute": "sanity", "amount": -1 }
      ]
    }
  },

  // ==================== 黑潮区域 ====================
  {
    "id": "vol_tile_black_tide",
    "name": "黑潮边缘",
    "description": "被黑潮侵蚀的边界地带，一切都被黑暗吞噬。",
    "type": "corridor",
    "floors": ["GROUND"],
    "edges": { "N": "OPEN", "S": "WALL", "E": "OPEN", "W": "OPEN" },
    "icon": "Waves",
    "cardSymbol": "OMEN",
    "onEnter": {
      "type": "ATTRIBUTE_CHECK",
      "attribute": "knowledge",
      "difficulty": 4,
      "success": [],
      "failure": [
        { "type": "modify_stat", "attribute": "might", "amount": -1 },
        { "type": "modify_stat", "attribute": "speed", "amount": -1 },
        { "type": "modify_stat", "attribute": "sanity", "amount": -1 },
        { "type": "modify_stat", "attribute": "knowledge", "amount": -1, "message": "黑潮侵蚀了你！" }
      ]
    }
  },
  {
    "id": "vol_tile_void_entrance",
    "name": "虚空入口",
    "description": "通往虚空中 的裂缝，隐约可见另一边的景象。",
    "type": "room",
    "floors": ["GROUND"],
    "edges": { "N": "OPEN", "S": "OPEN", "E": "WALL", "W": "OPEN" },
    "icon": "Void",
    "cardSymbol": "OMEN",
    "onEnter": {
      "type": "ATTRIBUTE_CHECK",
      "attribute": "sanity",
      "difficulty": 6,
      "success": [
        { "type": "special", "effect": "void_sight", "message": "你看见了虚空彼端的景象！" }
      ],
      "failure": [
        { "type": "modify_stat", "attribute": "sanity", "amount": -2, "message": "虚空正在吞噬你！" }
      ]
    },
    "interact": {
      "type": "TELEPORT",
      "destination": "any_revealed",
      "description": "通过虚空传送"
    }
  },
  {
    "id": "vol_tile_abyss_watchtower",
    "name": "深渊瞭望塔",
    "description": "为监视黑潮而建的塔楼，如今已废弃。",
    "type": "room",
    "floors": ["GROUND", "UPPER"],
    "edges": { "N": "OPEN", "S": "WALL", "E": "WALL", "W": "OPEN" },
    "icon": "Tower",
    "cardSymbol": "NONE",
    "interact": {
      "type": "REVEAL_MAP",
      "description": "观察全局，发现所有未探索区域",
      "effects": [
        { "type": "reveal_all" },
        { "type": "modify_stat", "attribute": "knowledge", "amount": 1 }
      ]
    }
  },

  // ==================== 泰坦遗迹 ====================
  {
    "id": "vol_tile_titan_forge",
    "name": "泰坦锻铁炉",
    "description": "泰坦族打造的巨型锻造炉，至今仍有余温。",
    "type": "room",
    "floors": ["GROUND"],
    "edges": { "N": "OPEN", "S": "OPEN", "E": "WALL", "W": "WALL" },
    "icon": "Hammer",
    "cardSymbol": "ITEM",
    "interact": {
      "type": "FORGE",
      "description": "锻造一件传奇武器",
      "condition": { "op": "GT", "stat": "knowledge", "value": 4 },
      "effects": [
        { "type": "gain_item", "tier": "legendary" }
      ]
    }
  },
  {
    "id": "vol_tile_mechanism_hall",
    "name": "机械大厅",
    "description": "泰坦族留下的自动机械仍在运转。",
    "type": "room",
    "floors": ["GROUND", "UPPER"],
    "edges": { "N": "OPEN", "S": "OPEN", "E": "OPEN", "W": "WALL" },
    "icon": "Gear",
    "cardSymbol": "EVENT",
    "effects": []
  },

  // ==================== 特殊区域 ====================
  {
    "id": "vol_tile_time_distortion",
    "name": "时间扭曲区",
    "description": "时间流动异常的区域，过去与未来交错。",
    "type": "corridor",
    "floors": ["GROUND"],
    "edges": { "N": "OPEN", "S": "OPEN", "E": "OPEN", "W": "OPEN" },
    "icon": "Clock",
    "cardSymbol": "OMEN",
    "onEnter": {
      "type": "RANDOM_EVENT",
      "possibilities": [
        { "type": "modify_stat", "attribute": "might", "amount": 1, "weight": 1 },
        { "type": "modify_stat", "attribute": "speed", "amount": 1, "weight": 1 },
        { "type": "modify_stat", "attribute": "sanity", "amount": 1, "weight": 1 },
        { "type": "modify_stat", "attribute": "knowledge", "amount": 1, "weight": 1 },
        { "type": "modify_stat", "attribute": "might", "amount": -1, "weight": 1 },
        { "type": "modify_stat", "attribute": "speed", "amount": -1, "weight": 1 }
      ]
    },
    "interact": {
      "type": "TIME_REWIND",
      "description": "回溯时间",
      "cost": { "type": "sanity", "amount": 2 },
      "effects": [
        { "type": "reroll_initiative" }
      ]
    }
  },
  {
    "id": "vol_tile_library_ancient",
    "name": "古老图书馆",
    "description": "收藏着无数古老知识的图书馆，部分书籍已石化。",
    "type": "room",
    "floors": ["GROUND", "UPPER"],
    "edges": { "N": "WALL", "S": "OPEN", "E": "OPEN", "W": "OPEN" },
    "icon": "Book",
    "cardSymbol": "EVENT",
    "onEnter": {
      "type": "ATTRIBUTE_CHECK",
      "attribute": "knowledge",
      "difficulty": 4,
      "success": [
        { "type": "modify_stat", "attribute": "knowledge", "amount": 2, "message": "你获得了古老的知识！" }
      ],
      "failure": [
        { "type": "modify_stat", "attribute": "knowledge", "amount": 1, "message": "你勉强看懂了一些内容。" }
      ]
    }
  },
  {
    "id": "vol_tile_starry_observatory",
    "name": "星空观测台",
    "description": "用于观测星空的高台，可以看到永恒之地的全貌。",
    "type": "room",
    "floors": ["UPPER"],
    "edges": { "N": "OPEN", "S": "WALL", "E": "WALL", "W": "OPEN" },
    "icon": "Star",
    "cardSymbol": "OMEN",
    "interact": {
      "type": "DIVINATION",
      "description": "预知下一个事件",
      "effects": [
        { "type": "reveal_next_event" },
        { "type": "modify_stat", "attribute": "knowledge", "amount": 1 }
      ]
    }
  },
  {
    "id": "vol_tile_portal_chamber",
    "name": "传送门室",
    "description": "古代留下的传送门，部分仍可使用。",
    "type": "room",
    "floors": ["GROUND"],
    "edges": { "N": "OPEN", "S": "OPEN", "E": "WALL", "W": "WALL" },
    "icon": "Portal",
    "cardSymbol": "EVENT",
    "interact": {
      "type": "TELEPORT",
      "destination": "any_revealed",
      "description": "使用传送门",
      "cost": { "type": "sanity", "amount": 1 }
    }
  },
  {
    "id": "vol_tile_dragon_lair",
    "name": "巨龙巢穴",
    "description": "昔日巨龙的栖息地，堆满了金银珠宝。",
    "type": "room",
    "floors": ["GROUND"],
    "edges": { "N": "WALL", "S": "OPEN", "E": "WALL", "W": "OPEN" },
    "icon": "Dragon",
    "cardSymbol": "ITEM",
    "onEnter": {
      "type": "DRAW_CARD",
      "deck": "ITEM",
      "count": 3,
      "message": "你在巨龙巢穴中发现了宝藏！"
    }
  },
  {
    "id": "vol_tile_sacred_spring",
    "name": "神圣之泉",
    "description": "传说中诸神沐浴的泉水，具有治愈之力。",
    "type": "room",
    "floors": ["GROUND"],
    "edges": { "N": "OPEN", "S": "OPEN", "E": "OPEN", "W": "WALL" },
    "icon": "Droplets",
    "cardSymbol": "NONE",
    "interact": {
      "type": "HEAL",
      "description": "在泉水中沐浴",
      "effects": [
        { "type": "heal", "amount": 999 },
        { "type": "modify_stat", "attribute": "sanity", "amount": 1 }
      ]
    }
  }
];
