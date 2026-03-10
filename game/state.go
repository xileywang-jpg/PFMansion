package game

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
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
	ID          string             `json:"id"`
	Name        string            `json:"name"`
	Attributes  map[string]Attribute `json:"attributes"`
	Traits      []string          `json:"traits"`
	Description string            `json:"description"`
}

// 玩家
type GamePlayer struct {
	ID         string         `json:"id"`
	Character  CharacterDef   `json:"character"`
	Position   Position      `json:"position"`
	Items      []string      `json:"items"`
	IsDead     bool          `json:"isDead"`
	Team       string        `json:"team"`
	Buffs      []string      `json:"buffs"`
	Skills     []string      `json:"skills"`
	SkillPoints int          `json:"skillPoints"`
}

// 位置
type Position struct {
	X int `json:"x"`
	Y int `json:"y"`
}

// 房间实例
type TileInstance struct {
	InstanceID  string      `json:"instanceId"`
	DefID       string      `json:"defId"`
	X           int         `json:"x"`
	Y           int         `json:"y"`
	Rotation    int         `json:"rotation"`
	Edges       map[Direction]string `json:"edges"`
	HasEventTriggered bool   `json:"hasEventTriggered"`
	Visibility  string      `json:"visibility"`
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
	Phase         GamePhase          `json:"phase"`
	TurnPhase     TurnPhase          `json:"turnPhase"`
	TurnIndex     int                `json:"turnIndex"`
	Players       map[string]*GamePlayer `json:"players"`
	PlayerIDs     []string           `json:"playerIds"`
	ActivePlayerID string            `json:"activePlayerId"`
	Map           map[string]*TileInstance `json:"map"`
	OmenCount     int                `json:"omenCount"`
	IsHauntActive bool               `json:"isHauntActive"`
	Logs          []LogEntry         `json:"logs"`
	MovesRemaining int               `json:"movesRemaining"`
	LastRollResult *int              `json:"lastRollResult,omitempty"`
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
					InstanceID: "start",
					DefID:      "start_tile",
					X:          0,
					Y:          0,
					Rotation:   0,
					Edges: map[Direction]string{
						DirectionNorth: "DOOR",
						DirectionEast:  "DOOR",
						DirectionSouth: "DOOR",
						DirectionWest:  "DOOR",
					},
					HasEventTriggered: true,
					Visibility:        "VISIBLE",
				},
			},
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

// ProcessGameAction 处理玩家游戏操作
func (g *GameManager) ProcessGameAction(roomID, playerID string, action map[string]interface{}) error {
	g.mu.Lock()
	defer g.mu.Unlock()

	room, exists := g.Rooms[roomID]
	if !exists {
		return errors.New("房间不存在")
	}

	if room.GameState == nil || room.GameState.FullState == nil {
		return errors.New("游戏未开始")
	}

	state := room.GameState.FullState
	
	// 验证是否是当前玩家
	if state.ActivePlayerID != playerID {
		return errors.New("还没轮到你")
	}

	// 处理移动操作
	if actionType, ok := action["type"].(string); ok {
		switch actionType {
		case "move":
			if dir, ok := action["direction"].(string); ok {
				return g.handleMove(roomID, playerID, dir)
			}
		}
	}

	return nil
}

func (g *GameManager) handleMove(roomID, playerID, dir string) error {
	room, ok := g.Rooms[roomID]
	if !ok {
		return errors.New("房间不存在")
	}

	state := room.GameState.FullState
	if state == nil {
		return errors.New("游戏未开始")
	}

	player, ok := state.Players[playerID]
	if !ok {
		return errors.New("玩家不存在")
	}

	if state.MovesRemaining <= 0 {
		return errors.New("体力已耗尽")
	}

	// 计算新位置
	direction := Direction(dir)
	newX := player.Position.X
	newY := player.Position.Y
	
	switch direction {
	case DirectionNorth:
		newY--
	case DirectionSouth:
		newY++
	case DirectionEast:
		newX++
	case DirectionWest:
		newX--
	}

	// 检查是否有房间
	key := fmt.Sprintf("%d,%d", newX, newY)
	if _, exists := state.Map[key]; exists {
		// 移动到已有房间
		player.Position.X = newX
		player.Position.Y = newY
		state.MovesRemaining--
		
		state.Logs = append(state.Logs, LogEntry{
			ID:        generateLogID(),
			Timestamp: time.Now().UnixMilli(),
			Text:      fmt.Sprintf("%s 进入了 (%d,%d)", player.Character.Name, newX, newY),
			Type:      "info",
		})
	}

	return nil
}

// 生成ID
func generateRoomID() string {
	return fmt.Sprintf("%04d", time.Now().UnixNano()%10000)
}

func generatePlayerID() string {
	return fmt.Sprintf("p%d", time.Now().UnixNano()%10000)
}

func generateLogID() string {
	return fmt.Sprintf("log%d", time.Now().UnixNano()%10000)
}
