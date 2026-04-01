package ws

import (
	"encoding/json"
	"errors"
	"net/http"
	"sync"
	"time"

	"mansion-protocol/game"
	"mansion-protocol/logger"

	"github.com/gorilla/websocket"
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
	hub       *Hub
	conn      *websocket.Conn
	send      chan []byte
	sessionID string
	roomID    string
	playerID  string
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

	clients map[*Client]bool
	rooms   map[string]map[*Client]bool // roomID -> clients

	register   chan *Client
	unregister chan *Client
	message    chan *Message
	broadcast  chan []byte

	mu sync.RWMutex
}

func NewHub(gs *game.GameManager) *Hub {
	return &Hub{
		gameManager: gs,
		clients:     make(map[*Client]bool),
		rooms:       make(map[string]map[*Client]bool),
		register:    make(chan *Client),
		unregister:  make(chan *Client),
		message:     make(chan *Message, 256),
		broadcast:   make(chan []byte, 256),
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
		Type       string `json:"type"`
		RoomName   string `json:"roomName"`
		PlayerName string `json:"playerName"`
		Theme      string `json:"theme"`
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
		"roomName":   req.RoomName,
		"playerName": req.PlayerName,
		"theme":      theme,
		"sessionId":  msg.sessionID,
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
		"roomId":   room.ID,
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
		Type       string `json:"type"`
		RoomId     string `json:"roomId"`
		PlayerName string `json:"playerName"`
	}

	if err := json.Unmarshal(msg.data, &req); err != nil {
		logger.Warn("加入房间: 解析请求失败", map[string]interface{}{"error": err.Error()})
		return
	}

	logger.Info("玩家尝试加入房间", map[string]interface{}{
		"roomId":     req.RoomId,
		"playerName": req.PlayerName,
		"sessionId":  msg.sessionID,
	})

	room, err := h.gameManager.JoinRoom(req.RoomId, req.PlayerName, msg.sessionID)
	if err != nil {
		logger.Warn("加入房间失败", map[string]interface{}{
			"roomId":     req.RoomId,
			"playerName": req.PlayerName,
			"error":      err.Error(),
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
		"roomId":      room.ID,
		"playerId":    msg.client.playerID,
		"playerName":  req.PlayerName,
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
		"playerId":   msg.client.playerID,
		"playerName": req.PlayerName,
		"players":    room.Players,
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
		Type  string `json:"type"`
		Ready bool   `json:"ready"`
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
		"roomId":   msg.client.roomID,
		"playerId": msg.client.playerID,
	})

	err := h.gameManager.StartGame(msg.client.roomID)
	if err != nil {
		logger.Error("开始游戏失败", map[string]interface{}{
			"roomId": msg.client.roomID,
			"error":  err.Error(),
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

type gameActionRequest struct {
	Type   string                 `json:"type"`
	RoomId string                 `json:"roomId,omitempty"`
	Action map[string]interface{} `json:"action"`
}

type gameActionContext struct {
	message    *Message
	roomID     string
	actionType string
	action     map[string]interface{}
}

type gameActionHandler func(*Hub, *gameActionContext) (bool, error)

var gameActionHandlers = map[string]gameActionHandler{
	"move":                     handleMoveGameAction,
	"end_turn":                 handleEndTurnGameAction,
	"cancel_tile_placement":    handleCancelTilePlacementGameAction,
	"perform_haunt_roll":       handlePerformHauntRollGameAction,
	"force_haunt":              handleForceHauntGameAction,
	"roll_dice":                handleRollDiceGameAction,
	"place_tile":               handlePlaceTileGameAction,
	"modify_stat":              handleModifyStatGameAction,
	"draw_card":                handleDrawCardGameAction,
	"resolve_event":            handleResolveEventGameAction,
	"start_combat":             handleStartCombatGameAction,
	"resolve_combat":           handleResolveCombatGameAction,
	"dismiss_combat_result":    handleDismissCombatResultGameAction,
	"use_item":                 handleUseItemGameAction,
	"execute_skill":            handleExecuteSkillGameAction,
	"unlock_skill_node":        handleUnlockSkillNodeGameAction,
	"trigger_buff":             handleTriggerBuffGameAction,
	"pickup_item":              handlePickupItemGameAction,
	"give_item":                handleGiveItemGameAction,
	"trade_items":              handleTradeItemsGameAction,
	"drop_item":                handleDropItemGameAction,
	"interact_wall":            handleInteractWallGameAction,
	"teleport_to_tile":         handleTeleportToTileGameAction,
	"divination":               handleDivinationGameAction,
	"execute_tile_interaction": handleExecuteTileInteractionGameAction,
	"attack_npc":               handleAttackNPCGameAction,
	"npc_attack_player":        handleNPCAttackPlayerGameAction,
}

func (ctx *gameActionContext) playerID() string {
	return ctx.message.client.playerID
}

func (ctx *gameActionContext) stringField(key string) string {
	value, _ := ctx.action[key].(string)
	return value
}

func (ctx *gameActionContext) requiredStringField(key, errMsg string) (string, error) {
	value := ctx.stringField(key)
	if value == "" {
		return "", errors.New(errMsg)
	}
	return value, nil
}

func (ctx *gameActionContext) intField(key string) (int, bool) {
	value, ok := ctx.action[key].(float64)
	if !ok {
		return 0, false
	}
	return int(value), true
}

func (h *Hub) sendClientMessage(client *Client, payload interface{}) {
	data, err := json.Marshal(payload)
	if err != nil {
		logger.Warn("序列化客户端消息失败", map[string]interface{}{"error": err.Error()})
		return
	}
	client.send <- data
}

func (h *Hub) sendClientError(client *Client, err error) {
	if err == nil {
		return
	}
	h.sendClientMessage(client, map[string]interface{}{
		"type":    "error",
		"message": err.Error(),
	})
}

func (h *Hub) dispatchGameAction(ctx *gameActionContext) (bool, error) {
	handler, ok := gameActionHandlers[ctx.actionType]
	if !ok {
		return false, errors.New("未知操作类型")
	}
	return handler(h, ctx)
}

func (h *Hub) handleGameAction(msg *Message) {
	logger.Debug("收到game_action", map[string]interface{}{
		"playerId": msg.client.playerID,
		"roomID":   msg.client.roomID,
		"data":     string(msg.data),
	})

	var req gameActionRequest
	if err := json.Unmarshal(msg.data, &req); err != nil {
		logger.Warn("解析game_action失败", map[string]interface{}{"error": err.Error()})
		return
	}

	roomID := req.RoomId
	if roomID == "" {
		roomID = msg.client.roomID
	}

	actionType, _ := req.Action["actionType"].(string)
	logger.Debug("处理game_action", map[string]interface{}{
		"actionType": actionType,
		"roomID":     roomID,
		"playerID":   msg.client.playerID,
		"fullAction": req.Action,
	})

	ctx := &gameActionContext{
		message:    msg,
		roomID:     roomID,
		actionType: actionType,
		action:     req.Action,
	}

	handled, err := h.dispatchGameAction(ctx)
	if err != nil {
		logger.Warn("game_action执行失败", map[string]interface{}{
			"actionType": actionType,
			"error":      err.Error(),
			"playerId":   msg.client.playerID,
		})
		h.sendClientError(msg.client, err)
		return
	}

	if handled {
		return
	}

	logger.Debug("action执行成功，准备发送state_sync", map[string]interface{}{
		"actionType": actionType,
		"roomId":     roomID,
	})
	h.sendGameState(roomID)
}

func handleMoveGameAction(h *Hub, ctx *gameActionContext) (bool, error) {
	direction := ctx.stringField("direction")
	logger.Debug("执行ProcessMove", map[string]interface{}{"direction": direction})
	return false, h.gameManager.ProcessMove(ctx.roomID, ctx.playerID(), direction)
}

func handleEndTurnGameAction(h *Hub, ctx *gameActionContext) (bool, error) {
	logger.Debug("执行EndTurn", nil)
	return false, h.gameManager.EndTurn(ctx.roomID, ctx.playerID())
}

func handleCancelTilePlacementGameAction(h *Hub, ctx *gameActionContext) (bool, error) {
	logger.Debug("执行CancelTilePlacement", nil)
	return false, h.gameManager.CancelTilePlacement(ctx.roomID, ctx.playerID())
}

func handlePerformHauntRollGameAction(h *Hub, ctx *gameActionContext) (bool, error) {
	state, err := h.gameManager.GetGameState(ctx.roomID)
	if err != nil {
		return true, err
	}
	if state == nil || state.ActivePlayerID != ctx.playerID() {
		return true, errors.New("只有当前玩家可以进行作祟检定")
	}

	results := h.gameManager.RollDice(6)
	sum := 0
	for _, value := range results {
		sum += value
	}

	actionResult, err := h.gameManager.ResolveHauntRoll(ctx.roomID, results)
	if err != nil {
		return true, err
	}

	h.broadcastToRoom(ctx.roomID, map[string]interface{}{
		"type":         "dice_result",
		"results":      results,
		"sum":          sum,
		"playerId":     ctx.playerID(),
		"actionResult": actionResult,
	})
	h.sendGameState(ctx.roomID)
	return true, nil
}

func handleForceHauntGameAction(h *Hub, ctx *gameActionContext) (bool, error) {
	return false, h.gameManager.ForceTriggerHaunt(ctx.roomID)
}

func handleRollDiceGameAction(h *Hub, ctx *gameActionContext) (bool, error) {
	pending, err := h.gameManager.CheckPendingAction(ctx.roomID)
	if err != nil {
		return true, err
	}

	state, err := h.gameManager.GetGameState(ctx.roomID)
	if err != nil {
		return true, err
	}
	if state == nil || state.ActivePlayerID != ctx.playerID() {
		return true, errors.New("只有当前玩家可以投骰子")
	}

	isHauntRoll := state.Phase == game.GamePhaseHauntRoll
	if pending == nil && !isHauntRoll {
		h.sendClientMessage(ctx.message.client, map[string]interface{}{
			"type":      "dice_result",
			"checkType": "STALE",
			"message":   "骰子结果已过期，请刷新状态",
		})
		return true, nil
	}

	numDice := 1
	if isHauntRoll {
		numDice = 6
	} else if pending.Type == game.PendingActionTypeAttributeCheck || pending.Type == game.PendingActionTypeTileAttributeCheck {
		if attrName := pending.AttributeName(); attrName != "" {
			if player, ok := state.Players[ctx.playerID()]; ok {
				if attr, ok := player.Character.Attributes[attrName]; ok && attr.Current > 0 {
					numDice = attr.Current
				}
			}
		}
	} else if actionNumDice, ok := ctx.intField("numDice"); ok {
		numDice = actionNumDice
	}

	results := h.gameManager.RollDice(numDice)
	sum := 0
	for _, value := range results {
		sum += value
	}

	var actionResult map[string]interface{}
	if isHauntRoll {
		actionResult, err = h.gameManager.ResolveHauntRoll(ctx.roomID, results)
		if err != nil {
			return true, err
		}
	} else {
		h.gameManager.SetLastRollResult(ctx.roomID, sum)

		switch pending.Type {
		case game.PendingActionTypeAttributeCheck:
			difficulty := pending.DifficultyValue(3)
			success := sum >= difficulty
			actionResult = map[string]interface{}{
				"checkType":  string(game.PendingActionTypeAttributeCheck),
				"attribute":  pending.AttributeName(),
				"difficulty": difficulty,
				"result":     sum,
				"success":    success,
			}

			h.gameManager.ClearPendingAction(ctx.roomID)
			if success {
				h.gameManager.ResolveEventChoice(ctx.roomID, ctx.playerID(), 0)
			} else {
				h.gameManager.ResolveEventChoice(ctx.roomID, ctx.playerID(), 1)
			}

		case game.PendingActionTypeTileAttributeCheck:
			difficulty := pending.DifficultyValue(3)
			success := sum >= difficulty
			actionResult = map[string]interface{}{
				"checkType":  string(game.PendingActionTypeTileAttributeCheck),
				"attribute":  pending.AttributeName(),
				"difficulty": difficulty,
				"result":     sum,
				"success":    success,
			}
			if err := h.gameManager.ResolvePendingTileCheck(ctx.roomID, ctx.playerID(), success); err != nil {
				return true, err
			}

		case game.PendingActionTypeCombat:
			actionResult = map[string]interface{}{
				"checkType": string(game.PendingActionTypeCombat),
				"result":    sum,
			}

		default:
			actionResult = map[string]interface{}{
				"checkType": "GENERAL",
				"result":    sum,
			}
			h.gameManager.ClearPendingAction(ctx.roomID)
		}
	}

	h.broadcastToRoom(ctx.roomID, map[string]interface{}{
		"type":         "dice_result",
		"results":      results,
		"sum":          sum,
		"playerId":     ctx.playerID(),
		"actionResult": actionResult,
	})
	h.sendGameState(ctx.roomID)
	return true, nil
}

func handlePlaceTileGameAction(h *Hub, ctx *gameActionContext) (bool, error) {
	direction := ctx.stringField("direction")
	rotation, _ := ctx.intField("rotation")
	err := h.gameManager.PlaceTile(ctx.roomID, ctx.playerID(), direction, rotation)
	if err != nil {
		return true, err
	}
	h.sendGameState(ctx.roomID)
	return true, nil
}

func handleModifyStatGameAction(h *Hub, ctx *gameActionContext) (bool, error) {
	attribute := ctx.stringField("attribute")
	amount, _ := ctx.intField("amount")
	return false, h.gameManager.ModifyStat(ctx.roomID, ctx.playerID(), attribute, amount)
}

func handleDrawCardGameAction(h *Hub, ctx *gameActionContext) (bool, error) {
	cardType := ctx.stringField("cardType")
	result, err := h.gameManager.DrawCard(ctx.roomID, ctx.playerID(), cardType)
	if err != nil {
		return true, err
	}
	if result != nil {
		if card, ok := result["card"]; ok && card != nil {
			h.broadcastToRoom(ctx.roomID, map[string]interface{}{
				"type":     "card_drawn",
				"card":     card,
				"deck":     result["deck"],
				"playerId": ctx.playerID(),
			})
		}
	}
	h.sendGameState(ctx.roomID)
	return true, nil
}

func handleResolveEventGameAction(h *Hub, ctx *gameActionContext) (bool, error) {
	choiceIndex, _ := ctx.intField("choiceIndex")
	err := h.gameManager.ResolveEventChoice(ctx.roomID, ctx.playerID(), choiceIndex)
	if err != nil {
		return true, err
	}
	h.sendGameState(ctx.roomID)
	return true, nil
}

func handleStartCombatGameAction(h *Hub, ctx *gameActionContext) (bool, error) {
	defenderID := ctx.stringField("defenderId")
	attribute := ctx.stringField("attribute")
	return false, h.gameManager.StartCombat(ctx.roomID, ctx.playerID(), defenderID, attribute)
}

func handleResolveCombatGameAction(h *Hub, ctx *gameActionContext) (bool, error) {
	result, err := h.gameManager.ResolveCombat(ctx.roomID, ctx.playerID())
	if err != nil {
		return true, err
	}
	h.broadcastToRoom(ctx.roomID, map[string]interface{}{
		"type":     "combat_resolved",
		"result":   result,
		"playerId": ctx.playerID(),
	})
	h.sendGameState(ctx.roomID)
	return true, nil
}

func handleDismissCombatResultGameAction(h *Hub, ctx *gameActionContext) (bool, error) {
	if err := h.gameManager.ClearCombatResult(ctx.roomID, ctx.playerID()); err != nil {
		return false, err
	}
	return false, nil
}

func handleUseItemGameAction(h *Hub, ctx *gameActionContext) (bool, error) {
	itemID := ctx.stringField("itemId")
	targetID := ctx.stringField("targetId")
	return false, h.gameManager.UseItem(ctx.roomID, ctx.playerID(), itemID, targetID)
}

func handleExecuteSkillGameAction(h *Hub, ctx *gameActionContext) (bool, error) {
	skillID := ctx.stringField("skillId")
	targetID := ctx.stringField("targetId")
	return false, h.gameManager.ExecuteSkill(ctx.roomID, ctx.playerID(), skillID, targetID)
}

func handleUnlockSkillNodeGameAction(h *Hub, ctx *gameActionContext) (bool, error) {
	nodeID, err := ctx.requiredStringField("nodeId", "未指定节点ID")
	if err != nil {
		return false, err
	}
	return false, h.gameManager.UnlockSkillNode(ctx.roomID, ctx.playerID(), nodeID)
}

func handleTriggerBuffGameAction(h *Hub, ctx *gameActionContext) (bool, error) {
	trigger, err := ctx.requiredStringField("trigger", "未指定触发类型")
	if err != nil {
		return false, err
	}
	h.gameManager.ApplyConditionalBuffs(ctx.roomID, ctx.playerID(), trigger)
	return false, nil
}

func handlePickupItemGameAction(h *Hub, ctx *gameActionContext) (bool, error) {
	itemID := ctx.stringField("itemId")
	logger.Debug("执行PickupItem", map[string]interface{}{
		"itemId":   itemID,
		"playerId": ctx.playerID(),
		"roomId":   ctx.roomID,
	})
	if itemID == "" {
		return false, errors.New("未指定物品ID")
	}
	err := h.gameManager.PickupItem(ctx.roomID, ctx.playerID(), itemID)
	if err != nil {
		logger.Warn("PickupItem失败", map[string]interface{}{
			"error":    err.Error(),
			"itemId":   itemID,
			"playerId": ctx.playerID(),
		})
	}
	return false, err
}

func handleGiveItemGameAction(h *Hub, ctx *gameActionContext) (bool, error) {
	targetID := ctx.stringField("targetId")
	itemID := ctx.stringField("itemId")
	logger.Debug("执行GiveItem", map[string]interface{}{
		"itemId":   itemID,
		"targetId": targetID,
		"playerId": ctx.playerID(),
	})
	if targetID == "" || itemID == "" {
		return false, errors.New("未指定目标或物品")
	}
	return false, h.gameManager.GiveItem(ctx.roomID, ctx.playerID(), targetID, itemID)
}

func handleTradeItemsGameAction(h *Hub, ctx *gameActionContext) (bool, error) {
	targetID := ctx.stringField("targetId")
	itemID := ctx.stringField("itemId")
	targetItemID := ctx.stringField("targetItemId")
	if targetID == "" || itemID == "" || targetItemID == "" {
		return false, errors.New("未指定完整的交易物品")
	}
	return false, h.gameManager.TradeItems(ctx.roomID, ctx.playerID(), targetID, itemID, targetItemID)
}

func handleDropItemGameAction(h *Hub, ctx *gameActionContext) (bool, error) {
	itemID := ctx.stringField("itemId")
	logger.Debug("执行DropItem", map[string]interface{}{
		"itemId":   itemID,
		"playerId": ctx.playerID(),
	})
	if itemID == "" {
		return false, errors.New("未指定物品ID")
	}
	return false, h.gameManager.DropItem(ctx.roomID, ctx.playerID(), itemID)
}

func handleInteractWallGameAction(h *Hub, ctx *gameActionContext) (bool, error) {
	direction, err := ctx.requiredStringField("direction", "未指定方向")
	if err != nil {
		return false, err
	}
	return false, h.gameManager.InteractWithWall(ctx.roomID, ctx.playerID(), direction)
}

func handleTeleportToTileGameAction(h *Hub, ctx *gameActionContext) (bool, error) {
	x, xOK := ctx.intField("x")
	y, yOK := ctx.intField("y")
	if !xOK || !yOK {
		return false, errors.New("未指定有效的传送目标")
	}
	return false, h.gameManager.TeleportPlayer(ctx.roomID, ctx.playerID(), x, y)
}

func handleDivinationGameAction(h *Hub, ctx *gameActionContext) (bool, error) {
	action, err := ctx.requiredStringField("action", "未指定占卜操作")
	if err != nil {
		return false, err
	}
	return false, h.gameManager.PerformDivination(ctx.roomID, ctx.playerID(), action)
}

func handleExecuteTileInteractionGameAction(h *Hub, ctx *gameActionContext) (bool, error) {
	interactionType, err := ctx.requiredStringField("interactionType", "未指定互动类型")
	if err != nil {
		return false, err
	}
	result, err := h.gameManager.ExecuteTileInteraction(ctx.roomID, ctx.playerID(), interactionType)
	if err != nil {
		return false, err
	}
	if result != nil {
		h.broadcastToRoom(ctx.roomID, map[string]interface{}{
			"type":         "dice_result",
			"results":      result["results"],
			"sum":          result["sum"],
			"playerId":     ctx.playerID(),
			"actionResult": result["actionResult"],
		})
	}
	return false, nil
}

func handleAttackNPCGameAction(h *Hub, ctx *gameActionContext) (bool, error) {
	npcInstanceID, err := ctx.requiredStringField("npcInstanceId", "未指定 NPC ID")
	if err != nil {
		return false, err
	}
	result, err := h.gameManager.AttackNPC(ctx.roomID, ctx.playerID(), npcInstanceID)
	if err != nil {
		return false, err
	}
	h.broadcastToRoom(ctx.roomID, map[string]interface{}{
		"type":     "npc_attack_result",
		"result":   result,
		"playerId": ctx.playerID(),
	})
	return false, nil
}

func handleNPCAttackPlayerGameAction(h *Hub, ctx *gameActionContext) (bool, error) {
	npcInstanceID, err := ctx.requiredStringField("npcInstanceId", "未指定 NPC ID")
	if err != nil {
		return false, err
	}
	result, err := h.gameManager.NPCAttackPlayer(ctx.roomID, npcInstanceID, ctx.playerID())
	if err != nil {
		return false, err
	}
	h.broadcastToRoom(ctx.roomID, map[string]interface{}{
		"type":     "npc_attacked_player",
		"result":   result,
		"playerId": ctx.playerID(),
	})
	return false, nil
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
		Type     string `json:"type"`
		RoomId   string `json:"roomId"`
		PlayerId string `json:"playerId"`
	}

	if err := json.Unmarshal(msg.data, &req); err != nil {
		logger.Warn("重连: 解析请求失败", map[string]interface{}{"error": err.Error()})
		return
	}

	logger.Info("收到重连请求", map[string]interface{}{
		"roomId":    req.RoomId,
		"playerId":  req.PlayerId,
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
		"roomId":     req.RoomId,
		"playerId":   req.PlayerId,
		"playerName": playerName,
	})

	// 发送重连成功和当前状态
	respData := map[string]interface{}{
		"type":       "reconnect_success",
		"roomId":     req.RoomId,
		"playerId":   req.PlayerId,
		"state":      room,
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
		RoomId   string `json:"roomId"`
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
		"type":      "sync_response",
		"roomId":    req.RoomId,
		"state":     state,
		"history":   history,
		"timestamp": time.Now().UnixMilli(),
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
		hub:       hub,
		conn:      conn,
		send:      make(chan []byte, 256),
		sessionID: sessionID,
	}

	hub.register <- client

	go client.writePump()
	go client.readPump()
}
