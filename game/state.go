package game

import (
	"encoding/json"
	"fmt"
	"time"
)

// ==================== Phase 1: 状态同步辅助函数 ====================

// SyncStateJSON 获取完整同步状态的 JSON
func (g *GameStateFull) SyncStateJSON() (string, error) {
	type SyncMessage struct {
		Type      string      `json:"type"`
		Version   int64       `json:"version"`
		Timestamp int64       `json:"timestamp"`
		State     interface{} `json:"state"`
	}

	msg := SyncMessage{
		Type:      "state_sync",
		Version:   time.Now().UnixMilli(),
		Timestamp: time.Now().UnixMilli(),
		State:     g,
	}

	data, err := json.Marshal(msg)
	if err != nil {
		return "", fmt.Errorf("序列化状态失败: %v", err)
	}
	return string(data), nil
}

// ==================== 游戏数据 ====================
// 剧本目标系统已实现 (objectives.go)
// - CheckVictory: 英雄/叛徒胜利条件检查
// - UpdateObjectives: 目标进度追踪
// - InitializeObjectives: 目标初始化
// - IncrementHauntTurns: 作祟回合递增

// ==================== 兼容旧接口 ====================
// 这些函数现在使用 JSON 数据 + embed，定义在 data_loader.go 中

// OriginalTileDeck 经典主题房间牌堆 (带被动效果) - 保留作为降级数据
var OriginalTileDeck = []TileDef{
	{
		ID:          "tile_hallway",
		Name:        "嘎吱作响的走廊",
		Description: "地板在你脚下发出阵阵呻吟",
		Type:        "corridor",
		Edges:       map[Direction]string{DirectionNorth: "OPEN", DirectionSouth: "OPEN", DirectionEast: "WALL", DirectionWest: "WALL"},
	},
	{
		ID:          "tile_library",
		Name:        "布满灰尘的图书馆",
		Description: "禁忌的知识",
		Type:        "room",
		Edges:       map[Direction]string{DirectionNorth: "WALL", DirectionSouth: "OPEN", DirectionEast: "OPEN", DirectionWest: "WALL"},
		CardSymbol:  "OMEN",
		OnEnterEffects: []Effect{
			{Type: "MODIFY_STAT", Stat: "knowledge", Amount: 1, Message: "你在图书馆研究发现知识 +1"},
		},
	},
	{
		ID:          "tile_conservatory",
		Name:        "温室",
		Description: "枯死的植物",
		Type:        "room",
		Edges:       map[Direction]string{DirectionNorth: "OPEN", DirectionSouth: "WALL", DirectionEast: "WALL", DirectionWest: "WALL"},
		CardSymbol:  "OMEN",
		OnEnterEffects: []Effect{
			{Type: "MODIFY_STAT", Stat: "sanity", Amount: -1, Message: "枯萎的植物让你感到不安，理智 -1"},
		},
	},
	{
		ID:          "tile_kitchen",
		Name:        "厨房",
		Description: "腐烂的气味",
		Type:        "room",
		Edges:       map[Direction]string{DirectionNorth: "OPEN", DirectionSouth: "WALL", DirectionEast: "WALL", DirectionWest: "OPEN"},
		CardSymbol:  "EVENT",
		OnEnterEffects: []Effect{
			{Type: "MODIFY_STAT", Stat: "sanity", Amount: -1, Message: "腐烂的气味让你作呕，理智 -1"},
		},
	},
	{
		ID:          "tile_chapel",
		Name:        "废弃礼拜堂",
		Description: "神圣不再",
		Type:        "room",
		Edges:       map[Direction]string{DirectionNorth: "OPEN", DirectionSouth: "WALL", DirectionEast: "OPEN", DirectionWest: "OPEN"},
		CardSymbol:  "OMEN",
		OnEnterEffects: []Effect{
			{Type: "MODIFY_STAT", Stat: "sanity", Amount: 1, Message: "礼拜堂让你感到一丝安宁，理智 +1"},
		},
	},
	{
		ID:          "tile_basement",
		Name:        "地下室",
		Description: "黑暗的深渊",
		Type:        "room",
		Edges:       map[Direction]string{DirectionNorth: "WALL", DirectionSouth: "WALL", DirectionEast: "OPEN", DirectionWest: "OPEN"},
		CardSymbol:  "OMEN",
		OnEnterEffects: []Effect{
			{Type: "MODIFY_STAT", Stat: "sanity", Amount: -2, Message: "地下室的黑暗压迫着你，理智 -2"},
		},
	},
	{
		ID:          "tile_attic",
		Name:        "阁楼",
		Description: "尘埃与蜘蛛网",
		Type:        "room",
		Edges:       map[Direction]string{DirectionNorth: "WALL", DirectionSouth: "OPEN", DirectionEast: "WALL", DirectionWest: "WALL"},
		CardSymbol:  "ITEM",
		OnEnterEffects: []Effect{
			{Type: "MODIFY_STAT", Stat: "knowledge", Amount: 1, Message: "阁楼里发现一些旧书籍，知识 +1"},
		},
	},
	{
		ID:          "tile_dining",
		Name:        "餐厅",
		Description: "腐败的盛宴",
		Type:        "room",
		Edges:       map[Direction]string{DirectionNorth: "OPEN", DirectionSouth: "OPEN", DirectionEast: "WALL", DirectionWest: "OPEN"},
		CardSymbol:  "ITEM",
		OnEnterEffects: []Effect{
			{Type: "MODIFY_STAT", Stat: "might", Amount: 1, Message: "找到一些食物，力量 +1"},
		},
	},
	{
		ID:          "tile_gymnasium",
		Name:        "体育馆",
		Description: "强身健体之所",
		Type:        "room",
		Edges:       map[Direction]string{DirectionNorth: "WALL", DirectionSouth: "WALL", DirectionEast: "OPEN", DirectionWest: "OPEN"},
		CardSymbol:  "ITEM",
		OnEnterEffects: []Effect{
			{Type: "MODIFY_STAT", Stat: "speed", Amount: 1, Message: "体育馆锻炼后，速度 +1"},
		},
	},
	{
		ID:           "tile_vault",
		Name:         "金库",
		Description:  "财富的象征",
		Type:         "room",
		Edges:        map[Direction]string{DirectionNorth: "OPEN", DirectionSouth: "WALL", DirectionEast: "WALL", DirectionWest: "WALL"},
		CardSymbol:   "ITEM",
		EventTrigger: "event_vault_chest",
	},
	// ========== Phase X: NPC 测试房间 ==========
	{
		ID:          "tile_npc_test",
		Name:        "幽暗密室",
		Description: "黑暗中似乎有什么在蠢蠢欲动",
		Type:        "room",
		Edges:       map[Direction]string{DirectionNorth: "OPEN", DirectionSouth: "WALL", DirectionEast: "WALL", DirectionWest: "WALL"},
		CardSymbol:  "EVENT",
		// 进入时必定生成一个 NPC 怪物（随机类型）
		OnEnterEffects: []Effect{
			{Type: "SPAWN_NPC", NPCDefID: "npc_ghost", Message: "你遭遇了幽灵！"},
		},
	},
	{
		ID:          "tile_beast_den",
		Name:        "野兽巢穴",
		Description: "嗜血野兽的领地",
		Type:        "room",
		Edges:       map[Direction]string{DirectionNorth: "WALL", DirectionSouth: "OPEN", DirectionEast: "WALL", DirectionWest: "WALL"},
		CardSymbol:  "EVENT",
		OnEnterEffects: []Effect{
			{Type: "SPAWN_NPC", NPCDefID: "npc_beast", Message: "野兽从阴影中扑出！"},
		},
	},
	{
		ID:          "tile_zombie_crypt",
		Name:        "僵尸墓穴",
		Description: "不死生物的安息之地",
		Type:        "room",
		Edges:       map[Direction]string{DirectionNorth: "WALL", DirectionSouth: "OPEN", DirectionEast: "WALL", DirectionWest: "WALL"},
		CardSymbol:  "OMEN",
		OnEnterEffects: []Effect{
			{Type: "SPAWN_NPC", NPCDefID: "npc_zombie", Message: "僵尸从坟墓中爬出！"},
		},
	},
}

// VolantisTileDeck 翁法罗斯主题房间牌堆 (带被动效果)
var VolantisTileDeck = []TileDef{
	{
		ID:          "vol_tile_auremae_plaza",
		Name:        "奥赫玛中心广场",
		Description: "黄金裔的骄傲，永恒之地最繁华的广场。中央矗立着创世之碑。",
		Type:        "room",
		Edges:       map[Direction]string{DirectionNorth: "OPEN", DirectionSouth: "OPEN", DirectionEast: "OPEN", DirectionWest: "OPEN"},
		CardSymbol:  "NONE",
		OnEnterEffects: []Effect{
			{Type: "MODIFY_STAT", Stat: "knowledge", Amount: 1, Message: "创世之碑的光辉照耀着你，知识 +1"},
		},
	},
	{
		ID:          "vol_tile_golden_gate",
		Name:        "黄金门",
		Description: "通往奥赫玛的宏伟入口，门上镶嵌着永恒的黄金。",
		Type:        "room",
		Edges:       map[Direction]string{DirectionNorth: "OPEN", DirectionSouth: "WALL", DirectionEast: "OPEN", DirectionWest: "OPEN"},
		CardSymbol:  "NONE",
		OnEnterEffects: []Effect{
			{Type: "MODIFY_STAT", Stat: "might", Amount: 1, Message: "黄金门的能量让你充满力量，力量 +1"},
		},
	},
	{
		ID:          "vol_tile_temple_light",
		Name:        "光辉神庙",
		Description: "供奉黄金裔诸神的圣地，沐浴在永恒的光辉中。",
		Type:        "room",
		Edges:       map[Direction]string{DirectionNorth: "WALL", DirectionSouth: "OPEN", DirectionEast: "WALL", DirectionWest: "OPEN"},
		CardSymbol:  "OMEN",
		OnEnterEffects: []Effect{
			{Type: "MODIFY_STAT", Stat: "sanity", Amount: 2, Message: "神庙的光辉净化着你，理智 +2"},
		},
	},
	{
		ID:          "vol_tile_shadow_realm",
		Name:        "幽影领域",
		Description: "通往冥潭的阴影边界，这里时间停滞，空间扭曲。",
		Type:        "room",
		Edges:       map[Direction]string{DirectionNorth: "OPEN", DirectionSouth: "WALL", DirectionEast: "WALL", DirectionWest: "WALL"},
		CardSymbol:  "OMEN",
		OnEnterEffects: []Effect{
			{Type: "MODIFY_STAT", Stat: "sanity", Amount: -2, Message: "阴影的侵蚀让你感到恐惧，理智 -2"},
		},
	},
	{
		ID:          "vol_tile_golden_harbor",
		Name:        "黄金港",
		Description: "商人与探险家的聚集地，永远繁忙的港口。",
		Type:        "room",
		Edges:       map[Direction]string{DirectionNorth: "WALL", DirectionSouth: "OPEN", DirectionEast: "OPEN", DirectionWest: "WALL"},
		CardSymbol:  "ITEM",
		OnEnterEffects: []Effect{
			{Type: "MODIFY_STAT", Stat: "knowledge", Amount: 1, Message: "港口的见闻让你增长见识，知识 +1"},
		},
	},
	{
		ID:          "vol_tile_arena",
		Name:        "永火竞技场",
		Description: "昔日的荣耀战场，如今只剩下回响的欢呼声。",
		Type:        "room",
		Edges:       map[Direction]string{DirectionNorth: "OPEN", DirectionSouth: "OPEN", DirectionEast: "WALL", DirectionWest: "WALL"},
		CardSymbol:  "EVENT",
		OnEnterEffects: []Effect{
			{Type: "MODIFY_STAT", Stat: "might", Amount: 1, Message: "竞技场的余勇让你血脉喷张，力量 +1"},
		},
	},
	{
		ID:          "vol_tile_underworld",
		Name:        "冥潭入口",
		Description: "通往冥潭的黑暗入口，死亡的气息扑面而来。",
		Type:        "room",
		Edges:       map[Direction]string{DirectionNorth: "WALL", DirectionSouth: "WALL", DirectionEast: "OPEN", DirectionWest: "WALL"},
		CardSymbol:  "OMEN",
		OnEnterEffects: []Effect{
			{Type: "MODIFY_STAT", Stat: "sanity", Amount: -3, Message: "死亡的压迫让你几近崩溃，理智 -3"},
		},
	},
	{
		ID:          "vol_tile_heros_rest",
		Name:        "英雄安息地",
		Description: "黄金裔战士的长眠之所，永恒的宁静笼罩着这里。",
		Type:        "room",
		Edges:       map[Direction]string{DirectionNorth: "OPEN", DirectionSouth: "WALL", DirectionEast: "WALL", DirectionWest: "OPEN"},
		CardSymbol:  "OMEN",
		OnEnterEffects: []Effect{
			{Type: "MODIFY_STAT", Stat: "speed", Amount: 1, Message: "英灵的祝福让你身轻如燕，速度 +1"},
		},
	},
	{
		ID:          "vol_tile_market",
		Name:        "繁星集市",
		Description: "各族商人汇聚的交易之地，充斥着奇珍异宝。",
		Type:        "room",
		Edges:       map[Direction]string{DirectionNorth: "OPEN", DirectionSouth: "WALL", DirectionEast: "OPEN", DirectionWest: "OPEN"},
		CardSymbol:  "ITEM",
		OnEnterEffects: []Effect{
			{Type: "MODIFY_STAT", Stat: "knowledge", Amount: 1, Message: "集市的见闻让你开阔眼界，知识 +1"},
		},
	},
	{
		ID:          "vol_tile_corridor",
		Name:        "黄金走廊",
		Description: "连接奥赫玛各处的华丽走廊，墙壁上刻满古老的符文。",
		Type:        "corridor",
		Edges:       map[Direction]string{DirectionNorth: "OPEN", DirectionSouth: "OPEN", DirectionEast: "OPEN", DirectionWest: "OPEN"},
	},
}

// 兼容旧名称
var TileDeck = OriginalTileDeck

// ThemeTileDecks 主题房间牌堆映射 (降级用)
var ThemeTileDecks = map[string][]TileDef{
	"original": OriginalTileDeck,
	"volantis": VolantisTileDeck,
}
