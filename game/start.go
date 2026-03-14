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

	i := 0
	for _, p := range room.Players {
		playerID := p.ID
		playerIDs = append(playerIDs, playerID)

		players[playerID] = &GamePlayer{
			ID:     playerID,
			Team:   "UNASSIGNED",
			Items:  []string{},
			Buffs:  []string{},
			Skills: []string{},
			SkillPoints: 0,
			Character: CharacterDef{
				ID:   "char_" + playerID,
				Name: p.Name,
				Attributes: map[string]Attribute{
					"might":     {Current: 3, Base: 3, Floor: 0, Max: 6},
					"speed":     {Current: 3, Base: 3, Floor: 0, Max: 6},
					"sanity":    {Current: 3, Base: 3, Floor: 0, Max: 6},
					"knowledge": {Current: 3, Base: 3, Floor: 0, Max: 6},
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
					DefID:             "start_tile",
					X:                 0,
					Y:                 0,
					Rotation:          0,
					Edges:             map[Direction]string{DirectionNorth: "DOOR", DirectionEast: "DOOR", DirectionSouth: "DOOR", DirectionWest: "DOOR"},
					HasEventTriggered: true,
					Visibility:        "VISIBLE",
					DroppedItems:      []string{},
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
