// 翁法罗斯主题 - 事件卡数据
// Volantis Event Cards

export const EVENTS_DATA = {
  "event_abandoned_camp": {
      "id": "event_abandoned_camp",
      "type": "EVENT",
      "title": "废弃营地",
      "description": "一个探险队留下的临时营地，看起来他们遭遇了什么可怕的事情。",
      "icon": "Tent",
      "triggerType": "ON_ENTER",
      "interaction": {
          "type": "CHOICE",
          "options": [
              {
                  "label": "搜寻物资",
                  "effects": [
                      {
                          "type": "DRAW_CARD",
                          "deck": "ITEM",
                          "message": "你找到了幸存者留下的补给！"
                      }
                  ]
              },
              {
                  "label": "调查痕迹",
                  "effects": [
                      {
                          "type": "MODIFY_STAT",
                          "stat": "knowledge",
                          "amount": 1,
                          "message": "你发现了他们遭遇了什么。"
                      },
                      {
                          "type": "LOG",
                          "message": "调查让你获得了重要的情报。",
                          "style": "info"
                      }
                  ]
              },
              {
                  "label": "离开",
                  "effects": [
                      {
                          "type": "LOG",
                          "message": "你感到不安，迅速离开了这里。",
                          "style": "narrative"
                      }
                  ]
              }
          ]
      }
  },
  "event_blood_stain": {
      "id": "event_blood_stain",
      "type": "EVENT",
      "title": "神秘血迹",
      "description": "墙上的血迹像是某种仪式的一部分，还在微微发亮。",
      "icon": "Droplet",
      "triggerType": "ON_ENTER",
      "interaction": {
          "type": "CHOICE",
          "options": [
              {
                  "label": "进行调查",
                  "effects": [
                      {
                          "type": "MODIFY_STAT",
                          "stat": "knowledge",
                          "amount": 1,
                          "message": "你发现这是某种黑暗仪式的痕迹。"
                      },
                      {
                          "type": "LOG",
                          "message": "调查让你获得了有用的情报。",
                          "style": "info"
                      }
                  ]
              },
              {
                  "label": "触摸血迹",
                  "effects": [
                      {
                          "type": "MODIFY_STAT",
                          "stat": "sanity",
                          "amount": -1,
                          "message": "一阵寒意顺着指尖传遍全身。"
                      },
                      {
                          "type": "LOG",
                          "message": "你感到一股不属于这个世界的力量。",
                          "style": "alert"
                      }
                  ]
              },
              {
                  "label": "忽视它",
                  "effects": [
                      {
                          "type": "LOG",
                          "message": "你决定不理会这个可疑的痕迹。",
                          "style": "narrative"
                      }
                  ]
              }
          ]
      }
  },
  "event_burning_man": {
      "id": "event_burning_man",
      "type": "EVENT",
      "title": "燃烧之人",
      "description": "一个被火焰包围的鬼魅人影在你面前无声地尖叫。",
      "flavorText": "这火焰虽是幻象，但恐惧却真实无比。",
      "icon": "Flame",
      "triggerType": "ON_ENTER",
      "interaction": {
          "type": "ATTRIBUTE_CHECK",
          "attribute": "sanity",
          "difficulty": 4,
          "success": [
              {
                  "type": "MODIFY_STAT",
                  "stat": "knowledge",
                  "amount": 1,
                  "message": "你意识到这只是幻象并获得了洞察力。"
              },
              {
                  "type": "LOG",
                  "message": "火焰如同出现时一样迅速熄灭了。",
                  "style": "narrative"
              }
          ],
          "failure": [
              {
                  "type": "MODIFY_STAT",
                  "stat": "sanity",
                  "amount": -1,
                  "message": "剧烈的恐惧灼伤了你的精神。"
              },
              {
                  "type": "LOG",
                  "message": "你惊恐地逃离现场。",
                  "style": "narrative"
              }
          ]
      }
  },
  "event_coffin": {
      "id": "event_coffin",
      "type": "EVENT",
      "title": "漆黑的棺材",
      "description": "你发现了一个打开的棺材，里面躺着一具苍白的躯体。",
      "icon": "Moon",
      "triggerType": "ON_ENTER",
      "interaction": {
          "type": "CHOICE",
          "options": [
              {
                  "label": "打入木桩 (需要匕首)",
                  "effects": [
                      {
                          "type": "IF",
                          "condition": {
                              "op": "HAS_ITEM",
                              "itemId": "item_dagger"
                          },
                          "then": [
                              {
                                  "type": "LOG",
                                  "message": "怪物在尖叫中化为灰烬！你获得了它的力量。",
                                  "style": "success"
                              },
                              {
                                  "type": "MODIFY_STAT",
                                  "stat": "might",
                                  "amount": 1
                              }
                          ],
                          "else": [
                              {
                                  "type": "LOG",
                                  "message": "你手里没有合适的武器！怪物苏醒了并袭击了你！",
                                  "style": "alert"
                              },
                              {
                                  "type": "MODIFY_STAT",
                                  "stat": "might",
                                  "amount": -2
                              }
                          ]
                      }
                  ]
              },
              {
                  "label": "搜身",
                  "effects": [
                      {
                          "type": "LOG",
                          "message": "你忍着恐惧搜寻了一番，发现了一些有用的东西。",
                          "style": "info"
                      },
                      {
                          "type": "DRAW_CARD",
                          "deck": "ITEM"
                      }
                  ]
              },
              {
                  "label": "悄悄离开",
                  "effects": [
                      {
                          "type": "LOG",
                          "message": "你屏住呼吸离开了房间，决定不打扰它。",
                          "style": "narrative"
                      }
                  ]
              }
          ]
      }
  },
  "event_creaky_floor": {
      "id": "event_creaky_floor",
      "type": "EVENT",
      "title": "腐烂的地板",
      "description": "脚下的木头伴随着刺耳的断裂声突然崩塌。",
      "flavorText": "下方的黑暗在等待着你。",
      "icon": "ArrowDown",
      "triggerType": "ON_ENTER",
      "interaction": {
          "type": "ATTRIBUTE_CHECK",
          "attribute": "speed",
          "difficulty": 3,
          "success": [
              {
                  "type": "LOG",
                  "message": "你千钧一发之际跳到了安全地带。",
                  "style": "narrative"
              }
          ],
          "failure": [
              {
                  "type": "MODIFY_STAT",
                  "stat": "might",
                  "amount": -1,
                  "message": "坠落造成了 1 点物理伤害。"
              },
              {
                  "type": "LOG",
                  "message": "你重重地摔在冰冷的石板地上。",
                  "style": "narrative"
              }
          ]
      }
  },
  "event_crystal_orb": {
      "id": "event_crystal_orb",
      "type": "EVENT",
      "title": "水晶球",
      "description": "房间中央摆放着一个发光的水晶球，里面似乎有影像在流动。",
      "icon": "Sparkles",
      "triggerType": "ON_ENTER",
      "interaction": {
          "type": "ATTRIBUTE_CHECK",
          "attribute": "knowledge",
          "difficulty": 4,
          "success": [
              {
                  "type": "MODIFY_STAT",
                  "stat": "knowledge",
                  "amount": 1,
                  "message": "水晶球向你展示了大厦的秘密通道！"
              },
              {
                  "type": "LOG",
                  "message": "你发现了隐藏路径。",
                  "style": "success"
              }
          ],
          "failure": [
              {
                  "type": "MODIFY_STAT",
                  "stat": "sanity",
                  "amount": -1,
                  "message": "水晶球的影像让你头晕目眩。"
              }
          ]
      }
  },
  "event_ghost_whisper": {
      "id": "event_ghost_whisper",
      "type": "EVENT",
      "title": "幽灵低语",
      "description": "一个声音从阴影中低语着你的名字。\"离开这里...\"它嘶嘶作响。",
      "icon": "Ghost",
      "triggerType": "ON_ENTER",
      "interaction": {
          "type": "ATTRIBUTE_CHECK",
          "attribute": "sanity",
          "difficulty": 4,
          "success": [
              {
                  "type": "MODIFY_STAT",
                  "stat": "knowledge",
                  "amount": 1,
                  "message": "你稳住了心神，从低语中捕捉到了线索。"
              }
          ],
          "failure": [
              {
                  "type": "MODIFY_STAT",
                  "stat": "sanity",
                  "amount": -1,
                  "message": "这声音像爪子一样撕扯着你的理智。"
              }
          ]
      }
  },
  "event_mirror": {
      "id": "event_mirror",
      "type": "EVENT",
      "title": "破碎的镜子",
      "description": "一面大镜子碎裂在地，镜中的你似乎...不太对劲。",
      "icon": "CircleDot",
      "triggerType": "ON_ENTER",
      "interaction": {
          "type": "ATTRIBUTE_CHECK",
          "attribute": "sanity",
          "difficulty": 3,
          "success": [
              {
                  "type": "LOG",
                  "message": "你稳住了心神，镜中的异象消失了。",
                  "style": "narrative"
              }
          ],
          "failure": [
              {
                  "type": "MODIFY_STAT",
                  "stat": "sanity",
                  "amount": -2,
                  "message": "镜中的你向你伸出了手！理智大幅下降！"
              },
              {
                  "type": "LOG",
                  "message": "你惊恐地打碎了剩余的镜面。",
                  "style": "alert"
              }
          ]
      }
  },
  "event_strange_book": {
      "id": "event_strange_book",
      "type": "EVENT",
      "title": "禁忌之书",
      "description": "书架上有一本古老的书籍，封面上的符号让你感到不安。",
      "icon": "Book",
      "triggerType": "ON_ENTER",
      "interaction": {
          "type": "ATTRIBUTE_CHECK",
          "attribute": "knowledge",
          "difficulty": 3,
          "success": [
              {
                  "type": "MODIFY_STAT",
                  "stat": "knowledge",
                  "amount": 2,
                  "message": "你理解了书中的奥秘，知识大幅提升！"
              },
              {
                  "type": "LOG",
                  "message": "禁忌的知识让你对这个世界有了新的认识。",
                  "style": "success"
              }
          ],
          "failure": [
              {
                  "type": "MODIFY_STAT",
                  "stat": "sanity",
                  "amount": -1,
                  "message": "书中的内容让你的理智受到了冲击。"
              },
              {
                  "type": "LOG",
                  "message": "你合上了书，不敢再翻开它。",
                  "style": "narrative"
              }
          ]
      }
  },
  "event_underground_lake": {
      "id": "event_underground_lake",
      "type": "EVENT",
      "title": "地下湖",
      "description": "你来到一个地下洞穴，平静的湖面反射着诡异的光芒。",
      "icon": "Waves",
      "triggerType": "ON_ENTER",
      "interaction": {
          "type": "CHOICE",
          "options": [
              {
                  "label": "饮用湖水",
                  "effects": [
                      {
                          "type": "MODIFY_STAT",
                          "stat": "speed",
                          "amount": 1,
                          "message": "湖水清凉甘甜，你感到身体轻盈了许多！"
                      },
                      {
                          "type": "LOG",
                          "message": "你获得了神秘的力量。",
                          "style": "success"
                      }
                  ]
              },
              {
                  "label": "继续前进",
                  "effects": [
                      {
                          "type": "LOG",
                          "message": "你绕过了湖水，继续探索。",
                          "style": "narrative"
                      }
                  ]
              }
          ]
      }
  },
  "event_vault_chest": {
      "id": "event_vault_chest",
      "type": "EVENT",
      "title": "上锁的宝箱",
      "description": "金库的中心放着一个沉重的铁箱，需要巨大的力量才能撬开。",
      "icon": "Lock",
      "triggerType": "ON_ENTER",
      "interaction": {
          "type": "ATTRIBUTE_CHECK",
          "attribute": "might",
          "difficulty": 3,
          "success": [
              {
                  "type": "DRAW_CARD",
                  "deck": "ITEM",
                  "message": "你用力撬开了锁，发现了里面的宝藏！"
              }
          ],
          "failure": [
              {
                  "type": "LOG",
                  "message": "锁纹丝不动。也许下次运气会好点。",
                  "style": "narrative"
              }
          ]
      }
  },
  "event_vines": {
      "id": "event_vines",
      "type": "EVENT",
      "title": "纠缠的藤蔓",
      "description": "枯死的植物突然像活了一样，紧紧缠住了你的双脚！",
      "icon": "Trees",
      "triggerType": "ON_ENTER",
      "interaction": {
          "type": "ATTRIBUTE_CHECK",
          "attribute": "might",
          "difficulty": 3,
          "success": [
              {
                  "type": "LOG",
                  "message": "你轻松挣脱了这些枯萎的藤蔓。",
                  "style": "narrative"
              }
          ],
          "failure": [
              {
                  "type": "MODIFY_STAT",
                  "stat": "speed",
                  "amount": -1,
                  "message": "长刺刺伤了你的腿，行动受阻。"
              }
          ]
      }
  },
  "vol_event_abyss_gaze": {
      "id": "vol_event_abyss_gaze",
      "type": "EVENT",
      "title": "深渊凝视",
      "description": "你站在世界的边缘，无尽的虚空正在呼唤你跳下去...",
      "icon": "Eye",
      "triggerType": "ON_ENTER",
      "interaction": {
          "type": "ATTRIBUTE_CHECK",
          "attribute": "sanity",
          "difficulty": 5,
          "success": [
              {
                  "type": "MODIFY_STAT",
                  "stat": "knowledge",
                  "amount": 2,
                  "message": "你从深渊中看到了真理，知识 +2！"
              },
              {
                  "type": "LOG",
                  "message": "你抵抗住了虚空的诱惑。",
                  "style": "success"
              }
          ],
          "failure": [
              {
                  "type": "MODIFY_STAT",
                  "stat": "sanity",
                  "amount": -4,
                  "message": "深渊的呼唤让你完全疯狂，理智 -4！！！"
              },
              {
                  "type": "MODIFY_STAT",
                  "stat": "speed",
                  "amount": -1,
                  "message": "你的精神崩溃导致身体也无法控制。"
              },
              {
                  "type": "LOG",
                  "message": "你的一部分已经堕入了虚空...",
                  "style": "alert"
              }
          ]
      }
  },
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
              {
                  "type": "modify_stat",
                  "attribute": "might",
                  "amount": 1,
                  "message": "你成功躲避了攻击，并进行反击！"
              },
              {
                  "type": "narrative_log",
                  "message": "反应够快！你安然无恙。"
              }
          ],
          "failure": [
              {
                  "type": "damage",
                  "amount": 2,
                  "message": "你被击中受伤。"
              },
              {
                  "type": "narrative_log",
                  "message": "反应不及，你受到了伤害。"
              }
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
              {
                  "type": "modify_stat",
                  "attribute": "knowledge",
                  "amount": 2,
                  "message": "你理解了卷轴上的内容！"
              },
              {
                  "type": "narrative_log",
                  "message": "知识就是力量。"
              }
          ],
          "failure": [
              {
                  "type": "modify_stat",
                  "attribute": "knowledge",
                  "amount": 1,
                  "message": "你勉强看懂了一些内容。"
              },
              {
                  "type": "narrative_log",
                  "message": "内容太过晦涩。"
              }
          ]
      }
  },
  "vol_event_ancient_warrior": {
      "id": "vol_event_ancient_warrior",
      "type": "EVENT",
      "title": "远古战士的挑战",
      "description": "斗技场的尘土飞扬，一个身披远古铠甲的战士向你走来...",
      "icon": "Sword",
      "triggerType": "ON_ENTER",
      "interaction": {
          "type": "ATTRIBUTE_CHECK",
          "attribute": "might",
          "difficulty": 4,
          "success": [
              {
                  "type": "MODIFY_STAT",
                  "stat": "might",
                  "amount": 2,
                  "message": "你击败了远古战士，获得了他的认可！"
              },
              {
                  "type": "LOG",
                  "message": "战士向你点了点头，化为了尘土。",
                  "style": "success"
              }
          ],
          "failure": [
              {
                  "type": "MODIFY_STAT",
                  "stat": "might",
                  "amount": -1,
                  "message": "你被打败了，力量 -1"
              },
              {
                  "type": "LOG",
                  "message": "远古的力量不是现在的你能抗衡的。",
                  "style": "alert"
              }
          ]
      }
  },
  "vol_event_arena_spirit": {
      "id": "vol_event_arena_spirit",
      "type": "EVENT",
      "title": "永火英灵",
      "description": "竞技场的亡魂从看台上一跃而起，向你发出挑战的怒吼！",
      "icon": "Sword",
      "triggerType": "ON_ENTER",
      "interaction": {
          "type": "CHOICE",
          "options": [
              {
                  "label": "接受挑战",
                  "effects": [
                      {
                          "type": "MODIFY_STAT",
                          "stat": "might",
                          "amount": -1,
                          "message": "战斗让你伤痕累累，力量 -1"
                      },
                      {
                          "type": "LOG",
                          "message": "你击败了英灵，获得了它的认可！",
                          "style": "success"
                      }
                  ]
              },
              {
                  "label": "用智慧取胜",
                  "effects": [
                      {
                          "type": "MODIFY_STAT",
                          "stat": "knowledge",
                          "amount": 1,
                          "message": "你发现了英灵的弱点，知识 +1"
                      },
                      {
                          "type": "LOG",
                          "message": "你用计谋化解了战斗。",
                          "style": "info"
                      }
                  ]
              },
              {
                  "label": "逃离竞技场",
                  "effects": [
                      {
                          "type": "MODIFY_STAT",
                          "stat": "speed",
                          "amount": -1,
                          "message": "逃跑时摔了一跤，速度 -1"
                      },
                      {
                          "type": "LOG",
                          "message": "你狼狈地逃离了竞技场。",
                          "style": "narrative"
                      }
                  ]
              }
          ]
      }
  },
  "vol_event_aurora_song": {
      "id": "vol_event_aurora_song",
      "type": "EVENT",
      "title": "极光之歌",
      "description": "草原上空的极光仿佛有生命般舞动着，发出美妙的歌声...",
      "icon": "Music",
      "triggerType": "ON_ENTER",
      "interaction": {
          "type": "ATTRIBUTE_CHECK",
          "attribute": "sanity",
          "difficulty": 3,
          "success": [
              {
                  "type": "MODIFY_STAT",
                  "stat": "sanity",
                  "amount": 2,
                  "message": "极光的歌声净化了你的心灵！理智 +2！"
              },
              {
                  "type": "LOG",
                  "message": "你沉醉在这美景中。",
                  "style": "success"
              }
          ],
          "failure": [
              {
                  "type": "MODIFY_STAT",
                  "stat": "sanity",
                  "amount": -1,
                  "message": "歌声让你产生了幻觉。"
              },
              {
                  "type": "LOG",
                  "message": "你不得不堵住耳朵。",
                  "style": "narrative"
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
              {
                  "type": "modify_stat",
                  "attribute": "sanity",
                  "amount": 2,
                  "message": "音乐抚慰了你的心灵。"
              },
              {
                  "type": "narrative_log",
                  "message": "你感到心境平和。"
              }
          ],
          "failure": [
              {
                  "type": "narrative_log",
                  "message": "音乐让你有些烦躁。"
              }
          ]
      }
  },
  "vol_event_crystal_resonance": {
      "id": "vol_event_crystal_resonance",
      "type": "EVENT",
      "title": "水晶共鸣",
      "description": "矿洞中的巨大水晶与你产生了奇妙的共鸣...",
      "icon": "Gem",
      "triggerType": "ON_ENTER",
      "interaction": {
          "type": "CHOICE",
          "options": [
              {
                  "label": "吸收能量",
                  "effects": [
                      {
                          "type": "MODIFY_STAT",
                          "stat": "sanity",
                          "amount": 2,
                          "message": "水晶的能量让你感到无比宁静！"
                      },
                      {
                          "type": "LOG",
                          "message": "你获得了水晶的祝福。",
                          "style": "success"
                      }
                  ]
              },
              {
                  "label": "采集水晶",
                  "effects": [
                      {
                          "type": "DRAW_CARD",
                          "deck": "ITEM",
                          "message": "你采集到一块珍贵的水晶！"
                      }
                  ]
              },
              {
                  "label": "离开",
                  "effects": [
                      {
                          "type": "LOG",
                          "message": "你决定不打扰这些神奇的水晶。",
                          "style": "narrative"
                      }
                  ]
              }
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
              {
                  "type": "modify_stat",
                  "attribute": "sanity",
                  "amount": -1,
                  "message": "你勉强抵御了诅咒。"
              },
              {
                  "type": "narrative_log",
                  "message": "诅咒被你击退。"
              }
          ],
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
                  "type": "narrative_log",
                  "message": "诅咒深深侵蚀了你。"
              }
          ]
      }
  },
  "vol_event_death_gate": {
      "id": "vol_event_death_gate",
      "type": "EVENT",
      "title": "冥潭之门",
      "description": "死亡的气息在这里凝聚成实质，你能听到冥潭深处的呼唤...",
      "icon": "Skull",
      "triggerType": "ON_ENTER",
      "interaction": {
          "type": "ATTRIBUTE_CHECK",
          "attribute": "sanity",
          "difficulty": 5,
          "success": [
              {
                  "type": "MODIFY_STAT",
                  "stat": "knowledge",
                  "amount": 2,
                  "message": "你从死亡边缘领悟了生命的真谛，知识 +2！"
              },
              {
                  "type": "LOG",
                  "message": "你成功抵抗了死亡的诱惑。",
                  "style": "success"
              }
          ],
          "failure": [
              {
                  "type": "MODIFY_STAT",
                  "stat": "sanity",
                  "amount": -3,
                  "message": "死亡的恐惧让你几近崩溃，理智 -3！"
              },
              {
                  "type": "LOG",
                  "message": "你匍匐在地，无法呼吸...",
                  "style": "alert"
              }
          ]
      }
  },
  "vol_event_desert_storm": {
      "id": "vol_event_desert_storm",
      "type": "EVENT",
      "title": "沙尘暴",
      "description": "沙漠中突然刮起了猛烈的沙尘暴，能见度急剧下降！",
      "icon": "Wind",
      "triggerType": "ON_ENTER",
      "interaction": {
          "type": "ATTRIBUTE_CHECK",
          "attribute": "speed",
          "difficulty": 4,
          "success": [
              {
                  "type": "LOG",
                  "message": "你成功在风暴中找到了避难所！",
                  "style": "success"
              }
          ],
          "failure": [
              {
                  "type": "MODIFY_STAT",
                  "stat": "speed",
                  "amount": -1,
                  "message": "风暴让你迷失了方向！"
              },
              {
                  "type": "LOG",
                  "message": "你在沙丘中跌跌撞撞，消耗了大量体力。",
                  "style": "alert"
              }
          ]
      }
  },
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
              {
                  "type": "modify_stat",
                  "attribute": "might",
                  "amount": 1
              },
              {
                  "type": "modify_stat",
                  "attribute": "speed",
                  "amount": 1
              },
              {
                  "type": "modify_stat",
                  "attribute": "sanity",
                  "amount": 1
              },
              {
                  "type": "modify_stat",
                  "attribute": "knowledge",
                  "amount": 1
              },
              {
                  "type": "narrative_log",
                  "message": "诸神眷顾于你！"
              }
          ],
          "failure": [
              {
                  "type": "modify_stat",
                  "attribute": "might",
                  "amount": 1
              },
              {
                  "type": "narrative_log",
                  "message": "祝福降临，但你只获得了部分力量。"
              }
          ]
      }
  },
  "vol_event_divine_light": {
      "id": "vol_event_divine_light",
      "type": "EVENT",
      "title": "诸神的光辉",
      "description": "光辉神庙的光芒笼罩着你，一种神圣的感觉油然而生。",
      "icon": "Sun",
      "triggerType": "ON_ENTER",
      "interaction": {
          "type": "ATTRIBUTE_CHECK",
          "attribute": "sanity",
          "difficulty": 4,
          "success": [
              {
                  "type": "MODIFY_STAT",
                  "stat": "sanity",
                  "amount": 2,
                  "message": "诸神的光辉彻底净化了你的心灵，理智 +2！"
              },
              {
                  "type": "MODIFY_STAT",
                  "stat": "knowledge",
                  "amount": 1,
                  "message": "你看到了世界的本源，知识 +1"
              },
              {
                  "type": "LOG",
                  "message": "你感受到了永恒之地的真正力量。",
                  "style": "success"
              }
          ],
          "failure": [
              {
                  "type": "MODIFY_STAT",
                  "stat": "sanity",
                  "amount": -1,
                  "message": "光辉太过强烈，你的理智受到了冲击。"
              },
              {
                  "type": "LOG",
                  "message": "你不得不闭上眼睛躲避这刺目的光芒。",
                  "style": "narrative"
              }
          ]
      }
  },
  "vol_event_dragon_treasure": {
      "id": "vol_event_dragon_treasure",
      "type": "EVENT",
      "title": "巨龙遗产",
      "description": "巢穴中堆满了黄金与珍宝，但最中央的是一颗仍然跳动的龙心...",
      "icon": "Gem",
      "triggerType": "ON_ENTER",
      "interaction": {
          "type": "CHOICE",
          "options": [
              {
                  "label": "吸收龙心之力",
                  "effects": [
                      {
                          "type": "MODIFY_STAT",
                          "stat": "might",
                          "amount": 2,
                          "message": "巨龙的力量在你体内流动，力量 +2！"
                      },
                      {
                          "type": "MODIFY_STAT",
                          "stat": "sanity",
                          "amount": -1,
                          "message": "但龙之意志也在侵蚀你的心智，理智 -1"
                      },
                      {
                          "type": "LOG",
                          "message": "你获得了远超常人的力量。",
                          "style": "success"
                      }
                  ]
              },
              {
                  "label": "搜刮财宝",
                  "effects": [
                      {
                          "type": "DRAW_CARD",
                          "deck": "ITEM",
                          "message": "你装满了价值连城的宝物！"
                      }
                  ]
              },
              {
                  "label": "敬而远之",
                  "effects": [
                      {
                          "type": "LOG",
                          "message": "你明智地选择了离开，不去触碰这些危险的东西。",
                          "style": "narrative"
                      }
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
              {
                  "type": "narrative_log",
                  "message": "你从噩梦中醒来！"
              }
          ],
          "failure": [
              {
                  "type": "modify_stat",
                  "attribute": "sanity",
                  "amount": -2,
                  "message": "噩梦让你精神受创。"
              },
              {
                  "type": "narrative_log",
                  "message": "你在梦魇中挣扎。"
              }
          ]
      }
  },
  "vol_event_dream_walk": {
      "id": "vol_event_dream_walk",
      "type": "EVENT",
      "title": "梦境漫步",
      "description": "踏上梦想家之路，你的意识开始模糊，仿佛行走在梦境与现实的边缘...",
      "icon": "Cloud",
      "triggerType": "ON_ENTER",
      "interaction": {
          "type": "ATTRIBUTE_CHECK",
          "attribute": "sanity",
          "difficulty": 3,
          "success": [
              {
                  "type": "MODIFY_STAT",
                  "stat": "speed",
                  "amount": 1,
                  "message": "你在梦境中获得了额外的速度！"
              },
              {
                  "type": "LOG",
                  "message": "梦境赋予了你超凡的能力。",
                  "style": "success"
              }
          ],
          "failure": [
              {
                  "type": "MODIFY_STAT",
                  "stat": "sanity",
                  "amount": -1,
                  "message": "你迷失在了梦境中。"
              },
              {
                  "type": "LOG",
                  "message": "你花费了很大力气才清醒过来。",
                  "style": "alert"
              }
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
              {
                  "type": "modify_stat",
                  "attribute": "speed",
                  "amount": 1,
                  "message": "你在黑暗中保持冷静。"
              },
              {
                  "type": "narrative_log",
                  "message": "日食持续中。"
              }
          ],
          "failure": [
              {
                  "type": "modify_stat",
                  "attribute": "sanity",
                  "amount": -2,
                  "message": "恐惧占据了你的内心。"
              },
              {
                  "type": "narrative_log",
                  "message": "黑暗让你不安。"
              }
          ]
      }
  },
  "vol_event_eternal_flame": {
      "id": "vol_event_eternal_flame",
      "type": "EVENT",
      "title": "永恒之火",
      "description": "瀑布源头竟然燃烧着永不熄灭的火焰，这是世界最后的余晖...",
      "icon": "Flame",
      "triggerType": "ON_ENTER",
      "interaction": {
          "type": "ATTRIBUTE_CHECK",
          "attribute": "might",
          "difficulty": 4,
          "success": [
              {
                  "type": "MODIFY_STAT",
                  "stat": "might",
                  "amount": 2,
                  "message": "永恒之火的力量让你脱胎换骨！"
              },
              {
                  "type": "LOG",
                  "message": "火焰与你产生了共鸣。",
                  "style": "success"
              }
          ],
          "failure": [
              {
                  "type": "MODIFY_STAT",
                  "stat": "sanity",
                  "amount": -1,
                  "message": "火焰的意志让你感到恐惧。"
              },
              {
                  "type": "LOG",
                  "message": "你匆忙逃离了这个地方。",
                  "style": "alert"
              }
          ]
      }
  },
  "vol_event_forbidden_knowledge": {
      "id": "vol_event_forbidden_knowledge",
      "type": "EVENT",
      "title": "被封印的真相",
      "description": "图书馆最深处的禁书散发出诱人的光芒，诱惑着你翻开它...",
      "icon": "BookOpen",
      "triggerType": "ON_ENTER",
      "interaction": {
          "type": "ATTRIBUTE_CHECK",
          "attribute": "knowledge",
          "difficulty": 4,
          "success": [
              {
                  "type": "MODIFY_STAT",
                  "stat": "knowledge",
                  "amount": 3,
                  "message": "你掌握了世界的终极奥秘！知识 +3！"
              },
              {
                  "type": "LOG",
                  "message": "你的智慧已经超越了凡人的界限。",
                  "style": "success"
              }
          ],
          "failure": [
              {
                  "type": "MODIFY_STAT",
                  "stat": "sanity",
                  "amount": -2,
                  "message": "禁书的知识太过沉重，理智 -2"
              },
              {
                  "type": "LOG",
                  "message": "你的意识被真理的重压击碎。",
                  "style": "alert"
              }
          ]
      }
  },
  "vol_event_forgotten_memory": {
      "id": "vol_event_forgotten_memory",
      "type": "EVENT",
      "title": "被遗忘的记忆",
      "description": "记忆宫殿中浮现出一段你不该知道的记忆...",
      "icon": "Brain",
      "triggerType": "ON_ENTER",
      "interaction": {
          "type": "ATTRIBUTE_CHECK",
          "attribute": "sanity",
          "difficulty": 4,
          "success": [
              {
                  "type": "MODIFY_STAT",
                  "stat": "knowledge",
                  "amount": 2,
                  "message": "你承受住了记忆的冲击，获得了珍贵的知识！"
              },
              {
                  "type": "LOG",
                  "message": "这些记忆对你至关重要。",
                  "style": "success"
              }
          ],
          "failure": [
              {
                  "type": "MODIFY_STAT",
                  "stat": "sanity",
                  "amount": -2,
                  "message": "记忆的冲击让你的理智崩溃！"
              },
              {
                  "type": "LOG",
                  "message": "你抱着头尖叫起来。",
                  "style": "alert"
              }
          ]
      }
  },
  "vol_event_forgotten_prayer": {
      "id": "vol_event_forgotten_prayer",
      "type": "EVENT",
      "title": "失传的祈祷",
      "description": "神坛上刻着古老的祈祷文，你忍不住轻声吟诵起来...",
      "icon": "Pray",
      "triggerType": "ON_ENTER",
      "interaction": {
          "type": "ATTRIBUTE_CHECK",
          "attribute": "knowledge",
          "difficulty": 3,
          "success": [
              {
                  "type": "MODIFY_STAT",
                  "stat": "sanity",
                  "amount": 2,
                  "message": "古老的祈祷净化了你的心灵！"
              },
              {
                  "type": "LOG",
                  "message": "诸神似乎听到了你的祈祷。",
                  "style": "success"
              }
          ],
          "failure": [
              {
                  "type": "MODIFY_STAT",
                  "stat": "sanity",
                  "amount": -1,
                  "message": "祈祷文唤醒了某些不干净的东西..."
              },
              {
                  "type": "LOG",
                  "message": "你感到有什么东西正在注视着你。",
                  "style": "alert"
              }
          ]
      }
  },
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
              {
                  "type": "gain_item",
                  "itemId": "random",
                  "message": "你发现了一件宝物！"
              },
              {
                  "type": "narrative_log",
                  "message": "知识让你找到了宝藏。"
              }
          ],
          "failure": [
              {
                  "type": "narrative_log",
                  "message": "宝藏与你擦肩而过。"
              }
          ]
      }
  },
  "vol_event_hotel_encounter": {
      "id": "vol_event_hotel_encounter",
      "type": "EVENT",
      "title": "销金窟奇遇",
      "description": "奢华的酒店中，一场危险的交易正在进行...",
      "icon": "Heart",
      "triggerType": "ON_ENTER",
      "interaction": {
          "type": "CHOICE",
          "options": [
              {
                  "label": "参与交易",
                  "effects": [
                      {
                          "type": "MODIFY_STAT",
                          "stat": "speed",
                          "amount": 1,
                          "message": "交易让你获得了特殊药剂，速度 +1！"
                      },
                      {
                          "type": "MODIFY_STAT",
                          "stat": "sanity",
                          "amount": -1,
                          "message": "但你的理智也受到了影响。"
                      },
                      {
                          "type": "LOG",
                          "message": "你获得了一些奇怪的东西。",
                          "style": "info"
                      }
                  ]
              },
              {
                  "label": "偷听情报",
                  "effects": [
                      {
                          "type": "MODIFY_STAT",
                          "stat": "knowledge",
                          "amount": 1,
                          "message": "你偷听到了重要的情报。"
                      },
                      {
                          "type": "LOG",
                          "message": "这个消息可能价值连城。",
                          "style": "info"
                      }
                  ]
              },
              {
                  "label": "离开",
                  "effects": [
                      {
                          "type": "LOG",
                          "message": "你选择不卷入这些危险的事情。",
                          "style": "narrative"
                      }
                  ]
              }
          ]
      }
  },
  "vol_event_market_trade": {
      "id": "vol_event_market_trade",
      "type": "EVENT",
      "title": "神秘商人",
      "description": "一个戴着面具的神秘商人向你招手，展示着奇怪的货物。",
      "icon": "ShoppingBag",
      "triggerType": "ON_ENTER",
      "interaction": {
          "type": "CHOICE",
          "options": [
              {
                  "label": "购买神秘物品",
                  "effects": [
                      {
                          "type": "DRAW_CARD",
                          "deck": "ITEM",
                          "message": "你从商人手中接过神秘的货物！"
                      }
                  ]
              },
              {
                  "label": "打听情报",
                  "effects": [
                      {
                          "type": "MODIFY_STAT",
                          "stat": "knowledge",
                          "amount": 1,
                          "message": "商人告诉了你一些关于永恒之地的秘密。"
                      },
                      {
                          "type": "LOG",
                          "message": "你获得了有用的情报。",
                          "style": "info"
                      }
                  ]
              },
              {
                  "label": "离开",
                  "effects": [
                      {
                          "type": "LOG",
                          "message": "你决定不与神秘商人交易。",
                          "style": "narrative"
                      }
                  ]
              }
          ]
      }
  },
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
                      {
                          "type": "gain_item",
                          "itemId": "random",
                          "cost": 2,
                          "message": "你获得了一件物品！"
                      }
                  ]
              },
              {
                  "label": "离开",
                  "effects": [
                      {
                          "type": "narrative_log",
                          "message": "你转身离开。"
                      }
                  ]
              }
          ]
      }
  },
  "vol_event_mirror_reflection": {
      "id": "vol_event_mirror_reflection",
      "type": "EVENT",
      "title": "镜中自我",
      "description": "湖面的倒影突然动了起来，镜中的你露出了诡异的笑容...",
      "icon": "Mirror",
      "triggerType": "ON_ENTER",
      "interaction": {
          "type": "ATTRIBUTE_CHECK",
          "attribute": "sanity",
          "difficulty": 4,
          "success": [
              {
                  "type": "MODIFY_STAT",
                  "stat": "knowledge",
                  "amount": 1,
                  "message": "你稳住了心神，从幻象中获得了洞察。"
              },
              {
                  "type": "LOG",
                  "message": "镜中的倒影恢复了平静。",
                  "style": "narrative"
              }
          ],
          "failure": [
              {
                  "type": "MODIFY_STAT",
                  "stat": "sanity",
                  "amount": -2,
                  "message": "镜中的你试图拉你进入水中！"
              },
              {
                  "type": "LOG",
                  "message": "你拼命挣扎，总算是逃脱了。",
                  "style": "alert"
              }
          ]
      }
  },
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
              {
                  "type": "modify_stat",
                  "attribute": "might",
                  "amount": 2
              },
              {
                  "type": "modify_stat",
                  "attribute": "speed",
                  "amount": 2
              },
              {
                  "type": "modify_stat",
                  "attribute": "sanity",
                  "amount": 2
              },
              {
                  "type": "modify_stat",
                  "attribute": "knowledge",
                  "amount": 2
              },
              {
                  "type": "narrative_log",
                  "message": "你被引入了神之领域！"
              }
          ],
          "failure": [
              {
                  "type": "narrative_log",
                  "message": "召唤的光芒消散了。"
              }
          ]
      }
  },
  "vol_event_penumbra_choice": {
      "id": "vol_event_penumbra_choice",
      "type": "EVENT",
      "title": "光暗抉择",
      "description": "半影区的力量在你面前分裂成两条道路：一条通往光明，一条堕入黑暗...",
      "icon": "SunMoon",
      "triggerType": "ON_ENTER",
      "interaction": {
          "type": "CHOICE",
          "options": [
              {
                  "label": "拥抱光明",
                  "effects": [
                      {
                          "type": "MODIFY_STAT",
                          "stat": "sanity",
                          "amount": 2,
                          "message": "光明的力量让你充满希望！"
                      },
                      {
                          "type": "LOG",
                          "message": "你选择了光明的道路。",
                          "style": "success"
                      }
                  ]
              },
              {
                  "label": "堕入黑暗",
                  "effects": [
                      {
                          "type": "MODIFY_STAT",
                          "stat": "might",
                          "amount": 2,
                          "message": "黑暗的力量让你变得更强大！"
                      },
                      {
                          "type": "MODIFY_STAT",
                          "stat": "sanity",
                          "amount": -1,
                          "message": "但你的内心也愈发阴暗。"
                      },
                      {
                          "type": "LOG",
                          "message": "你选择了黑暗的道路。",
                          "style": "alert"
                      }
                  ]
              }
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
              {
                  "type": "modify_stat",
                  "attribute": "speed",
                  "amount": 1,
                  "message": "你成功逃离了火海。"
              },
              {
                  "type": "narrative_log",
                  "message": "速度让你逃过一劫。"
              }
          ],
          "failure": [
              {
                  "type": "damage",
                  "amount": 3,
                  "message": "你被火焰灼伤。"
              },
              {
                  "type": "narrative_log",
                  "message": "烈焰吞噬了你。"
              }
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
                      {
                          "type": "modify_stat",
                          "attribute": "knowledge",
                          "amount": 1
                      },
                      {
                          "type": "modify_stat",
                          "attribute": "sanity",
                          "amount": 1
                      },
                      {
                          "type": "narrative_log",
                          "message": "难民感激地离去了。"
                      }
                  ]
              },
              {
                  "label": "拒绝",
                  "effects": [
                      {
                          "type": "narrative_log",
                          "message": "你转身离开。"
                      }
                  ]
              }
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
              {
                  "type": "teleport",
                  "destination": "any",
                  "message": "你打开了通道！"
              },
              {
                  "type": "narrative_log",
                  "message": "新路径被发现了。"
              }
          ],
          "failure": [
              {
                  "type": "narrative_log",
                  "message": "你无法打开通道。"
              }
          ]
      }
  },
  "vol_event_shadow_prince": {
      "id": "vol_event_shadow_prince",
      "type": "EVENT",
      "title": "暗影王子",
      "description": "宫殿深处，一个身披黑袍的身影缓缓转身...「你终于来了。」",
      "icon": "Crown",
      "triggerType": "ON_ENTER",
      "interaction": {
          "type": "CHOICE",
          "options": [
              {
                  "label": "与他交易",
                  "effects": [
                      {
                          "type": "MODIFY_STAT",
                          "stat": "might",
                          "amount": 2,
                          "message": "王子给了你暗影的力量！"
                      },
                      {
                          "type": "MODIFY_STAT",
                          "stat": "sanity",
                          "amount": -1,
                          "message": "但你也付出了代价。"
                      },
                      {
                          "type": "LOG",
                          "message": "交易达成。",
                          "style": "info"
                      }
                  ]
              },
              {
                  "label": "战斗",
                  "effects": [
                      {
                          "type": "MODIFY_STAT",
                          "stat": "might",
                          "amount": -2,
                          "message": "王子的力量远超你的想象！"
                      },
                      {
                          "type": "LOG",
                          "message": "你被打败了，仓皇逃离。",
                          "style": "alert"
                      }
                  ]
              },
              {
                  "label": "逃跑",
                  "effects": [
                      {
                          "type": "LOG",
                          "message": "你选择不激怒这个强大的存在。",
                          "style": "narrative"
                      }
                  ]
              }
          ]
      }
  },
  "vol_event_shadow_touch": {
      "id": "vol_event_shadow_touch",
      "type": "EVENT",
      "title": "幽影之触",
      "description": "虚无的阴影向你伸出触手，试图将你拉入永恒的黑暗...",
      "icon": "Ghost",
      "triggerType": "ON_ENTER",
      "interaction": {
          "type": "ATTRIBUTE_CHECK",
          "attribute": "sanity",
          "difficulty": 5,
          "success": [
              {
                  "type": "MODIFY_STAT",
                  "stat": "speed",
                  "amount": 1,
                  "message": "你挣脱了阴影的束缚，速度 +1！"
              },
              {
                  "type": "LOG",
                  "message": "你从虚空的边缘逃回了现实世界。",
                  "style": "success"
              }
          ],
          "failure": [
              {
                  "type": "MODIFY_STAT",
                  "stat": "sanity",
                  "amount": -2,
                  "message": "阴影侵入了你的意识，理智 -2！"
              },
              {
                  "type": "MODIFY_STAT",
                  "stat": "speed",
                  "amount": -1,
                  "message": "阴影缠绕着你，腿部受伤，速度 -1"
              },
              {
                  "type": "LOG",
                  "message": "你的一部分永远留在了幽影领域...",
                  "style": "alert"
              }
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
              {
                  "type": "modify_stat",
                  "attribute": "knowledge",
                  "amount": 1,
                  "message": "你成功压制了亡者的灵魂。"
              },
              {
                  "type": "narrative_log",
                  "message": "你用理智压制了它们。"
              }
          ],
          "failure": [
              {
                  "type": "damage",
                  "amount": 2,
                  "message": "亡者的攻击让你受伤。"
              },
              {
                  "type": "narrative_log",
                  "message": "恐惧占据了你的内心。"
              }
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
                      {
                          "type": "modify_stat",
                          "attribute": "knowledge",
                          "amount": 1
                      },
                      {
                          "type": "modify_stat",
                          "attribute": "sanity",
                          "amount": -1
                      },
                      {
                          "type": "narrative_log",
                          "message": "幽魂告诉你一个秘密。"
                      }
                  ]
              },
              {
                  "label": "驱散",
                  "effects": [
                      {
                          "type": "modify_stat",
                          "attribute": "might",
                          "amount": 1
                      },
                      {
                          "type": "narrative_log",
                          "message": "你赶走了幽魂。"
                      }
                  ]
              }
          ]
      }
  },
  "vol_event_spring_blessing": {
      "id": "vol_event_spring_blessing",
      "type": "EVENT",
      "title": "生命之泉",
      "description": "苗圃中央的喷泉散发着生命的气息，据说能治百病...",
      "icon": "Droplets",
      "triggerType": "ON_ENTER",
      "interaction": {
          "type": "CHOICE",
          "options": [
              {
                  "label": "饮用泉水",
                  "effects": [
                      {
                          "type": "HEAL",
                          "stat": "might",
                          "amount": 2
                      },
                      {
                          "type": "HEAL",
                          "stat": "sanity",
                          "amount": 1
                      },
                      {
                          "type": "LOG",
                          "message": "泉水甘甜可口，你感到焕然一新！",
                          "style": "success"
                      }
                  ]
              },
              {
                  "label": "收集泉水",
                  "effects": [
                      {
                          "type": "DRAW_CARD",
                          "deck": "ITEM",
                          "message": "你用容器收集了一些泉水！"
                      }
                  ]
              },
              {
                  "label": "离开",
                  "effects": [
                      {
                          "type": "LOG",
                          "message": "你选择不打扰这片圣地。",
                          "style": "narrative"
                      }
                  ]
              }
          ]
      }
  },
  "vol_event_starlight_test": {
      "id": "vol_event_starlight_test",
      "type": "EVENT",
      "title": "星辉学院的入学测试",
      "description": "学院大门前正在进行招生测试，你是否能通过考验？",
      "icon": "GraduationCap",
      "triggerType": "ON_ENTER",
      "interaction": {
          "type": "ATTRIBUTE_CHECK",
          "attribute": "knowledge",
          "difficulty": 3,
          "success": [
              {
                  "type": "MODIFY_STAT",
                  "stat": "knowledge",
                  "amount": 2,
                  "message": "你通过了测试！知识 +2！"
              },
              {
                  "type": "DRAW_CARD",
                  "deck": "ITEM",
                  "message": "学院奖励了你一件物品！"
              }
          ],
          "failure": [
              {
                  "type": "LOG",
                  "message": "你未能通过测试，只能下次再来。",
                  "style": "narrative"
              }
          ]
      }
  },
  "vol_event_theater_performance": {
      "id": "vol_event_theater_performance",
      "type": "EVENT",
      "title": "黄金剧院的演出",
      "description": "剧院正在上演《黄金裔的陨落》，演员们的表演深深打动了你...",
      "icon": "TheaterMasks",
      "triggerType": "ON_ENTER",
      "interaction": {
          "type": "CHOICE",
          "options": [
              {
                  "label": "继续观赏",
                  "effects": [
                      {
                          "type": "MODIFY_STAT",
                          "stat": "sanity",
                          "amount": 1,
                          "message": "精彩的演出治愈了你的心灵。"
                      },
                      {
                          "type": "LOG",
                          "message": "你沉浸在剧情中，忘记了时间的流逝。",
                          "style": "success"
                      }
                  ]
              },
              {
                  "label": "幕后探索",
                  "effects": [
                      {
                          "type": "DRAW_CARD",
                          "deck": "ITEM",
                          "message": "你在后台发现了演员遗留的物品！"
                      }
                  ]
              },
              {
                  "label": "离开",
                  "effects": [
                      {
                          "type": "LOG",
                          "message": "你决定不打扰这场演出。",
                          "style": "narrative"
                      }
                  ]
              }
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
              {
                  "type": "modify_stat",
                  "attribute": "knowledge",
                  "amount": 1,
                  "message": "你理解了时间的变化。"
              },
              {
                  "type": "narrative_log",
                  "message": "时间为你所用。"
              }
          ],
          "failure": [
              {
                  "type": "narrative_log",
                  "message": "时间乱流让你迷失。"
              },
              {
                  "type": "teleport",
                  "destination": "random"
              }
          ]
      }
  },
  "vol_event_time_warp": {
      "id": "vol_event_time_warp",
      "type": "EVENT",
      "title": "时间漩涡",
      "description": "空间的扭曲让你看到了过去与未来的幻象，时间在这里失去了意义...",
      "icon": "Clock",
      "triggerType": "ON_ENTER",
      "interaction": {
          "type": "ATTRIBUTE_CHECK",
          "attribute": "knowledge",
          "difficulty": 4,
          "success": [
              {
                  "type": "MODIFY_STAT",
                  "stat": "knowledge",
                  "amount": 2,
                  "message": "你领悟了时间的真谛，知识 +2！"
              },
              {
                  "type": "MODIFY_STAT",
                  "stat": "speed",
                  "amount": 1,
                  "message": "你获得了部分时间之力，速度 +1"
              },
              {
                  "type": "LOG",
                  "message": "你成功从时间漩涡中保持清醒。",
                  "style": "success"
              }
          ],
          "failure": [
              {
                  "type": "MODIFY_STAT",
                  "stat": "sanity",
                  "amount": -2,
                  "message": "时间的混乱撕裂了你的意识，理智 -2"
              },
              {
                  "type": "LOG",
                  "message": "你不知道自己在漩涡中停留了多久...",
                  "style": "alert"
              }
          ]
      }
  },
  "vol_event_titan_blessing": {
      "id": "vol_event_titan_blessing",
      "type": "EVENT",
      "title": "泰坦的祝福",
      "description": "塔顶供奉着一尊泰坦神像，散发出远古的力量波动...",
      "icon": "Mountain",
      "triggerType": "ON_ENTER",
      "interaction": {
          "type": "ATTRIBUTE_CHECK",
          "attribute": "might",
          "difficulty": 4,
          "success": [
              {
                  "type": "MODIFY_STAT",
                  "stat": "might",
                  "amount": 3,
                  "message": "泰坦的力量与你产生了共鸣！力量 +3！"
              },
              {
                  "type": "LOG",
                  "message": "你感受到了远古战士的力量！",
                  "style": "success"
              }
          ],
          "failure": [
              {
                  "type": "MODIFY_STAT",
                  "stat": "might",
                  "amount": -1,
                  "message": "神像的力量太过强大，你被反噬受伤。"
              },
              {
                  "type": "LOG",
                  "message": "你不得不后退几步。",
                  "style": "narrative"
              }
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
              {
                  "type": "modify_stat",
                  "attribute": "might",
                  "amount": 1,
                  "message": "你击败了泰坦守卫！"
              },
              {
                  "type": "narrative_log",
                  "message": "战斗胜利！"
              }
          ],
          "failure": [
              {
                  "type": "damage",
                  "amount": 3,
                  "message": "泰坦守卫的拳头击中了你。"
              },
              {
                  "type": "narrative_log",
                  "message": "你不是它的对手。"
              }
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
              {
                  "type": "narrative_log",
                  "message": "你成功避开了陷阱！"
              }
          ],
          "failure": [
              {
                  "type": "damage",
                  "amount": 2,
                  "message": "陷阱对你造成了伤害。"
              },
              {
                  "type": "narrative_log",
                  "message": "陷阱触发了。"
              }
          ]
      }
  },
  "vol_event_trinity_wisdom": {
      "id": "vol_event_trinity_wisdom",
      "type": "EVENT",
      "title": "时间的秘密",
      "description": "档案馆中保存着缇宝三姐妹的记忆碎片，你似乎能听到时间的低语...",
      "icon": "Clock",
      "triggerType": "ON_ENTER",
      "interaction": {
          "type": "ATTRIBUTE_CHECK",
          "attribute": "knowledge",
          "difficulty": 4,
          "success": [
              {
                  "type": "MODIFY_STAT",
                  "stat": "knowledge",
                  "amount": 2,
                  "message": "时间的奥秘让你如梦初醒，知识 +2！"
              },
              {
                  "type": "LOG",
                  "message": "你仿佛看到了永恒之地的过去与未来。",
                  "style": "success"
              }
          ],
          "failure": [
              {
                  "type": "MODIFY_STAT",
                  "stat": "sanity",
                  "amount": -1,
                  "message": "时间的洪流让你头晕目眩。"
              },
              {
                  "type": "LOG",
                  "message": "你急忙退出了档案馆。",
                  "style": "narrative"
              }
          ]
      }
  },
  "vol_event_void_portal": {
      "id": "vol_event_void_portal",
      "type": "EVENT",
      "title": "虚空传送门",
      "description": "中庭中央的传送门散发出诡异的光芒，似乎通往某个未知的地方...",
      "icon": "Portal",
      "triggerType": "ON_ENTER",
      "interaction": {
          "type": "ATTRIBUTE_CHECK",
          "attribute": "knowledge",
          "difficulty": 5,
          "success": [
              {
                  "type": "MODIFY_STAT",
                  "stat": "knowledge",
                  "amount": 3,
                  "message": "你理解了传送门的奥秘！知识 +3！"
              },
              {
                  "type": "LOG",
                  "message": "你获得了跨越空间的力量！",
                  "style": "success"
              }
          ],
          "failure": [
              {
                  "type": "MODIFY_STAT",
                  "stat": "sanity",
                  "amount": -2,
                  "message": "传送门的能量撕裂了你的意识！"
              },
              {
                  "type": "LOG",
                  "message": "你七窍流血，勉强逃回了现实世界。",
                  "style": "alert"
              }
          ]
      }
  },
};
