
export const SCENARIOS_DATA = {
  "haunt_00": {
    "id": "haunt_00",
    "name": "末日决战",
    "introText": "大厦的空气变得极其凝重。某种邪恶的力量切断了所有退路，只有最强的人能活到最后。",
    "traitorRule": "HIGHEST_MIGHT",
    "traitorInfo": {
      "objective": "丛林法则。杀死所有英雄。",
      "setupText": "作为最强壮的生还者，你决定清除所有竞争者。",
      "abilities": ["无视痛觉：受伤时减少 1 点伤害。"]
    },
    "heroInfo": {
      "objective": "在黑暗中生存。击败叛徒或者存活 5 个回合。",
      "setupText": "团结起来，不要落单。"
    }
  },
  "haunt_01": {
    "id": "haunt_01",
    "name": "丧尸崛起",
    "introText": "水晶球中浮现出腐烂的面孔。墓地的泥土在大厦地板下翻动，死者正在苏醒，而你们中的一人正在指挥这支不朽的大军。",
    "traitorRule": "TRIGGER_PLAYER",
    "traitorInfo": {
      "objective": "大快朵颐。杀死所有英雄。",
      "setupText": "你现在可以指挥丧尸（暂时由叙事决定）。",
      "abilities": ["死灵领主：你的攻击可以从相邻房间发起。", "不死之身：首次致死伤害不会让你阵亡，而是将所有属性重置为 3。"]
    },
    "heroInfo": {
      "objective": "摧毁图腾。找到分布在大厦中的“仪式图腾”并将其摧毁。",
      "setupText": "图腾散发着绿色的幽光，摧毁它们需要通过力量 4+ 检定。"
    }
  },
  "haunt_02": {
    "id": "haunt_02",
    "name": "墙中低语",
    "introText": "礼拜堂的彩绘玻璃突然碎裂，每一块碎片都在尖叫。墙壁里传来无数声音，它们在呼唤着某个名字...",
    "traitorRule": "LOWEST_SANITY",
    "traitorInfo": {
      "objective": "让所有人加入合唱。将英雄们的理智降至 0。",
      "setupText": "你听懂了墙壁的语言。它们饿了。",
      "abilities": ["精神鞭笞：你的攻击造成理智伤害而非肉体伤害。", "隐形：英雄无法对你发起攻击，除非通过知识 5+ 检定发现你。"]
    },
    "heroInfo": {
      "objective": "封印裂隙。找到声源并进行驱魔仪式。",
      "setupText": "在礼拜堂进行知识 6+ 检定以完成仪式。每次失败都会受到 1 点理智伤害。"
    }
  },
  "haunt_03": {
    "id": "haunt_03",
    "name": "野兽之心",
    "introText": "满月穿透了屋顶的破洞。一声长嚎撕裂了寂静。你们中的一人开始发生可怕的变化，骨骼噼啪作响，毛发疯长...",
    "traitorRule": "HIGHEST_MIGHT",
    "traitorInfo": {
      "objective": "狩猎时刻。吞噬所有猎物。",
      "setupText": "你变成了狼人。你的力量翻倍，但每回合必须移动并攻击。",
      "abilities": ["野性冲锋：移动力 +2。", "撕裂：攻击造成额外 2 点伤害。"]
    },
    "heroInfo": {
      "objective": "银色子弹。找到银制武器并杀死野兽。",
      "setupText": "在大厦中寻找银器（特殊物品）。只有银器能对狼人造成有效伤害。"
    }
  }
};
