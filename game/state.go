package game

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"sync"
	"time"
)

// 玩家结构
type Player struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	SessionID string `json:"-"` // WebSocket session ID
	IsReady   bool   `json:"isReady"`
	IsHost    bool   `json:"isHost"`
	Team      string `json:"team"` // HERO, TRAITOR, UNASSIGNED
}

// 房间结构
type Room struct {
	ID        string         `json:"id"`
	Name      string         `json:"name"`
	Players   map[string]*Player `json:"players"`
	GameState *RoomGameState `json:"gameState"`
	CreatedAt time.Time     `json:"createdAt"`
	mu        sync.RWMutex
}

// 房间内游戏状态（简化版 v1）
type RoomGameState struct {
	Phase     string `json:"phase"` // WAITING, PLAYING
	TurnIndex int    `json:"turnIndex"`
	// 后续添加完整游戏状态
}

// 房间管理器
type GameState struct {
	Rooms   map[string]*Room
	Players map[string]*Player // sessionID -> Player
	mu      sync.RWMutex
	quit    chan struct{}
}

func NewGameState() *GameState {
	return &GameState{
		Rooms:   make(map[string]*Room),
		Players: make(map[string]*Player),
		quit:    make(chan struct{}),
	}
}

func (g *GameState) Run() {
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

func (g *GameState) Stop() {
	close(g.quit)
}

func (g *GameState) cleanupRooms() {
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

// 创建房间
func (g *GameState) CreateRoom(roomName, playerName, sessionID string) *Room {
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
func (g *GameState) JoinRoom(roomID, playerName, sessionID string) (*Room, error) {
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
func (g *GameState) LeaveRoom(sessionID string) (roomID string, playerID string) {
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
func (g *GameState) GetRoomStateJSON(roomID string) (string, error) {
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
func (g *GameState) SetPlayerReady(roomID, playerID string, ready bool) {
	g.mu.Lock()
	defer g.mu.Unlock()

	if room, ok := g.Rooms[roomID]; ok {
		if player, ok := room.Players[playerID]; ok {
			player.IsReady = ready
		}
	}
}

// 获取所有房间列表
func (g *GameState) ListRooms() []*Room {
	g.mu.RLock()
	defer g.mu.RUnlock()

	rooms := make([]*Room, 0, len(g.Rooms))
	for _, room := range g.Rooms {
		rooms = append(rooms, room)
	}
	return rooms
}

func generateRoomID() string {
	return fmt.Sprintf("%04d", time.Now().UnixNano()%10000)
}

func generatePlayerID() string {
	return fmt.Sprintf("p%d", time.Now().UnixNano()%10000)
}
