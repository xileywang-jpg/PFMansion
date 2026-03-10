package game

import (
	"encoding/json"
	"errors"
	"log"
	"math/rand"
	"sync"
	"time"
)

// ==================== 玩家结构 ====================

type Player struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	SessionID string `json:"-"` // WebSocket session ID
	IsReady   bool   `json:"isReady"`
	IsHost    bool   `json:"isHost"`
	Team      string `json:"team"` // HERO, TRAITOR, UNASSIGNED
	IsDead    bool   `json:"isDead"`
}

// ==================== 游戏状态类型 ====================

// 方向
type Direction string

const (
	DirectionNorth Direction = "N"
	DirectionEast  Direction = "E"
	DirectionSouth Direction = "S"
	DirectionWest  Direction = "W"
)

// 游戏阶段
type GamePhase string

const (
	GamePhaseExploration GamePhase = "EXPLORATION"
	GamePhaseHauntRoll   GamePhase = "HAUNT_ROLL"
	GamePhaseHauntReveal GamePhase = "HAUNT_REVEAL"
	GamePhaseHaunt       GamePhase = "HAUNT"
	GamePhaseGameOver   GamePhase = "GAME_OVER"
)

// 回合阶段
type TurnPhase string

const (
	TurnPhaseMoving          TurnPhase = "MOVING"
	TurnPhaseEventResolving  TurnPhase = "EVENT_RESOLVING"
	TurnPhaseDone            TurnPhase = "DONE"
)

// 属性类型
type AttributeName string

const (
	AttributeMight     AttributeName = "might"
	AttributeSpeed     AttributeName = "speed"
	AttributeSanity    AttributeName = "sanity"
	AttributeKnowledge AttributeName = "knowledge"
)

// 属性结构
type Attribute struct {
	Current int   `json:"current"`
	Base    int   `json:"base"`
	Floor   int   `json:"floor"`
	Max     int   `json:"max"`
}

// 角色定义
type CharacterDef struct {
	ID          string                   `json:"id"`
	Name        string                  `json:"name"`
	Attributes  map[string]Attribute    `json:"attributes"`
	Traits      []string                `json:"traits"`
	Description string                  `json:"description"`
}

// 玩家
type GamePlayer struct {
	ID         string         `json:"id"`
	Character  CharacterDef  `json:"character"`
	Position   Position      `json:"position"`
	Items      []string     `json:"items"`
	IsDead     bool          `json:"isDead"`
	Team       string        `json:"team"`
	Buffs      []string     `json:"buffs"`
	Skills     []string     `json:"skills"`
	SkillPoints int         `json:"skillPoints"`
}

// 位置
type Position struct {
	X int `json:"x"`
	Y int `json:"y"`
}

// 房间定义
type TileDef struct {
	ID          string            `json:"id"`
	Name        string           `json:"name"`
	Description string           `json:"description"`
	Type       string           `json:"type"`
	Floors     []string         `json:"floors"`
	Edges      map[Direction]string `json:"edges"`
	CardSymbol string           `json:"cardSymbol,omitempty"`
	EventTrigger string        `json:"eventTrigger,omitempty"`
}

// 房间实例
type TileInstance struct {
	InstanceID       string            `json:"instanceId"`
	DefID            string            `json:"defId"`
	X                int               `json:"x"`
	Y                int               `json:"y"`
	Rotation         int               `json:"rotation"`
	Edges            map[Direction]string `json:"edges"`
	HasEventTriggered bool              `json:"hasEventTriggered"`
	Visibility       string            `json:"visibility"`
	DroppedItems     []string          `json:"droppedItems"`
}

// 卡牌定义
type CardDef struct {
	ID          string      `json:"id"`
	Type       string      `json:"type"`
	Title      string      `json:"title"`
	Description string     `json:"description"`
	CardSymbol string      `json:"cardSymbol,omitempty"`
}

// 剧本定义
type Scenario struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	IntroText   string   `json:"introText"`
	TraitorRule string   `json:"traitorRule"`
}

// 日志条目
type LogEntry struct {
	ID        string    `json:"id"`
	Timestamp int64     `json:"timestamp"`
	Text      string    `json:"text"`
	Type      string    `json:"type"` // info, alert, success, narrative
}

// ==================== 完整游戏状态 ====================

type GameStateFull struct {
	Phase         GamePhase              `json:"phase"`
	TurnPhase     TurnPhase              `json:"turnPhase"`
	TurnIndex     int                    `json:"turnIndex"`
	Players       map[string]*GamePlayer `json:"players"`
	PlayerIDs     []string               `json:"playerIds"`
	ActivePlayerID string                `json:"activePlayerId"`
	Map           map[string]*TileInstance `json:"map"`
	TileDeck      []TileDef              `json:"tileDeck"`
	OmenCount     int                   `json:"omenCount"`
	IsHauntActive bool                  `json:"isHauntActive"`
	CurrentScenario *Scenario           `json:"currentScenario,omitempty"`
	TraitorID     string                `json:"traitorId,omitempty"`
	Logs          []LogEntry            `json:"logs"`
	MovesRemaining int                  `json:"movesRemaining"`
	LastRollResult *int                 `json:"lastRollResult,omitempty"`
	LastTriggeredOmen string           `json:"lastTriggeredOmen,omitempty"`
	LastTriggeredTile string            `json:"lastTriggeredTile,omitempty"`
}

// ==================== 房间游戏状态 ====================

type RoomGameState struct {
	Phase      string        `json:"phase"` // WAITING, PLAYING
	TurnIndex  int           `json:"turnIndex"`
	FullState *GameStateFull `json:"fullState,omitempty"`
}

// ==================== 房间结构 ====================

type Room struct {
	ID        string              `json:"id"`
	Name      string              `json:"name"`
	Players   map[string]*Player `json:"players"`
	GameState *RoomGameState     `json:"gameState"`
	CreatedAt time.Time          `json:"createdAt"`
	mu        sync.RWMutex
}

// ==================== 游戏数据 (简化版) ====================

var TileDeck = []TileDef{
	{ID: "tile_hallway", Name: "嘎吱作响的走廊", Description: "地板在你脚下发出阵阵呻吟", Type: "corridor", Edges: map[Direction]string{DirectionNorth: "OPEN", DirectionSouth: "OPEN", DirectionEast: "WALL", DirectionWest: "WALL"}},
	{ID: "tile_library", Name: "布满灰尘的图书馆", Description: "禁忌的知识", Type: "room", Edges: map[Direction]string{DirectionNorth: "WALL", DirectionSouth: "OPEN", DirectionEast: "OPEN", DirectionWest: "WALL"}, CardSymbol: "OMEN"},
	{ID: "tile_conservatory", Name: "温室", Description: "枯死的植物", Type: "room", Edges: map[Direction]string{DirectionNorth: "OPEN", DirectionSouth: "WALL", DirectionEast: "WALL", DirectionWest: "WALL"}, CardSymbol: "OMEN"},
	{ID: "tile_kitchen", Name: "厨房", Description: "腐烂的气味", Type: "room", Edges: map[Direction]string{DirectionNorth: "OPEN", DirectionSouth: "WALL", DirectionEast: "WALL", DirectionWest: "OPEN"}, CardSymbol: "EVENT"},
	{ID: "tile_chapel", Name: "废弃礼拜堂", Description: "神圣不再", Type: "room", Edges: map[Direction]string{DirectionNorth: "OPEN", DirectionSouth: "WALL", DirectionEast: "OPEN", DirectionWest: "OPEN"}, CardSymbol: "OMEN"},
	{ID: "tile_basement", Name: "地下室", Description: "黑暗的深渊", Type: "room", Edges: map[Direction]string{DirectionNorth: "WALL", DirectionSouth: "WALL", DirectionEast: "OPEN", DirectionWest: "OPEN"}, CardSymbol: "OMEN"},
	{ID: "tile_attic", Name: "阁楼", Description: "尘埃与蜘蛛网", Type: "room", Edges: map[Direction]string{DirectionNorth: "WALL", DirectionSouth: "OPEN", DirectionEast: "WALL", DirectionWest: "WALL"}, CardSymbol: "ITEM"},
	{ID: "tile_dining", Name: "餐厅", Description: "腐败的盛宴", Type: "room", Edges: map[Direction]string{DirectionNorth: "OPEN", DirectionSouth: "OPEN", DirectionEast: "WALL", DirectionWest: "OPEN"}, CardSymbol: "ITEM"},
}

// 剧本矩阵 (简化版)
var HauntMatrix = map[string]string{
	"tile_library":      "haunt_ghost",
	"tile_conservatory": "haunt_beast",
	"tile_chapel":       "haunt_demon",
	"tile_basement":     "haunt_shadow",
	"tile_attic":        "haunt_vampire",
	"default":           "haunt_default",
}

var Scenarios = map[string]Scenario{
	"haunt_ghost":    {ID: "haunt_ghost", Name: "幽灵的复仇", IntroText: "一位含冤而死的幽灵在大厦中游荡...", TraitorRule: "LOWEST_SANITY"},
	"haunt_beast":     {ID: "haunt_beast", Name: "野兽之王", IntroText: "有人变成了嗜血的怪物...", TraitorRule: "HIGHEST_MIGHT"},
	"haunt_demon":     {ID: "haunt_demon", Name: "恶魔契约", IntroText: "有人与黑暗签订了契约...", TraitorRule: "TRIGGER_PLAYER"},
	"haunt_shadow":    {ID: "haunt_shadow", Name: "阴影侵袭", IntroText: "虚无的阴影正在吞噬一切...", TraitorRule: "LOWEST_SANITY"},
	"haunt_vampire":   {ID: "haunt_vampire", Name: "血色饥渴", IntroText: "鲜血的渴望控制了某人...", TraitorRule: "HIGHEST_MIGHT"},
	"haunt_default":   {ID: "haunt_default", Name: "黑暗觉醒", IntroText: "邪恶在大厦中苏醒...", TraitorRule: "TRIGGER_PLAYER"},
}

// ==================== 游戏状态管理器 ====================

type GameManager struct {
	Rooms   map[string]*Room
	Players map[string]*Player // sessionID -> Player
	mu      sync.RWMutex
	quit    chan struct{}
}

func NewGameManager() *GameManager {
	return &GameManager{
		Rooms:   make(map[string]*Room),
		Players: make(map[string]*Player),
		quit:    make(chan struct{}),
	}
}

func (g *GameManager) Run() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	
	for {
		select {
		case <-ticker.C:
			g.cleanupRooms()
		case <-g.quit:
			return
		}
	}
}

func (g *GameManager) Stop() {
	close(g.quit)
}

func (g *GameManager) cleanupRooms() {
	g.mu.Lock()
	defer g.mu.Unlock()
	
	now := time.Now()
	for id, room := range g.Rooms {
		if len(room.Players) == 0 && now.Sub(room.CreatedAt) > time.Hour {
			delete(g.Rooms, id)
			log.Printf("🧹 清理空闲房间: %s", id)
		}
	}
}

// ==================== 房间操作 ====================

// 创建房间
func (g *GameManager) CreateRoom(roomName, playerName, sessionID string) *Room {
	g.mu.Lock()
	defer g.mu.Unlock()

	roomID := generateRoomID()
	player := &Player{
		ID:      generatePlayerID(),
		Name:    playerName,
		IsHost:  true,
		IsReady: true,
	}

	room := &Room{
		ID:        roomID,
		Name:      roomName,
		Players:   map[string]*Player{player.ID: player},
		GameState: &RoomGameState{Phase: "WAITING"},
		CreatedAt: time.Now(),
	}

	g.Rooms[roomID] = room
	g.Players[sessionID] = player

	log.Printf("📝 创建房间: %s (%s), 房主: %s", roomID, roomName, playerName)
	
	return room
}

// 加入房间
func (g *GameManager) JoinRoom(roomID, playerName, sessionID string) (*Room, error) {
	g.mu.Lock()
	defer g.mu.Unlock()

	room, exists := g.Rooms[roomID]
	if !exists {
		return nil, errors.New("房间不存在")
	}

	if len(room.Players) >= 4 {
		return nil, errors.New("房间已满")
	}

	player := &Player{
		ID:      generatePlayerID(),
		Name:    playerName,
		IsHost:  false,
		IsReady: false,
	}

	room.Players[player.ID] = player
	g.Players[sessionID] = player

	log.Printf("👤 玩家 %s 加入房间 %s", playerName, roomID)
	
	return room, nil
}

// 离开房间
func (g *GameManager) LeaveRoom(sessionID string) (roomID string, playerID string) {
	g.mu.Lock()
	defer g.mu.Unlock()

	player, exists := g.Players[sessionID]
	if !exists {
		return "", ""
	}

	for rid, room := range g.Rooms {
		if _, ok := room.Players[player.ID]; ok {
			delete(room.Players, player.ID)
			
			if player.IsHost && len(room.Players) > 0 {
				for _, p := range room.Players {
					p.IsHost = true
					break
				}
			}
			
			delete(g.Players, sessionID)
			log.Printf("👋 玩家 %s 离开房间 %s", player.Name, rid)
			return rid, player.ID
		}
	}

	return "", ""
}

// 获取房间状态（JSON）
func (g *GameManager) GetRoomStateJSON(roomID string) (string, error) {
	g.mu.RLock()
	defer g.mu.RUnlock()

	room, exists := g.Rooms[roomID]
	if !exists {
		return "", errors.New("房间不存在")
	}

	data, err := json.Marshal(room)
	if err != nil {
		return "", err
	}

	return string(data), nil
}

// 玩家准备
func (g *GameManager) SetPlayerReady(roomID, playerID string, ready bool) {
	g.mu.Lock()
	defer g.mu.Unlock()

	if room, ok := g.Rooms[roomID]; ok {
		if player, ok := room.Players[playerID]; ok {
			player.IsReady = ready
		}
	}
}

// 获取所有房间列表
func (g *GameManager) ListRooms() []*Room {
	g.mu.RLock()
	defer g.mu.RUnlock()

	rooms := make([]*Room, 0, len(g.Rooms))
	for _, room := range g.Rooms {
		rooms = append(rooms, room)
	}
	return rooms
}

// ==================== 游戏状态同步 ====================

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
	
	// 洗牌房间牌堆
	tileDeck := make([]TileDef, len(TileDeck))
	copy(tileDeck, TileDeck)
	rand.Shuffle(len(tileDeck), func(i, j int) {
		tileDeck[i], tileDeck[j] = tileDeck[j], tileDeck[i]
	})

	i := 0
	for _, p := range room.Players {
		playerID := p.ID
		playerIDs = append(playerIDs, playerID)
		
		players[playerID] = &GamePlayer{
			ID:    playerID,
			Team:  "UNASSIGNED",
			Items: []string{},
			Buffs: []string{},
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
					InstanceID:       "start",
					DefID:            "start_tile",
					X:                0,
					Y:                0,
					Rotation:         0,
					Edges:            map[Direction]string{DirectionNorth: "DOOR", DirectionEast: "DOOR", DirectionSouth: "DOOR", DirectionWest: "DOOR"},
					HasEventTriggered: true,
					Visibility:        "VISIBLE",
					DroppedItems:     []string{},
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
		},
	}

	log.Printf("🎮 房间 %s 游戏开始", roomID)
	return nil
}

// GetGameState 获取游戏状态
func (g *GameManager) GetGameState(roomID string) (*GameStateFull, error) {
	g.mu.RLock()
	defer g.mu.RUnlock()

	room, exists := g.Rooms[roomID]
	if !exists {
		return nil, errors.New("房间不存在")
	}

	if room.GameState == nil || room.GameState.FullState == nil {
		return nil, errors.New("游戏未开始")
	}

	return room.GameState.FullState, nil
}

// 解析 JSON
func init() {
	rand.Seed(time.Now().UnixNano())
}
