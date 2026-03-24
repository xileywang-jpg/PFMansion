export const ITEMS_DATA = {
  "item_revolver": {
    "id": "item_revolver",
    "name": "生锈的左轮手枪",
    "description": "一把旧式勤务武器。握在手里沉稳可靠。",
    "icon": "Crosshair",
    "type": "WEAPON",
    "usage": {
      "actionLabel": "开火",
      "isConsumable": false,
      "target": "OPPONENT",
      "effects": [
        { "type": "DAMAGE", "target": { "type": "SELECTED_PARTNER" }, "amount": 2 },
        { "type": "LOG", "message": "砰！你的左轮手枪喷出了火舌。", "style": "alert" }
      ]
    },
    "passiveEffects": ["攻击时力量 +2"]
  },
  "item_dagger": {
    "id": "item_dagger",
    "name": "祭祀匕首",
    "description": "刀刃上刻有奇怪的凹槽，似乎渴望着鲜血。",
    "icon": "Sword",
    "type": "WEAPON",
    "grantedSkills": ["skill_vampiric_strike"],
    "passiveEffects": ["获得技能：嗜血打击"]
  },
  "item_amulet": {
    "id": "item_amulet",
    "name": "神圣护身符",
    "description": "它在你的胸口散发着淡淡的暖意。",
    "icon": "Gem",
    "type": "PASSIVE",
    "passiveEffects": ["理智 +1"]
  },
  "item_adrenaline": {
    "id": "item_adrenaline",
    "name": "肾上腺素针剂",
    "description": "紧急医疗兴奋剂。请谨慎使用。",
    "icon": "Syringe",
    "type": "CONSUMABLE",
    "usage": {
      "actionLabel": "注射",
      "isConsumable": true,
      "target": "SELF",
      "effects": [
        { "type": "MODIFY_STAT", "target": { "type": "SELF" }, "stat": "speed", "amount": 2 },
        { "type": "MODIFY_STAT", "target": { "type": "SELF" }, "stat": "might", "amount": 1 },
        { "type": "LOG", "message": "你感到一股力量涌遍全身！", "style": "success" }
      ]
    }
  },
  "item_pickaxe": {
    "id": "item_pickaxe",
    "name": "矿工镐",
    "description": "不仅能挖矿，还能挖穿墙壁。",
    "icon": "Hammer",
    "type": "WEAPON",
    "passiveEffects": ["允许破坏墙壁"]
  }
};