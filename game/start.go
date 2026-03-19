package game

import (
	"errors"
	"math/rand"
	"time"
)

// StartGame 开始游戏（所有玩家准备后）
func (g *GameManager) StartGame(roomID string) error {
	g.mu.Lock()
	defer g.mu.Unlock()

	room, exists := g.Rooms[roomID]
	if !exists {
		return errors.New("房间不存在")
	}

	// 检查是否所有玩家都已准备
	for _, p := range room.Players {
		if !p.IsReady {
			return errors.New("还有玩家未准备")
		}
	}

	// 初始化游戏状态
	players := make(map[string]*GamePlayer)
	playerIDs := make([]string, 0, len(room.Players))

	// 根据主题获取房间牌堆并洗牌
	theme := room.Theme
	if theme == "" {
		theme = "original"
	}
	themeTileDeck := GetTileDeckByTheme(theme)
	tileDeck := make([]TileDef, len(themeTileDeck))
	copy(tileDeck, themeTileDeck)
	rand.Shuffle(len(tileDeck), func(i, j int) {
		tileDeck[i], tileDeck[j] = tileDeck[j], tileDeck[i]
	})

	// 初始化属性辅助函数 - 从数据源加载 values 数组
	initAttribute := func(attrName string, defaultValue int, charID string) Attribute {
		// 尝试从角色数据中获取 values 数组
		values, startIndex := GetCharacterAttributeValues(charID, attrName)
		
		if values == nil || len(values) == 0 {
			// 降级：使用简单的 values 数组
			floor := 0
			max := values[len(values)-1]
			if max < defaultValue {
				max = defaultValue
			}
			simpleValues := make([]int, max-floor+1)
			for i := range simpleValues {
				simpleValues[i] = floor + i
			}
			return Attribute{
				Current: defaultValue,
				Base:    defaultValue,
				Floor:   floor,
				Max:     max,
				Values:  simpleValues,
				Index:   defaultValue,
			}
		}
		
		// 使用数据源中的 values 数组
		floor := values[0]
		max := values[len(values)-1]
		current := values[startIndex]
		
		return Attribute{
			Current: current,
			Base:    current,
			Floor:   floor,
			Max:     max,
			Values:  values,
			Index:   startIndex,
		}
	}

	// 获取主题的角色数据
	themeCharacters := GetCharactersByTheme(theme)

	i := 0
	for _, p := range room.Players {
		playerID := p.ID
		playerIDs = append(playerIDs, playerID)
		
		// 根据玩家索引获取对应的角色定义
		var charID string
		var charName string
		if themeCharacters != nil && i < len(themeCharacters) {
			charID = themeCharacters[i].ID
			charName = themeCharacters[i].Name
		} else {
			// 降级：使用默认角色
			charID = "char_default"
			charName = "冒险者"
		}

		players[playerID] = &GamePlayer{
			ID:     playerID,
			Team:   "UNASSIGNED",
			Items:  []Card{},
			DroppedItems: []Card{},
			Buffs:  []string{},
			Skills: []string{},
			SkillPoints: 0,
			PersonalLogs: []PersonalLog{
				{
					ID:        generateLogID(),
					Timestamp: time.Now().UnixMilli(),
					Text:      "进入了大厦。",
					Type:      "info",
				},
			},
			StatusEffects: []StatusEffect{},
			UnlockedSkillNodes: []string{},
			ShowTrail: false,
			Character: CharacterDef{
				ID:   charID,
				Name: charName,
				Attributes: map[string]Attribute{
					"might":     initAttribute("might", 3, charID),
					"speed":     initAttribute("speed", 3, charID),
					"sanity":    initAttribute("sanity", 3, charID),
					"knowledge": initAttribute("knowledge", 3, charID),
				},
			},
			Position: Position{X: 0, Y: 0},
		}
		i++
	}

	room.GameState = &RoomGameState{
		Phase: "PLAYING",
		FullState: &GameStateFull{
			Phase:          GamePhaseExploration,
			TurnPhase:      TurnPhaseMoving,
			TurnIndex:      1,
			Players:        players,
			PlayerIDs:      playerIDs,
			ActivePlayerID: playerIDs[0],
			Map: map[string]*TileInstance{
				"0,0": {
					InstanceID:        "start",
					DefID:             "tile_entry_hall",
					X:                 0,
					Y:                 0,
					Rotation:          0,
					Edges:             map[Direction]string{
						DirectionNorth: "OPEN",
						DirectionEast:  "OPEN",
						DirectionSouth: "OPEN",
						DirectionWest:  "OPEN",
					},
					HasEventTriggered: true,
					Visibility:        "VISIBLE",
					DroppedItems:      []Card{},
				},
			},
			TileDeck:       tileDeck,
			OmenCount:      0,
			IsHauntActive:  false,
			Logs: []LogEntry{
				{
					ID:        "init",
					Timestamp: time.Now().UnixMilli(),
					Text:      "大厦沉重的大门在你们身后砰然关上。",
					Type:      "narrative",
				},
			},
			MovesRemaining: 3,
			// 初始化卡牌牌堆
			Decks: map[string][]Card{
				"EVENT": InitDeck("EVENT"),
				"ITEM":  InitDeck("ITEM"),
				"OMEN":  InitDeck("OMEN"),
			},
		},
	}

	return nil
}
