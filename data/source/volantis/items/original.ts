// 翁法罗斯主题 - 物品卡数据
// Volantis Item Cards

export const ITEMS_DATA = {
  // ==================== 武器 ====================
  "vol_weapon_spear_athena": {
    "id": "vol_weapon_spear_athena",
    "name": "雅典娜的长矛",
    "description": "智慧女神的武器，能够精准击中敌人弱点。",
    "icon": "Spear",
    "type": "WEAPON",
    "usage": {
      "actionLabel": "投掷",
      "isConsumable": false,
      "target": "OPPONENT",
      "effects": [
        { "type": "DAMAGE", "target": { "type": "SELECTED_PARTNER" }, "amount": 3 },
        { "type": "LOG", "message": "长矛划过一道完美的弧线，击中目标！", "style": "alert" }
      ]
    },
    "passiveEffects": [{ "type": "buff", "text": "力量+1" }]
  },
  "vol_weapon_sword_ares": {
    "id": "vol_weapon_sword_ares",
    "name": "阿瑞斯之剑",
    "description": "战争之神的武器，嗜血渴望战斗。",
    "icon": "Sword",
    "type": "WEAPON",
    "usage": {
      "actionLabel": "猛砍",
      "isConsumable": false,
      "target": "OPPONENT",
      "effects": [
        { "type": "DAMAGE", "target": { "type": "SELECTED_PARTNER" }, "amount": 4 },
        { "type": "DAMAGE", "target": { "type": "SELF" }, "amount": 1 }
      ]
    },
    "passiveEffects": [{ "type": "buff", "text": "力量+2" }]
  },
  "vol_weapon_dagger_sifere": {
    "id": "vol_weapon_dagger_sifere",
    "name": "飞贼之刃",
    "description": "赛飞儿同款匕首，锋利无比。",
    "icon": "Dagger",
    "type": "WEAPON",
    "usage": {
      "actionLabel": "穿刺",
      "isConsumable": false,
      "target": "OPPONENT",
      "effects": [
        { "type": "DAMAGE", "target": { "type": "SELECTED_PARTNER" }, "amount": 2 },
        { "type": "MODIFY_STAT", "target": { "type": "SELF" }, "stat": "speed", "amount": 1 }
      ]
    },
    "passiveEffects": [{ "type": "buff", "text": "速度+1" }]
  },
  "vol_weapon_bow_apollo": {
    "id": "vol_weapon_bow_apollo",
    "name": "太阳神弓",
    "description": "光明之神的武器，箭矢如阳光般璀璨。",
    "icon": "Bow",
    "type": "WEAPON",
    "usage": {
      "actionLabel": "狙击",
      "isConsumable": false,
      "target": "OPPONENT",
      "effects": [
        { "type": "DAMAGE", "target": { "type": "SELECTED_PARTNER" }, "amount": 3 }
      ]
    },
    "passiveEffects": [{ "type": "buff", "text": "远程伤害+1" }]
  },
  "vol_weapon_staff_nyx": {
    "id": "vol_weapon_staff_nyx",
    "name": "夜影法杖",
    "description": "掌控暗影力量的法杖。",
    "icon": "Staff",
    "type": "WEAPON",
    "usage": {
      "actionLabel": "暗影冲击",
      "isConsumable": false,
      "target": "OPPONENT",
      "effects": [
        { "type": "DAMAGE", "target": { "type": "SELECTED_PARTNER" }, "amount": 2 },
        { "type": "MODIFY_STAT", "target": { "type": "SELECTED_PARTNER" }, "stat": "speed", "amount": -1 }
      ]
    },
    "passiveEffects": [{ "type": "buff", "text": "知识+1" }]
  },
  "vol_weapon_hammer_hephaestus": {
    "id": "vol_weapon_hammer_hephaestus",
    "name": "泰坦之锤",
    "description": "锻冶之神打造的巨型战锤，威力惊人。",
    "icon": "Hammer",
    "type": "WEAPON",
    "usage": {
      "actionLabel": "粉碎",
      "isConsumable": false,
      "target": "OPPONENT",
      "effects": [
        { "type": "DAMAGE", "target": { "type": "SELECTED_PARTNER" }, "amount": 5 }
      ]
    },
    "passiveEffects": [{ "type": "buff", "text": "力量+2，但速度-1" }]
  },

  // ==================== 消耗品 ====================
  "vol_potion_ambrosia": {
    "id": "vol_potion_ambrosia",
    "name": "神酒琼浆",
    "description": "诸神的饮品，一滴即可治愈重伤。",
    "icon": "Wine",
    "type": "CONSUMABLE",
    "usage": {
      "actionLabel": "饮用",
      "isConsumable": true,
      "target": "SELF",
      "effects": [
        { "type": "HEAL", "target": { "type": "SELF" }, "amount": 4 },
        { "type": "MODIFY_STAT", "target": { "type": "SELF" }, "stat": "sanity", "amount": 2 }
      ]
    }
  },
  "vol_potion_manna": {
    "id": "vol_potion_manna",
    "name": "灵hun面包",
    "description": "神圣的食物，仅一小块就令人饱腹。",
    "icon": "Bread",
    "type": "CONSUMABLE",
    "usage": {
      "actionLabel": "食用",
      "isConsumable": true,
      "target": "SELF",
      "effects": [
        { "type": "HEAL", "target": { "type": "SELF" }, "amount": 2 }
      ]
    }
  },
  "vol_potion_phoenix": {
    "id": "vol_potion_phoenix",
    "name": "凤凰眼泪",
    "description": "神鸟凤凰的眼泪，能让人浴火重生。",
    "icon": "Tear",
    "type": "CONSUMABLE",
    "usage": {
      "actionLabel": "使用",
      "isConsumable": true,
      "target": "SELF",
      "effects": [
        { "type": "REVIVE", "target": { "type": "SELF" }, "amount": 3 }
      ]
    }
  },
  "vol_scroll_teleport": {
    "id": "vol_scroll_teleport",
    "name": "传送卷轴",
    "description": "记载空间魔法的卷轴，可瞬间转移。",
    "icon": "Scroll",
    "type": "CONSUMABLE",
    "usage": {
      "actionLabel": "传送",
      "isConsumable": true,
      "target": "SELF",
      "effects": [
        { "type": "TELEPORT", "target": { "type": "SELF" }, "destination": "any" }
      ]
    }
  },
  "vol_scroll_fireball": {
    "id": "vol_scroll_fireball",
    "name": "火球术卷轴",
    "description": "记载火焰魔法的卷轴，威力巨大。",
    "icon": "Flame",
    "type": "CONSUMABLE",
    "usage": {
      "actionLabel": "释放",
      "isConsumable": true,
      "target": "ALL_OTHERS",
      "effects": [
        { "type": "DAMAGE", "target": { "type": "ALL_OTHERS" }, "amount": 2 }
      ]
    }
  },
  "vol_scroll_shield": {
    "id": "vol_scroll_shield",
    "name": "护盾卷轴",
    "description": "记载防御魔法的卷轴。",
    "icon": "Shield",
    "type": "CONSUMABLE",
    "usage": {
      "actionLabel": "施放",
      "isConsumable": true,
      "target": "SELF",
      "effects": [
        { "type": "BUFF", "target": { "type": "SELF" }, "duration": 3, "stat": "might", "amount": 2 }
      ]
    }
  },

  // ==================== 被动物品 ====================
  "vol_armor_aegis": {
    "id": "vol_armor_aegis",
    "name": "雅典娜之盾",
    "description": "神用的盾牌，坚不可摧。",
    "icon": "Shield",
    "type": "PASSIVE",
    "usage": {
      "actionLabel": "装备",
      "isConsumable": false,
      "target": "SELF"
    },
    "passiveEffects": [
      { "type": "buff", "text": "受到伤害-1" },
      { "type": "buff", "text": "知识+1" }
    ]
  },
  "vol_boots_hermes": {
    "id": "vol_boots_hermes",
    "name": "Hermes之靴",
    "description": "神使的靴子，能飞檐走壁。",
    "icon": "Boot",
    "type": "PASSIVE",
    "usage": {
      "actionLabel": "装备",
      "isConsumable": false,
      "target": "SELF"
    },
    "passiveEffects": [
      { "type": "buff", "text": "速度+2" },
      { "type": "buff", "text": "移动时无视障碍" }
    ]
  },
  "vol_crown_glory": {
    "id": "vol_crown_glory",
    "name": "荣耀冠冕",
    "description": "表彰英雄的冠冕，佩戴者受到尊敬。",
    "icon": "Crown",
    "type": "PASSIVE",
    "usage": {
      "actionLabel": "装备",
      "isConsumable": false,
      "target": "SELF"
    },
    "passiveEffects": [
      { "type": "buff", "text": "力量+1" },
      { "type": "buff", "text": "知识+1" },
      { "type": "buff", "text": "队伍攻击+1" }
    ]
  },
  "vol_cloak_invisibility": {
    "id": "vol_cloak_invisibility",
    "name": "隐匿斗篷",
    "description": "穿上后可以短暂隐身。",
    "icon": "Cloak",
    "type": "PASSIVE",
    "usage": {
      "actionLabel": "装备",
      "isConsumable": false,
      "target": "SELF"
    },
    "passiveEffects": [
      { "type": "buff", "text": "速度+1" },
      { "type": "special", "text": "每场战斗可隐身1回合" }
    ]
  },
  "vol_amulet_truth": {
    "id": "vol_amulet_truth",
    "name": "真理护符",
    "description": "能够看穿一切谎言。",
    "icon": "Eye",
    "type": "PASSIVE",
    "usage": {
      "actionLabel": "装备",
      "isConsumable": false,
      "target": "SELF"
    },
    "passiveEffects": [
      { "type": "buff", "text": "知识+2" },
      { "type": "special", "text": "免疫心智控制" }
    ]
  },
  "vol_ring_vitality": {
    "id": "vol_ring_vitality",
    "name": "生命戒指",
    "description": "蕴含生命能量的戒指。",
    "icon": "Ring",
    "type": "PASSIVE",
    "usage": {
      "actionLabel": "装备",
      "isConsumable": false,
      "target": "SELF"
    },
    "passiveEffects": [
      { "type": "buff", "text": "最大生命+2" },
      { "type": "heal", "text": "每回合恢复1点生命" }
    ]
  },
  "vol_charm_lucky": {
    "id": "vol_charm_lucky",
    "name": "幸运 charm",
    "description": "能带来好运的护身符。",
    "icon": "Clover",
    "type": "PASSIVE",
    "usage": {
      "actionLabel": "装备",
      "isConsumable": false,
      "target": "SELF"
    },
    "passiveEffects": [
      { "type": "special", "text": "检定+1" },
      { "type": "buff", "text": "暴击率+10%" }
    ]
  },

  // ==================== 特殊物品 ====================
  "vol_key_olympus": {
    "id": "vol_key_olympus",
    "name": "Olympus密钥",
    "description": "通往诸神领域的钥匙。",
    "icon": "Key",
    "type": "KEY",
    "usage": {
      "actionLabel": "使用",
      "isConsumable": false,
      "target": "SELF"
    },
    "passiveEffects": [
      { "type": "special", "text": "完成终极任务的关键" }
    ]
  },
  "vol_compass_eternal": {
    "id": "vol_compass_eternal",
    "name": "永恒罗盘",
    "description": "永远指向正确方向的魔法罗盘。",
    "icon": "Compass",
    "type": "PASSIVE",
    "usage": {
      "actionLabel": "装备",
      "isConsumable": false,
      "target": "SELF"
    },
    "passiveEffects": [
      { "type": "special", "text": "不会迷失方向" },
      { "type": "buff", "text": "知识+1" }
    ]
  },
  "vol_orb_prophecy": {
    "id": "vol_orb_prophecy",
    "name": "预言水晶球",
    "description": "能够预知未来的神秘水晶。",
    "icon": "Crystal",
    "type": "PASSIVE",
    "usage": {
      "actionLabel": "装备",
      "isConsumable": false,
      "target": "SELF"
    },
    "passiveEffects": [
      { "type": "special", "text": "每场战斗可预判一次攻击" },
      { "type": "buff", "text": "知识+2" }
    ]
  },
  "vol_lyre_orpheus": {
    "id": "vol_lyre_orpheus",
    "name": "俄耳甫斯之琴",
    "description": "天籁之音的乐器，能安抚人心。",
    "icon": "Lyre",
    "type": "PASSIVE",
    "usage": {
      "actionLabel": "演奏",
      "isConsumable": false,
      "target": "SELF"
    },
    "passiveEffects": [
      { "type": "special", "text": "队友速度+1" },
      { "type": "heal", "text": "每回合队友恢复1点生命" }
    ]
  },
  "vol_spear_destiny": {
    "id": "vol_spear_destiny",
    "name": "命运之矛",
    "description": "能够命中注定目标的武器。",
    "icon": "Spear",
    "type": "WEAPON",
    "usage": {
      "actionLabel": "投掷",
      "isConsumable": false,
      "target": "OPPONENT",
      "effects": [
        { "type": "DAMAGE", "target": { "type": "SELECTED_PARTNER" }, "amount": 5 },
        { "type": "LOG", "message": "命运之矛命中了目标！", "style": "alert" }
      ]
    },
    "passiveEffects": [
      { "type": "buff", "text": "力量+2" },
      { "type": "special", "text": "必定命中" }
    ]
  }
};
