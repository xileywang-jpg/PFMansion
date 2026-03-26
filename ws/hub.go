package ws

import (
	"encoding/json"
	"errors"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"mansion-protocol/game"
	"mansion-protocol/logger"
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
				logger.Error("WebSocket 错误", map[string]interface{}{"error": err.Error()})
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
			logger.Info("新客户端连接", map[string]interface{}{"sessionId": client.sessionID})

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
			logger.Info("客户端断开", map[string]interface{}{"sessionId": client.sessionID})

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
		logger.Warn("解析消息失败", map[string]interface{}{"error": err.Error()})
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
	// 阶段3新增：重连和同步
	case "reconnect":
		h.handleReconnect(msg)
	case "get_history":
		h.handleGetHistory(msg)
	case "sync_request":
		h.handleSyncRequest(msg)
	// Phase 1 新增：心跳检测
	case "ping":
		h.handlePing(msg)
	case "pong":
		// Pong already handled by writePump
	default:
		logger.Warn("未知消息类型", map[string]interface{}{"type": base.Type})
	}
}

// handlePing 处理心跳
func (h *Hub) handlePing(msg *Message) {
	resp := map[string]interface{}{
		"type":      "pong",
		"timestamp": time.Now().UnixMilli(),
	}
	data, _ := json.Marshal(resp)
	msg.client.send <- data
}

func (h *Hub) handleCreateRoom(msg *Message) {
	var req struct {
		Type      string `json:"type"`
		RoomName  string `json:"roomName"`
		PlayerName string `json:"playerName"`
		Theme     string `json:"theme"`
	}
	
	if err := json.Unmarshal(msg.data, &req); err != nil {
		logger.Warn("创建房间: 解析请求失败", map[string]interface{}{"error": err.Error()})
		return
	}

	// 默认主题
	theme := req.Theme
	if theme == "" {
		theme = "original"
	}

	logger.Info("创建房间", map[string]interface{}{
		"roomName": req.RoomName,
		"playerName": req.PlayerName,
		"theme": theme,
		"sessionId": msg.sessionID,
	})

	room := h.gameManager.CreateRoom(req.RoomName, req.PlayerName, theme, msg.sessionID)
	
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

	logger.Info("房间创建成功", map[string]interface{}{
		"roomId": room.ID,
		"playerId": msg.client.playerID,
	})

	// 返回房间信息
	resp := map[string]interface{}{
		"type":     "room_created",
		"roomId":   room.ID,
		"roomName": room.Name,
		"theme":    room.Theme,
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
		logger.Warn("加入房间: 解析请求失败", map[string]interface{}{"error": err.Error()})
		return
	}

	logger.Info("玩家尝试加入房间", map[string]interface{}{
		"roomId": req.RoomId,
		"playerName": req.PlayerName,
		"sessionId": msg.sessionID,
	})

	room, err := h.gameManager.JoinRoom(req.RoomId, req.PlayerName, msg.sessionID)
	if err != nil {
		logger.Warn("加入房间失败", map[string]interface{}{
			"roomId": req.RoomId,
			"playerName": req.PlayerName,
			"error": err.Error(),
		})
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

	logger.Info("玩家加入房间成功", map[string]interface{}{
		"roomId": room.ID,
		"playerId": msg.client.playerID,
		"playerName": req.PlayerName,
		"playerCount": len(room.Players),
	})

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
	logger.Info("开始游戏", map[string]interface{}{
		"roomId": msg.client.roomID,
		"playerId": msg.client.playerID,
	})

	err := h.gameManager.StartGame(msg.client.roomID)
	if err != nil {
		logger.Error("开始游戏失败", map[string]interface{}{
			"roomId": msg.client.roomID,
			"error": err.Error(),
		})
		resp := map[string]interface{}{
			"type":    "error",
			"message": err.Error(),
		}
		data, _ := json.Marshal(resp)
		msg.client.send <- data
		return
	}

	logger.Info("游戏已开始", map[string]interface{}{
		"roomId": msg.client.roomID,
	})

	// 广播游戏开始
	h.broadcastToRoom(msg.client.roomID, map[string]interface{}{
		"type": "game_started",
	})

	logger.Info("准备发送游戏状态", map[string]interface{}{"roomId": msg.client.roomID})

	// 发送初始游戏状态
	h.sendGameState(msg.client.roomID)
}

func (h *Hub) handleGameAction(msg *Message) {
	var req struct {
		Type   string                 `json:"type"`
		RoomId string                `json:"roomId,omitempty"`
		Action map[string]interface{} `json:"action"`
	}
	
	if err := json.Unmarshal(msg.data, &req); err != nil {
		return
	}

	// 优先使用消息中的 roomId，否则使用客户端保存的
	roomID := req.RoomId
	if roomID == "" {
		roomID = msg.client.roomID
	}

	actionType, _ := req.Action["actionType"].(string)
	var err error

	switch actionType {
	case "move":
		dir, _ := req.Action["direction"].(string)
		err = h.gameManager.ProcessMove(roomID, msg.client.playerID, dir)
	case "end_turn":
		err = h.gameManager.EndTurn(roomID, msg.client.playerID)
	// ===== 作祟系统 =====
	case "perform_haunt_roll":
		// 执行作祟检定
		err = h.gameManager.TriggerHauntRoll(roomID)
	case "force_haunt":
		// 强制触发作祟（调试用）
		err = h.gameManager.ForceTriggerHaunt(roomID)
	case "roll_dice":
		// 🔒 安全修复：验证是否是当前玩家，且有待处理的投骰子动作
		roomID := msg.client.roomID
		pending, err := h.gameManager.CheckPendingAction(roomID)
		if err != nil {
			resp := map[string]interface{}{
				"type":    "error",
				"message": err.Error(),
			}
			data, _ := json.Marshal(resp)
			msg.client.send <- data
			return
		}

		// 检查是否是当前玩家
		state, _ := h.gameManager.GetGameState(roomID)
		if state == nil || state.ActivePlayerID != msg.client.playerID {
			resp := map[string]interface{}{
				"type":    "error",
				"message": "只有当前玩家可以投骰子",
			}
			data, _ := json.Marshal(resp)
			msg.client.send <- data
			return
		}

		// 检查是否有待处理的投骰子动作（属性检定或战斗）
		// 容忍 pending 为 nil 的情况（防止超时重试或多发请求导致错误）
		if pending == nil {
			resp := map[string]interface{}{
				"type":  "dice_result",
				"checkType": "STALE",
				"message": "骰子结果已过期，请刷新状态",
			}
			data, _ := json.Marshal(resp)
			msg.client.send <- data
			return
		}

		// 处理投骰子（后端生成结果）
		numDice := 1
		if nd, ok := req.Action["numDice"].(float64); ok {
			numDice = int(nd)
		}
		results := h.gameManager.RollDice(numDice)
		sum := 0
		for _, v := range results {
			sum += v
		}

		// Bug Fix: 设置 LastRollResult 以便 state_sync 时前端能同步骰子结果
		h.gameManager.SetLastRollResult(roomID, sum)

		// 根据待处理动作类型处理结果
		var actionResult map[string]interface{}
		switch pending.Type {
		case "ATTRIBUTE_CHECK":
			// 属性检定
			difficulty := 3 // 默认难度
			if d, ok := pending.Data["difficulty"].(float64); ok {
				difficulty = int(d)
			}
			success := sum >= difficulty
			actionResult = map[string]interface{}{
				"checkType":  "ATTRIBUTE_CHECK",
				"attribute":  pending.Data["attribute"],
				"difficulty": difficulty,
				"result":     sum,
				"success":    success,
			}

			// 清除待处理动作
			h.gameManager.ClearPendingAction(roomID)

			// 继续执行事件效果
			if success {
				h.gameManager.ResolveEventChoice(roomID, msg.client.playerID, 0) // 0 = success
			} else {
				h.gameManager.ResolveEventChoice(roomID, msg.client.playerID, 1) // 1 = failure
			}

		case "COMBAT":
			// 战斗骰子 - 已经由 ResolveCombat 处理
			actionResult = map[string]interface{}{
				"checkType": "COMBAT",
				"result":    sum,
			}

		default:
			actionResult = map[string]interface{}{
				"checkType": "GENERAL",
				"result":    sum,
			}
			// 清除待处理动作
			h.gameManager.ClearPendingAction(roomID)
		}

		resp := map[string]interface{}{
			"type":         "dice_result",
			"results":      results,
			"sum":          sum,
			"playerId":     msg.client.playerID,
			"actionResult": actionResult,
		}
		h.broadcastToRoom(roomID, resp)
		return
	case "place_tile":
		// 放置新房间
		dir, _ := req.Action["direction"].(string)
		rotation, _ := req.Action["rotation"].(float64)
		err = h.gameManager.PlaceTile(roomID, msg.client.playerID, dir, int(rotation))
		// 如果有错误，立即返回错误，不发送状态同步（避免清除前端的 pendingTile）
		if err != nil {
			resp := map[string]interface{}{
				"type":    "error",
				"message": err.Error(),
			}
			data, _ := json.Marshal(resp)
			msg.client.send <- data
			return
		}
		// 放置成功后发送状态更新
		h.sendGameState(roomID)
		return
	case "modify_stat":
		// 修改属性
		attr, _ := req.Action["attribute"].(string)
		amount, _ := req.Action["amount"].(float64)
		err = h.gameManager.ModifyStat(roomID, msg.client.playerID, attr, int(amount))
	// ===== 阶段1新增：事件系统 =====
	case "draw_card":
		cardType, _ := req.Action["cardType"].(string)
		result, err := h.gameManager.DrawCard(roomID, msg.client.playerID, cardType)
		if err != nil {
			resp := map[string]interface{}{
				"type":    "error",
				"message": err.Error(),
			}
			data, _ := json.Marshal(resp)
			msg.client.send <- data
			return
		}
		// 广播抽卡结果
		h.broadcastToRoom(roomID, map[string]interface{}{
			"type":      "card_drawn",
			"card":      result["card"],
			"deck":      result["deck"],
			"playerId":  msg.client.playerID,
		})
		// 发送状态更新
		h.sendGameState(roomID)
		return
	case "resolve_event":
		choiceIndex, _ := req.Action["choiceIndex"].(float64)
		err = h.gameManager.ResolveEventChoice(roomID, msg.client.playerID, int(choiceIndex))
		if err == nil {
			h.sendGameState(roomID)
		}
	// ===== 阶段1新增：战斗系统 =====
	case "start_combat":
		defenderID, _ := req.Action["defenderId"].(string)
		attribute, _ := req.Action["attribute"].(string)
		err = h.gameManager.StartCombat(roomID, msg.client.playerID, defenderID, attribute)
	case "resolve_combat":
		// 🔒 安全修复：后端统一生成骰子结果，不接受前端传入
		result, err := h.gameManager.ResolveCombat(roomID, msg.client.playerID)
		if err == nil {
			h.broadcastToRoom(roomID, map[string]interface{}{
				"type":         "combat_resolved",
				"result":       result,
				"playerId":     msg.client.playerID,
			})
			h.sendGameState(roomID)
			return
		}
	// ===== 阶段1新增：物品系统 =====
	case "use_item":
		itemID, _ := req.Action["itemId"].(string)
		targetID, _ := req.Action["targetId"].(string)
		err = h.gameManager.UseItem(roomID, msg.client.playerID, itemID, targetID)
	// ===== 阶段1新增：技能系统 =====
	case "execute_skill":
		skillID, _ := req.Action["skillId"].(string)
		targetID, _ := req.Action["targetId"].(string)
		err = h.gameManager.ExecuteSkill(roomID, msg.client.playerID, skillID, targetID)
	case "unlock_skill_node":
		nodeID, _ := req.Action["nodeId"].(string)
		if nodeID == "" {
			err = errors.New("未指定节点ID")
		} else {
			err = h.gameManager.UnlockSkillNode(roomID, msg.client.playerID, nodeID)
		}
	// ===== 条件触发buff =====
	case "trigger_buff":
		trigger, _ := req.Action["trigger"].(string)
		if trigger == "" {
			err = errors.New("未指定触发类型")
		} else {
			// 应用条件触发的buff
			h.gameManager.ApplyConditionalBuffs(roomID, msg.client.playerID, trigger)
		}
	// ===== Phase 2: 物品与互动操作 =====
	case "pickup_item":
		itemID, _ := req.Action["itemId"].(string)
		if itemID == "" {
			err = errors.New("未指定物品ID")
		} else {
			err = h.gameManager.PickupItem(roomID, msg.client.playerID, itemID)
		}
	case "give_item":
		targetID, _ := req.Action["targetId"].(string)
		itemID, _ := req.Action["itemId"].(string)
		if targetID == "" || itemID == "" {
			err = errors.New("未指定目标或物品")
		} else {
			err = h.gameManager.GiveItem(roomID, msg.client.playerID, targetID, itemID)
		}
	case "drop_item":
		itemID, _ := req.Action["itemId"].(string)
		if itemID == "" {
			err = errors.New("未指定物品ID")
		} else {
			err = h.gameManager.DropItem(roomID, msg.client.playerID, itemID)
		}
	case "interact_wall":
		dir, _ := req.Action["direction"].(string)
		if dir == "" {
			err = errors.New("未指定方向")
		} else {
			err = h.gameManager.InteractWithWall(roomID, msg.client.playerID, dir)
		}
	// ===== Phase X: NPC 战斗系统 =====
	case "attack_npc":
		npcInstanceID, _ := req.Action["npcInstanceId"].(string)
		if npcInstanceID == "" {
			err = errors.New("未指定 NPC ID")
		} else {
			result, attackErr := h.gameManager.AttackNPC(roomID, msg.client.playerID, npcInstanceID)
			if attackErr != nil {
				err = attackErr
			} else {
				// 广播攻击结果
				h.broadcastToRoom(roomID, map[string]interface{}{
					"type":     "npc_attack_result",
					"result":   result,
					"playerId":  msg.client.playerID,
				})
				// 状态会在下面 sendGameState 同步
			}
		}
	case "npc_attack_player":
		npcInstanceID, _ := req.Action["npcInstanceId"].(string)
		if npcInstanceID == "" {
			err = errors.New("未指定 NPC ID")
		} else {
			result, attackErr := h.gameManager.NPCAttackPlayer(roomID, npcInstanceID, msg.client.playerID)
			if attackErr != nil {
				err = attackErr
			} else {
				// 广播 NPC 攻击结果
				h.broadcastToRoom(roomID, map[string]interface{}{
					"type":     "npc_attacked_player",
					"result":   result,
					"playerId":  msg.client.playerID,
				})
			}
		}
	default:
		// 未知操作
		err = errors.New("未知操作类型")
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
	h.sendGameState(roomID)
}

func (h *Hub) handleGetState(msg *Message) {
	var req struct {
		Type   string `json:"type"`
		RoomId string `json:"roomId,omitempty"`
	}
	
	if err := json.Unmarshal(msg.data, &req); err != nil {
		return
	}

	roomID := req.RoomId
	if roomID == "" {
		roomID = msg.client.roomID
	}
	
	h.sendGameState(roomID)
}

func (h *Hub) sendGameState(roomID string) {
	logger.Info("发送游戏状态", map[string]interface{}{"roomId": roomID})
	
	state, err := h.gameManager.GetGameState(roomID)
	if err != nil {
		logger.Error("获取游戏状态失败", map[string]interface{}{"roomId": roomID, "error": err.Error()})
		return
	}

	// 使用完整的同步状态格式
	syncState := state.ToSyncState()
	
	resp := map[string]interface{}{
		"type":      "state_sync",
		"version":   syncState.Version,
		"timestamp": syncState.Timestamp,
		"state":     syncState,
	}
	h.broadcastToRoom(roomID, resp)
}

// sendGameStateToClient 向特定客户端发送状态 (带错误处理)
func (h *Hub) sendGameStateToClient(client *Client, roomID string) {
	state, err := h.gameManager.GetGameState(roomID)
	if err != nil {
		h.sendError(client, err.Error())
		return
	}

	// 使用完整的同步状态格式
	syncState := state.ToSyncState()
	
	resp := map[string]interface{}{
		"type":      "state_sync",
		"version":   syncState.Version,
		"timestamp": syncState.Timestamp,
		"state":     syncState,
	}
	
	data, _ := json.Marshal(resp)
	select {
	case client.send <- data:
	default:
		logger.Warn("客户端发送队列已满", map[string]interface{}{"sessionId": client.sessionID})
	}
}

// sendError 发送错误消息 (统一格式)
func (h *Hub) sendError(client *Client, message string) {
	resp := map[string]interface{}{
		"type":    "error",
		"code":    "GAME_ERROR",
		"message": message,
	}
	data, _ := json.Marshal(resp)
	select {
	case client.send <- data:
	default:
		logger.Warn("错误消息发送失败", map[string]interface{}{"message": message})
	}
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

// ==================== 阶段3新增：重连和同步 ====================

// handleReconnect 处理重连请求 (简化版: 通过 roomId + playerId 重连)
func (h *Hub) handleReconnect(msg *Message) {
	var req struct {
		Type      string `json:"type"`
		RoomId    string `json:"roomId"`
		PlayerId  string `json:"playerId"`
	}

	if err := json.Unmarshal(msg.data, &req); err != nil {
		logger.Warn("重连: 解析请求失败", map[string]interface{}{"error": err.Error()})
		return
	}

	logger.Info("收到重连请求", map[string]interface{}{
		"roomId": req.RoomId,
		"playerId": req.PlayerId,
		"sessionId": msg.sessionID,
	})

	// 尝试通过 roomId + playerId 恢复连接
	room, err := h.gameManager.GetGameState(req.RoomId)
	if err != nil {
		logger.Warn("重连失败: 房间不存在", map[string]interface{}{"roomId": req.RoomId})
		resp := map[string]interface{}{
			"type":    "reconnect_failed",
			"message": "房间不存在",
		}
		data, _ := json.Marshal(resp)
		msg.client.send <- data
		return
	}

	// 检查玩家是否在房间中
	playerFound := false
	var playerName string
	for _, p := range room.Players {
		if p.ID == req.PlayerId {
			playerFound = true
			// 从 Character 中获取名字
			playerName = p.Character.Name
			break
		}
	}

	if !playerFound {
		logger.Warn("重连失败: 玩家不在房间中", map[string]interface{}{"playerId": req.PlayerId, "roomId": req.RoomId})
		resp := map[string]interface{}{
			"type":    "reconnect_failed",
			"message": "玩家不在房间中",
		}
		data, _ := json.Marshal(resp)
		msg.client.send <- data
		return
	}

	// 重连成功，恢复客户端状态
	msg.client.roomID = req.RoomId
	msg.client.playerID = req.PlayerId

	// 将客户端加入房间
	h.mu.Lock()
	if h.rooms[req.RoomId] == nil {
		h.rooms[req.RoomId] = make(map[*Client]bool)
	}
	h.rooms[req.RoomId][msg.client] = true
	h.mu.Unlock()

	logger.Info("重连成功", map[string]interface{}{
		"roomId": req.RoomId,
		"playerId": req.PlayerId,
		"playerName": playerName,
	})

	// 发送重连成功和当前状态
	respData := map[string]interface{}{
		"type":     "reconnect_success",
		"roomId":   req.RoomId,
		"playerId": req.PlayerId,
		"state":    room,
		"playerName": playerName,
	}
	data, _ := json.Marshal(respData)
	msg.client.send <- data

	// 通知房间内其他玩家
	h.broadcastToRoom(req.RoomId, map[string]interface{}{
		"type":       "player_reconnected",
		"playerId":   req.PlayerId,
		"playerName": playerName,
	})
}

// handleGetHistory 获取操作历史
func (h *Hub) handleGetHistory(msg *Message) {
	var req struct {
		Type   string `json:"type"`
		RoomId string `json:"roomId"`
		Count  int    `json:"count"`
	}

	if err := json.Unmarshal(msg.data, &req); err != nil {
		return
	}

	if req.Count <= 0 {
		req.Count = 20
	}

	history := h.gameManager.GetActionHistory(req.RoomId, req.Count)

	resp := map[string]interface{}{
		"type":    "history_response",
		"roomId":  req.RoomId,
		"history": history,
	}
	data, _ := json.Marshal(resp)
	msg.client.send <- data
}

// handleSyncRequest 处理同步请求
func (h *Hub) handleSyncRequest(msg *Message) {
	var req struct {
		Type     string `json:"type"`
		RoomId  string `json:"roomId"`
		PlayerId string `json:"playerId"`
	}

	if err := json.Unmarshal(msg.data, &req); err != nil {
		return
	}

	// 获取完整游戏状态
	state, err := h.gameManager.GetGameState(req.RoomId)
	if err != nil {
		resp := map[string]interface{}{
			"type":    "error",
			"message": err.Error(),
		}
		data, _ := json.Marshal(resp)
		msg.client.send <- data
		return
	}

	// 获取最近操作历史
	history := h.gameManager.GetActionHistory(req.RoomId, 30)

	resp := map[string]interface{}{
		"type":         "sync_response",
		"roomId":       req.RoomId,
		"state":        state,
		"history":      history,
		"timestamp":    time.Now().UnixMilli(),
	}
	data, _ := json.Marshal(resp)
	msg.client.send <- data

	logger.Debug("同步请求处理", map[string]interface{}{"roomId": req.RoomId, "playerId": req.PlayerId})
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
	logger.Error("WebSocket 升级失败", map[string]interface{}{"error": err.Error()})
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
