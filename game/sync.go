package game

import (
	"log"
	"sync"
	"time"
)

// ==================== 操作历史系统 ====================

// ActionRecord 操作记录
type ActionRecord struct {
	ID        string    `json:"id"`
	Timestamp int64     `json:"timestamp"`
	PlayerID  string    `json:"playerId"`
	Action    string    `json:"action"`    // 操作类型
	Details   string    `json:"details"`   // 操作详情
}

// ActionHistory 操作历史记录器
type ActionHistory struct {
	mu       sync.RWMutex
	records  []ActionRecord
	maxSize  int
}

// NewActionHistory 创建操作历史记录器
func NewActionHistory(maxSize int) *ActionHistory {
	return &ActionHistory{
		records: make([]ActionRecord, 0, maxSize),
		maxSize: maxSize,
	}
}

// Add 记录操作
func (h *ActionHistory) Add(playerID, action, details string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	record := ActionRecord{
		ID:        generateLogID(),
		Timestamp: time.Now().UnixMilli(),
		PlayerID:  playerID,
		Action:    action,
		Details:   details,
	}

	h.records = append(h.records, record)

	// 限制大小
	if len(h.records) > h.maxSize {
		h.records = h.records[len(h.records)-h.maxSize:]
	}
}

// GetRecent 获取最近 N 条记录
func (h *ActionHistory) GetRecent(count int) []ActionRecord {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if count > len(h.records) {
		count = len(h.records)
	}

	start := len(h.records) - count
	result := make([]ActionRecord, count)
	copy(result, h.records[start:])

	return result
}

// GetAll 获取所有记录
func (h *ActionHistory) GetAll() []ActionRecord {
	h.mu.RLock()
	defer h.mu.RUnlock()

	result := make([]ActionRecord, len(h.records))
	copy(result, h.records)

	return result
}

// Clear 清空历史
func (h *ActionHistory) Clear() {
	h.mu.Lock()
	defer h.mu.Unlock()

	h.records = h.records[:0]
}

// ==================== 房间操作历史 ====================

// RoomActionHistory 房间操作历史
type RoomActionHistory struct {
	roomID   string
	history  *ActionHistory
}

// NewRoomActionHistory 创建房间操作历史
func NewRoomActionHistory(roomID string) *RoomActionHistory {
	return &RoomActionHistory{
		roomID:  roomID,
		history: NewActionHistory(100), // 每个房间保留100条
	}
}

// Add 记录操作
func (h *RoomActionHistory) Add(playerID, action, details string) {
	log.Printf("📜 [%s] %s: %s - %s", h.roomID, playerID, action, details)
	h.history.Add(playerID, action, details)
}

// GetRecent 获取最近记录
func (h *RoomActionHistory) GetRecent(count int) []ActionRecord {
	return h.history.GetRecent(count)
}

// GetAll 获取所有记录
func (h *RoomActionHistory) GetAll() []ActionRecord {
	return h.history.GetAll()
}

// ==================== 会话管理 ====================

// SessionManager 会话管理器
type SessionManager struct {
	mu           sync.RWMutex
	sessions     map[string]*SessionInfo // sessionID -> info
	playerRooms   map[string]string      // playerID -> roomID
}

// SessionInfo 会话信息
type SessionInfo struct {
	SessionID   string
	PlayerID    string
	RoomID      string
	Connected   bool
	LastActive  int64
	ReconnectKey string // 重连密钥
}

// NewSessionManager 创建会话管理器
func NewSessionManager() *SessionManager {
	return &SessionManager{
		sessions:    make(map[string]*SessionInfo),
		playerRooms: make(map[string]string),
	}
}

// RegisterSession 注册会话
func (sm *SessionManager) RegisterSession(sessionID, playerID, roomID string) string {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	// 生成重连密钥
	reconnectKey := generateLogID()

	sm.sessions[sessionID] = &SessionInfo{
		SessionID:   sessionID,
		PlayerID:    playerID,
		RoomID:      roomID,
		Connected:   true,
		LastActive:  time.Now().UnixMilli(),
		ReconnectKey: reconnectKey,
	}

	sm.playerRooms[playerID] = roomID

	log.Printf("🔗 会话注册: %s -> 玩家 %s (房间 %s)", sessionID, playerID, roomID)

	return reconnectKey
}

// UnregisterSession 注销会话
func (sm *SessionManager) UnregisterSession(sessionID string) {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	if info, ok := sm.sessions[sessionID]; ok {
		delete(sm.playerRooms, info.PlayerID)
		delete(sm.sessions, sessionID)
		log.Printf("🔗 会话注销: %s", sessionID)
	}
}

// SetDisconnected 标记断开
func (sm *SessionManager) SetDisconnected(sessionID string) {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	if info, ok := sm.sessions[sessionID]; ok {
		info.Connected = false
		log.Printf("❌ 会话断开: %s", sessionID)
	}
}

// Reconnect 重连
func (sm *SessionManager) Reconnect(sessionID, reconnectKey string) (*SessionInfo, bool) {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	info, ok := sm.sessions[sessionID]
	if !ok {
		return nil, false
	}

	if info.ReconnectKey != reconnectKey {
		return nil, false
	}

	info.Connected = true
	info.LastActive = time.Now().UnixMilli()
	log.Printf("🔄 会话重连成功: %s", sessionID)

	return info, true
}

// GetSession 获取会话信息
func (sm *SessionManager) GetSession(sessionID string) (*SessionInfo, bool) {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	info, ok := sm.sessions[sessionID]
	return info, ok
}

// GetPlayerRoom 获取玩家所在房间
func (sm *SessionManager) GetPlayerRoom(playerID string) (string, bool) {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	roomID, ok := sm.playerRooms[playerID]
	return roomID, ok
}

// UpdateActivity 更新活跃时间
func (sm *SessionManager) UpdateActivity(sessionID string) {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	if info, ok := sm.sessions[sessionID]; ok {
		info.LastActive = time.Now().UnixMilli()
	}
}

// GetConnectedPlayers 获取房间内在线玩家
func (sm *SessionManager) GetConnectedPlayers(roomID string) []string {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	var players []string
	for _, info := range sm.sessions {
		if info.RoomID == roomID && info.Connected {
			players = append(players, info.PlayerID)
		}
	}

	return players
}
