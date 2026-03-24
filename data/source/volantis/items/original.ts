// 翁法罗斯主题 - 物品卡数据 (迭代版)
// 新增：伪装/看破、无条件穿越、特殊传送等机制
// Volantis Item Cards

export const ITEMS_DATA = [
  {
    "id": "vol_weapon_spear_athena",
    "name": "雅典娜的长矛",
    "description": "智慧女神的武器，能够精准击中敌人弱点。",
    "icon": "Spear",
    "type": "WEAPON",
    "usage": {"actionLabel":"投掷","isConsumable":false,"target":"OPPONENT","effects":[{"type":"DAMAGE","target":{"type":"SELECTED_PARTNER"},"amount":3},{"type":"LOG","message":"长矛划过一道完美的弧线，击中目标！","style":"alert"}]},
    "passiveEffects": ["力量+1"]
  },
  {
    "id": "vol_weapon_sword_ares",
    "name": "阿瑞斯之剑",
    "description": "战争之神的武器，嗜血渴望战斗。",
    "icon": "Sword",
    "type": "WEAPON",
    "usage": {"actionLabel":"猛砍","isConsumable":false,"target":"OPPONENT","effects":[{"type":"DAMAGE","target":{"type":"SELECTED_PARTNER"},"amount":4},{"type":"DAMAGE","target":{"type":"SELF"},"amount":1}]},
    "passiveEffects": ["力量+2"]
  },
  {
    "id": "vol_weapon_dagger_sifere",
    "name": "飞贼之刃",
    "description": "赛飞儿同款匕首，锋利无比。",
    "icon": "Dagger",
    "type": "WEAPON",
    "usage": {"actionLabel":"穿刺","isConsumable":false,"target":"OPPONENT","effects":[{"type":"DAMAGE","target":{"type":"SELECTED_PARTNER"},"amount":2},{"type":"MODIFY_STAT","target":{"type":"SELF"},"stat":"speed","amount":1}]},
    "passiveEffects": ["速度+1", "可穿越敌人位置"]
  },
  {
    "id": "vol_weapon_bow_apollo",
    "name": "太阳神弓",
    "description": "光明之神的武器，箭矢如阳光般璀璨。",
    "icon": "Bow",
    "type": "WEAPON",
    "usage": {"actionLabel":"狙击","isConsumable":false,"target":"OPPONENT","effects":[{"type":"DAMAGE","target":{"type":"SELECTED_PARTNER"},"amount":3}]},
    "passiveEffects": ["远程攻击+1"]
  },
  {
    "id": "vol_weapon_staff_nyx",
    "name": "夜影法杖",
    "description": "掌控暗影力量的法杖。",
    "icon": "Staff",
    "type": "WEAPON",
    "usage": {"actionLabel":"暗影冲击","isConsumable":false,"target":"OPPONENT","effects":[{"type":"DAMAGE","target":{"type":"SELECTED_PARTNER"},"amount":2},{"type":"MODIFY_STAT","target":{"type":"SELECTED_PARTNER"},"stat":"speed","amount":-1}]},
    "passiveEffects": ["知识+1", "攻击时附加减速效果"]
  },
  {
    "id": "vol_weapon_hammer_hephaestus",
    "name": "泰坦之锤",
    "description": "锻冶之神打造的巨型战锤，威力惊人。",
    "icon": "Hammer",
    "type": "WEAPON",
    "usage": {"actionLabel":"粉碎","isConsumable":false,"target":"OPPONENT","effects":[{"type":"DAMAGE","target":{"type":"SELECTED_PARTNER"},"amount":5}]},
    "passiveEffects": ["力量+2，但速度-1"]
  },
  {
    "id": "vol_potion_ambrosia",
    "name": "神酒琼浆",
    "description": "诸神的饮品，一滴即可治愈重伤。",
    "icon": "Wine",
    "type": "CONSUMABLE",
    "usage": {"actionLabel":"饮用","isConsumable":true,"target":"SELF","effects":[{"type":"HEAL","target":{"type":"SELF"},"amount":4},{"type":"MODIFY_STAT","target":{"type":"SELF"},"stat":"sanity","amount":2}]}
  },
  {
    "id": "vol_potion_phoenix",
    "name": "凤凰眼泪",
    "description": "神鸟凤凰的眼泪，能让人浴火重生。",
    "icon": "Tear",
    "type": "CONSUMABLE",
    "usage": {"actionLabel":"使用","isConsumable":true,"target":"SELF","effects":[{"type":"REVIVE","target":{"type":"SELF"},"amount":3}]}
  },
  {
    "id": "vol_scroll_teleport",
    "name": "传送卷轴",
    "description": "记载空间魔法的卷轴，可瞬间转移。",
    "icon": "Scroll",
    "type": "CONSUMABLE",
    "usage": {"actionLabel":"传送","isConsumable":true,"target":"SELF","effects":[{"type":"TELEPORT","target":{"type":"SELF"},"location":"any"}]}
  },
  {
    "id": "vol_scroll_fireball",
    "name": "火球术卷轴",
    "description": "记载火焰魔法的卷轴，威力巨大。",
    "icon": "Flame",
    "type": "CONSUMABLE",
    "usage": {"actionLabel":"释放","isConsumable":true,"target":"ALL_OTHERS","effects":[{"type":"DAMAGE","target":{"type":"ALL_OTHERS"},"amount":2}]}
  },
  {
    "id": "vol_scroll_reveal",
    "name": "洞察卷轴",
    "description": "看破一切隐匿与幻象的魔法卷轴。",
    "icon": "Eye",
    "type": "CONSUMABLE",
    "usage": {"actionLabel":"使用","isConsumable":true,"target":"SELF","effects":[{"type":"special","effect":"reveal_all","message":"你发现了所有隐藏的区域！"},{"type":"special","effect":"detect_disguise","message":"所有隐匿的单位都无所遁形！"}]}
  },
  {
    "id": "vol_potion_invisibility",
    "name": "隐形药水",
    "description": "喝下后可隐匿身形一段时间。",
    "icon": "Potion",
    "type": "CONSUMABLE",
    "usage": {"actionLabel":"饮用","isConsumable":true,"target":"SELF","effects":[{"type":"special","effect":"invisible","duration":3,"message":"你变得不可见！"}]}
  },
  {
    "id": "vol_scroll_passwall",
    "name": "穿墙卷轴",
    "description": "能让持有者无条件穿过墙壁的魔法。",
    "icon": "Scroll",
    "type": "CONSUMABLE",
    "usage": {"actionLabel":"使用","isConsumable":true,"target":"SELF","effects":[{"type":"special","effect":"pass_wall","duration":2,"message":"你可以穿过墙壁！"}]}
  },
  {
    "id": "vol_cloak_disguise",
    "name": "伪装斗篷",
    "description": "穿上后可伪装成其他阵营的单位。",
    "icon": "Cloak",
    "type": "PASSIVE",
    "usage": {"actionLabel":"装备","isConsumable":false,"target":"SELF"},
    "passiveEffects": ["可主动使用伪装（持续3回合）"],
    "grantedActions": [{"id":"action_disguise","name":"伪装","description":"伪装成敌人或中立单位","cost":{"type":"sanity","amount":1},"effects":[{"type":"special","effect":"disguise","duration":3},{"type":"LOG","message":"你伪装成功！","style":"success"}]}]
  },
  {
    "id": "vol_amulet_truth",
    "name": "真理护符",
    "description": "能够看穿一切伪装与幻象。",
    "icon": "Eye",
    "type": "PASSIVE",
    "usage": {"actionLabel":"装备","isConsumable":false,"target":"SELF"},
    "passiveEffects": ["知识+2", "免疫心智控制", "可看破隐匿单位"]
  },
  {
    "id": "vol_ring_detection",
    "name": "侦测戒指",
    "description": "能够探测附近的隐藏机关和单位。",
    "icon": "Ring",
    "type": "PASSIVE",
    "usage": {"actionLabel":"装备","isConsumable":false,"target":"SELF"},
    "passiveEffects": ["自动侦测陷阱", "进入区域时自动揭示隐藏内容"]
  },
  {
    "id": "vol_boots_hermes",
    "name": "Hermes之靴",
    "description": "神使的靴子，能飞檐走壁，无视地形。",
    "icon": "Boot",
    "type": "PASSIVE",
    "usage": {"actionLabel":"装备","isConsumable":false,"target":"SELF"},
    "passiveEffects": ["速度+2", "移动时无视障碍物", "可无条件穿越地形"]
  },
  {
    "id": "vol_ring_teleport",
    "name": "传送戒指",
    "description": "蕴含空间魔法的戒指，可随时传送。",
    "icon": "Ring",
    "type": "PASSIVE",
    "usage": {"actionLabel":"装备","isConsumable":false,"target":"SELF"},
    "passiveEffects": ["每场战斗可传送1次到任意已探索区域"],
    "grantedActions": [{"id":"action_teleport","name":"任意传送","description":"传送到任意已探索区域","cost":{"type":"sanity","amount":1},"effects":[{"type":"TELEPORT","target":{"type":"SELF"},"location":"any_revealed"}]}]
  },
  {
    "id": "vol_cloak_phasing",
    "name": "相位斗篷",
    "description": "允许穿戴者短暂进入相位状态穿过实体。",
    "icon": "Cloak",
    "type": "PASSIVE",
    "usage": {"actionLabel":"装备","isConsumable":false,"target":"SELF"},
    "passiveEffects": ["每回合可选择进入相位状态1次", "相位状态下可穿过墙壁和敌人"]
  },
  {
    "id": "vol_armor_aegis",
    "name": "雅典娜之盾",
    "description": "神用的盾牌，坚不可摧。",
    "icon": "Shield",
    "type": "PASSIVE",
    "usage": {"actionLabel":"装备","isConsumable":false,"target":"SELF"},
    "passiveEffects": ["受到伤害-1", "知识+1"]
  },
  {
    "id": "vol_crown_glory",
    "name": "荣耀冠冕",
    "description": "表彰英雄的冠冕，佩戴者受到尊敬。",
    "icon": "Crown",
    "type": "PASSIVE",
    "usage": {"actionLabel":"装备","isConsumable":false,"target":"SELF"},
    "passiveEffects": ["力量+1", "知识+1", "队伍攻击+1"]
  },
  {
    "id": "vol_charm_lucky",
    "name": "幸运charm",
    "description": "能带来好运的护身符。",
    "icon": "Clover",
    "type": "PASSIVE",
    "usage": {"actionLabel":"装备","isConsumable":false,"target":"SELF"},
    "passiveEffects": ["检定+1", "暴击率+10%"]
  },
  {
    "id": "vol_orb_prophecy",
    "name": "预言水晶球",
    "description": "能够预知未来的神秘水晶。",
    "icon": "Crystal",
    "type": "PASSIVE",
    "usage": {"actionLabel":"使用","isConsumable":false,"target":"SELF"},
    "passiveEffects": ["每场战斗可预判一次攻击", "知识+2"],
    "grantedActions": [{"id":"action_prophecy","name":"预言","description":"预知下一次事件","effects":[{"type":"special","effect":"reveal_next_event"},{"type":"LOG","message":"水晶球揭示了未来！","style":"info"}]}]
  },
  {
    "id": "vol_lyre_orpheus",
    "name": "俄耳甫斯之琴",
    "description": "天籁之音的乐器，能安抚人心。",
    "icon": "Lyre",
    "type": "PASSIVE",
    "usage": {"actionLabel":"演奏","isConsumable":false,"target":"SELF"},
    "passiveEffects": ["队友速度+1", "每回合队友恢复1点生命"]
  }
];