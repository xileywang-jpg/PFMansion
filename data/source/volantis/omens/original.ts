// 翁法罗斯主题 - 灾祸卡数据
// Volantis Omen Cards

export const OMENS_DATA = {
  "vol_omen_cursed_coin": {
    "id": "vol_omen_cursed_coin",
    "name": "诅咒金币",
    "description": "一枚沾满诅咒的金币据说能带来无尽的财富，但也带来不幸。",
    "icon": "Coin",
    "type": "OMEN",
    "passiveEffects": [
      { "type": "buff", "text": "交易时价格-1" },
      { "type": "debuff", "text": "理智-1" }
    ]
  },
  "vol_omen_oracle_skull": {
    "id": "vol_omen_oracle_skull",
    "name": "预言头骨",
    "description": "死亡先知的头骨，能预知未来但代价高昂。",
    "icon": "Skull",
    "type": "OMEN",
    "passiveEffects": [
      { "type": "special", "text": "可预知下一个事件" },
      { "type": "debuff", "text": "理智-2" }
    ]
  },
  "vol_omen_blood_stone": {
    "id": "vol_omen_blood_stone",
    "name": "血纹石",
    "description": "蕴含血腥力量的宝石，汲取持有者的生命。",
    "icon": "Gem",
    "type": "OMEN",
    "passiveEffects": [
      { "type": "buff", "text": "力量+2" },
      { "type": "debuff", "text": "每回合损失1点生命" }
    ]
  },
  "vol_omen_shadow_mirror": {
    "id": "vol_omen_shadow_mirror",
    "name": "暗影魔镜",
    "description": "映照出内心恐惧的魔镜。",
    "icon": "Mirror",
    "type": "OMEN",
    "passiveEffects": [
      { "type": "special", "text": "可复制敌人能力" },
      { "type": "debuff", "text": "理智-1" }
    ]
  },
  "vol_omen_titan_eye": {
    "id": "vol_omen_titan_eye",
    "name": "泰坦之眼",
    "description": "古老泰坦的眼睛，能看穿一切伪装。",
    "icon": "Eye",
    "type": "OMEN",
    "passiveEffects": [
      { "type": "buff", "text": "知识+2" },
      { "type": "special", "text": "识破伪装" }
    ]
  },
  "vol_omen_phoenix_feather": {
    "id": "vol_omen_phoenix_feather",
    "name": "凤凰羽毛",
    "description": "神鸟凤凰的羽毛，蕴含重生之力。",
    "icon": "Feather",
    "type": "OMEN",
    "passiveEffects": [
      { "type": "heal", "text": "每3回合恢复1点生命" },
      { "type": "buff", "text": "速度+1" }
    ]
  },
  "vol_omen_demon_flame": {
    "id": "vol_omen_demon_flame",
    "name": "恶魔之焰",
    "description": "来自深渊的火焰，永不熄灭。",
    "icon": "Flame",
    "type": "OMEN",
    "passiveEffects": [
      { "type": "buff", "text": "火焰伤害+2" },
      { "type": "debuff", "text": "理智-1" }
    ]
  },
  "vol_omen_fate_thread": {
    "id": "vol_omen_fate_thread",
    "name": "命运丝线",
    "description": "编织命运的丝线，能短暂改写命运。",
    "icon": "Thread",
    "type": "OMEN",
    "passiveEffects": [
      { "type": "special", "text": "每场战斗可重投1次骰子" },
      { "type": "debuff", "text": "理智-1" }
    ]
  },
  "vol_omen_void_crystal": {
    "id": "vol_omen_void_crystal",
    "name": "虚空结晶",
    "description": "来自虚空的碎片，连接着未知的世界。",
    "icon": "Crystal",
    "type": "OMEN",
    "passiveEffects": [
      { "type": "special", "text": "可进行空间传送" },
      { "type": "debuff", "text": "理智-2" }
    ]
  },
  "vol_omen_dragon_scale": {
    "id": "vol_omen_dragon_scale",
    "name": "龙鳞",
    "description": "巨龙的鳞片，坚不可摧。",
    "icon": "Scale",
    "type": "OMEN",
    "passiveEffects": [
      { "type": "buff", "text": "防御+2" },
      { "type": "debuff", "text": "速度-1" }
    ]
  }
};
