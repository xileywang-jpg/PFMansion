package ws

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"mansion-protocol/game"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 512 * 1024
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // 允许所有来源（生产环境应限制
	},
}

// 客户端连接
type Client struct {
	hub      *Hub
	conn     *websocket.Conn
	send     chan []byte
	sessionID string
	roomID   string
	playerID string
}

func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket 错误: %v", err)
			}
			break
		}

		c.hub.message <- &Message{
			client:    c,
			sessionID: c.sessionID,
			data:      message,
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// 消息结构
type Message struct {
	client    *Client
	sessionID string
	data      []byte
}

// Hub 维护所有客户端和房间
type Hub struct {
	gameState *game.GameState
	
	clients   map[*Client]bool
	rooms     map[string]map[*Client]bool // roomID -> clients
	
	register   chan *Client
	unregister chan *Client
	message    chan *Message
	broadcast  chan []byte
	
	mu sync.RWMutex
}

func NewHub(gs *game.GameState) *Hub {
	return &Hub{
		gameState:  gs,
		clients:    make(map[*Client]bool),
		rooms:      make(map[string]map[*Client]bool),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		message:    make(chan *Message, 256),
		broadcast:  make(chan []byte, 256),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			log.Printf("➕ 新客户端连接: %s", client.sessionID)

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
				
				// 从房间中移除
				if client.roomID != "" {
					if roomClients, ok := h.rooms[client.roomID]; ok {
						delete(roomClients, client)
						if len(roomClients) == 0 {
							delete(h.rooms, client.roomID)
						}
					}
				}
			}
			h.mu.Unlock()
			log.Printf("➖ 客户端断开: %s", client.sessionID)

		case msg := <-h.message:
			h.handleMessage(msg)

		case message := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
			h.mu.RUnlock()
		}
	}
}

func (h *Hub) handleMessage(msg *Message) {
	var base struct {
		Type string `json:"type"`
	}
	
	if err := json.Unmarshal(msg.data, &base); err != nil {
		log.Printf("解析消息失败: %v", err)
		return
	}

	switch base.Type {
	case "create_room":
		h.handleCreateRoom(msg)
	case "join_room":
		h.handleJoinRoom(msg)
	case "leave_room":
		h.handleLeaveRoom(msg)
	case "list_rooms":
		h.handleListRooms(msg)
	case "set_ready":
		h.handleSetReady(msg)
	default:
		// 转发给房间内其他玩家
		h.forwardToRoom(msg)
	}
}

func (h *Hub) handleCreateRoom(msg *Message) {
	var req struct {
		Type      string `json:"type"`
		RoomName  string `json:"roomName"`
		PlayerName string `json:"playerName"`
	}
	
	if err := json.Unmarshal(msg.data, &req); err != nil {
		return
	}

	room := h.gameState.CreateRoom(req.RoomName, req.PlayerName, msg.sessionID)
	
	msg.client.roomID = room.ID
	
	// 获取刚创建的玩家ID
	for _, p := range room.Players {
		msg.client.playerID = p.ID
		break
	}
	
	// 将客户端加入房间
	h.mu.Lock()
	if h.rooms[room.ID] == nil {
		h.rooms[room.ID] = make(map[*Client]bool)
	}
	h.rooms[room.ID][msg.client] = true
	h.mu.Unlock()

	// 返回房间信息
	resp := map[string]interface{}{
		"type":     "room_created",
		"roomId":   room.ID,
		"roomName": room.Name,
		"playerId": msg.client.playerID,
		"isHost":   true,
	}
	data, _ := json.Marshal(resp)
	msg.client.send <- data
}

func (h *Hub) handleJoinRoom(msg *Message) {
	var req struct {
		Type      string `json:"type"`
		RoomId    string `json:"roomId"`
		PlayerName string `json:"playerName"`
	}
	
	if err := json.Unmarshal(msg.data, &req); err != nil {
		return
	}

	room, err := h.gameState.JoinRoom(req.RoomId, req.PlayerName, msg.sessionID)
	if err != nil {
		resp := map[string]interface{}{
			"type":    "error",
			"message": err.Error(),
		}
		data, _ := json.Marshal(resp)
		msg.client.send <- data
		return
	}

	msg.client.roomID = room.ID
	// 获取刚加入的玩家ID
	for _, p := range room.Players {
		if p.Name == req.PlayerName {
			msg.client.playerID = p.ID
			break
		}
	}

	// 将客户端加入房间
	h.mu.Lock()
	if h.rooms[room.ID] == nil {
		h.rooms[room.ID] = make(map[*Client]bool)
	}
	h.rooms[room.ID][msg.client] = true
	h.mu.Unlock()

	// 返回房间信息
	resp := map[string]interface{}{
		"type":     "room_joined",
		"roomId":   room.ID,
		"roomName": room.Name,
		"playerId": msg.client.playerID,
		"players":  room.Players,
	}
	data, _ := json.Marshal(resp)
	msg.client.send <- data

	// 通知房间内其他玩家
	h.broadcastToRoom(room.ID, map[string]interface{}{
		"type":       "player_joined",
		"playerId":  msg.client.playerID,
		"playerName": req.PlayerName,
		"players":   room.Players,
	})
}

func (h *Hub) handleLeaveRoom(msg *Message) {
	roomID, playerID := h.gameState.LeaveRoom(msg.sessionID)
	
	if roomID != "" {
		msg.client.roomID = ""
		
		h.mu.Lock()
		if clients, ok := h.rooms[roomID]; ok {
			delete(clients, msg.client)
		}
		h.mu.Unlock()

		// 通知房间内其他玩家
		h.broadcastToRoom(roomID, map[string]interface{}{
			"type":     "player_left",
			"playerId": playerID,
		})
	}
}

func (h *Hub) handleListRooms(msg *Message) {
	rooms := h.gameState.ListRooms()
	resp := map[string]interface{}{
		"type":  "room_list",
		"rooms": rooms,
	}
	data, _ := json.Marshal(resp)
	msg.client.send <- data
}

func (h *Hub) handleSetReady(msg *Message) {
	var req struct {
		Type   string `json:"type"`
		Ready  bool   `json:"ready"`
	}
	
	if err := json.Unmarshal(msg.data, &req); err != nil {
		return
	}

	h.gameState.SetPlayerReady(msg.client.roomID, msg.client.playerID, req.Ready)

	// 广播给房间内所有人
	h.broadcastToRoom(msg.client.roomID, map[string]interface{}{
		"type":     "player_ready",
		"playerId": msg.client.playerID,
		"ready":    req.Ready,
	})
}

func (h *Hub) forwardToRoom(msg *Message) {
	// 转发游戏操作给房间内其他玩家
	h.broadcastToRoom(msg.client.roomID, map[string]interface{}{
		"type":      "game_action",
		"playerId": msg.client.playerID,
		"action":   msg.data,
	})
}

func (h *Hub) broadcastToRoom(roomID string, message interface{}) {
	data, err := json.Marshal(message)
	if err != nil {
		return
	}

	h.mu.RLock()
	clients := h.rooms[roomID]
	h.mu.RUnlock()

	for client := range clients {
		select {
		case client.send <- data:
		default:
			close(client.send)
			h.mu.Lock()
			delete(h.clients, client)
			delete(clients, client)
			h.mu.Unlock()
		}
	}
}

// 向指定客户端发送消息
// Broadcast 广播消息给所有客户端
func (h *Hub) Broadcast(message []byte) {
	h.broadcast <- message
}

func (h *Hub) SendToClient(sessionID string, message interface{}) {
	data, err := json.Marshal(message)
	if err != nil {
		return
	}

	h.mu.RLock()
	defer h.mu.RUnlock()

	for client := range h.clients {
		if client.sessionID == sessionID {
			select {
			case client.send <- data:
			default:
			}
			break
		}
	}
}

// HandleWebSocket 处理 WebSocket 连接
func HandleWebSocket(hub *Hub, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket 升级失败: %v", err)
		return
	}

	sessionID := r.RemoteAddr // 简单使用 RemoteAddr 作为 session ID

	client := &Client{
		hub:      hub,
		conn:     conn,
		send:     make(chan []byte, 256),
		sessionID: sessionID,
	}

	hub.register <- client

	go client.writePump()
	go client.readPump()
}
