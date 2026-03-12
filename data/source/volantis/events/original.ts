// 翁法罗斯主题 - 事件卡数据
// Volantis Event Cards

export const EVENTS_DATA = {
  // ==================== 战斗事件 ====================
  "vol_event_ambush": {
    "id": "vol_event_ambush",
    "type": "EVENT",
    "title": "伏兵四起",
    "description": "你遭到了敌人的伏击！",
    "flavorText": "隐藏在暗处的敌人突然发动攻击。",
    "icon": "Sword",
    "triggerType": "ON_ENTER",
    "interaction": {
      "type": "ATTRIBUTE_CHECK",
      "attribute": "speed",
      "difficulty": 4,
      "success": [
        { "type": "modify_stat", "attribute": "might", "amount": 1, "message": "你成功躲避了攻击，并进行反击！" },
        { "type": "narrative_log", "message": "反应够快！你安然无恙。" }
      ],
      "failure": [
        { "type": "damage", "amount": 2, "message": "你被击中受伤。" },
        { "type": "narrative_log", "message": "反应不及，你受到了伤害。" }
      ]
    }
  },
  "vol_event_skeletal_warrior": {
    "id": "vol_event_skeletal_warrior",
    "type": "EVENT",
    "title": "亡者复苏",
    "description": "战场上的亡魂再次拿起武器。",
    "flavorText": "白骨之手从地里伸出，握紧了生锈的剑。",
    "icon": "Skull",
    "triggerType": "ON_ENTER",
    "interaction": {
      "type": "ATTRIBUTE_CHECK",
      "attribute": "sanity",
      "difficulty": 5,
      "success": [
        { "type": "modify_stat", "attribute": "knowledge", "amount": 1, "message": "你成功压制了亡者的灵魂。" },
        { "type": "narrative_log", "message": "你用理智压制了它们。" }
      ],
      "failure": [
        { "type": "damage", "amount": 2, "message": "亡者的攻击让你受伤。" },
        { "type": "narrative_log", "message": "恐惧占据了你的内心。" }
      ]
    }
  },
  "vol_event_titan_guard": {
    "id": "vol_event_titan_guard",
    "type": "EVENT",
    "title": "泰坦守卫苏醒",
    "description": "古老的泰坦机械守卫被惊醒了。",
    "flavorText": "齿轮开始转动，沉睡的巨人即将苏醒。",
    "icon": "Gear",
    "triggerType": "ON_ENTER",
    "interaction": {
      "type": "ATTRIBUTE_CHECK",
      "attribute": "might",
      "difficulty": 5,
      "success": [
        { "type": "modify_stat", "attribute": "might", "amount": 1, "message": "你击败了泰坦守卫！" },
        { "type": "narrative_log", "message": "战斗胜利！" }
      ],
      "failure": [
        { "type": "damage", "amount": 3, "message": "泰坦守卫的拳头击中了你。" },
        { "type": "narrative_log", "message": "你不是它的对手。" }
      ]
    }
  },
  "vol_event_phoenix_attack": {
    "id": "vol_event_phoenix_attack",
    "type": "EVENT",
    "title": "凤凰之怒",
    "description": "神鸟凤凰被惊扰，展开攻击。",
    "flavorText": "火焰如浪潮般向你涌来。",
    "icon": "Phoenix",
    "triggerType": "ON_ENTER",
    "interaction": {
      "type": "ATTRIBUTE_CHECK",
      "attribute": "speed",
      "difficulty": 6,
      "success": [
        { "type": "modify_stat", "attribute": "speed", "amount": 1, "message": "你成功逃离了火海。" },
        { "type": "narrative_log", "message": "速度让你逃过一劫。" }
      ],
      "failure": [
        { "type": "damage", "amount": 3, "message": "你被火焰灼伤。" },
        { "type": "narrative_log", "message": "烈焰吞噬了你。" }
      ]
    }
  },

  // ==================== 探索事件 ====================
  "vol_event_hidden_treasure": {
    "id": "vol_event_hidden_treasure",
    "type": "EVENT",
    "title": "隐藏宝藏",
    "description": "你发现了隐藏的宝藏！",
    "flavorText": "墙壁后面似乎有东西在发光...",
    "icon": "Treasure",
    "triggerType": "ON_ENTER",
    "interaction": {
      "type": "ATTRIBUTE_CHECK",
      "attribute": "knowledge",
      "difficulty": 3,
      "success": [
        { "type": "gain_item", "itemId": "random", "message": "你发现了一件宝物！" },
        { "type": "narrative_log", "message": "知识让你找到了宝藏。" }
      ],
      "failure": [
        { "type": "narrative_log", "message": "宝藏与你擦肩而过。" }
      ]
    }
  },
  "vol_event_ancient_scroll": {
    "id": "vol_event_ancient_scroll",
    "type": "EVENT",
    "title": "古老卷轴",
    "description": "你发现了一份古老的卷轴。",
    "flavorText": "羊皮纸上记载着古老的智慧。",
    "icon": "Scroll",
    "triggerType": "ON_ENTER",
    "interaction": {
      "type": "ATTRIBUTE_CHECK",
      "attribute": "knowledge",
      "difficulty": 4,
      "success": [
        { "type": "modify_stat", "attribute": "knowledge", "amount": 2, "message": "你理解了卷轴上的内容！" },
        { "type": "narrative_log", "message": "知识就是力量。" }
      ],
      "failure": [
        { "type": "modify_stat", "attribute": "knowledge", "amount": 1, "message": "你勉强看懂了一些内容。" },
        { "type": "narrative_log", "message": "内容太过晦涩。" }
      ]
    }
  },
  "vol_event_secret_passage": {
    "id": "vol_event_secret_passage",
    "type": "EVENT",
    "title": "秘密通道",
    "description": "你发现了一条隐藏的通道。",
    "flavorText": "墙壁上有一个不易察觉的凹痕...",
    "icon": "Door",
    "triggerType": "ON_ENTER",
    "interaction": {
      "type": "ATTRIBUTE_CHECK",
      "attribute": "speed",
      "difficulty": 3,
      "success": [
        { "type": "teleport", "destination": "any", "message": "你打开了通道！" },
        { "type": "narrative_log", "message": "新路径被发现了。" }
      ],
      "failure": [
        { "type": "narrative_log", "message": "你无法打开通道。" }
      ]
    }
  },
  "vol_event_trap": {
    "id": "vol_event_trap",
    "type": "EVENT",
    "title": "陷阱触发",
    "description": "你触发了古代陷阱！",
    "flavorText": "地板突然塌陷...",
    "icon": "Trap",
    "triggerType": "ON_ENTER",
    "interaction": {
      "type": "ATTRIBUTE_CHECK",
      "attribute": "speed",
      "difficulty": 4,
      "success": [
        { "type": "narrative_log", "message": "你成功避开了陷阱！" }
      ],
      "failure": [
        { "type": "damage", "amount": 2, "message": "陷阱对你造成了伤害。" },
        { "type": "narrative_log", "message": "陷阱触发了。" }
      ]
    }
  },

  // ==================== 神秘事件 ====================
  "vol_event_divine_blessing": {
    "id": "vol_event_divine_blessing",
    "type": "EVENT",
    "title": "神祇祝福",
    "description": "你受到了神明的祝福！",
    "flavorText": "光芒笼罩了你，温暖而舒适。",
    "icon": "Star",
    "triggerType": "ON_ENTER",
    "interaction": {
      "type": "ATTRIBUTE_CHECK",
      "attribute": "knowledge",
      "difficulty": 5,
      "success": [
        { "type": "modify_stat", "attribute": "might", "amount": 1 },
        { "type": "modify_stat", "attribute": "speed", "amount": 1 },
        { "type": "modify_stat", "attribute": "sanity", "amount": 1 },
        { "type": "modify_stat", "attribute": "knowledge", "amount": 1 },
        { "type": "narrative_log", "message": "诸神眷顾于你！" }
      ],
      "failure": [
        { "type": "modify_stat", "attribute": "might", "amount": 1 },
        { "type": "narrative_log", "message": "祝福降临，但你只获得了部分力量。" }
      ]
    }
  },
  "vol_event_curse": {
    "id": "vol_event_curse",
    "type": "EVENT",
    "title": "古老诅咒",
    "description": "你被古老的诅咒侵蚀了！",
    "flavorText": "阴影攀上了你的身体...",
    "icon": "Skull",
    "triggerType": "ON_ENTER",
    "interaction": {
      "type": "ATTRIBUTE_CHECK",
      "attribute": "sanity",
      "difficulty": 5,
      "success": [
        { "type": "modify_stat", "attribute": "sanity", "amount": -1, "message": "你勉强抵御了诅咒。" },
        { "type": "narrative_log", "message": "诅咒被你击退。" }
      ],
      "failure": [
        { "type": "modify_stat", "attribute": "might", "amount": -1 },
        { "type": "modify_stat", "attribute": "speed", "amount": -1 },
        { "type": "narrative_log", "message": "诅咒深深侵蚀了你。" }
      ]
    }
  },
  "vol_event_time_anomaly": {
    "id": "vol_event_time_anomaly",
    "type": "EVENT",
    "title": "时间异常",
    "description": "时间的流动变得异常！",
    "flavorText": "周围的一切变得模糊...",
    "icon": "Clock",
    "triggerType": "ON_ENTER",
    "interaction": {
      "type": "ATTRIBUTE_CHECK",
      "attribute": "knowledge",
      "difficulty": 4,
      "success": [
        { "type": "modify_stat", "attribute": "knowledge", "amount": 1, "message": "你理解了时间的变化。" },
        { "type": "narrative_log", "message": "时间为你所用。" }
      ],
      "failure": [
        { "type": "narrative_log", "message": "时间乱流让你迷失。" },
        { "type": "teleport", "destination": "random" }
      ]
    }
  },
  "vol_event_spirit_appearing": {
    "id": "vol_event_spirit_appearing",
    "type": "EVENT",
    "title": "幽魂显现",
    "description": "一个幽魂出现在你面前。",
    "flavorText": "透明的身影漂浮在空中，似乎有话要说...",
    "icon": "Ghost",
    "triggerType": "ON_ENTER",
    "interaction": {
      "type": "CHOICE",
      "options": [
        {
          "label": "倾听",
          "effects": [
            { "type": "modify_stat", "attribute": "knowledge", "amount": 1 },
            { "type": "modify_stat", "attribute": "sanity", "amount": -1 },
            { "type": "narrative_log", "message": "幽魂告诉你一个秘密。" }
          ]
        },
        {
          "label": "驱散",
          "effects": [
            { "type": "modify_stat", "attribute": "might", "amount": 1 },
            { "type": "narrative_log", "message": "你赶走了幽魂。" }
          ]
        }
      ]
    }
  },
  "vol_event_dream_nightmare": {
    "id": "vol_event_dream_nightmare",
    "type": "EVENT",
    "title": "梦魇入侵",
    "description": "你陷入了噩梦之中。",
    "flavorText": "睁开眼睛，你发现身处陌生的黑暗...",
    "icon": "Moon",
    "triggerType": "ON_ENTER",
    "interaction": {
      "type": "ATTRIBUTE_CHECK",
      "attribute": "sanity",
      "difficulty": 4,
      "success": [
        { "type": "narrative_log", "message": "你从噩梦中醒来！" }
      ],
      "failure": [
        { "type": "modify_stat", "attribute": "sanity", "amount": -2, "message": "噩梦让你精神受创。" },
        { "type": "narrative_log", "message": "你在梦魇中挣扎。" }
      ]
    }
  },

  // ==================== 社交事件 ====================
  "vol_event_merchant": {
    "id": "vol_event_merchant",
    "type": "EVENT",
    "title": "神秘商人",
    "description": "你遇到了一位神秘商人。",
    "flavorText": "一个全身笼罩在黑袍中的人向你招手...",
    "icon": "Store",
    "triggerType": "ON_ENTER",
    "interaction": {
      "type": "CHOICE",
      "options": [
        {
          "label": "交易",
          "effects": [
            { "type": "gain_item", "itemId": "random", "cost": 2, "message": "你获得了一件物品！" }
          ]
        },
        {
          "label": "离开",
          "effects": [
            { "type": "narrative_log", "message": "你转身离开。" }
          ]
        }
      ]
    }
  },
  "vol_event_bard_song": {
    "id": "vol_event_bard_song",
    "type": "EVENT",
    "title": "吟游诗人",
    "description": "一位吟游诗人正在歌唱。",
    "flavorText": "美妙的旋律在空间中回荡...",
    "icon": "Music",
    "triggerType": "ON_ENTER",
    "interaction": {
      "type": "ATTRIBUTE_CHECK",
      "attribute": "sanity",
      "difficulty": 3,
      "success": [
        { "type": "modify_stat", "attribute": "sanity", "amount": 2, "message": "音乐抚慰了你的心灵。" },
        { "type": "narrative_log", "message": "你感到心境平和。" }
      ],
      "failure": [
        { "type": "narrative_log", "message": "音乐让你有些烦躁。" }
      ]
    }
  },
  "vol_event_refugee": {
    "id": "vol_event_refugee",
    "type": "EVENT",
    "title": "难民求助",
    "description": "一个难民请求你的帮助。",
    "flavorText": "衣衫褴褛的旅行者向你伸出求助的手...",
    "icon": "User",
    "triggerType": "ON_ENTER",
    "interaction": {
      "type": "CHOICE",
      "options": [
        {
          "label": "帮助",
          "effects": [
            { "type": "modify_stat", "attribute": "knowledge", "amount": 1 },
            { "type": "modify_stat", "attribute": "sanity", "amount": 1 },
            { "type": "narrative_log", "message": "难民感激地离去了。" }
          ]
        },
        {
          "label": "拒绝",
          "effects": [
            { "type": "narrative_log", "message": "你转身离开。" }
          ]
        }
      ]
    }
  },

  // ==================== 特殊事件 ====================
  "vol_event_olympus_call": {
    "id": "vol_event_olympus_call",
    "type": "EVENT",
    "title": "诸神召唤",
    "description": "你收到了诸神的召唤。",
    "flavorText": "天空中降下金色光芒，邀请你前往神之领域。",
    "icon": "Star",
    "triggerType": "ON_ENTER",
    "interaction": {
      "type": "ATTRIBUTE_CHECK",
      "attribute": "knowledge",
      "difficulty": 7,
      "success": [
        { "type": "modify_stat", "attribute": "might", "amount": 2 },
        { "type": "modify_stat", "attribute": "speed", "amount": 2 },
        { "type": "modify_stat", "attribute": "sanity", "amount": 2 },
        { "type": "modify_stat", "attribute": "knowledge", "amount": 2 },
        { "type": "narrative_log", "message": "你被引入了神之领域！" }
      ],
      "failure": [
        { "type": "narrative_log", "message": "召唤的光芒消散了。" }
      ]
    }
  },
  "vol_event_eclipse": {
    "id": "vol_event_eclipse",
    "type": "EVENT",
    "title": "日食降临",
    "description": "太阳被吞噬，黑暗降临大地。",
    "flavorText": "光明逐渐消失，世界陷入沉寂...",
    "icon": "Sun",
    "triggerType": "ON_ENTER",
    "interaction": {
      "type": "ATTRIBUTE_CHECK",
      "attribute": "sanity",
      "difficulty": 5,
      "success": [
        { "type": "modify_stat", "attribute": "speed", "amount": 1, "message": "你在黑暗中保持冷静。" },
        { "type": "narrative_log", "message": "日食持续中。" }
      ],
      "failure": [
        { "type": "modify_stat", "attribute": "sanity", "amount": -2, "message": "恐惧占据了你的内心。" },
        { "type": "narrative_log", "message": "黑暗让你不安。" }
      ]
    }
  }
};
