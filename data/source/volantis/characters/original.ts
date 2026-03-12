// 翁法罗斯主题 - 人物卡数据
// Volantis Character Cards

export const CHARACTERS_DATA = [
  {
    "id": "vol_aglaia",
    "name": "阿格莱雅",
    "description": "黄金裔的领袖，永恒之地的守护者。她承载着部族的希望，以光辉之翼照亮前路。",
    "traits": ["领袖", "光辉"],
    "attributes": {
      "might": { "values": [2, 3, 4, 5, 5, 6, 7, 8], "startIndex": 3 },
      "speed": { "values": [2, 3, 3, 4, 5, 5, 6, 7], "startIndex": 2 },
      "sanity": { "values": [3, 4, 5, 5, 6, 7, 8, 9], "startIndex": 3 },
      "knowledge": { "values": [3, 4, 4, 5, 6, 7, 7, 8], "startIndex": 3 }
    },
    "ability": "光辉庇护：每回合开始时，可选择一名相邻队友，赋予其+1速度直到回合结束。"
  },
  {
    "id": "vol_sifere",
    "name": "赛飞儿",
    "description": "来自多洛斯的猫咪怪盗，行踪如风，劫富济贫。看似玩世不恭，实则心怀正义。",
    "traits": ["迅捷", "盗寇"],
    "attributes": {
      "might": { "values": [1, 2, 3, 4, 4, 5, 6, 6], "startIndex": 2 },
      "speed": { "values": [4, 5, 6, 6, 7, 7, 8, 9], "startIndex": 3 },
      "sanity": { "values": [2, 3, 4, 5, 5, 6, 7, 7], "startIndex": 3 },
      "knowledge": { "values": [2, 3, 4, 4, 5, 6, 6, 7], "startIndex": 2 }
    },
    "ability": "喵喵瞬影：速度检定+2，可穿越敌人位置。"
  },
  {
    "id": "vol_tibo",
    "name": "缇宝",
    "description": "缇安与缇宁的姐姐，三胞胎中的领导者。能够同时存在于多个时间线。",
    "traits": ["时间", "分裂"],
    "attributes": {
      "might": { "values": [2, 3, 3, 4, 5, 5, 6, 7], "startIndex": 2 },
      "speed": { "values": [3, 4, 4, 5, 6, 6, 7, 7], "startIndex": 3 },
      "sanity": { "values": [3, 4, 5, 6, 6, 7, 8, 9], "startIndex": 4 },
      "knowledge": { "values": [3, 4, 5, 5, 6, 7, 8, 8], "startIndex": 3 }
    },
    "ability": "时之回响：每场战斗可额外进行一次行动（需通过理智4以上）。"
  },
  {
    "id": "vol_mithrix",
    "name": "万敌",
    "description": "纷争之子，战斗本能刻入骨髓的战士。渴望与强者交锋，却在寻找真正的意义。",
    "traits": ["好战", "坚韧"],
    "attributes": {
      "might": { "values": [4, 5, 5, 6, 7, 7, 8, 9], "startIndex": 4 },
      "speed": { "values": [2, 3, 4, 4, 5, 5, 6, 7], "startIndex": 2 },
      "sanity": { "values": [1, 2, 3, 4, 4, 5, 5, 6], "startIndex": 2 },
      "knowledge": { "values": [1, 2, 3, 3, 4, 5, 5, 6], "startIndex": 1 }
    },
    "ability": "死斗：生命值低于50%时，力量+2但理智-1。"
  },
  {
    "id": "vol_thelma",
    "name": "遐蝶",
    "description": "冥河的女儿，能够操控死亡之力。外表冷漠，内心却渴望生命的光辉。",
    "traits": ["死亡", "灵媒"],
    "attributes": {
      "might": { "values": [1, 2, 3, 3, 4, 5, 5, 6], "startIndex": 1 },
      "speed": { "values": [2, 3, 4, 4, 5, 5, 6, 7], "startIndex": 2 },
      "sanity": { "values": [4, 5, 6, 7, 7, 8, 9, 9], "startIndex": 5 },
      "knowledge": { "values": [3, 4, 5, 6, 6, 7, 8, 8], "startIndex": 4 }
    },
    "ability": "死亡低语：可与亡灵对话，获得隐藏线索但理智-1。"
  },
  {
    "id": "vol_hercules",
    "name": "赫丘利",
    "description": "黄金裔的锻造大师，任何武器在他手中都能发挥最大威力。沉默寡言但值得信赖。",
    "traits": ["锻造", "坚韧"],
    "attributes": {
      "might": { "values": [3, 4, 5, 5, 6, 7, 7, 8], "startIndex": 3 },
      "speed": { "values": [1, 2, 3, 4, 4, 5, 5, 6], "startIndex": 2 },
      "sanity": { "values": [2, 3, 4, 4, 5, 6, 6, 7], "startIndex": 2 },
      "knowledge": { "values": [3, 4, 5, 6, 6, 7, 8, 8], "startIndex": 4 }
    },
    "ability": "神兵利器：战斗开始时可打造临时武器，伤害+1。"
  },
  {
    "id": "vol_orpheus",
    "name": "俄耳甫斯",
    "description": "流浪歌手，琴声能抚慰人心也能迷惑敌人。似乎在寻找某个失落的旋律。",
    "traits": ["音乐", "迷惑"],
    "attributes": {
      "might": { "values": [1, 2, 2, 3, 4, 4, 5, 6], "startIndex": 1 },
      "speed": { "values": [3, 4, 5, 5, 6, 6, 7, 8], "startIndex": 3 },
      "sanity": { "values": [3, 4, 5, 6, 7, 7, 8, 9], "startIndex": 4 },
      "knowledge": { "values": [2, 3, 4, 5, 5, 6, 7, 7], "startIndex": 3 }
    },
    "ability": "天籁之音：每回合可选择使全体队友速度+1或使敌人速度-1。"
  },
  {
    "id": "vol_athena",
    "name": "雅典娜",
    "description": "智慧与战争的女神，拥有预知未来的能力。冷静理性，是团队的军师。",
    "traits": ["智慧", "预知"],
    "attributes": {
      "might": { "values": [2, 3, 4, 4, 5, 6, 6, 7], "startIndex": 2 },
      "speed": { "values": [2, 3, 4, 4, 5, 6, 6, 7], "startIndex": 2 },
      "sanity": { "values": [4, 5, 6, 6, 7, 8, 9, 9], "startIndex": 4 },
      "knowledge": { "values": [4, 5, 6, 7, 7, 8, 9, 9], "startIndex": 5 }
    },
    "ability": "神机妙算：每场战斗可预判一次攻击，完全闪避（需知识5以上）。"
  },
  {
    "id": "vol_ares",
    "name": "阿瑞斯",
    "description": "战争之神的化身，嗜血好战。拥有极强的破坏力，但理智较为脆弱。",
    "traits": ["毁灭", "狂暴"],
    "attributes": {
      "might": { "values": [5, 6, 6, 7, 8, 8, 9, 9], "startIndex": 5 },
      "speed": { "values": [3, 4, 4, 5, 6, 6, 7, 8], "startIndex": 3 },
      "sanity": { "values": [1, 1, 2, 3, 3, 4, 4, 5], "startIndex": 0 },
      "knowledge": { "values": [1, 2, 2, 3, 4, 4, 5, 5], "startIndex": 1 }
    },
    "ability": "嗜血狂暴：攻击造成伤害时，自身也受到1点伤害，但伤害+2。"
  },
  {
    "id": "vol_hephaestus",
    "name": "赫菲斯托斯",
    "description": "泰坦族的锻冶之神，创造了无数神器。行走不便但智力超群。",
    "traits": ["锻造", "发明"],
    "attributes": {
      "might": { "values": [2, 3, 3, 4, 5, 5, 6, 7], "startIndex": 2 },
      "speed": { "values": [1, 1, 2, 2, 3, 4, 4, 5], "startIndex": 0 },
      "sanity": { "values": [3, 4, 5, 5, 6, 7, 8, 8], "startIndex": 3 },
      "knowledge": { "values": [4, 5, 6, 7, 8, 8, 9, 9], "startIndex": 5 }
    },
    "ability": "神器打造：可将一件物品升级为神器（需知识7以上，耗时1回合）。"
  },
  {
    "id": "vol_nyx",
    "name": "尼克斯",
    "description": "夜之女神，掌控阴影与梦境。行踪诡秘，敌人甚至不知道她的存在。",
    "traits": ["隐身", "梦境"],
    "attributes": {
      "might": { "values": [2, 3, 3, 4, 5, 5, 6, 7], "startIndex": 2 },
      "speed": { "values": [4, 5, 6, 7, 7, 8, 8, 9], "startIndex": 4 },
      "sanity": { "values": [3, 4, 5, 6, 6, 7, 8, 9], "startIndex": 4 },
      "knowledge": { "values": [2, 3, 4, 5, 5, 6, 7, 7], "startIndex": 3 }
    },
    "ability": "暗影潜行：可进入隐身状态2回合，隐身时敌人无法主动攻击。"
  },
  {
    "id": "vol_prometheus",
    "name": "普罗米修斯",
    "description": "盗火者，为了给人类带来光明不惜一切。拥有治愈之火，可治疗伤口。",
    "traits": ["治愈", "牺牲"],
    "attributes": {
      "might": { "values": [2, 3, 4, 4, 5, 6, 6, 7], "startIndex": 3 },
      "speed": { "values": [2, 3, 3, 4, 5, 5, 6, 6], "startIndex": 2 },
      "sanity": { "values": [3, 4, 5, 6, 6, 7, 8, 9], "startIndex": 4 },
      "knowledge": { "values": [3, 4, 5, 5, 6, 7, 8, 8], "startIndex": 3 }
    },
    "ability": "盗火治愈：可将自身生命值转移给队友，每点生命换取1点治疗。"
  }
];
