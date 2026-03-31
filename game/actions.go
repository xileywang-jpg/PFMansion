package game

import (
	"errors"
	"fmt"
	"math/rand"
	"strings"
	"time"
)

// ==================== 玩家操作 ====================

// RollDice 投骰子 (服务器端统一生成)
// 使用山屋惊魂经典版规则：骰子点数为 0, 1, 2
// 0: 空白面 (2/6), 1: 白点 (2/6), 2: 绿点 (2/6)
func (g *GameManager) RollDice(numDice int) []int {
	diceFaces := []int{0, 0, 1, 1, 2, 2}
	results := make([]int, numDice)
	for i := 0; i < numDice; i++ {
		results[i] = diceFaces[rand.Intn(len(diceFaces))]
	}
	return results
}

// RollDiceSum 投骰子并返回总和
func (g *GameManager) RollDiceSum(numDice int) int {
	results := g.RollDice(numDice)
	sum := 0
	for _, v := range results {
		sum += v
	}
	return sum
}

func (g *GameManager) setLastRollResultUnlocked(state *GameStateFull, result int) {
	if state == nil {
		return
	}
	state.LastRollResult = &result
}

func (g *GameManager) clearLastRollResultUnlocked(state *GameStateFull) {
	if state == nil {
		return
	}
	state.LastRollResult = nil
}

func (g *GameManager) requireActivePlayerUnlocked(state *GameStateFull, playerID string) (*GamePlayer, error) {
	if state == nil {
		return nil, errors.New("游戏未开始")
	}

	if state.ActivePlayerID != playerID {
		return nil, errors.New("还没轮到你")
	}

	player, ok := state.Players[playerID]
	if !ok {
		return nil, errors.New("玩家不存在")
	}

	if player.IsDead {
		return nil, errors.New("已死亡的玩家无法行动")
	}

	return player, nil
}

// SetLastRollResult 设置最近一次骰子结果（用于前端同步显示）
func (g *GameManager) SetLastRollResult(roomID string, result int) error {
	g.mu.Lock()
	defer g.mu.Unlock()

	room, ok := g.Rooms[roomID]
	if !ok {
		return errors.New("房间不存在")
	}

	state := room.GameState
	if state == nil || state.FullState == nil {
		return errors.New("游戏未开始")
	}

	g.setLastRollResultUnlocked(state.FullState, result)
	return nil
}

// ClearLastRollResult 清除最近一次骰子结果，避免跨检定复用
func (g *GameManager) ClearLastRollResult(roomID string) error {
	g.mu.Lock()
	defer g.mu.Unlock()

	room, ok := g.Rooms[roomID]
	if !ok {
		return errors.New("房间不存在")
	}

	state := room.GameState
	if state == nil || state.FullState == nil {
		return errors.New("游戏未开始")
	}

	g.clearLastRollResultUnlocked(state.FullState)
	return nil
}

// SetPendingAction 设置待处理动作（状态控制）
func (g *GameManager) SetPendingAction(roomID string, action *PendingAction) error {
	g.mu.Lock()
	defer g.mu.Unlock()

	room, ok := g.Rooms[roomID]
	if !ok {
		return errors.New("房间不存在")
	}

	state := room.GameState
	if state == nil || state.FullState == nil {
		return errors.New("游戏未开始")
	}

	g.clearLastRollResultUnlocked(state.FullState)
	state.FullState.PendingAction = action
	return nil
}

// ClearPendingAction 清除待处理动作
func (g *GameManager) ClearPendingAction(roomID string) error {
	g.mu.Lock()
	defer g.mu.Unlock()

	room, ok := g.Rooms[roomID]
	if !ok {
		return errors.New("房间不存在")
	}

	state := room.GameState
	if state == nil || state.FullState == nil {
		return errors.New("游戏未开始")
	}

	state.FullState.PendingAction = nil
	return nil
}

// CheckPendingAction 检查待处理动作
func (g *GameManager) CheckPendingAction(roomID string) (*PendingAction, error) {
	g.mu.RLock()
	defer g.mu.RUnlock()

	room, ok := g.Rooms[roomID]
	if !ok {
		return nil, errors.New("房间不存在")
	}

	state := room.GameState
	if state == nil || state.FullState == nil {
		return nil, errors.New("游戏未开始")
	}

	return state.FullState.PendingAction, nil
}

type drawCardExecutionResult struct {
	Card   *Card
	Deck   string
	Wait   bool
	Reveal bool
}

func (g *GameManager) executeDeckDrawUnlocked(roomID, playerID, deckName string) (*drawCardExecutionResult, error) {
	room, ok := g.Rooms[roomID]
	if !ok || room.GameState == nil || room.GameState.FullState == nil {
		return nil, errors.New("游戏未开始")
	}
	state := room.GameState.FullState
	player, ok := state.Players[playerID]
	if !ok {
		return nil, errors.New("玩家不存在")
	}

	deckName = strings.ToUpper(deckName)
	deck := state.Decks[deckName]
	if len(deck) == 0 {
		g.addLog(roomID, fmt.Sprintf("%s 牌堆已空！", deckName), "alert")
		return nil, nil
	}

	card := deck[0]
	state.Decks[deckName] = deck[1:]
	result := &drawCardExecutionResult{
		Card: &card,
		Deck: deckName,
	}

	switch deckName {
	case "ITEM":
		player.Items = append(player.Items, card)
		g.applyPassiveEffects(roomID, playerID, card)
		g.addLog(roomID, fmt.Sprintf("%s 发现了物品：%s！", player.Character.Name, card.Name), "success")
		g.addLog(roomID, fmt.Sprintf("%s 获得了物品：%s", player.Character.Name, card.Name), "success")
		state.ActiveCard = nil
		if winner := g.updateObjectivesUnlocked(state, "ITEM_COLLECTED", map[string]interface{}{"playerId": playerID, "itemId": card.ID}); winner != "" {
			return result, nil
		}
		return result, nil

	case "OMEN":
		state.ActiveCard = &card
		state.OmenCount++
		state.LastTriggeredOmen = card.ID
		g.addLog(roomID, fmt.Sprintf("%s 发现了预兆：%s！", player.Character.Name, card.Name), "alert")
		g.addLog(roomID, fmt.Sprintf("预兆计数：%d。进行作祟检定...", state.OmenCount), "alert")
		g.clearLastRollResultUnlocked(state)
		results := g.RollDice(6)
		sum := 0
		for _, v := range results {
			sum += v
		}
		g.setLastRollResultUnlocked(state, sum)
		g.addLog(roomID, fmt.Sprintf("作祟检定: %v = %d vs %d", results, sum, state.OmenCount), "alert")
		if sum < state.OmenCount {
			g.addLog(roomID, "作祟爆发！大厦的阴暗面显露无疑...", "alert")
			state.Phase = GamePhaseHauntReveal
			state.ActiveCard = nil
			return result, g.triggerHauntRoom(room, &card)
		}
		g.addLog(roomID, fmt.Sprintf("作祟检定通过（%d >= %d），暂时安全。", sum, state.OmenCount), "info")
		player.Items = append(player.Items, card)
		g.applyPassiveEffects(roomID, playerID, card)
		g.addLog(roomID, fmt.Sprintf("%s 获得了预兆：%s", player.Character.Name, card.Name), "success")
		state.ActiveCard = nil
		if winner := g.updateObjectivesUnlocked(state, "ITEM_COLLECTED", map[string]interface{}{"playerId": playerID, "itemId": card.ID}); winner != "" {
			return result, nil
		}
		return result, nil

	case "EVENT":
		state.ActiveCard = &card
		g.addLog(roomID, fmt.Sprintf("%s 触发了事件：%s！", player.Character.Name, card.Name), "alert")
		if card.Interaction != nil {
			switch card.Interaction.Type {
			case "ATTRIBUTE_CHECK":
				g.clearLastRollResultUnlocked(state)
				state.PendingAction = &PendingAction{
					Type:   "ATTRIBUTE_CHECK",
					Target: playerID,
					Data: map[string]interface{}{
						"attribute":  card.Interaction.Attribute,
						"difficulty": card.Interaction.Difficulty,
						"eventID":    card.ID,
					},
				}
				result.Wait = true
				result.Reveal = true
				return result, nil
			case "CHOICE":
				g.clearLastRollResultUnlocked(state)
				state.PendingAction = &PendingAction{
					Type:   "CHOICE",
					Target: playerID,
					Data: map[string]interface{}{
						"eventID": card.ID,
					},
				}
				result.Wait = true
				result.Reveal = true
				return result, nil
			}
		}
		player.Items = append(player.Items, card)
		g.addLog(roomID, fmt.Sprintf("%s 获得了事件奖励：%s", player.Character.Name, card.Name), "success")
		state.ActiveCard = nil
		return result, nil
	}

	result.Reveal = state.ActiveCard != nil
	return result, nil
}

func (g *GameManager) drawCardFromDeckUnlocked(roomID, playerID, deckName string) (bool, error) {
	result, err := g.executeDeckDrawUnlocked(roomID, playerID, deckName)
	if err != nil || result == nil {
		return false, err
	}
	return result.Wait, nil
}

func intValueFromPendingData(value interface{}) (int, bool) {
	switch v := value.(type) {
	case int:
		return v, true
	case int32:
		return int(v), true
	case int64:
		return int(v), true
	case float32:
		return int(v), true
	case float64:
		return int(v), true
	default:
		return 0, false
	}
}

func (g *GameManager) attachPendingContinuationUnlocked(state *GameStateFull, continuation map[string]interface{}) {
	if state == nil || state.PendingAction == nil || continuation == nil {
		return
	}
	if state.PendingAction.Data == nil {
		state.PendingAction.Data = map[string]interface{}{}
	}
	state.PendingAction.Data["continuation"] = continuation
}

func (g *GameManager) triggerTileLeaveUnlocked(roomID, playerID, tileDefID string, continuation map[string]interface{}) (bool, error) {
	if tileDefID == "" {
		return false, nil
	}

	room, ok := g.Rooms[roomID]
	if !ok || room.GameState == nil || room.GameState.FullState == nil {
		return false, errors.New("游戏未开始")
	}
	state := room.GameState.FullState

	tileDef := g.getTileDef(roomID, tileDefID)
	if tileDef == nil || tileDef.OnLeave == nil {
		return false, nil
	}

	wait, err := g.executeTileTriggerUnlocked(roomID, playerID, tileDef.OnLeave)
	if wait {
		g.attachPendingContinuationUnlocked(state, continuation)
	}
	return wait, err
}

func (g *GameManager) completeMoveToExistingTileUnlocked(roomID, playerID string, state *GameStateFull, player *GamePlayer, existingTile *TileInstance, newX, newY int) error {
	player.Position.X = newX
	player.Position.Y = newY
	state.MovesRemaining--

	state.Logs = append(state.Logs, LogEntry{
		ID:        generateLogID(),
		Timestamp: time.Now().UnixMilli(),
		Text:      fmt.Sprintf("%s 进入了 %s", player.Character.Name, existingTile.DefID),
		Type:      "info",
	})
	state.LastTriggeredTile = existingTile.DefID
	if winner := g.updateObjectivesUnlocked(state, "TILE_REACHED", map[string]interface{}{
		"playerId": playerID,
		"tileId":   existingTile.DefID,
	}); winner != "" {
		return nil
	}

	if !existingTile.HasEventTriggered && existingTile.DefID != "start_tile" {
		existingTile.HasEventTriggered = true
		return g.TriggerRoomEvent(roomID, playerID, existingTile.DefID)
	}

	return nil
}

func (g *GameManager) preparePendingTileUnlocked(roomID string, state *GameStateFull, player *GamePlayer, direction string, newX, newY int) error {
	if len(state.TileDeck) == 0 {
		return errors.New("房间牌堆已空")
	}

	tileDef := state.TileDeck[0]
	state.TileDeck = state.TileDeck[1:]
	state.PendingTile = &tileDef
	state.PendingMoveDirection = direction
	state.PendingTargetPos = &Pos{X: newX, Y: newY}
	state.MovesRemaining--
	g.addLog(roomID, fmt.Sprintf("%s 探索发现了新区域，请放置房间", player.Character.Name), "info")
	return nil
}

func (g *GameManager) placePendingTileUnlocked(roomID, playerID string, state *GameStateFull, player *GamePlayer, direction string, rotation int) error {
	if state.PendingTile == nil {
		return errors.New("没有待放置的房间，请先移动到新区域")
	}
	if state.PendingTargetPos == nil {
		return errors.New("缺少待放置目标位置")
	}

	currentTile, ok := state.Map[fmt.Sprintf("%d,%d", player.Position.X, player.Position.Y)]
	if !ok {
		return errors.New("当前位置没有房间")
	}

	dir := Direction(direction)
	currentEdge := currentTile.Edges[dir]
	if currentEdge != "OPEN" {
		return errors.New("该方向没有开放的门口")
	}

	newX := state.PendingTargetPos.X
	newY := state.PendingTargetPos.Y
	targetKey := fmt.Sprintf("%d,%d", newX, newY)
	if _, exists := state.Map[targetKey]; exists {
		return errors.New("该位置已有房间")
	}

	tileDef := *state.PendingTile
	rotatedEdges := rotateEdges(tileDef.Edges, rotation)
	oppositeDir := getOppositeDirection(dir)
	if rotatedEdges[oppositeDir] != "OPEN" {
		return errors.New("该方向无法放置：房间边缘不相通")
	}

	newTile := &TileInstance{
		InstanceID:        generateTileID(),
		DefID:             tileDef.ID,
		X:                 newX,
		Y:                 newY,
		Rotation:          rotation,
		Edges:             rotatedEdges,
		HasEventTriggered: false,
		Visibility:        "VISIBLE",
		DroppedItems:      []Card{},
	}

	state.Map[targetKey] = newTile
	player.Position.X = newX
	player.Position.Y = newY
	state.PendingTile = nil
	state.PendingMoveDirection = ""
	state.PendingTargetPos = nil

	state.Logs = append(state.Logs, LogEntry{
		ID:        generateLogID(),
		Timestamp: time.Now().UnixMilli(),
		Text:      fmt.Sprintf("%s 探索发现了 %s", player.Character.Name, tileDef.Name),
		Type:      "success",
	})
	state.LastTriggeredTile = tileDef.ID
	if winner := g.updateObjectivesUnlocked(state, "ROOM_EXPLORED", map[string]interface{}{
		"playerId": playerID,
		"count":    len(state.Map),
	}); winner != "" {
		return nil
	}
	if winner := g.updateObjectivesUnlocked(state, "TILE_REACHED", map[string]interface{}{
		"playerId": playerID,
		"tileId":   tileDef.ID,
	}); winner != "" {
		return nil
	}

	newTile.HasEventTriggered = true
	return g.TriggerRoomEvent(roomID, playerID, tileDef.ID)
}

func (g *GameManager) normalizeRelocationTargetUnlocked(state *GameStateFull, targetX, targetY int) (*TileInstance, int, int, bool, error) {
	if state == nil {
		return nil, 0, 0, false, errors.New("游戏未开始")
	}

	targetKey := fmt.Sprintf("%d,%d", targetX, targetY)
	if targetTile, ok := state.Map[targetKey]; ok {
		return targetTile, targetX, targetY, false, nil
	}

	entryTile, ok := state.Map["0,0"]
	if !ok {
		return nil, 0, 0, false, errors.New("目标位置不存在且入口不可用")
	}

	return entryTile, 0, 0, true, nil
}

func (g *GameManager) finalizeRelocationUnlocked(roomID, playerID string, state *GameStateFull, player *GamePlayer, moveType string, targetX, targetY int) error {
	targetTile, finalX, finalY, fallbackToEntry, err := g.normalizeRelocationTargetUnlocked(state, targetX, targetY)
	if err != nil {
		return err
	}

	oldX, oldY := player.Position.X, player.Position.Y
	player.Position = Position{X: finalX, Y: finalY}

	switch moveType {
	case "TELEPORT":
		if fallbackToEntry {
			g.addLog(roomID, fmt.Sprintf("%s 被传送到了未知区域", player.Character.Name), "alert")
		} else {
			g.addLog(roomID, fmt.Sprintf("%s 被传送到了 %s", player.Character.Name, targetTile.DefID), "success")
		}
	default:
		if fallbackToEntry {
			g.addLog(roomID, fmt.Sprintf("%s 被传送到了未知区域", player.Character.Name), "alert")
		} else {
			g.addLog(roomID, fmt.Sprintf("%s 从 (%d,%d) 移动到了 (%d,%d)", player.Character.Name, oldX, oldY, finalX, finalY), "info")
		}
	}

	state.LastTriggeredTile = targetTile.DefID
	if winner := g.updateObjectivesUnlocked(state, "TILE_REACHED", map[string]interface{}{
		"playerId": playerID,
		"tileId":   targetTile.DefID,
	}); winner != "" {
		return nil
	}

	if !targetTile.HasEventTriggered && targetTile.DefID != "start_tile" {
		targetTile.HasEventTriggered = true
		return g.TriggerRoomEvent(roomID, playerID, targetTile.DefID)
	}

	return nil
}

func (g *GameManager) resumePendingContinuationUnlocked(roomID, playerID string, state *GameStateFull, continuation map[string]interface{}) error {
	if continuation == nil {
		return nil
	}

	player, ok := state.Players[playerID]
	if !ok {
		return errors.New("玩家不存在")
	}

	continuationType, _ := continuation["type"].(string)
	switch continuationType {
	case "MOVE_EXISTING_TILE":
		newX, okX := intValueFromPendingData(continuation["x"])
		newY, okY := intValueFromPendingData(continuation["y"])
		if !okX || !okY {
			return errors.New("离场续行动作缺少目标坐标")
		}
		existingTile, ok := state.Map[fmt.Sprintf("%d,%d", newX, newY)]
		if !ok {
			return errors.New("离场续行动作的目标房间不存在")
		}
		return g.completeMoveToExistingTileUnlocked(roomID, playerID, state, player, existingTile, newX, newY)

	case "PREPARE_PENDING_TILE":
		newX, okX := intValueFromPendingData(continuation["x"])
		newY, okY := intValueFromPendingData(continuation["y"])
		direction, okDir := continuation["direction"].(string)
		if !okX || !okY || !okDir {
			return errors.New("离场续行动作缺少探索信息")
		}
		return g.preparePendingTileUnlocked(roomID, state, player, direction, newX, newY)

	case "PLACE_PENDING_TILE":
		direction, okDir := continuation["direction"].(string)
		rotation, okRotation := intValueFromPendingData(continuation["rotation"])
		if !okDir || !okRotation {
			return errors.New("离场续行动作缺少放置信息")
		}
		return g.placePendingTileUnlocked(roomID, playerID, state, player, direction, rotation)

	case "TELEPORT":
		newX, okX := intValueFromPendingData(continuation["x"])
		newY, okY := intValueFromPendingData(continuation["y"])
		if !okX || !okY {
			return errors.New("离场续行动作缺少传送坐标")
		}
		return g.finalizeRelocationUnlocked(roomID, playerID, state, player, "TELEPORT", newX, newY)

	case "FORCED_MOVE":
		newX, okX := intValueFromPendingData(continuation["x"])
		newY, okY := intValueFromPendingData(continuation["y"])
		if !okX || !okY {
			return errors.New("离场续行动作缺少强制位移坐标")
		}
		return g.finalizeRelocationUnlocked(roomID, playerID, state, player, "FORCED_MOVE", newX, newY)

	case "":
		return nil

	default:
		return fmt.Errorf("未知的离场续行动作: %s", continuationType)
	}
}

func (g *GameManager) executeTileTriggerUnlocked(roomID, playerID string, trigger *TileTrigger) (bool, error) {
	if trigger == nil {
		return false, nil
	}

	room, ok := g.Rooms[roomID]
	if !ok || room.GameState == nil || room.GameState.FullState == nil {
		return false, errors.New("游戏未开始")
	}
	state := room.GameState.FullState
	player, ok := state.Players[playerID]
	if !ok {
		return false, errors.New("玩家不存在")
	}

	switch trigger.Type {
	case "", "EFFECTS":
		for _, effect := range trigger.Effects {
			g.applyEffect(roomID, playerID, effect)
		}
		return false, nil

	case "ATTRIBUTE_CHECK":
		g.clearLastRollResultUnlocked(state)
		state.PendingAction = &PendingAction{
			Type:   "TILE_ATTRIBUTE_CHECK",
			Target: playerID,
			Data: map[string]interface{}{
				"attribute":      trigger.Attribute,
				"difficulty":     trigger.Difficulty,
				"successEffects": trigger.Success,
				"failureEffects": trigger.Failure,
			},
			Message: trigger.Message,
		}
		if trigger.Message != "" {
			g.addLog(roomID, trigger.Message, "alert")
		} else {
			g.addLog(roomID, fmt.Sprintf("%s 需要进行 %s 检定", player.Character.Name, trigger.Attribute), "alert")
		}
		return true, nil

	case "DRAW_CARD":
		count := trigger.Count
		if count <= 0 {
			count = 1
		}
		deckName := trigger.Deck
		if deckName == "" {
			deckName = "EVENT"
		}
		for i := 0; i < count; i++ {
			wait, err := g.drawCardFromDeckUnlocked(roomID, playerID, deckName)
			if err != nil || wait {
				return wait, err
			}
		}
		return false, nil

	case "RANDOM_EVENT":
		if len(trigger.Possibilities) == 0 {
			return false, nil
		}
		totalWeight := 0
		for _, possibility := range trigger.Possibilities {
			weight := possibility.Weight
			if weight <= 0 {
				weight = 1
			}
			totalWeight += weight
		}
		roll := rand.Intn(totalWeight)
		for _, possibility := range trigger.Possibilities {
			weight := possibility.Weight
			if weight <= 0 {
				weight = 1
			}
			if roll < weight {
				g.applyEffect(roomID, playerID, possibility.Effect)
				return false, nil
			}
			roll -= weight
		}
		return false, nil

	default:
		return false, fmt.Errorf("不支持的地块触发类型: %s", trigger.Type)
	}
}

func (g *GameManager) ResolvePendingTileCheck(roomID, playerID string, success bool) error {
	g.mu.Lock()
	defer g.mu.Unlock()

	room, ok := g.Rooms[roomID]
	if !ok || room.GameState == nil || room.GameState.FullState == nil {
		return errors.New("游戏未开始")
	}
	state := room.GameState.FullState
	pending := state.PendingAction
	if pending == nil || pending.Type != "TILE_ATTRIBUTE_CHECK" {
		return errors.New("没有待处理的地块检定")
	}
	if pending.Target != playerID {
		return errors.New("当前不是你的地块检定")
	}
	continuation, _ := pending.Data["continuation"].(map[string]interface{})
	state.PendingAction = nil
	g.clearLastRollResultUnlocked(state)

	var selected []Effect
	if success {
		if effects, ok := pending.Data["successEffects"].([]Effect); ok {
			selected = effects
		}
	} else {
		if effects, ok := pending.Data["failureEffects"].([]Effect); ok {
			selected = effects
		}
	}
	for _, effect := range selected {
		g.applyEffect(roomID, playerID, effect)
	}
	if state.PendingAction == nil && continuation != nil {
		if err := g.resumePendingContinuationUnlocked(roomID, playerID, state, continuation); err != nil {
			return err
		}
	}
	return nil
}

// TriggerRoomEvent 触发房间事件
func (g *GameManager) TriggerRoomEvent(roomID, playerID, tileDefID string) error {
	room, ok := g.Rooms[roomID]
	if !ok {
		return errors.New("房间不存在")
	}

	state := room.GameState
	if state == nil || state.FullState == nil {
		return errors.New("游戏未开始")
	}

	// 获取房间定义
	tileDef := g.getTileDef(roomID, tileDefID)
	if tileDef == nil {
		return nil // 没有定义，跳过
	}

	player, ok := state.FullState.Players[playerID]
	if !ok {
		return errors.New("玩家不存在")
	}

	state.FullState.LastTriggeredTile = tileDefID

	// 1. 检查 EventTrigger - 触发事件卡
	if tileDef.EventTrigger != "" {
		event := GetEvent(tileDef.EventTrigger)
		if event != nil {
			// 设置为激活的事件卡
			state.FullState.ActiveCard = event

			// 根据交互类型处理
			if event.Interaction != nil {
				switch event.Interaction.Type {
				case "ATTRIBUTE_CHECK":
					g.clearLastRollResultUnlocked(state.FullState)
					// 设置待处理动作，让玩家投骰子
					state.FullState.PendingAction = &PendingAction{
						Type:   "ATTRIBUTE_CHECK",
						Target: playerID,
						Data: map[string]interface{}{
							"attribute":  event.Interaction.Attribute,
							"difficulty": event.Interaction.Difficulty,
							"eventID":    event.ID,
						},
					}
					g.addLog(roomID, fmt.Sprintf("%s 触发了事件: %s - 需要进行 %s 检定",
						player.Character.Name, event.Name, event.Interaction.Attribute), "alert")
					return nil // 等待玩家投骰子

				case "CHOICE":
					g.clearLastRollResultUnlocked(state.FullState)
					// 设置待处理动作，让玩家选择
					state.FullState.PendingAction = &PendingAction{
						Type:   "CHOICE",
						Target: playerID,
						Data: map[string]interface{}{
							"eventID": event.ID,
						},
					}
					g.addLog(roomID, fmt.Sprintf("%s 触发了事件: %s - 请做出选择",
						player.Character.Name, event.Name), "alert")
					return nil // 等待玩家选择
				}
			}
		}
	}

	// 2. 检查 CardSymbol - 根据类型从对应牌堆抽牌
	if tileDef.CardSymbol != "" && tileDef.CardSymbol != "NONE" {
		wait, err := g.drawCardFromDeckUnlocked(roomID, playerID, tileDef.CardSymbol)
		if err != nil {
			return err
		}
		if wait {
			return nil
		}
	}

	// 3. 执行统一的入场触发器
	if wait, err := g.executeTileTriggerUnlocked(roomID, playerID, tileDef.OnEnter); err != nil {
		return err
	} else if wait {
		return nil
	}

	return nil
}

// ProcessMove 处理玩家移动
func (g *GameManager) ProcessMove(roomID, playerID, direction string) error {
	g.mu.Lock()
	defer g.mu.Unlock()

	room, ok := g.Rooms[roomID]
	if !ok {
		return errors.New("房间不存在")
	}

	state := room.GameState
	if state == nil || state.FullState == nil {
		return errors.New("游戏未开始")
	}

	player, err := g.requireActivePlayerUnlocked(state.FullState, playerID)
	if err != nil {
		return err
	}

	// 验证回合阶段
	if state.FullState.TurnPhase != "MOVING" {
		return errors.New("当前不能移动")
	}

	// 验证体力
	if state.FullState.MovesRemaining <= 0 {
		return errors.New("体力已耗尽")
	}

	// 获取当前位置的房间
	currentTile, ok := state.FullState.Map[fmt.Sprintf("%d,%d", player.Position.X, player.Position.Y)]
	if !ok {
		return errors.New("当前位置没有房间")
	}

	// 检查方向
	dir := Direction(direction)
	edge, ok := currentTile.Edges[dir]
	if !ok || edge == "WALL" {
		return errors.New("该方向没有门")
	}

	// 计算新位置
	newX := player.Position.X
	newY := player.Position.Y
	switch dir {
	case DirectionNorth:
		newY--
	case DirectionSouth:
		newY++
	case DirectionEast:
		newX++
	case DirectionWest:
		newX--
	}

	// 检查目标位置
	targetKey := fmt.Sprintf("%d,%d", newX, newY)
	if existingTile, exists := state.FullState.Map[targetKey]; exists {
		continuation := map[string]interface{}{
			"type": "MOVE_EXISTING_TILE",
			"x":    newX,
			"y":    newY,
		}
		wait, err := g.triggerTileLeaveUnlocked(roomID, playerID, currentTile.DefID, continuation)
		if err != nil {
			return err
		}
		if wait {
			return nil
		}
		return g.completeMoveToExistingTileUnlocked(roomID, playerID, state.FullState, player, existingTile, newX, newY)
	} else {
		return g.preparePendingTileUnlocked(roomID, state.FullState, player, string(dir), newX, newY)
	}
}

// rotateEdges 将边缘按旋转角度旋转（每步90°）
func rotateEdges(edges map[Direction]string, rotation int) map[Direction]string {
	r := ((rotation % 360) + 360) % 360
	if r == 0 {
		return edges
	}
	steps := r / 90
	result := make(map[Direction]string)
	for dir, edge := range edges {
		result[dir] = edge
	}
	for i := 0; i < steps; i++ {
		temp := make(map[Direction]string)
		for d, e := range result {
			temp[d] = e
		}
		result[DirectionEast] = temp[DirectionNorth]
		result[DirectionSouth] = temp[DirectionEast]
		result[DirectionWest] = temp[DirectionSouth]
		result[DirectionNorth] = temp[DirectionWest]
	}
	return result
}

// PlaceTile 放置新房间
func (g *GameManager) PlaceTile(roomID, playerID, direction string, rotation int) error {
	g.mu.Lock()
	defer g.mu.Unlock()

	room, ok := g.Rooms[roomID]
	if !ok {
		return errors.New("房间不存在")
	}

	state := room.GameState
	if state == nil || state.FullState == nil {
		return errors.New("游戏未开始")
	}

	player, err := g.requireActivePlayerUnlocked(state.FullState, playerID)
	if err != nil {
		return err
	}

	// 验证待放置的房间已就绪（体力和牌堆已在 ProcessMove 中消耗和准备）
	if state.FullState.PendingTile == nil {
		return errors.New("没有待放置的房间，请先移动到新区域")
	}

	// 获取当前位置
	currentTile, ok := state.FullState.Map[fmt.Sprintf("%d,%d", player.Position.X, player.Position.Y)]
	if !ok {
		return errors.New("当前位置没有房间")
	}

	// 检查方向
	dir := Direction(direction)
	currentEdge := currentTile.Edges[dir]
	if currentEdge != "OPEN" {
		return errors.New("该方向没有开放的门口")
	}

	// 计算新位置
	newX := player.Position.X
	newY := player.Position.Y
	switch dir {
	case DirectionNorth:
		newY--
	case DirectionSouth:
		newY++
	case DirectionEast:
		newX++
	case DirectionWest:
		newX--
	}

	// 检查位置是否已有房间
	targetKey := fmt.Sprintf("%d,%d", newX, newY)
	if _, exists := state.FullState.Map[targetKey]; exists {
		return errors.New("该位置已有房间")
	}

	continuation := map[string]interface{}{
		"type":      "PLACE_PENDING_TILE",
		"direction": direction,
		"rotation":  rotation,
	}
	wait, err := g.triggerTileLeaveUnlocked(roomID, playerID, currentTile.DefID, continuation)
	if err != nil {
		return err
	}
	if wait {
		return nil
	}
	return g.placePendingTileUnlocked(roomID, playerID, state.FullState, player, direction, rotation)
}

// CancelTilePlacement 取消房间放置，将待放置的房间归还牌堆
func (g *GameManager) CancelTilePlacement(roomID, playerID string) error {
	g.mu.Lock()
	defer g.mu.Unlock()

	room, ok := g.Rooms[roomID]
	if !ok {
		return errors.New("房间不存在")
	}

	state := room.GameState
	if state == nil || state.FullState == nil {
		return errors.New("游戏未开始")
	}

	if state.FullState.ActivePlayerID != playerID {
		return errors.New("还没轮到你")
	}

	if state.FullState.PendingTile == nil {
		return errors.New("没有待放置的房间")
	}

	// 将 PendingTile 放回牌堆顶部，归还消耗的步数
	state.FullState.TileDeck = append([]TileDef{*state.FullState.PendingTile}, state.FullState.TileDeck...)
	state.FullState.PendingTile = nil
	state.FullState.PendingMoveDirection = ""
	state.FullState.PendingTargetPos = nil
	state.FullState.MovesRemaining++
	g.addLog(roomID, fmt.Sprintf("%s 决定不进入新区域", state.FullState.Players[playerID].Character.Name), "info")

	return nil
}

// EndTurn 结束当前玩家回合
func (g *GameManager) EndTurn(roomID, playerID string) error {
	g.mu.Lock()
	defer g.mu.Unlock()

	room, ok := g.Rooms[roomID]
	if !ok {
		return errors.New("房间不存在")
	}

	state := room.GameState
	if state == nil || state.FullState == nil {
		return errors.New("游戏未开始")
	}

	// 验证是否是当前玩家
	if state.FullState.ActivePlayerID != playerID {
		return errors.New("还没轮到你")
	}

	// 切换回合
	return g.nextTurnInternal(room)
}

// ModifyStat 修改玩家属性
func (g *GameManager) ModifyStat(roomID, playerID, attribute string, amount int) error {
	g.mu.Lock()
	defer g.mu.Unlock()

	room, ok := g.Rooms[roomID]
	if !ok {
		return errors.New("房间不存在")
	}

	state := room.GameState
	if state == nil || state.FullState == nil {
		return errors.New("游戏未开始")
	}

	player, ok := state.FullState.Players[playerID]
	if !ok {
		return errors.New("玩家不存在")
	}

	attr, ok := player.Character.Attributes[attribute]
	if !ok {
		return errors.New("属性不存在")
	}

	// 修改属性
	attr.Current += amount

	// 边界检查
	if attr.Current < attr.Floor {
		attr.Current = attr.Floor
	}
	if attr.Current > attr.Max {
		attr.Current = attr.Max
	}

	// 将修改后的属性存回 map
	player.Character.Attributes[attribute] = attr

	// 记录日志
	state.FullState.Logs = append(state.FullState.Logs, LogEntry{
		ID:        generateLogID(),
		Timestamp: time.Now().UnixMilli(),
		Text:      fmt.Sprintf("%s 的 %s %s (当前: %d)", player.Character.Name, attribute, formatSign(amount), attr.Current),
		Type:      "info",
	})

	// 检查死亡
	if attr.Current <= attr.Floor && attribute == "might" {
		player.IsDead = true
		state.FullState.Logs = append(state.FullState.Logs, LogEntry{
			ID:        generateLogID(),
			Timestamp: time.Now().UnixMilli(),
			Text:      fmt.Sprintf("%s 在大厦中殒落了...", player.Character.Name),
			Type:      "alert",
		})
	}

	return nil
}

func formatSign(n int) string {
	if n >= 0 {
		return fmt.Sprintf("+%d", n)
	}
	return fmt.Sprintf("%d", n)
}

// getTileDef 获取房间定义（支持主题）
func (g *GameManager) getTileDef(roomID, tileID string) *TileDef {
	room, ok := g.Rooms[roomID]
	if ok && room != nil {
		theme := room.Theme
		// 使用 GetTileDeckByTheme 获取正确主题的牌堆
		deck := GetTileDeckByTheme(theme)
		for i := range deck {
			if deck[i].ID == tileID {
				return &deck[i]
			}
		}
	}
	// 回退到原始牌堆
	for i := range TileDeck {
		if TileDeck[i].ID == tileID {
			return &TileDeck[i]
		}
	}
	return nil
}

// ==================== Phase 2: 物品与互动操作 ====================

// PickupItem 捡起地面上的物品
func (g *GameManager) PickupItem(roomID, playerID, itemID string) error {
	g.mu.Lock()
	defer g.mu.Unlock()

	room, ok := g.Rooms[roomID]
	if !ok {
		return errors.New("房间不存在")
	}

	state := room.GameState
	if state == nil || state.FullState == nil {
		return errors.New("游戏未开始")
	}

	player, err := g.requireActivePlayerUnlocked(state.FullState, playerID)
	if err != nil {
		return err
	}

	// 获取玩家当前位置的地块
	posKey := fmt.Sprintf("%d,%d", player.Position.X, player.Position.Y)
	tile, ok := state.FullState.Map[posKey]
	if !ok {
		return errors.New("当前位置没有房间")
	}

	// 在地块掉落的物品中查找
	foundIdx := -1
	for i, item := range tile.DroppedItems {
		if item.ID == itemID {
			foundIdx = i
			break
		}
	}
	if foundIdx == -1 {
		return errors.New("该物品不在此处")
	}

	// 捡起物品
	item := tile.DroppedItems[foundIdx]
	tile.DroppedItems = append(tile.DroppedItems[:foundIdx], tile.DroppedItems[foundIdx+1:]...)
	player.Items = append(player.Items, item)

	// 记录日志
	state.FullState.Logs = append(state.FullState.Logs, LogEntry{
		ID:        generateLogID(),
		Timestamp: time.Now().UnixMilli(),
		Text:      fmt.Sprintf("%s 捡起了 %s", player.Character.Name, item.Name),
		Type:      "success",
	})
	state.FullState.ActiveCard = nil
	state.FullState.PendingAction = nil
	if len(item.PassiveEffects) > 0 {
		g.applyPassiveEffects(roomID, playerID, item)
	}
	if winner := g.updateObjectivesUnlocked(state.FullState, "ITEM_COLLECTED", map[string]interface{}{
		"playerId": playerID,
		"itemId":   item.ID,
	}); winner != "" {
		return nil
	}

	// 若是厄运卡，说明是从地面拾取（旧版流程遗留）
	// 新版流程中，预兆卡在 TriggerRoomEvent 中已直接给玩家，不会放到地面
	// 此处仅作为防御性处理
	if item.Type == "OMEN" {
		state.FullState.LastTriggeredTile = tile.DefID
		state.FullState.LastTriggeredOmen = item.ID
		// 预兆已被玩家获得（OmenCount 在揭示时已增加）
		if !state.FullState.IsHauntActive {
			state.FullState.OmenCount++
			state.FullState.Phase = GamePhaseHauntRoll
			g.clearLastRollResultUnlocked(state.FullState)
		}
		g.addLog(roomID, fmt.Sprintf("%s 获得了预兆：%s", player.Character.Name, item.Name), "success")
	} else {
		state.FullState.TurnPhase = TurnPhaseDone
	}

	return nil
}

// GiveItem 给予物品给其他玩家
func (g *GameManager) GiveItem(roomID, fromPlayerID, toPlayerID, itemID string) error {
	g.mu.Lock()
	defer g.mu.Unlock()

	room, ok := g.Rooms[roomID]
	if !ok {
		return errors.New("房间不存在")
	}

	state := room.GameState
	if state == nil || state.FullState == nil {
		return errors.New("游戏未开始")
	}

	fromPlayer, err := g.requireActivePlayerUnlocked(state.FullState, fromPlayerID)
	if err != nil {
		return err
	}

	toPlayer, ok := state.FullState.Players[toPlayerID]
	if !ok {
		return errors.New("接收者不存在")
	}
	if toPlayer.IsDead {
		return errors.New("已死亡的玩家无法接收物品")
	}
	if fromPlayer.Position != toPlayer.Position {
		return errors.New("只能将物品交给同一房间的玩家")
	}

	// 在发送者物品中查找
	foundIdx := -1
	for i, item := range fromPlayer.Items {
		if item.ID == itemID {
			foundIdx = i
			break
		}
	}
	if foundIdx == -1 {
		return errors.New("你没有该物品")
	}

	// 转移物品
	item := fromPlayer.Items[foundIdx]
	if len(item.PassiveEffects) > 0 {
		g.removePassiveEffects(roomID, fromPlayerID, item)
	}
	fromPlayer.Items = append(fromPlayer.Items[:foundIdx], fromPlayer.Items[foundIdx+1:]...)
	toPlayer.Items = append(toPlayer.Items, item)
	if len(item.PassiveEffects) > 0 {
		g.applyPassiveEffects(roomID, toPlayerID, item)
	}

	// 记录日志
	state.FullState.Logs = append(state.FullState.Logs, LogEntry{
		ID:        generateLogID(),
		Timestamp: time.Now().UnixMilli(),
		Text:      fmt.Sprintf("%s 将 %s 交给了 %s", fromPlayer.Character.Name, item.Name, toPlayer.Character.Name),
		Type:      "info",
	})

	return nil
}

// DropItem 丢弃物品到地面
func (g *GameManager) DropItem(roomID, playerID, itemID string) error {
	g.mu.Lock()
	defer g.mu.Unlock()

	room, ok := g.Rooms[roomID]
	if !ok {
		return errors.New("房间不存在")
	}

	state := room.GameState
	if state == nil || state.FullState == nil {
		return errors.New("游戏未开始")
	}

	player, err := g.requireActivePlayerUnlocked(state.FullState, playerID)
	if err != nil {
		return err
	}

	// 在玩家物品中查找
	foundIdx := -1
	for i, item := range player.Items {
		if item.ID == itemID {
			foundIdx = i
			break
		}
	}
	if foundIdx == -1 {
		return errors.New("你没有该物品")
	}

	// 丢弃物品到当前位置
	item := player.Items[foundIdx]
	if len(item.PassiveEffects) > 0 {
		g.removePassiveEffects(roomID, playerID, item)
	}
	player.Items = append(player.Items[:foundIdx], player.Items[foundIdx+1:]...)

	posKey := fmt.Sprintf("%d,%d", player.Position.X, player.Position.Y)
	tile, ok := state.FullState.Map[posKey]
	if !ok {
		return errors.New("当前位置没有房间")
	}
	tile.DroppedItems = append(tile.DroppedItems, item)

	// 记录日志
	state.FullState.Logs = append(state.FullState.Logs, LogEntry{
		ID:        generateLogID(),
		Timestamp: time.Now().UnixMilli(),
		Text:      fmt.Sprintf("%s 丢弃了 %s", player.Character.Name, item.Name),
		Type:      "info",
	})

	return nil
}

// InteractWithWall 与墙壁互动（破坏墙壁）
func (g *GameManager) InteractWithWall(roomID, playerID, direction string) error {
	g.mu.Lock()
	defer g.mu.Unlock()

	room, ok := g.Rooms[roomID]
	if !ok {
		return errors.New("房间不存在")
	}

	state := room.GameState
	if state == nil || state.FullState == nil {
		return errors.New("游戏未开始")
	}

	player, err := g.requireActivePlayerUnlocked(state.FullState, playerID)
	if err != nil {
		return err
	}

	// 获取玩家当前位置
	posKey := fmt.Sprintf("%d,%d", player.Position.X, player.Position.Y)
	currentTile, ok := state.FullState.Map[posKey]
	if !ok {
		return errors.New("当前位置没有房间")
	}

	// 检查是否有镐子
	hasPickaxe := false
	for _, item := range player.Items {
		if item.ID == "item_pickaxe" {
			hasPickaxe = true
			break
		}
	}

	// 获取玩家力量属性
	might := player.Character.Attributes["might"]
	mightVal := might.Current

	// 有镐子或力量 > 5 可以破坏墙壁
	if !hasPickaxe && mightVal <= 5 {
		return errors.New("力量不足，无法破坏墙壁")
	}

	// 修改墙壁为碎石
	dir := Direction(direction)
	currentTile.Edges[dir] = "RUBBLE"

	// 如果有相邻房间，也要修改相邻墙壁
	var nx, ny int
	switch dir {
	case DirectionNorth:
		ny = player.Position.Y - 1
		nx = player.Position.X
	case DirectionSouth:
		ny = player.Position.Y + 1
		nx = player.Position.X
	case DirectionEast:
		ny = player.Position.Y
		nx = player.Position.X + 1
	case DirectionWest:
		ny = player.Position.Y
		nx = player.Position.X - 1
	}

	neighborKey := fmt.Sprintf("%d,%d", nx, ny)
	if neighborTile, ok := state.FullState.Map[neighborKey]; ok {
		// 修改相邻房间的对向墙壁
		oppositeDir := getOppositeDirection(dir)
		neighborTile.Edges[oppositeDir] = "RUBBLE"
	}

	// 没有镐子则扣1点力量
	if !hasPickaxe {
		might.Current = might.Current - 1
		if might.Current < might.Floor {
			might.Current = might.Floor
		}
		// 将修改后的属性存回 map
		player.Character.Attributes["might"] = might
		// 记录日志
		state.FullState.Logs = append(state.FullState.Logs, LogEntry{
			ID:        generateLogID(),
			Timestamp: time.Now().UnixMilli(),
			Text:      fmt.Sprintf("%s 强行破坏墙壁，力量 -1", player.Character.Name),
			Type:      "alert",
		})
	}

	// 记录日志
	state.FullState.Logs = append(state.FullState.Logs, LogEntry{
		ID:        generateLogID(),
		Timestamp: time.Now().UnixMilli(),
		Text:      fmt.Sprintf("%s 破坏了墙壁", player.Character.Name),
		Type:      "info",
	})

	return nil
}

// getOppositeDirection 获取相反方向
func getOppositeDirection(dir Direction) Direction {
	switch dir {
	case DirectionNorth:
		return DirectionSouth
	case DirectionSouth:
		return DirectionNorth
	case DirectionEast:
		return DirectionWest
	case DirectionWest:
		return DirectionEast
	}
	return dir
}
