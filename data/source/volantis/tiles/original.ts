// 翁法罗斯主题 - 地图卡数据 (迭代版)
// 新增：进入/离开检定、互动效果
// Volantis Map Cards

export const TILES_DATA = [
  {
  "id": "vol_tile_abyss",
  "name": "无尽深渊",
  "description": "世界的边缘，虚空在此与现实交汇。",
  "type": "room",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "WALL",
    "S": "WALL",
    "E": "WALL",
    "W": "OPEN"
  },
  "cardSymbol": "OMEN",
  "eventTrigger": "vol_event_abyss_gaze",
  "onEnterEffects": [
    {
      "type": "MODIFY_STAT",
      "stat": "sanity",
      "amount": -3,
      "message": "深渊的呼唤让你几近疯狂，理智 -3"
    }
  ]
},
{
  "id": "vol_tile_abyss_watchtower",
  "name": "深渊瞭望塔",
  "description": "为监视黑潮而建的塔楼，如今已废弃。",
  "type": "room",
  "floors": [
    "GROUND",
    "UPPER"
  ],
  "edges": {
    "N": "OPEN",
    "S": "WALL",
    "E": "WALL",
    "W": "OPEN"
  },
  "icon": "Tower",
  "cardSymbol": "NONE",
  "interact": {
    "type": "REVEAL_MAP",
    "description": "观察全局，发现所有未探索区域",
    "effects": [
      {
        "type": "MODIFY_STAT",
        "stat": "knowledge",
        "amount": 1
      }
    ]
  }
},
{
  "id": "vol_tile_ancient_arena",
  "name": "远古斗技场",
  "description": "比永火竞技场更古老的斗技场，残存着远古战士的英魂。",
  "type": "room",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "WALL",
    "S": "OPEN",
    "E": "WALL",
    "W": "WALL"
  },
  "cardSymbol": "EVENT",
  "eventTrigger": "vol_event_ancient_warrior",
  "onEnterEffects": [
    {
      "type": "MODIFY_STAT",
      "stat": "might",
      "amount": 1,
      "message": "远古战士的英魂激励着你，力量 +1"
    }
  ]
},
{
  "id": "vol_tile_archive_eternity",
  "name": "永恒档案馆",
  "description": "记载着永恒之地所有历史的宏伟建筑。",
  "type": "room",
  "floors": [
    "GROUND",
    "UPPER"
  ],
  "edges": {
    "N": "WALL",
    "S": "OPEN",
    "E": "WALL",
    "W": "WALL"
  },
  "cardSymbol": "ITEM",
  "onEnterEffects": [
    {
      "type": "MODIFY_STAT",
      "stat": "knowledge",
      "amount": 2,
      "message": "档案馆的浩瀚知识让你受益匪浅，知识 +2"
    }
  ]
},
{
  "id": "vol_tile_arena",
  "name": "永火竞技场",
  "description": "昔日的荣耀战场，如今只剩下回响的欢呼声。",
  "type": "room",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "OPEN",
    "S": "OPEN",
    "E": "WALL",
    "W": "WALL"
  },
  "cardSymbol": "EVENT",
  "eventTrigger": "vol_event_arena_spirit",
  "onEnterEffects": [
    {
      "type": "MODIFY_STAT",
      "stat": "might",
      "amount": 1,
      "message": "竞技场的余勇让你血脉喷张，力量 +1"
    }
  ]
},
{
  "id": "vol_tile_auremae_plaza",
  "name": "奥赫玛中心广场",
  "description": "黄金裔的骄傲，永恒之地最繁华的广场。中央矗立着创世之碑。",
  "type": "room",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "OPEN",
    "S": "OPEN",
    "E": "OPEN",
    "W": "OPEN"
  },
  "cardSymbol": "NONE",
  "onEnterEffects": [
    {
      "type": "MODIFY_STAT",
      "stat": "knowledge",
      "amount": 1,
      "message": "创世之碑的光辉照耀着你，知识 +1"
    }
  ]
},
{
  "id": "vol_tile_aurora_meadow",
  "name": "极光草原",
  "description": "天空永远流淌着极光的美丽草原。",
  "type": "room",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "OPEN",
    "S": "OPEN",
    "E": "OPEN",
    "W": "WALL"
  },
  "cardSymbol": "NONE",
  "onEnterEffects": [
    {
      "type": "MODIFY_STAT",
      "stat": "sanity",
      "amount": 2,
      "message": "极光的美丽让你沉醉，理智 +2"
    }
  ]
},
{
  "id": "vol_tile_black_tide",
  "name": "黑潮边缘",
  "description": "被黑潮侵蚀的边界地带，一切都被黑暗吞噬。",
  "type": "corridor",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "OPEN",
    "S": "WALL",
    "E": "OPEN",
    "W": "OPEN"
  },
  "icon": "Waves",
  "cardSymbol": "OMEN",
  "onEnter": {
    "type": "ATTRIBUTE_CHECK",
    "attribute": "knowledge",
    "difficulty": 4,
    "success": [],
    "failure": [
      {
        "type": "modify_stat",
        "attribute": "might",
        "amount": -1
      },
      {
        "type": "modify_stat",
        "attribute": "speed",
        "amount": -1
      },
      {
        "type": "modify_stat",
        "attribute": "sanity",
        "amount": -1
      },
      {
        "type": "modify_stat",
        "attribute": "knowledge",
        "amount": -1,
        "message": "黑潮侵蚀了你！"
      }
    ]
  }
},
{
  "id": "vol_tile_blooming_nursery",
  "name": "盛放苗圃",
  "description": "培育永恒之地奇花异草的神秘苗圃。",
  "type": "room",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "WALL",
    "S": "WALL",
    "E": "OPEN",
    "W": "OPEN"
  },
  "cardSymbol": "ITEM",
  "onEnterEffects": [
    {
      "type": "MODIFY_STAT",
      "stat": "speed",
      "amount": 1,
      "message": "苗圃的生命力让你活力充沛，速度 +1"
    }
  ]
},
{
  "id": "vol_tile_celestial_obelisk",
  "name": "星穹方尖碑",
  "description": "记录星穹铁道历史的神秘方尖碑，散发着奇异的光芒。",
  "type": "room",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "OPEN",
    "S": "WALL",
    "E": "OPEN",
    "W": "WALL"
  },
  "cardSymbol": "ITEM",
  "onEnterEffects": [
    {
      "type": "MODIFY_STAT",
      "stat": "knowledge",
      "amount": 2,
      "message": "方尖碑上的星图让你理解了宇宙的奥秘，知识 +2"
    }
  ]
},
{
  "id": "vol_tile_citadel_light",
  "name": "光辉堡垒",
  "description": "黄金裔最后的防线，沐浴在永恒光辉中的坚固壁垒。",
  "type": "room",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "WALL",
    "S": "OPEN",
    "E": "OPEN",
    "W": "OPEN"
  },
  "cardSymbol": "NONE",
  "onEnterEffects": [
    {
      "type": "MODIFY_STAT",
      "stat": "might",
      "amount": 1,
      "message": "堡垒的防御让你感到安全，力量 +1"
    }
  ]
},
{
  "id": "vol_tile_corridor",
  "name": "黄金走廊",
  "description": "连接奥赫玛各处的华丽走廊，墙壁上刻满古老的符文。",
  "type": "corridor",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "OPEN",
    "S": "OPEN",
    "E": "OPEN",
    "W": "OPEN"
  }
},
{
  "id": "vol_tile_crypt",
  "name": "地下墓穴",
  "description": "安葬亡者的墓穴，墙壁上刻满了往者的名讳。",
  "type": "room",
  "floors": [
    "GROUND",
    "UPPER"
  ],
  "edges": {
    "N": "WALL",
    "S": "OPEN",
    "E": "OPEN",
    "W": "OPEN"
  },
  "icon": "Tomb",
  "cardSymbol": "OMEN",
  "onEnter": {
    "type": "DRAW_CARD",
    "deck": "OMEN",
    "message": "你在墓穴中发现了一张灾祸卡！"
  }
},
{
  "id": "vol_tile_crystal_caverns",
  "name": "水晶矿洞",
  "description": "地下蕴藏着巨大水晶的矿洞，闪烁着梦幻的光芒。",
  "type": "room",
  "floors": [
    "BASEMENT"
  ],
  "edges": {
    "N": "WALL",
    "S": "OPEN",
    "E": "OPEN",
    "W": "WALL"
  },
  "cardSymbol": "ITEM",
  "onEnterEffects": [
    {
      "type": "MODIFY_STAT",
      "stat": "sanity",
      "amount": 1,
      "message": "水晶的光芒让你感到平静，理智 +1"
    }
  ]
},
{
  "id": "vol_tile_dragon_lair",
  "name": "巨龙巢穴",
  "description": "昔日巨龙的栖息地，堆满了金银珠宝。",
  "type": "room",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "WALL",
    "S": "OPEN",
    "E": "WALL",
    "W": "OPEN"
  },
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
  "id": "vol_tile_dragon_nest",
  "name": "巨龙巢穴",
  "description": "传说中黄金龙的栖息地，虽然龙已离去，但宝藏仍在此处。",
  "type": "room",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "WALL",
    "S": "WALL",
    "E": "OPEN",
    "W": "OPEN"
  },
  "cardSymbol": "ITEM",
  "eventTrigger": "vol_event_dragon_treasure",
  "onEnterEffects": [
    {
      "type": "MODIFY_STAT",
      "stat": "might",
      "amount": 2,
      "message": "龙的力量残余让你变得更强，力量 +2"
    }
  ]
},
{
  "id": "vol_tile_dreamers_road",
  "name": "梦想家之路",
  "description": "通往无尽星空的道路，只有心怀梦想之人才能踏上。",
  "type": "corridor",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "OPEN",
    "S": "OPEN",
    "E": "OPEN",
    "W": "OPEN"
  },
  "cardSymbol": "NONE",
  "onEnterEffects": [
    {
      "type": "MODIFY_STAT",
      "stat": "speed",
      "amount": 1,
      "message": "梦想的力量推动着你前进，速度 +1"
    }
  ]
},
{
  "id": "vol_tile_emberfall",
  "name": "余烬瀑布",
  "description": "永恒之火熄灭后形成的瀑布，散发着最后的光芒。",
  "type": "room",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "OPEN",
    "S": "OPEN",
    "E": "WALL",
    "W": "WALL"
  },
  "cardSymbol": "OMEN",
  "onEnterEffects": [
    {
      "type": "MODIFY_STAT",
      "stat": "sanity",
      "amount": 1,
      "message": "瀑布的宁静让你心灵得到安抚，理智 +1"
    }
  ]
},
{
  "id": "vol_tile_eternal_flame",
  "name": "永恒烈焰",
  "description": "永不熄灭的神圣火焰，据说蕴含创世之力。",
  "type": "room",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "OPEN",
    "S": "WALL",
    "E": "OPEN",
    "W": "OPEN"
  },
  "icon": "Flame",
  "cardSymbol": "OMEN",
  "onEnter": {
    "type": "ATTRIBUTE_CHECK",
    "attribute": "sanity",
    "difficulty": 4,
    "success": [
      {
        "type": "modify_stat",
        "attribute": "might",
        "amount": 2,
        "message": "火焰之力与你共鸣！"
      }
    ],
    "failure": [
      {
        "type": "modify_stat",
        "attribute": "sanity",
        "amount": -2,
        "message": "火焰灼烧着你的理智！"
      }
    ]
  }
},
{
  "id": "vol_tile_faded_memorial",
  "name": "凋零纪念碑",
  "description": "为逝去的黄金裔英雄们建立的纪念碑，上面刻满了他们的名字。",
  "type": "room",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "OPEN",
    "S": "OPEN",
    "E": "WALL",
    "W": "OPEN"
  },
  "cardSymbol": "OMEN",
  "onEnterEffects": [
    {
      "type": "MODIFY_STAT",
      "stat": "sanity",
      "amount": -1,
      "message": "纪念碑的哀伤让你感到沉重，理智 -1"
    }
  ]
},
{
  "id": "vol_tile_forbidden_library",
  "name": "禁忌图书馆",
  "description": "记载着被遗忘知识的隐秘之地，某些内容不被允许阅读。",
  "type": "room",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "WALL",
    "S": "OPEN",
    "E": "WALL",
    "W": "OPEN"
  },
  "cardSymbol": "OMEN",
  "eventTrigger": "vol_event_forbidden_knowledge",
  "onEnterEffects": [
    {
      "type": "MODIFY_STAT",
      "stat": "knowledge",
      "amount": 2,
      "message": "禁忌的知识让你wisdom大幅提升，知识 +2"
    }
  ]
},
{
  "id": "vol_tile_forgotten_temple",
  "name": "遗忘神庙",
  "description": "被时间遗忘的古老神庙，曾经供奉着失传的诸神。",
  "type": "room",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "WALL",
    "S": "OPEN",
    "E": "WALL",
    "W": "OPEN"
  },
  "cardSymbol": "OMEN",
  "eventTrigger": "vol_event_forgotten_prayer",
  "onEnterEffects": [
    {
      "type": "MODIFY_STAT",
      "stat": "sanity",
      "amount": -2,
      "message": "神庙的荒废让你感到不安，理智 -2"
    }
  ]
},
{
  "id": "vol_tile_garden_beginnings",
  "name": "起始花园",
  "description": "世界的起点，万物的发源地，传说在此创世。",
  "type": "room",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "OPEN",
    "S": "WALL",
    "E": "OPEN",
    "W": "WALL"
  },
  "cardSymbol": "OMEN",
  "onEnterEffects": [
    {
      "type": "MODIFY_STAT",
      "stat": "knowledge",
      "amount": 2,
      "message": "创始的力量让你领悟了世界的本源，知识 +2"
    }
  ]
},
{
  "id": "vol_tile_golden_gate",
  "name": "黄金门",
  "description": "通往奥赫玛的宏伟入口，门上镶嵌着永恒的黄金。",
  "type": "room",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "OPEN",
    "S": "WALL",
    "E": "OPEN",
    "W": "OPEN"
  },
  "cardSymbol": "NONE",
  "onEnterEffects": [
    {
      "type": "MODIFY_STAT",
      "stat": "might",
      "amount": 1,
      "message": "黄金门的能量让你充满力量，力量 +1"
    }
  ]
},
{
  "id": "vol_tile_golden_harbor",
  "name": "黄金港",
  "description": "商人与探险家的聚集地，永远繁忙的港口。",
  "type": "room",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "WALL",
    "S": "OPEN",
    "E": "OPEN",
    "W": "WALL"
  },
  "cardSymbol": "ITEM",
  "onEnterEffects": [
    {
      "type": "MODIFY_STAT",
      "stat": "knowledge",
      "amount": 1,
      "message": "港口的见闻让你增长见识，知识 +1"
    }
  ]
},
{
  "id": "vol_tile_golden_theater",
  "name": "黄金剧院",
  "description": "永恒之地最负盛名的剧院，上演着黄金裔的千年传奇。",
  "type": "room",
  "floors": [
    "GROUND",
    "UPPER"
  ],
  "edges": {
    "N": "OPEN",
    "S": "WALL",
    "E": "OPEN",
    "W": "OPEN"
  },
  "cardSymbol": "EVENT",
  "eventTrigger": "vol_event_theater_performance",
  "onEnterEffects": [
    {
      "type": "MODIFY_STAT",
      "stat": "sanity",
      "amount": 1,
      "message": "精彩的演出让你如痴如醉，理智 +1"
    }
  ]
},
{
  "id": "vol_tile_guild_hall",
  "name": "冒险者公会",
  "description": "佣兵与冒险者聚集的地方，任务公告板贴满了委托。",
  "type": "room",
  "floors": [
    "GROUND",
    "UPPER"
  ],
  "edges": {
    "N": "OPEN",
    "S": "WALL",
    "E": "OPEN",
    "W": "OPEN"
  },
  "icon": "Scroll",
  "cardSymbol": "NONE",
  "onEnter": {
    "type": "DRAW_CARD",
    "deck": "SKILL",
    "message": "你获得了一张技能卡！"
  }
},
{
  "id": "vol_tile_heros_rest",
  "name": "英雄安息地",
  "description": "黄金裔战士的长眠之所，永恒的宁静笼罩着这里。",
  "type": "room",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "OPEN",
    "S": "WALL",
    "E": "WALL",
    "W": "OPEN"
  },
  "cardSymbol": "OMEN",
  "onEnterEffects": [
    {
      "type": "MODIFY_STAT",
      "stat": "speed",
      "amount": 1,
      "message": "英灵的祝福让你身轻如燕，速度 +1"
    }
  ]
},
{
  "id": "vol_tile_house_golden",
  "name": "黄金之家",
  "description": "黄金裔贵族的宅邸，华丽程度令人叹为观止。",
  "type": "room",
  "floors": [
    "GROUND",
    "UPPER"
  ],
  "edges": {
    "N": "OPEN",
    "S": "OPEN",
    "E": "WALL",
    "W": "OPEN"
  },
  "cardSymbol": "ITEM",
  "onEnterEffects": [
    {
      "type": "MODIFY_STAT",
      "stat": "knowledge",
      "amount": 1,
      "message": "宅邸中的装饰让你增长了见识，知识 +1"
    }
  ]
},
{
  "id": "vol_tile_lake_mirror",
  "name": "镜之湖",
  "description": "平静如镜的湖面，能映照出人内心最深处的恐惧。",
  "type": "room",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "OPEN",
    "S": "OPEN",
    "E": "OPEN",
    "W": "OPEN"
  },
  "icon": "Mirror",
  "cardSymbol": "OMEN",
  "interact": {
    "type": "MIRROR",
    "description": "投入湖中查看自己的命运",
    "effects": [
      {
        "type": "MODIFY_STAT",
        "stat": "sanity",
        "amount": -1
      }
    ]
  }
},
{
  "id": "vol_tile_library_ancient",
  "name": "古老图书馆",
  "description": "收藏着无数古老知识的图书馆，部分书籍已石化。",
  "type": "room",
  "floors": [
    "GROUND",
    "UPPER"
  ],
  "edges": {
    "N": "WALL",
    "S": "OPEN",
    "E": "OPEN",
    "W": "OPEN"
  },
  "icon": "Book",
  "cardSymbol": "EVENT",
  "onEnter": {
    "type": "ATTRIBUTE_CHECK",
    "attribute": "knowledge",
    "difficulty": 4,
    "success": [
      {
        "type": "modify_stat",
        "attribute": "knowledge",
        "amount": 2,
        "message": "你获得了古老的知识！"
      }
    ],
    "failure": [
      {
        "type": "modify_stat",
        "attribute": "knowledge",
        "amount": 1,
        "message": "你勉强看懂了一些内容。"
      }
    ]
  }
},
{
  "id": "vol_tile_love_hotel",
  "name": "爱欲酒店",
  "description": "销金窟的奢华酒店，欲望与交易在此交织。",
  "type": "room",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "OPEN",
    "S": "OPEN",
    "E": "OPEN",
    "W": "WALL"
  },
  "cardSymbol": "EVENT",
  "eventTrigger": "vol_event_hotel_encounter",
  "onEnterEffects": [
    {
      "type": "MODIFY_STAT",
      "stat": "speed",
      "amount": 1,
      "message": "酒店的房间让你休息充分，速度 +1"
    }
  ]
},
{
  "id": "vol_tile_market",
  "name": "繁星集市",
  "description": "各族商人汇聚的交易之地，充斥着奇珍异宝。",
  "type": "room",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "OPEN",
    "S": "WALL",
    "E": "OPEN",
    "W": "OPEN"
  },
  "cardSymbol": "ITEM",
  "eventTrigger": "vol_event_market_trade",
  "onEnterEffects": [
    {
      "type": "MODIFY_STAT",
      "stat": "knowledge",
      "amount": 1,
      "message": "集市的见闻让你开阔眼界，知识 +1"
    }
  ]
},
{
  "id": "vol_tile_market_square",
  "name": "集市广场",
  "description": "商贩云集的热闹场所，你可以在这里交易物品。",
  "type": "room",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "OPEN",
    "S": "OPEN",
    "E": "OPEN",
    "W": "WALL"
  },
  "icon": "Store",
  "cardSymbol": "NONE",
  "interact": {
    "type": "TRADE",
    "description": "与任意玩家交换1件物品"
  }
},
{
  "id": "vol_tile_mechanism_hall",
  "name": "机械大厅",
  "description": "泰坦族留下的自动机械仍在运转。",
  "type": "room",
  "floors": [
    "GROUND",
    "UPPER"
  ],
  "edges": {
    "N": "OPEN",
    "S": "OPEN",
    "E": "OPEN",
    "W": "WALL"
  },
  "icon": "Gear",
  "cardSymbol": "EVENT",
  "effects": []
},
{
  "id": "vol_tile_mirror_lake",
  "name": "镜影湖",
  "description": "平静如镜的湖面，倒映着另一个世界的影像。",
  "type": "room",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "OPEN",
    "S": "OPEN",
    "E": "WALL",
    "W": "WALL"
  },
  "cardSymbol": "EVENT",
  "eventTrigger": "vol_event_mirror_reflection",
  "onEnterEffects": [
    {
      "type": "MODIFY_STAT",
      "stat": "sanity",
      "amount": -1,
      "message": "镜中的倒影让你感到不安，理智 -1"
    }
  ]
},
{
  "id": "vol_tile_molten_river",
  "name": "熔岩河流",
  "description": "炽热的熔岩流动形成的河流，温度足以融化金属。",
  "type": "corridor",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "WALL",
    "S": "OPEN",
    "E": "OPEN",
    "W": "OPEN"
  },
  "icon": "Lava",
  "cardSymbol": "OMEN",
  "interact": {
    "type": "CROSS",
    "description": "跳过熔岩障碍",
    "attribute": "speed",
    "difficulty": 4,
    "successMessage": "你轻盈地跳过熔岩！",
    "failureMessage": "你被烫伤了！",
    "failure": [
      {
        "type": "DAMAGE",
        "stat": "might",
        "amount": 2
      }
    ]
  }
},
{
  "id": "vol_tile_narrow_alley",
  "name": "狭窄巷弄",
  "description": "奥赫玛错综复杂的小巷，是盗贼的藏身之所。",
  "type": "corridor",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "OPEN",
    "S": "WALL",
    "E": "OPEN",
    "W": "OPEN"
  },
  "icon": "Dagger",
  "cardSymbol": "NONE",
  "onEnter": {
    "type": "ATTRIBUTE_CHECK",
    "attribute": "speed",
    "difficulty": 3,
    "success": [],
    "failure": [
      {
        "type": "modify_stat",
        "attribute": "speed",
        "amount": -1,
        "message": "你被陷阱绊倒，速度降低！"
      }
    ]
  }
},
{
  "id": "vol_tile_palace_memory",
  "name": "记忆宫殿",
  "description": "黄金裔的记忆化为实体，构成了这座璀璨的宫殿。",
  "type": "room",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "OPEN",
    "S": "WALL",
    "E": "WALL",
    "W": "WALL"
  },
  "cardSymbol": "OMEN",
  "onEnterEffects": [
    {
      "type": "MODIFY_STAT",
      "stat": "knowledge",
      "amount": 1,
      "message": "宫殿中的记忆碎片让你回忆起更多知识，知识 +1"
    }
  ]
},
{
  "id": "vol_tile_penumbra",
  "name": "半影区",
  "description": "光明与黑暗的交界处，一切都处于模糊的灰色地带。",
  "type": "room",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "WALL",
    "S": "OPEN",
    "E": "OPEN",
    "W": "WALL"
  },
  "cardSymbol": "EVENT",
  "eventTrigger": "vol_event_penumbra_choice",
  "onEnterEffects": [
    {
      "type": "MODIFY_STAT",
      "stat": "sanity",
      "amount": -1,
      "message": "半影区的诡异让你感到不安，理智 -1"
    }
  ]
},
{
  "id": "vol_tile_phoenix_nest",
  "name": "凤凰巢穴",
  "description": "神鸟凤凰的栖息地，充满了生命的火焰。",
  "type": "room",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "OPEN",
    "S": "OPEN",
    "E": "WALL",
    "W": "WALL"
  },
  "icon": "Phoenix",
  "cardSymbol": "OMEN",
  "onEnter": {
    "type": "ATTRIBUTE_CHECK",
    "attribute": "sanity",
    "difficulty": 5,
    "success": [
      {
        "type": "heal",
        "amount": 999,
        "message": "你获得了凤凰的祝福，完全恢复！"
      }
    ],
    "failure": [
      {
        "type": "modify_stat",
        "attribute": "sanity",
        "amount": -1,
        "message": "你被火焰灼伤！"
      }
    ]
  },
  "onLeave": {
    "type": "ATTRIBUTE_CHECK",
    "attribute": "speed",
    "difficulty": 4,
    "success": [],
    "failure": [
      {
        "type": "damage",
        "amount": 1,
        "message": "凤凰之火在你离开时灼伤了你！"
      }
    ]
  }
},
{
  "id": "vol_tile_portal_chamber",
  "name": "传送门室",
  "description": "古代留下的传送门，部分仍可使用。",
  "type": "room",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "OPEN",
    "S": "OPEN",
    "E": "WALL",
    "W": "WALL"
  },
  "icon": "Portal",
  "cardSymbol": "EVENT",
  "interact": {
    "type": "TELEPORT",
    "description": "使用传送门",
    "destination": "any_revealed",
    "cost": {
      "type": "sanity",
      "amount": 1
    }
  }
},
{
  "id": "vol_tile_river_styx",
  "name": "冥河斯堤克斯",
  "description": "连接生与死的河流，据说渡过此河将遗忘一切。",
  "type": "corridor",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "OPEN",
    "S": "OPEN",
    "E": "WALL",
    "W": "WALL"
  },
  "icon": "River",
  "cardSymbol": "OMEN",
  "onEnter": {
    "type": "ATTRIBUTE_CHECK",
    "attribute": "sanity",
    "difficulty": 5,
    "success": [
      {
        "type": "special",
        "effect": "communicate_ghost",
        "message": "你听见了亡者的低语！"
      }
    ],
    "failure": [
      {
        "type": "modify_stat",
        "attribute": "sanity",
        "amount": -2,
        "message": "河水带走了你的记忆！"
      }
    ]
  }
},
{
  "id": "vol_tile_ruby_dunes",
  "name": "红玉沙丘",
  "description": "永恒之地唯一的沙漠地区，沙粒如同红玉般晶莹。",
  "type": "room",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "OPEN",
    "S": "OPEN",
    "E": "WALL",
    "W": "WALL"
  },
  "cardSymbol": "EVENT",
  "eventTrigger": "vol_event_desert_storm",
  "onEnterEffects": [
    {
      "type": "MODIFY_STAT",
      "stat": "speed",
      "amount": -1,
      "message": "沙丘的行进困难，速度 -1"
    }
  ]
},
{
  "id": "vol_tile_sacred_bloom",
  "name": "圣绽花园",
  "description": "永恒之地最美丽的花园，万年花开不谢。",
  "type": "room",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "OPEN",
    "S": "OPEN",
    "E": "WALL",
    "W": "WALL"
  },
  "cardSymbol": "ITEM",
  "onEnterEffects": [
    {
      "type": "MODIFY_STAT",
      "stat": "sanity",
      "amount": 2,
      "message": "花园的芬芳让你心旷神怡，理智 +2"
    }
  ]
},
{
  "id": "vol_tile_sacred_spring",
  "name": "神圣之泉",
  "description": "传说中诸神沐浴的泉水，具有治愈之力。",
  "type": "room",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "OPEN",
    "S": "OPEN",
    "E": "OPEN",
    "W": "WALL"
  },
  "icon": "Droplets",
  "cardSymbol": "NONE",
  "interact": {
    "type": "HEAL",
    "description": "在泉水中沐浴",
    "effects": [
      {
        "type": "HEAL",
        "stat": "might",
        "amount": 999
      },
      {
        "type": "HEAL",
        "stat": "sanity",
        "amount": 999
      },
      {
        "type": "MODIFY_STAT",
        "stat": "sanity",
        "amount": 1
      }
    ]
  }
},
{
  "id": "vol_tile_sanctuary",
  "name": "永恒圣所",
  "description": "诸神最后的避难所，这里保存着世界的起源之火。",
  "type": "room",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "OPEN",
    "S": "WALL",
    "E": "WALL",
    "W": "OPEN"
  },
  "cardSymbol": "OMEN",
  "onEnterEffects": [
    {
      "type": "MODIFY_STAT",
      "stat": "sanity",
      "amount": 2,
      "message": "圣所的宁静让你心灵得到净化，理智 +2"
    }
  ]
},
{
  "id": "vol_tile_shadow_palace",
  "name": "暗影宫殿",
  "description": "隐藏在阴影中的神秘宫殿，只有特定之人才能进入。",
  "type": "room",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "WALL",
    "S": "WALL",
    "E": "OPEN",
    "W": "OPEN"
  },
  "cardSymbol": "OMEN",
  "eventTrigger": "vol_event_shadow_prince",
  "onEnterEffects": [
    {
      "type": "MODIFY_STAT",
      "stat": "might",
      "amount": 1,
      "message": "暗影的力量让你变得更强，力量 +1"
    },
    {
      "type": "MODIFY_STAT",
      "stat": "sanity",
      "amount": -1,
      "message": "但暗影也在侵蚀你的内心，理智 -1"
    }
  ]
},
{
  "id": "vol_tile_shadow_realm",
  "name": "幽影领域",
  "description": "通往冥潭的阴影边界，这里时间停滞，空间扭曲。",
  "type": "room",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "OPEN",
    "S": "WALL",
    "E": "WALL",
    "W": "WALL"
  },
  "cardSymbol": "OMEN",
  "eventTrigger": "vol_event_shadow_touch",
  "onEnterEffects": [
    {
      "type": "MODIFY_STAT",
      "stat": "sanity",
      "amount": -2,
      "message": "阴影的侵蚀让你感到恐惧，理智 -2"
    }
  ]
},
{
  "id": "vol_tile_starlight_academy",
  "name": "星辉学院",
  "description": "永恒之地最高学府，培养着下一代的黄金裔精英。",
  "type": "room",
  "floors": [
    "GROUND",
    "UPPER"
  ],
  "edges": {
    "N": "OPEN",
    "S": "WALL",
    "E": "OPEN",
    "W": "OPEN"
  },
  "cardSymbol": "ITEM",
  "onEnterEffects": [
    {
      "type": "MODIFY_STAT",
      "stat": "knowledge",
      "amount": 2,
      "message": "学院的知识让你受益匪浅，知识 +2"
    }
  ]
},
{
  "id": "vol_tile_starry_observatory",
  "name": "星空观测台",
  "description": "用于观测星空的高台，可以看到永恒之地的全貌。",
  "type": "room",
  "floors": [
    "UPPER"
  ],
  "edges": {
    "N": "OPEN",
    "S": "WALL",
    "E": "WALL",
    "W": "OPEN"
  },
  "icon": "Star",
  "cardSymbol": "OMEN",
  "interact": {
    "type": "DIVINATION",
    "description": "预知下一个事件",
    "effects": [
      {
        "type": "MODIFY_STAT",
        "stat": "knowledge",
        "amount": 1
      }
    ]
  }
},
{
  "id": "vol_tile_temple_light",
  "name": "光辉神庙",
  "description": "供奉黄金裔诸神的圣地，沐浴在永恒的光辉中。",
  "type": "room",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "WALL",
    "S": "OPEN",
    "E": "WALL",
    "W": "OPEN"
  },
  "cardSymbol": "OMEN",
  "eventTrigger": "vol_event_divine_light",
  "onEnterEffects": [
    {
      "type": "MODIFY_STAT",
      "stat": "sanity",
      "amount": 2,
      "message": "神庙的光辉净化着你，理智 +2"
    }
  ]
},
{
  "id": "vol_tile_time_distortion",
  "name": "时间漩涡",
  "description": "空间中扭曲的奇点，时间在这里变得毫无意义。",
  "type": "room",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "OPEN",
    "S": "OPEN",
    "E": "WALL",
    "W": "WALL"
  },
  "cardSymbol": "EVENT",
  "eventTrigger": "vol_event_time_warp",
  "interact": {
    "type": "TIME_REWIND",
    "description": "回溯时间",
    "cost": {
      "type": "sanity",
      "amount": 2
    }
  },
  "onEnterEffects": [
    {
      "type": "MODIFY_STAT",
      "stat": "sanity",
      "amount": -2,
      "message": "时间的混乱让你头晕目眩，理智 -2"
    }
  ]
},
{
  "id": "vol_tile_titan_forge",
  "name": "泰坦锻铁炉",
  "description": "泰坦族打造的巨型锻造炉，至今仍有余温。",
  "type": "room",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "OPEN",
    "S": "OPEN",
    "E": "WALL",
    "W": "WALL"
  },
  "icon": "Hammer",
  "cardSymbol": "ITEM",
  "interact": {
    "type": "FORGE",
    "description": "锻造一件传奇武器",
    "poolId": "forge_legendary_weapons",
    "condition": {
      "op": "GT",
      "stat": "knowledge",
      "value": 4
    }
  }
},
{
  "id": "vol_tile_tower_titans",
  "name": "泰坦之塔",
  "description": "古代泰坦遗留下的巨塔，顶端直插云霄。",
  "type": "room",
  "floors": [
    "GROUND",
    "UPPER"
  ],
  "edges": {
    "N": "OPEN",
    "S": "WALL",
    "E": "WALL",
    "W": "OPEN"
  },
  "cardSymbol": "ITEM",
  "eventTrigger": "vol_event_titan_blessing",
  "onEnterEffects": [
    {
      "type": "MODIFY_STAT",
      "stat": "might",
      "amount": 2,
      "message": "泰坦的余力让你力量倍增，力量 +2"
    }
  ]
},
{
  "id": "vol_tile_trinity_archive",
  "name": "三位一体档案馆",
  "description": "缇宝三姐妹的居所，时间的秘密在此被静静守护。",
  "type": "room",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "OPEN",
    "S": "OPEN",
    "E": "WALL",
    "W": "OPEN"
  },
  "cardSymbol": "OMEN",
  "eventTrigger": "vol_event_trinity_wisdom",
  "onEnterEffects": [
    {
      "type": "MODIFY_STAT",
      "stat": "knowledge",
      "amount": 2,
      "message": "档案馆的知识让你如梦初醒，知识 +2"
    }
  ]
},
{
  "id": "vol_tile_tristezza",
  "name": "悲悼岭",
  "description": "哀伤之地，逝去的黄金裔在此留下无尽的悲叹。",
  "type": "room",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "OPEN",
    "S": "WALL",
    "E": "WALL",
    "W": "OPEN"
  },
  "cardSymbol": "OMEN",
  "onEnterEffects": [
    {
      "type": "MODIFY_STAT",
      "stat": "sanity",
      "amount": -2,
      "message": "悲伤的氛围侵蚀着你的内心，理智 -2"
    }
  ]
},
{
  "id": "vol_tile_underworld",
  "name": "冥潭入口",
  "description": "通往冥潭的黑暗入口，死亡的气息扑面而来。",
  "type": "room",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "WALL",
    "S": "WALL",
    "E": "OPEN",
    "W": "WALL"
  },
  "cardSymbol": "OMEN",
  "eventTrigger": "vol_event_death_gate",
  "onEnterEffects": [
    {
      "type": "MODIFY_STAT",
      "stat": "sanity",
      "amount": -3,
      "message": "死亡的压迫让你几近崩溃，理智 -3"
    }
  ]
},
{
  "id": "vol_tile_void_atrium",
  "name": "虚空中庭",
  "description": "通往虚空中庭的入口，空间的边界在这里变得模糊。",
  "type": "room",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "WALL",
    "S": "OPEN",
    "E": "OPEN",
    "W": "OPEN"
  },
  "cardSymbol": "EVENT",
  "eventTrigger": "vol_event_void_portal",
  "onEnterEffects": [
    {
      "type": "MODIFY_STAT",
      "stat": "sanity",
      "amount": -2,
      "message": "虚空的能量让你的意识开始模糊，理智 -2"
    }
  ]
},
{
  "id": "vol_tile_void_entrance",
  "name": "虚空入口",
  "description": "通往虚空中 的裂缝，隐约可见另一边的景象。",
  "type": "room",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "OPEN",
    "S": "OPEN",
    "E": "WALL",
    "W": "OPEN"
  },
  "icon": "Void",
  "cardSymbol": "OMEN",
  "onEnter": {
    "type": "ATTRIBUTE_CHECK",
    "attribute": "sanity",
    "difficulty": 6,
    "success": [
      {
        "type": "special",
        "effect": "void_sight",
        "message": "你看见了虚空彼端的景象！"
      }
    ],
    "failure": [
      {
        "type": "modify_stat",
        "attribute": "sanity",
        "amount": -2,
        "message": "虚空正在吞噬你！"
      }
    ]
  },
  "interact": {
    "type": "TELEPORT",
    "destination": "any_revealed",
    "description": "通过虚空传送"
  }
},
{
  "id": "vol_tile_warehouse",
  "name": "仓库区",
  "description": "堆满货物与箱子的Storage区域，偶尔有珍贵物品。",
  "type": "room",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "OPEN",
    "S": "OPEN",
    "E": "WALL",
    "W": "WALL"
  },
  "icon": "Box",
  "cardSymbol": "ITEM",
  "effects": []
},
{
  "id": "vol_tile_whispering_woods",
  "name": "低语森林",
  "description": "树木成精的古老森林，它们在风中低语着古老的秘密。",
  "type": "room",
  "floors": [
    "GROUND"
  ],
  "edges": {
    "N": "WALL",
    "S": "OPEN",
    "E": "OPEN",
    "W": "WALL"
  },
  "cardSymbol": "OMEN",
  "onEnterEffects": [
    {
      "type": "MODIFY_STAT",
      "stat": "knowledge",
      "amount": 1,
      "message": "树木的低语告诉你古老的秘密，知识 +1"
    }
  ]
},
];
