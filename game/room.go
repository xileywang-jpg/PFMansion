package game

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math/rand"
	"sync"
	"time"
)

// ==================== 游戏管理器 ====================

// GameManager 游戏状态管理器
type GameManager struct {
	mu              sync.RWMutex
	Rooms           map[string]*Room
	Players         map[string]*Player
	SessionManager  *SessionManager
	RoomHistories   map[string]*RoomActionHistory // roomID -> history
	roomActivity    map[string]int64              // roomID -> last activity timestamp
}

// NewGameManager 创建新的游戏管理器
func NewGameManager() *GameManager {
	gm := &GameManager{
		Rooms:          make(map[string]*Room),
		Players:        make(map[string]*Player),
		SessionManager: NewSessionManager(),
		RoomHistories:  make(map[string]*RoomActionHistory),
		roomActivity:   make(map[string]int64),
	}
	
	// 启动房间清理协程
	go gm.roomCleanupLoop()
	
	return gm
}

// roomCleanupLoop 定期清理不活跃的房间
func (g *GameManager) roomCleanupLoop() {
	ticker := time.NewTicker(5 * time.Minute) // 每5分钟检查一次
	defer ticker.Stop()
	
	for range ticker.C {
		g.cleanupInactiveRooms()
	}
}

// cleanupInactiveRooms 清理不活跃的房间
func (g *GameManager) cleanupInactiveRooms() {
	g.mu.Lock()
	defer g.mu.Unlock()
	
	now := time.Now().UnixMilli()
	inactiveThreshold := int64(30 * 60 * 1000) // 30分钟不活跃
	
	for roomID, lastActivity := range g.roomActivity {
		if room, ok := g.Rooms[roomID]; ok {
			// 等待中的房间30分钟无活动解散
			if room.GameState != nil && room.GameState.Phase == "WAITING" {
				if now-lastActivity > inactiveThreshold {
					log.Printf("🧹 清理不活跃房间: %s (等待超过30分钟)", roomID)
					delete(g.Rooms, roomID)
					delete(g.RoomHistories, roomID)
					delete(g.roomActivity, roomID)
				}
			}
		}
	}
}

// updateRoomActivity 更新房间活跃时间
func (g *GameManager) updateRoomActivity(roomID string) {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.roomActivity[roomID] = time.Now().UnixMilli()
}

// Run 启动游戏管理器（协程）
func (g *GameManager) Run() {
	log.Println("🎮 游戏状态管理器已启动")
}

// ==================== 房间操作 ====================

// CreateRoom 创建房间
func (g *GameManager) CreateRoom(roomName, playerName, theme, sessionID string) *Room {
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
		Theme:     theme,
		Players:   map[string]*Player{player.ID: player},
		GameState: &RoomGameState{Phase: "WAITING"},
		CreatedAt: time.Now().UnixMilli(),
	}

	g.Rooms[roomID] = room
	g.Players[sessionID] = player
	g.roomActivity[roomID] = time.Now().UnixMilli() // 记录房间创建时间
	
	// 初始化操作历史
	g.RoomHistories[roomID] = NewRoomActionHistory(roomID)
	
	// 注册会话
	g.SessionManager.RegisterSession(sessionID, player.ID, roomID)

	log.Printf("📝 创建房间: %s (%s), 主题: %s, 房主: %s", roomID, roomName, theme, playerName)

	return room
}

// JoinRoom 加入房间
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
	
	// 注册会话
	g.SessionManager.RegisterSession(sessionID, player.ID, roomID)
	
	// 记录操作历史
	if history, ok := g.RoomHistories[roomID]; ok {
		history.Add(player.ID, "JOIN", "加入房间")
	}

	log.Printf("👤 玩家 %s 加入房间 %s", playerName, roomID)

	return room, nil
}

// LeaveRoom 离开房间
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
			
			// 注销会话
			g.SessionManager.UnregisterSession(sessionID)
			
			// 记录操作历史
			if history, ok := g.RoomHistories[rid]; ok {
				history.Add(player.ID, "LEAVE", "离开房间")
			}
			
			// 如果房间为空，删除房间
			if len(room.Players) == 0 {
				delete(g.Rooms, rid)
				delete(g.RoomHistories, rid)
				delete(g.roomActivity, rid)
				log.Printf("🗑️ 房间 %s 已解散（无玩家）", rid)
			}
			
			log.Printf("👋 玩家 %s 离开房间 %s", player.Name, rid)
			return rid, player.ID
		}
	}

	return "", ""
}

// ListRooms 获取房间列表
func (g *GameManager) ListRooms() []*Room {
	g.mu.RLock()
	defer g.mu.RUnlock()

	rooms := make([]*Room, 0, len(g.Rooms))
	for _, room := range g.Rooms {
		rooms = append(rooms, room)
	}
	return rooms
}

// SetPlayerReady 设置玩家准备状态
func (g *GameManager) SetPlayerReady(roomID, playerID string, ready bool) {
	g.mu.Lock()
	defer g.mu.Unlock()

	room, exists := g.Rooms[roomID]
	if !exists {
		return
	}

	if player, ok := room.Players[playerID]; ok {
		player.IsReady = ready
	}
}

// GetRoomState 获取房间状态
func (g *GameManager) GetRoomState(roomID string) (*RoomGameState, error) {
	g.mu.RLock()
	defer g.mu.RUnlock()

	room, exists := g.Rooms[roomID]
	if !exists {
		return nil, errors.New("房间不存在")
	}

	if room.GameState == nil || room.GameState.FullState == nil {
		return nil, errors.New("游戏未开始")
	}

	return room.GameState, nil
}

// GetGameState 获取完整游戏状态
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

// GetRoomStateJSON 获取房间状态 JSON
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

// GetRoom 获取房间
func (g *GameManager) GetRoom(roomID string) (*Room, error) {
	g.mu.RLock()
	defer g.mu.RUnlock()

	room, exists := g.Rooms[roomID]
	if !exists {
		return nil, errors.New("房间不存在")
	}

	return room, nil
}

// GetPlayer 获取玩家
func (g *GameManager) GetPlayer(sessionID string) (*Player, error) {
	g.mu.RLock()
	defer g.mu.RUnlock()

	player, exists := g.Players[sessionID]
	if !exists {
		return nil, errors.New("玩家不存在")
	}

	return player, nil
}

// GetActionHistory 获取操作历史
func (g *GameManager) GetActionHistory(roomID string, count int) []ActionRecord {
	g.mu.RLock()
	defer g.mu.RUnlock()

	if history, ok := g.RoomHistories[roomID]; ok {
		return history.GetRecent(count)
	}

	return []ActionRecord{}
}

// RecordAction 记录操作
func (g *GameManager) RecordAction(roomID, playerID, action, details string) {
	g.mu.Lock()
	defer g.mu.Unlock()

	if history, ok := g.RoomHistories[roomID]; ok {
		history.Add(playerID, action, details)
	}
}

// ReconnectSession 重连会话
func (g *GameManager) ReconnectSession(sessionID, reconnectKey string) (*SessionInfo, bool) {
	return g.SessionManager.Reconnect(sessionID, reconnectKey)
}

// ==================== ID 生成 ====================

func generateRoomID() string {
	return fmt.Sprintf("%04d", rand.Intn(10000))
}

func generatePlayerID() string {
	return fmt.Sprintf("p%d", rand.Intn(10000))
}

func generateLogID() string {
	return fmt.Sprintf("log%d", rand.Intn(100000))
}

func generateTileID() string {
	return fmt.Sprintf("tile%d", rand.Intn(100000))
}
