// 翁法罗斯主题 - 地图卡数据
// Volantis Map Cards

export const TILES_DATA = [
  // ==================== 奥赫玛城区 ====================
  {
    "id": "vol_tile_auremae_plaza",
    "name": "奥赫玛中心广场",
    "description": "黄金裔的骄傲，永恒之地最繁华的广场。中央矗立着创世之碑。",
    "type": "room",
    "floors": ["GROUND"],
    "edges": { "N": "OPEN", "S": "OPEN", "E": "OPEN", "W": "OPEN" },
    "icon": "Crown",
    "cardSymbol": "NONE",
    "effects": [
      { "type": "buff", "text": "所有属性+1" },
      { "type": "special", "text": "剧本事件触发率+50%" }
    ]
  },
  {
    "id": "vol_tile_golden_gate",
    "name": "黄金门",
    "description": "通往奥赫玛的宏伟入口，门上镶嵌着永恒的黄金。",
    "type": "room",
    "floors": ["GROUND"],
    "edges": { "N": "OPEN", "S": "WALL", "E": "OPEN", "W": "OPEN" },
    "icon": "Gate",
    "cardSymbol": "NONE",
    "effects": [
      { "type": "buff", "text": "力量+1" }
    ]
  },
  {
    "id": "vol_tile_sacred_path",
    "name": "神圣大道",
    "description": "通往神庙的朝圣之路，两旁是永恒燃烧的火炬。",
    "type": "corridor",
    "floors": ["GROUND"],
    "edges": { "N": "OPEN", "S": "OPEN", "E": "WALL", "W": "WALL" },
    "icon": "Path",
    "cardSymbol": "NONE",
    "effects": []
  },
  {
    "id": "vol_tile_temple_light",
    "name": "光辉神庙",
    "description": "供奉黄金裔诸神的圣地，沐浴在永恒的光辉中。",
    "type": "room",
    "floors": ["GROUND"],
    "edges": { "N": "WALL", "S": "OPEN", "E": "WALL", "W": "OPEN" },
    "icon": "Temple",
    "cardSymbol": "OMEN",
    "effects": [
      { "type": "buff", "text": "知识+1" },
      { "type": "event", "text": "可进行一次祈福" }
    ]
  },
  {
    "id": "vol_tile_market_square",
    "name": "集市广场",
    "description": "商贩云集的热闹场所，你可以在这里交易物品。",
    "type": "room",
    "floors": ["GROUND"],
    "edges": { "N": "OPEN", "S": "OPEN", "E": "OPEN", "W": "WALL" },
    "icon": "Store",
    "cardSymbol": "NONE",
    "effects": [
      { "type": "special", "text": "可与任意玩家交换1件物品" }
    ]
  },
  {
    "id": "vol_tile_guild_hall",
    "name": "冒险者公会",
    "description": "佣兵与冒险者聚集的地方，任务公告板贴满了委托。",
    "type": "room",
    "floors": ["GROUND", "UPPER"],
    "edges": { "N": "OPEN", "S": "WALL", "E": "OPEN", "W": "OPEN" },
    "icon": "Scroll",
    "cardSymbol": "NONE",
    "effects": [
      { "type": "special", "text": "可抽取1张技能卡" }
    ]
  },
  {
    "id": "vol_tile_narrow_alley",
    "name": "狭窄巷弄",
    "description": "奥赫玛错综复杂的小巷，是盗贼的藏身之所。",
    "type": "corridor",
    "floors": ["GROUND"],
    "edges": { "N": "OPEN", "S": "WALL", "E": "OPEN", "W": "OPEN" },
    "icon": "Dagger",
    "cardSymbol": "NONE",
    "effects": [
      { "type": "debuff", "text": "速度-1" }
    ]
  },
  {
    "id": "vol_tile_warehouse",
    "name": "仓库区",
    "description": "堆满货物与箱子的Storage区域，偶尔有珍贵物品。",
    "type": "room",
    "floors": ["GROUND"],
    "edges": { "N": "OPEN", "S": "OPEN", "E": "WALL", "W": "WALL" },
    "icon": "Box",
    "cardSymbol": "ITEM",
    "effects": [
      { "type": "special", "text": "可抽取1张物品卡" }
    ]
  },

  // ==================== 黄金港 ====================
  {
    "id": "vol_tile_golden_port",
    "name": "黄金港码头",
    "description": "繁忙的港口，来自各地的船只在此停泊。",
    "type": "room",
    "floors": ["GROUND"],
    "edges": { "N": "WALL", "S": "OPEN", "E": "OPEN", "W": "OPEN" },
    "icon": "Ship",
    "cardSymbol": "NONE",
    "effects": [
      { "type": "special", "text": "可通往其他区域" }
    ]
  },
  {
    "id": "vol_tile_lighthouse",
    "name": "永恒灯塔",
    "description": "为航船指引方向的灯塔，永不熄灭的光芒。",
    "type": "room",
    "floors": ["GROUND", "UPPER"],
    "edges": { "N": "OPEN", "S": "WALL", "E": "WALL", "W": "OPEN" },
    "icon": "Light",
    "cardSymbol": "OMEN",
    "effects": [
      { "type": "buff", "text": "全属性+1" },
      { "type": "debuff", "text": "理智-1（永火灼烧）" }
    ]
  },
  {
    "id": "vol_tile_fishing_village",
    "name": "渔村",
    "description": "宁静的小渔村，村民们世代在此生活。",
    "type": "room",
    "floors": ["GROUND"],
    "edges": { "N": "OPEN", "S": "OPEN", "E": "WALL", "W": "OPEN" },
    "icon": "Home",
    "cardSymbol": "NONE",
    "effects": [
      { "type": "heal", "text": "恢复1点生命" }
    ]
  },
  {
    "id": "vol_tile_dockside_bar",
    "name": "港口酒吧",
    "description": "水手们休憩的酒吧，流传着各种海上的传言。",
    "type": "room",
    "floors": ["GROUND"],
    "edges": { "N": "OPEN", "S": "WALL", "E": "OPEN", "W": "WALL" },
    "icon": "Beer",
    "cardSymbol": "EVENT",
    "effects": [
      { "type": "event", "text": "触发随机事件" }
    ]
  },

  // ==================== 纷争事由之地 ====================
  {
    "id": "vol_tile_battlefield",
    "name": "纷争战场",
    "description": "诸神战争的遗迹，满是残垣断壁和武器碎片。",
    "type": "room",
    "floors": ["GROUND"],
    "edges": { "N": "OPEN", "S": "OPEN", "E": "WALL", "W": "WALL" },
    "icon": "Sword",
    "cardSymbol": "OMEN",
    "effects": [
      { "type": "buff", "text": "力量+2" },
      { "type": "debuff", "text": "理智-1" }
    ]
  },
  {
    "id": "vol_tile_war_tent",
    "name": "战争帐篷",
    "description": "昔日军队的临时驻地，如今空无一人。",
    "type": "room",
    "floors": ["GROUND"],
    "edges": { "N": "OPEN", "S": "WALL", "E": "OPEN", "W": "WALL" },
    "icon": "Tent",
    "cardSymbol": "NONE",
    "effects": [
      { "type": "special", "text": "可搜寻到武器" }
    ]
  },
  {
    "id": "vol_tile_monument",
    "name": "战争纪念碑",
    "description": "为纪念阵亡将士而建的纪念碑，上面刻着古老的符文。",
    "type": "room",
    "floors": ["GROUND"],
    "edges": { "N": "WALL", "S": "OPEN", "E": "OPEN", "W": "OPEN" },
    "icon": "Monument",
    "cardSymbol": "OMEN",
    "effects": [
      { "type": "buff", "text": "知识+1" },
      { "type": "event", "text": "触发战争记忆事件" }
    ]
  },
  {
    "id": "vol_tile_broken_weapon",
    "name": "残兵存放处",
    "description": "堆积如山的破损武器，部分仍可使用。",
    "type": "room",
    "floors": ["GROUND"],
    "edges": { "N": "WALL", "S": "OPEN", "E": "WALL", "W": "OPEN" },
    "icon": "Shield",
    "cardSymbol": "ITEM",
    "effects": [
      { "type": "special", "text": "可抽取1张武器卡" }
    ]
  },
  {
    "id": "vol_tile_blood_stained",
    "name": "血染之地",
    "description": "战斗最为激烈的区域，土地仍散发着血腥气息。",
    "type": "corridor",
    "floors": ["GROUND"],
    "edges": { "N": "OPEN", "S": "OPEN", "E": "OPEN", "W": "WALL" },
    "icon": "Droplet",
    "cardSymbol": "OMEN",
    "effects": [
      { "type": "debuff", "text": "力量-1" },
      { "type": "special", "text": "战斗触发率+100%" }
    ]
  },

  // ==================== 永火试炼 ====================
  {
    "id": "vol_tile_eternal_flame",
    "name": "永恒烈焰",
    "description": "永不熄灭的神圣火焰，据说蕴含创世之力。",
    "type": "room",
    "floors": ["GROUND"],
    "edges": { "N": "OPEN", "S": "WALL", "E": "OPEN", "W": "OPEN" },
    "icon": "Flame",
    "cardSymbol": "OMEN",
    "effects": [
      { "type": "buff", "text": "力量+2" },
      { "type": "debuff", "text": "理智-2" }
    ]
  },
  {
    "id": "vol_tile_fire_temple",
    "name": "火焰圣殿",
    "description": "供奉火神的古老神殿，墙壁上燃烧着永恒的火焰。",
    "type": "room",
    "floors": ["GROUND", "UPPER"],
    "edges": { "N": "WALL", "S": "OPEN", "E": "WALL", "W": "OPEN" },
    "icon": "Fire",
    "cardSymbol": "OMEN",
    "effects": [
      { "type": "buff", "text": "知识+1" },
      { "type": "event", "text": "触发火焰试炼" }
    ]
  },
  {
    "id": "vol_tile_ash_fields",
    "name": "灰烬平原",
    "description": "被火焰焚烧后的荒原，只剩下灰烬与焦土。",
    "type": "corridor",
    "floors": ["GROUND"],
    "edges": { "N": "OPEN", "S": "OPEN", "E": "WALL", "W": "OPEN" },
    "icon": "Ash",
    "cardSymbol": "NONE",
    "effects": [
      { "type": "debuff", "text": "速度-1" }
    ]
  },
  {
    "id": "vol_tile_molten_river",
    "name": "熔岩河流",
    "description": "炽热的熔岩流动形成的河流，温度足以融化金属。",
    "type": "corridor",
    "floors": ["GROUND"],
    "edges": { "N": "WALL", "S": "OPEN", "E": "OPEN", "W": "OPEN" },
    "icon": "Lava",
    "cardSymbol": "OMEN",
    "effects": [
      { "type": "damage", "text": "通过时受到2点伤害" },
      { "type": "special", "text": "可快速通过" }
    ]
  },
  {
    "id": "vol_tile_phoenix_nest",
    "name": "凤凰巢穴",
    "description": "神鸟凤凰的栖息地，充满了生命的火焰。",
    "type": "room",
    "floors": ["GROUND"],
    "edges": { "N": "OPEN", "S": "OPEN", "E": "WALL", "W": "WALL" },
    "icon": "Phoenix",
    "cardSymbol": "OMEN",
    "effects": [
      { "type": "heal", "text": "完全恢复" },
      { "type": "debuff", "text": "理智-1" }
    ]
  },

  // ==================== 冥潭 ====================
  {
    "id": "vol_tile_river_styx",
    "name": "冥河斯堤克斯",
    "description": "连接生与死的河流，据说渡过此河将遗忘一切。",
    "type": "corridor",
    "floors": ["GROUND"],
    "edges": { "N": "OPEN", "S": "OPEN", "E": "WALL", "W": "WALL" },
    "icon": "River",
    "cardSymbol": "OMEN",
    "effects": [
      { "type": "debuff", "text": "理智-2" },
      { "type": "special", "text": "可与亡灵对话" }
    ]
  },
  {
    "id": "vol_tile_underworld_gate",
    "name": "冥界入口",
    "description": "通往冥界的大门，散发着死亡的气息。",
    "type": "room",
    "floors": ["GROUND"],
    "edges": { "N": "OPEN", "S": "WALL", "E": "OPEN", "W": "WALL" },
    "icon": "Skull",
    "cardSymbol": "OMEN",
    "effects": [
      { "type": "event", "text": "触发冥界试炼" },
      { "type": "debuff", "text": "知识-1" }
    ]
  },
  {
    "id": "vol_tile_shadow_realm",
    "name": "暗影领域",
    "description": "永远被黑暗笼罩的区域，视线所及只有阴影。",
    "type": "room",
    "floors": ["GROUND"],
    "edges": { "N": "OPEN", "S": "OPEN", "E": "OPEN", "W": "WALL" },
    "icon": "Moon",
    "cardSymbol": "OMEN",
    "effects": [
      { "type": "debuff", "text": "速度-2" },
      { "type": "special", "text": "潜行+2" }
    ]
  },
  {
    "id": "vol_tile_crypt",
    "name": "地下墓穴",
    "description": "安葬亡者的墓穴，墙壁上刻满了往者的名讳。",
    "type": "room",
    "floors": ["GROUND", "UPPER"],
    "edges": { "N": "WALL", "S": "OPEN", "E": "OPEN", "W": "OPEN" },
    "icon": "Tomb",
    "cardSymbol": "OMEN",
    "effects": [
      { "type": "special", "text": "可获得1张灾祸卡" },
      { "type": "event", "text": "触发亡者低语" }
    ]
  },
  {
    "id": "vol_tile_soul_forge",
    "name": "灵魂锻造铺",
    "description": "为亡者打造武器的神秘作坊，只在月光下营业。",
    "type": "room",
    "floors": ["GROUND"],
    "edges": { "N": "OPEN", "S": "WALL", "E": "WALL", "W": "OPEN" },
    "icon": "Anvil",
    "cardSymbol": "ITEM",
    "effects": [
      { "type": "special", "text": "可将物品转换为神器" }
    ]
  },
  {
    "id": "vol_tile_lake_mirror",
    "name": "镜之湖",
    "description": "平静如镜的湖面，能映照出人内心最深处的恐惧。",
    "type": "room",
    "floors": ["GROUND"],
    "edges": { "N": "OPEN", "S": "OPEN", "E": "OPEN", "W": "OPEN" },
    "icon": "Mirror",
    "cardSymbol": "OMEN",
    "effects": [
      { "type": "event", "text": "触发心像试炼" },
      { "type": "debuff", "text": "理智-1" }
    ]
  },

  // ==================== 黑潮区域 ====================
  {
    "id": "vol_tile_black_tide",
    "name": "黑潮边缘",
    "description": "被黑潮侵蚀的边界地带，一切都被黑暗吞噬。",
    "type": "corridor",
    "floors": ["GROUND"],
    "edges": { "N": "OPEN", "S": "WALL", "E": "OPEN", "W": "OPEN" },
    "icon": "Waves",
    "cardSymbol": "OMEN",
    "effects": [
      { "type": "debuff", "text": "全属性-1" },
      { "type": "special", "text": "理智检定-2" }
    ]
  },
  {
    "id": "vol_tile_corrupted_ruins",
    "name": "腐化遗迹",
    "description": "被黑潮完全侵蚀的古代遗迹，散发着不祥的气息。",
    "type": "room",
    "floors": ["GROUND"],
    "edges": { "N": "WALL", "S": "OPEN", "E": "OPEN", "W": "WALL" },
    "icon": "Broken",
    "cardSymbol": "OMEN",
    "effects": [
      { "type": "damage", "text": "每回合受到1点伤害" },
      { "type": "special", "text": "可获得被封印的知识" }
    ]
  },
  {
    "id": "vol_tile_void_entrance",
    "name": "虚空入口",
    "description": "通往虚空中 的裂缝，隐约可见另一边的景象。",
    "type": "room",
    "floors": ["GROUND"],
    "edges": { "N": "OPEN", "S": "OPEN", "E": "WALL", "W": "OPEN" },
    "icon": "Void",
    "cardSymbol": "OMEN",
    "effects": [
      { "type": "event", "text": "触发虚空试炼" },
      { "type": "debuff", "text": "理智-2" }
    ]
  },
  {
    "id": "vol_tile_abyss_watchtower",
    "name": "深渊瞭望塔",
    "description": "为监视黑潮而建的塔楼，如今已废弃。",
    "type": "room",
    "floors": ["GROUND", "UPPER"],
    "edges": { "N": "OPEN", "S": "WALL", "E": "WALL", "W": "OPEN" },
    "icon": "Tower",
    "cardSymbol": "NONE",
    "effects": [
      { "type": "special", "text": "可观察全局（速度+2）" }
    ]
  },

  // ==================== 泰坦遗迹 ====================
  {
    "id": "vol_tile_titan_forge",
    "name": "泰坦锻铁炉",
    "description": "泰坦族打造的巨型锻造炉，至今仍有余温。",
    "type": "room",
    "floors": ["GROUND"],
    "edges": { "N": "OPEN", "S": "OPEN", "E": "WALL", "W": "WALL" },
    "icon": "Hammer",
    "cardSymbol": "ITEM",
    "effects": [
      { "type": "special", "text": "可锻造一件传奇武器" }
    ]
  },
  {
    "id": "vol_tile_giant_throne",
    "name": "巨人王座",
    "description": "昔日泰坦王的王座，散发着威严的气息。",
    "type": "room",
    "floors": ["GROUND"],
    "edges": { "N": "WALL", "S": "OPEN", "E": "OPEN", "W": "OPEN" },
    "icon": "Crown",
    "cardSymbol": "OMEN",
    "effects": [
      { "type": "buff", "text": "力量+2" },
      { "type": "debuff", "text": "知识-1" }
    ]
  },
  {
    "id": "vol_tile_mechanism_hall",
    "name": "机械大厅",
    "description": "泰坦族留下的自动机械仍在运转。",
    "type": "room",
    "floors": ["GROUND", "UPPER"],
    "edges": { "N": "OPEN", "S": "OPEN", "E": "OPEN", "W": "WALL" },
    "icon": "Gear",
    "cardSymbol": "EVENT",
    "effects": [
      { "type": "event", "text": "触发机械守卫战斗" },
      { "type": "special", "text": "可获得泰坦科技" }
    ]
  },
  {
    "id": "vol_tile_colossus_foot",
    "name": "巨人之足",
    "description": "倒塌的泰坦巨像的一只脚，体积惊人。",
    "type": "room",
    "floors": ["GROUND"],
    "edges": { "N": "OPEN", "S": "WALL", "E": "OPEN", "W": "WALL" },
    "icon": "Foot",
    "cardSymbol": "NONE",
    "effects": [
      { "type": "special", "text": "可作为掩体" }
    ]
  },

  // ==================== 永恒之地其他区域 ====================
  {
    "id": "vol_tile_time_distortion",
    "name": "时间扭曲区",
    "description": "时间流动异常的区域，过去与未来交错。",
    "type": "corridor",
    "floors": ["GROUND"],
    "edges": { "N": "OPEN", "S": "OPEN", "E": "OPEN", "W": "OPEN" },
    "icon": "Clock",
    "cardSymbol": "OMEN",
    "effects": [
      { "type": "event", "text": "随机获得或失去属性" },
      { "type": "special", "text": "可进行时间回溯" }
    ]
  },
  {
    "id": "vol_tile_garden_eternal",
    "name": "永恒花园",
    "description": "永远不会凋谢的花园，芬芳馥郁。",
    "type": "room",
    "floors": ["GROUND"],
    "edges": { "N": "OPEN", "S": "OPEN", "E": "OPEN", "W": "OPEN" },
    "icon": "Flower",
    "cardSymbol": "NONE",
    "effects": [
      { "type": "heal", "text": "恢复2点生命" },
      { "type": "buff", "text": "速度+1" }
    ]
  },
  {
    "id": "vol_tile_library_ancient",
    "name": "古老图书馆",
    "description": "收藏着无数古老知识的图书馆，部分书籍已石化。",
    "type": "room",
    "floors": ["GROUND", "UPPER"],
    "edges": { "N": "WALL", "S": "OPEN", "E": "OPEN", "W": "OPEN" },
    "icon": "Book",
    "cardSymbol": "EVENT",
    "effects": [
      { "type": "buff", "text": "知识+2" },
      { "type": "event", "text": "触发知识试炼" }
    ]
  },
  {
    "id": "vol_tile_starry_observatory",
    "name": "星空观测台",
    "description": "用于观测星空的高台，可以看到永恒之地的全貌。",
    "type": "room",
    "floors": ["UPPER"],
    "edges": { "N": "OPEN", "S": "WALL", "E": "WALL", "W": "OPEN" },
    "icon": "Star",
    "cardSymbol": "OMEN",
    "effects": [
      { "type": "special", "text": "可预知下一个事件" },
      { "type": "buff", "text": "知识+1" }
    ]
  },
  {
    "id": "vol_tile_forbidden_sanctum",
    "name": "禁忌圣地",
    "description": "被封印的禁忌区域据说通往神的领域。",
    "type": "room",
    "floors": ["GROUND"],
    "edges": { "N": "WALL", "S": "WALL", "E": "OPEN", "W": "OPEN" },
    "icon": "Lock",
    "cardSymbol": "OMEN",
    "effects": [
      { "type": "event", "text": "触发终极试炼" },
      { "type": "debuff", "text": "全属性-1" }
    ]
  },
  {
    "id": "vol_tile_portal_chamber",
    "name": "传送门室",
    "description": "古代留下的传送门，部分仍可使用。",
    "type": "room",
    "floors": ["GROUND"],
    "edges": { "N": "OPEN", "S": "OPEN", "E": "WALL", "W": "WALL" },
    "icon": "Portal",
    "cardSymbol": "EVENT",
    "effects": [
      { "type": "special", "text": "可传送到任意已发现区域" }
    ]
  },
  {
    "id": "vol_tile_dragon_lair",
    "name": "巨龙巢穴",
    "description": "昔日巨龙的栖息地，堆满了金银珠宝。",
    "type": "room",
    "floors": ["GROUND"],
    "edges": { "N": "WALL", "S": "OPEN", "E": "WALL", "W": "OPEN" },
    "icon": "Dragon",
    "cardSymbol": "ITEM",
    "effects": [
      { "type": "special", "text": "可抽取3张物品卡" },
      { "type": "event", "text": "触发巨龙守卫战斗" }
    ]
  },
  {
    "id": "vol_tile_sacred_spring",
    "name": "神圣之泉",
    "description": "传说中诸神沐浴的泉水，具有治愈之力。",
    "type": "room",
    "floors": ["GROUND"],
    "edges": { "N": "OPEN", "S": "OPEN", "E": "OPEN", "W": "WALL" },
    "icon": "Droplets",
    "cardSymbol": "NONE",
    "effects": [
      { "type": "heal", "text": "完全恢复" },
      { "type": "buff", "text": "理智+1" }
    ]
  },
  {
    "id": "vol_tile_battle_arena",
    "name": "竞技场",
    "description": "古代用于角斗的竞技场，观众的欢呼声似乎仍在回响。",
    "type": "room",
    "floors": ["GROUND"],
    "edges": { "N": "OPEN", "S": "WALL", "E": "OPEN", "W": "WALL" },
    "icon": "Sword",
    "cardSymbol": "EVENT",
    "effects": [
      { "type": "event", "text": "触发竞技场挑战" },
      { "type": "buff", "text": "力量+1" }
    ]
  },
  {
    "id": "vol_tile_abandoned_shrine",
    "name": "废弃神社",
    "description": "被遗忘的神社，神像已爬满藤蔓。",
    "type": "room",
    "floors": ["GROUND"],
    "edges": { "N": "OPEN", "S": "OPEN", "E": "WALL", "W": "OPEN" },
    "icon": "Shrine",
    "cardSymbol": "OMEN",
    "effects": [
      { "type": "event", "text": "触发古老祈祷" },
      { "type": "debuff", "text": "理智-1" }
    ]
  }
];
