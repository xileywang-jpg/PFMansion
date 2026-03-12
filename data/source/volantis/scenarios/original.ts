// 翁法罗斯主题 - 剧本数据
// Volantis Scenario Cards

export const SCENARIOS_DATA = {
  // ==================== 主线剧本 ====================
  "vol_scenario_olympus": {
    "id": "vol_scenario_olympus",
    "name": "诸神黄昏",
    "introText": "永恒之地的平衡被打破，诸神即将苏醒。世界陷入了前所未有的危机，只有最强大的英雄才能阻止这一切。",
    "traitorRule": "HIGHEST_MIGHT",
    "traitorInfo": {
      "objective": "阻止英雄进入神之领域。",
      "setupText": "你被选为秩序的守护者，必须阻止凡人打扰诸神的沉眠。",
      "abilities": [
        "可以使用神之力量（力量+3）",
        "每回合可召唤1个神话生物"
      ]
    },
    "heroInfo": {
      "objective": "进入神之领域，阻止诸神黄昏。",
      "setupText": "你们是被选中的英雄，必须在诸神苏醒前找到阻止的方法。",
      "objectives": [
        "收集3块泰坦神印",
        "击败守护神兽",
        "进入永恒圣殿"
      ]
    }
  },
  "vol_scenario_blacktide": {
    "id": "vol_scenario_blacktide",
    "name": "黑潮侵袭",
    "introText": "黑潮正在吞噬永恒之地，一切都被化为虚无。你们必须在世界彻底沦陷前找到生机。",
    "traitorRule": "LOWEST_SANITY",
    "traitorInfo": {
      "objective": "让黑潮吞噬一切。",
      "setupText": "你已经被黑潮侵蚀，决定拥抱虚空的力量。",
      "abilities": [
        "可控制黑潮怪物",
        "理智归零时直接获胜"
      ]
    },
    "heroInfo": {
      "objective": "封印黑潮源头。",
      "setupText": "团结一致，找到封印黑潮的方法。",
      "objectives": [
        "找到3块封印碎片",
        "进入黑潮核心",
        "完成封印仪式"
      ]
    }
  },
  "vol_scenario_war_god": {
    "id": "vol_scenario_war_god",
    "name": "战争之神复活",
    "introText": "战争之神阿瑞斯即将复活，整个永恒之地将陷入永无止境的战争。",
    "traitorRule": "SPECIFIC_CHAR_ID",
    "traitorInfo": {
      "objective": "帮助阿瑞斯复活。",
      "setupText": "你是阿瑞斯的信徒，必须帮助他复活。",
      "abilities": [
        "可以使用战争之力",
        "杀死英雄可直接转化其为信徒"
      ],
      "characterId": "vol_ares"
    },
    "heroInfo": {
      "objective": "阻止阿瑞斯复活。",
      "setupText": "你们必须阻止战争的化身苏醒。",
      "objectives": [
        "找到战神剑并摧毁",
        "封印复活祭坛",
        "击败阿瑞斯信徒"
      ]
    }
  },
  "vol_scenario_titan_awakening": {
    "id": "vol_scenario_titan_awakening",
    "name": "泰坦觉醒",
    "introText": "沉睡的泰坦族即将觉醒，大地开始震颤。",
    "traitorRule": "HIGHEST_MIGHT",
    "traitorInfo": {
      "objective": "唤醒所有泰坦。",
      "setupText": "你是泰坦族的后裔，誓要恢复昔日的荣光。",
      "abilities": [
        "可控制机械守卫",
        "力量随回合递增"
      ]
    },
    "heroInfo": {
      "objective": "阻止泰坦觉醒。",
      "setupText": "你们必须在大地崩裂前阻止这一切。",
      "objectives": [
        "关闭3座能量枢纽",
        "进入泰坦遗迹",
        "封印觉醒核心"
      ]
    }
  },

  // ==================== 支线剧本 ====================
  "vol_scenario_phoenix_nest": {
    "id": "vol_scenario_phoenix_nest",
    "name": "凤凰之谜",
    "introText": "神鸟凤凰的巢穴被发现，里面似乎藏着永恒的秘密。",
    "traitorRule": "HIGHEST_SANITY",
    "traitorInfo": {
      "objective": "独占凤凰的力量。",
      "setupText": "你决定独占凤凰的永恒之力。",
      "abilities": [
        "可以使用火焰之力",
        "死亡后满血复活1次"
      ]
    },
    "heroInfo": {
      "objective": "获取凤凰之力或封印。",
      "setupText": "决定凤凰之力的归属。",
      "objectives": [
        "通过火焰试炼",
        "找到凤凰蛋",
        "做出最终选择"
      ]
    }
  },
  "vol_scenario_styx_crossing": {
    "id": "vol_scenario_styx_crossing",
    "name": "冥河渡劫",
    "introText": "冥河泛滥，死亡的力量正在侵蚀生者的世界。",
    "traitorRule": "LOWEST_KNOWLEDGE",
    "traitorInfo": {
      "objective": "打开冥界大门。",
      "setupText": "死亡才是最终的归宿。",
      "abilities": [
        "可召唤亡灵军队",
        "在冥河领域全属性+2"
      ]
    },
    "heroInfo": {
      "objective": "封印冥河。",
      "setupText": "阻止死亡蔓延。",
      "objectives": [
        "找到冥河源头",
        "收集3滴冥河水",
        "完成封印"
      ]
    }
  },
  "vol_scenario_time_labyrinth": {
    "id": "vol_scenario_time_labyrinth",
    "name": "时间迷宫",
    "introText": "时间扭曲形成的迷宫困住了所有人，必须找到出口。",
    "traitorRule": "HIGHEST_SPEED",
    "traitorInfo": {
      "objective": "困住所有人。",
      "setupText": "你发现了时间的秘密，决定永远留在这里。",
      "abilities": [
        "可以操控时间回溯",
        "敌人回合-1"
      ]
    },
    "heroInfo": {
      "objective": "找到时间出口。",
      "setupText": "团结逃出时间迷宫。",
      "objectives": [
        "收集时间碎片",
        "解开时间谜题",
        "突破时间屏障"
      ]
    }
  },
  "vol_scenario_eternal_war": {
    "id": "vol_scenario_eternal_war",
    "name": "永恒战争",
    "introText": "黄金裔与泰坦族的战争延续了千年，如今到了终结之时。",
    "traitorRule": "TRIGGER_PLAYER",
    "traitorInfo": {
      "objective": "赢得战争。",
      "setupText": "你是某方的卧底，必须在关键时刻倒戈。",
      "abilities": [
        "可策反1名队友",
        "了解敌方战术"
      ]
    },
    "heroInfo": {
      "objective": "结束永恒战争。",
      "setupText": "找到和平的方法。",
      "objectives": [
        "找到停战协议",
        "说服双方领袖",
        "达成和平"
      ]
    }
  },
  "vol_scenario_divine_trial": {
    "id": "vol_scenario_divine_trial",
    "name": "神选试炼",
    "introText": "诸神降下试炼，只有通过者才能获得神之力量。",
    "traitorRule": "HIGHEST_KNOWLEDGE",
    "traitorInfo": {
      "objective": "成为唯一的神选者。",
      "setupText": "你必须阻止其他人成为神选者。",
      "abilities": [
        "可以使用神器",
        "每回合可抢夺他人 buff"
      ]
    },
    "heroInfo": {
      "objective": "通过所有试炼。",
      "setupText": "团结合作，成为神选者。",
      "objectives": [
        "通过智慧试炼",
        "通过力量试炼",
        "通过意志试炼"
      ]
    }
  },
  "vol_scenario_abyss_exploration": {
    "id": "vol_scenario_abyss_exploration",
    "name": "深渊探索",
    "introText": "黑潮退却，深渊显露出了不为人知的秘密。",
    "traitorRule": "HIGHEST_SPEED",
    "traitorInfo": {
      "objective": "率先到达深渊核心。",
      "setupText": "你要抢先获得深渊的力量。",
      "abilities": [
        "可无视地形移动",
        "可看到敌人位置"
      ]
    },
    "heroInfo": {
      "objective": "探索深渊并返回。",
      "setupText": "探索未知，获取知识。",
      "objectives": [
        "探索5个深渊区域",
        "找到深渊核心",
        "安全返回"
      ]
    }
  }
};
