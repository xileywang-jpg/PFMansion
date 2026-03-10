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
		return true // 允许所有来源（生产环境应限制）
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
	gameManager *game.GameManager
	
	clients   map[*Client]bool
	rooms     map[string]map[*Client]bool // roomID -> clients
	
	register   chan *Client
	unregister chan *Client
	message    chan *Message
	broadcast  chan []byte
	
	mu sync.RWMutex
}

func NewHub(gs *game.GameManager) *Hub {
	return &Hub{
		gameManager: gs,
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
	case "start_game":
		h.handleStartGame(msg)
	case "game_action":
		h.handleGameAction(msg)
	case "get_state":
		h.handleGetState(msg)
	default:
		log.Printf("未知消息类型: %s", base.Type)
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

	room := h.gameManager.CreateRoom(req.RoomName, req.PlayerName, msg.sessionID)
	
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

	room, err := h.gameManager.JoinRoom(req.RoomId, req.PlayerName, msg.sessionID)
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
	roomID, playerID := h.gameManager.LeaveRoom(msg.sessionID)
	
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
	rooms := h.gameManager.ListRooms()
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

	h.gameManager.SetPlayerReady(msg.client.roomID, msg.client.playerID, req.Ready)

	// 广播给房间内所有人
	h.broadcastToRoom(msg.client.roomID, map[string]interface{}{
		"type":     "player_ready",
		"playerId": msg.client.playerID,
		"ready":    req.Ready,
	})
}

func (h *Hub) handleStartGame(msg *Message) {
	err := h.gameManager.StartGame(msg.client.roomID)
	if err != nil {
		resp := map[string]interface{}{
			"type":    "error",
			"message": err.Error(),
		}
		data, _ := json.Marshal(resp)
		msg.client.send <- data
		return
	}

	// 广播游戏开始
	h.broadcastToRoom(msg.client.roomID, map[string]interface{}{
		"type": "game_started",
	})

	// 发送初始游戏状态
	h.sendGameState(msg.client.roomID)
}

func (h *Hub) handleGameAction(msg *Message) {
	var req struct {
		Type   string                 `json:"type"`
		Action map[string]interface{} `json:"action"`
	}
	
	if err := json.Unmarshal(msg.data, &req); err != nil {
		return
	}

	actionType, _ := req.Action["actionType"].(string)
	var err error

	switch actionType {
	case "move":
		dir, _ := req.Action["direction"].(string)
		err = h.gameManager.ProcessMove(msg.client.roomID, msg.client.playerID, dir)
	case "end_turn":
		err = h.gameManager.EndTurn(msg.client.roomID, msg.client.playerID)
	case "roll_dice":
		// 处理投骰子（前端触发，后端生成结果）
		// 返回骰子结果给前端
		numDice := 1
		if nd, ok := req.Action["numDice"].(float64); ok {
			numDice = int(nd)
		}
		results := h.gameManager.RollDice(numDice)
		sum := 0
		for _, v := range results {
			sum += v
		}
		resp := map[string]interface{}{
			"type":     "dice_result",
			"results":  results,
			"sum":      sum,
			"playerId": msg.client.playerID,
		}
		h.broadcastToRoom(msg.client.roomID, resp)
		return
	case "modify_stat":
		attr, _ := req.Action["attribute"].(string)
		amount, _ := req.Action["amount"].(float64)
		err = h.gameManager.ModifyStat(msg.client.roomID, msg.client.playerID, attr, int(amount))
	default:
		// 通用处理
		err = h.gameManager.ProcessGameAction(msg.client.roomID, msg.client.playerID, req.Action)
	}

	if err != nil {
		resp := map[string]interface{}{
			"type":    "error",
			"message": err.Error(),
		}
		data, _ := json.Marshal(resp)
		msg.client.send <- data
		return
	}

	// 广播更新后的游戏状态
	h.sendGameState(msg.client.roomID)
}

func (h *Hub) handleGetState(msg *Message) {
	h.sendGameState(msg.client.roomID)
}

func (h *Hub) sendGameState(roomID string) {
	state, err := h.gameManager.GetGameState(roomID)
	if err != nil {
		return
	}

	resp := map[string]interface{}{
		"type":  "state_sync",
		"state": state,
	}
	h.broadcastToRoom(roomID, resp)
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

// Broadcast 广播消息给所有客户端
func (h *Hub) Broadcast(message []byte) {
	h.broadcast <- message
}

// SendToClient 向指定客户端发送消息
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
