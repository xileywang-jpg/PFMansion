// 翁法罗斯主题 - 灾祸卡数据 (迭代版)
// 使用精准格式化表述
// Volantis Omen Cards

export const OMENS_DATA = [
  {
    "id": "vol_omen_cursed_coin",
    "name": "诅咒金币",
    "description": "一枚沾满诅咒的金币据说能带来无尽的财富，但也带来不幸。",
    "icon": "Coin",
    "type": "OMEN",
    "passiveEffects": [{"type":"buff","text":"交易时价格-1"},{"type":"debuff","text":"理智-1"}],
    "onTurnStart": {"type":"CHECK","condition":{"op":"EQ","stat":"sanity","value":0},"effect":{"type":"lose_game","message":"理智归零，你被金币的诅咒吞噬！"}}
  },
  {
    "id": "vol_omen_oracle_skull",
    "name": "预言头骨",
    "description": "死亡先知的头骨，能预知未来但代价高昂。",
    "icon": "Skull",
    "type": "OMEN",
    "passiveEffects": [{"type":"special","text":"可预知下一个事件（需行动）"}],
    "grantedActions": [{"id":"action_prophecy","name":"颅中低语","description":"向头骨询问未来","cost":{"type":"sanity","amount":2},"effects":[{"type":"special","effect":"reveal_next_event"},{"type":"LOG","message":"头骨揭示了命运的轨迹...","style":"narrative"}]}]
  },
  {
    "id": "vol_omen_blood_stone",
    "name": "血纹石",
    "description": "蕴含血腥力量的宝石，汲取持有者的生命。",
    "icon": "Gem",
    "type": "OMEN",
    "passiveEffects": [{"type":"buff","text":"力量+2"}],
    "onTurnEnd": {"type":"DAMAGE","target":{"type":"SELF"},"amount":1,"message":"血纹石正在汲取你的生命！"}
  },
  {
    "id": "vol_omen_shadow_mirror",
    "name": "暗影魔镜",
    "description": "映照出内心恐惧的魔镜。",
    "icon": "Mirror",
    "type": "OMEN",
    "passiveEffects": [{"type":"debuff","text":"理智-1"}],
    "grantedActions": [{"id":"action_mirror_copy","name":"镜像复制","description":"复制范围内一个单位的能力","condition":{"op":"GT","stat":"sanity","value":3},"effects":[{"type":"special","effect":"copy_ability","target":"NEAREST_ENEMY"},{"type":"LOG","message":"你复制了敌人的能力！","style":"success"}]}]
  },
  {
    "id": "vol_omen_titan_eye",
    "name": "泰坦之眼",
    "description": "古老泰坦的眼睛，能看穿一切伪装。",
    "icon": "Eye",
    "type": "OMEN",
    "passiveEffects": [{"type":"buff","text":"知识+2"},{"type":"special","text":"自动识破伪装和隐匿"}],
    "onEnterTile": {"type":"AUTO_REVEAL","message":"泰坦之眼揭示了隐藏的区域！"}
  },
  {
    "id": "vol_omen_phoenix_feather",
    "name": "凤凰羽毛",
    "description": "神鸟凤凰的羽毛，蕴含重生之力。",
    "icon": "Feather",
    "type": "OMEN",
    "passiveEffects": [{"type":"heal","text":"每3回合恢复1点生命"},{"type":"buff","text":"速度+1"}],
    "onDeath": {"type":"REVIVE","amount":3,"message":"凤凰羽毛让你浴火重生！"}
  },
  {
    "id": "vol_omen_demon_flame",
    "name": "恶魔之焰",
    "description": "来自深渊的火焰，永不熄灭。",
    "icon": "Flame",
    "type": "OMEN",
    "passiveEffects": [{"type":"buff","text":"火焰伤害+2"}],
    "onAttack": {"type":"ADD_EFFECT","effect":{"type":"burn","damage":1,"duration":2},"message":"恶魔之焰灼烧着敌人！"}
  },
  {
    "id": "vol_omen_fate_thread",
    "name": "命运丝线",
    "description": "编织命运的丝线，能短暂改写命运。",
    "icon": "Thread",
    "type": "OMEN",
    "passiveEffects": [{"type":"debuff","text":"理智-1"}],
    "grantedActions": [{"id":"action_reroll","name":"命运重织","description":"重投一次骰子","cooldown":3,"effects":[{"type":"special","effect":"reroll"},{"type":"LOG","message":"你改写了命运！","style":"success"}]}]
  },
  {
    "id": "vol_omen_void_crystal",
    "name": "虚空结晶",
    "description": "来自虚空的碎片，连接着未知的世界。",
    "icon": "Crystal",
    "type": "OMEN",
    "passiveEffects": [{"type":"debuff","text":"理智-2"}],
    "grantedActions": [{"id":"action_void_teleport","name":"虚空穿越","description":"传送到任意已揭示区域","cost":{"type":"sanity","amount":2},"effects":[{"type":"TELEPORT","target":{"type":"SELF"},"location":"any_revealed"}]}]
  },
  {
    "id": "vol_omen_dragon_scale",
    "name": "龙鳞",
    "description": "巨龙的鳞片，坚不可摧。",
    "icon": "Scale",
    "type": "OMEN",
    "passiveEffects": [{"type":"buff","text":"防御+2"},{"type":"debuff","text":"速度-1"}],
    "onReceiveDamage": {"type":"REDUCE","amount":1,"message":"龙鳞抵消了部分伤害！"}
  },
  {
    "id": "vol_omen_siren_voice",
    "name": "塞壬之声",
    "description": "迷惑心智的歌声，让人无法自制。",
    "icon": "Music",
    "type": "OMEN",
    "passiveEffects": [{"type":"special","text":"敌人攻击你时有一定几率迷惑"}],
    "onEnemyAttack": {"type":"CHECK","condition":{"op":"ROLL_CHANCE","value":30},"effect":{"type":"confuse","target":{"type":"ATTACKER"},"duration":1},"message":"塞壬之声迷惑了攻击者！"}
  },
  {
    "id": "vol_omen_medusa_gaze",
    "name": "美杜莎之凝视",
    "description": "石化之眼，被直视者将逐渐石化。",
    "icon": "Eye",
    "type": "OMEN",
    "passiveEffects": [{"type":"debuff","text":"理智-1"}],
    "onAttack": {"type":"CHECK","condition":{"op":"ROLL_CHANCE","value":20},"effect":{"type":"petrify","target":{"type":"TARGET"},"duration":2},"message":"敌人被石化了！"}
  }
];
