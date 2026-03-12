
export const TILES_DATA = [
  {
    "id": "tile_hallway",
    "name": "嘎吱作响的走廊",
    "description": "地板在你脚下发出阵阵呻吟。",
    "type": "corridor",
    "floors": ["GROUND", "UPPER"],
    "edges": { "N": "OPEN", "S": "OPEN", "E": "WALL", "W": "WALL" },
    "icon": "Footprints"
  },
  {
    "id": "tile_library",
    "name": "布满灰尘的图书馆",
    "description": "这里的书架上摆满了禁忌的知识。",
    "type": "room",
    "floors": ["GROUND", "UPPER"],
    "edges": { "N": "WALL", "S": "OPEN", "E": "OPEN", "W": "WALL" },
    "icon": "Book",
    "cardSymbol": "OMEN",
    "effects": [
      { "type": "buff", "text": "如果你在这里结束回合，获得 1 点知识。" }
    ]
  },
  {
    "id": "tile_conservatory",
    "name": "温室",
    "description": "枯死的植物像抓取的手指一样从天花板垂下。",
    "type": "room",
    "floors": ["GROUND"],
    "edges": { "N": "OPEN", "S": "WALL", "E": "WALL", "W": "WALL" },
    "icon": "Trees",
    "cardSymbol": "OMEN"
  },
  {
    "id": "tile_kitchen",
    "name": "厨房",
    "description": "腐烂的气味扑面而来。",
    "type": "room",
    "floors": ["GROUND", "BASEMENT"],
    "edges": { "N": "OPEN", "S": "WALL", "E": "WALL", "W": "OPEN" },
    "icon": "Utensils",
    "cardSymbol": "OMEN",
    "effects": [
      { "type": "debuff", "text": "进入时理智 -1。" }
    ]
  },
  {
    "id": "tile_chapel",
    "name": "废弃礼拜堂",
    "description": "彩绘玻璃窗上描绘着扭曲的圣徒。",
    "type": "room",
    "floors": ["GROUND", "UPPER"],
    "edges": { "N": "OPEN", "S": "OPEN", "E": "WALL", "W": "WALL" },
    "icon": "Church",
    "cardSymbol": "OMEN",
    "effects": [
      { "type": "buff", "text": "理智 +1" }
    ]
  },
  {
    "id": "tile_gymnasium",
    "name": "体育馆",
    "description": "到处散落着陈旧的运动器材。",
    "type": "room",
    "floors": ["GROUND", "BASEMENT"],
    "edges": { "N": "WALL", "S": "WALL", "E": "OPEN", "W": "OPEN" },
    "icon": "Dumbbell",
    "cardSymbol": "ITEM",
    "effects": [
      { "type": "buff", "text": "每局游戏限一次，获得 1 点速度。" }
    ]
  },
  {
    "id": "tile_vault",
    "name": "金库",
    "description": "一道沉重的钢门虚掩着。",
    "type": "room",
    "floors": ["BASEMENT"],
    "edges": { "N": "OPEN", "S": "WALL", "E": "WALL", "W": "WALL" },
    "icon": "Lock",
    "eventTrigger": "event_vault_chest",
    "effects": [
      { "type": "trigger", "text": "必须通过 力量 3+ 检定才能打开宝箱。" }
    ]
  },
  {
    "id": "tile_basement_landing",
    "name": "地下室平台",
    "description": "这里又冷又湿。",
    "type": "special",
    "floors": ["BASEMENT"],
    "edges": { "N": "OPEN", "S": "OPEN", "E": "OPEN", "W": "OPEN" },
    "icon": "ArrowDown"
  }
];
