package game

import (
	"errors"
	"fmt"
	"math/rand"
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

	state.FullState.LastRollResult = &result
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

	// 2. 检查 CardSymbol - 根据类型触发不同的抽牌效果
	if tileDef.CardSymbol != "" && tileDef.CardSymbol != "NONE" {
		switch tileDef.CardSymbol {
		case "OMEN":
			// OMEN 卡会增加作祟计数
			state.FullState.OmenCount++
			g.addLog(roomID, fmt.Sprintf("发现了预兆！大厦变得更加躁动不安... (预兆数: %d)", state.FullState.OmenCount), "alert")
			// 检查是否触发作祟
			if state.FullState.OmenCount >= 6 && !state.FullState.IsHauntActive {
				state.FullState.Phase = GamePhaseHauntRoll
				g.addLog(roomID, "厄运积累到极限！作祟即将爆发！", "alert")
			}
		case "ITEM":
			// 物品卡 - 将物品添加到地面的掉落物品列表
			g.addLog(roomID, "发现了物品！", "info")
			// 获取物品定义并添加到地面
			item := GetItem(tileDef.ID)
			if item != nil {
				// 将物品添加到当前地块的掉落物品列表
				tile, ok := state.FullState.Map[fmt.Sprintf("%d,%d", player.Position.X, player.Position.Y)]
				if ok {
					tile.DroppedItems = append(tile.DroppedItems, *item)
					// 将物品设置为激活的卡（前端会显示拾取按钮）
					state.FullState.ActiveCard = item
				}
			}
		case "EVENT":
			// 事件卡不增加作祟计数，只记录日志
			g.addLog(roomID, "触发了事件！", "info")
		}
		// 注意：实际的抽卡由前端在放置房间后调用 drawCard 来处理
		// 后端只在玩家确认捡起物品时应用效果
	}

	// 3. 执行房间被动效果 (通用化)
	for _, effect := range tileDef.OnEnterEffects {
		// 应用效果
		g.applyEffect(roomID, playerID, effect)
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

	// 验证是否是当前玩家
	if state.FullState.ActivePlayerID != playerID {
		return errors.New("还没轮到你")
	}

	// 验证回合阶段
	if state.FullState.TurnPhase != "MOVING" {
		return errors.New("当前不能移动")
	}

	// 验证体力
	if state.FullState.MovesRemaining <= 0 {
		return errors.New("体力已耗尽")
	}

	player, ok := state.FullState.Players[playerID]
	if !ok {
		return errors.New("玩家不存在")
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
		// 移动到已有房间
		player.Position.X = newX
		player.Position.Y = newY
		state.FullState.MovesRemaining--

		// 添加日志
		state.FullState.Logs = append(state.FullState.Logs, LogEntry{
			ID:        generateLogID(),
			Timestamp: time.Now().UnixMilli(),
			Text:      fmt.Sprintf("%s 进入了 %s", player.Character.Name, existingTile.DefID),
			Type:      "info",
		})

		// 检查是否有事件触发
		if !existingTile.HasEventTriggered && existingTile.DefID != "start_tile" {
			existingTile.HasEventTriggered = true
			// 触发房间事件（包含 EventTrigger 和 CardSymbol）
			g.TriggerRoomEvent(roomID, playerID, existingTile.DefID)
		}
	} else {
		// 需要放置新房间
		return errors.New("需要放置新房间")
	}

	return nil
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

	// 验证是否是当前玩家
	if state.FullState.ActivePlayerID != playerID {
		return errors.New("还没轮到你")
	}

	// 验证体力
	if state.FullState.MovesRemaining <= 0 {
		return errors.New("体力已耗尽")
	}

	// 检查牌堆
	if len(state.FullState.TileDeck) == 0 {
		return errors.New("房间牌堆已空")
	}

	player, ok := state.FullState.Players[playerID]
	if !ok {
		return errors.New("玩家不存在")
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

	// 抽取房间
	tileDef := state.FullState.TileDeck[0]
	state.FullState.TileDeck = state.FullState.TileDeck[1:]

	// 应用旋转后的边缘
	rotatedEdges := rotateEdges(tileDef.Edges, rotation)

	// 对面方向的边缘必须也是 OPEN 才能放置（两面都对上才是门）
	oppositeDir := getOppositeDirection(dir)
	if rotatedEdges[oppositeDir] != "OPEN" {
		return errors.New("该方向无法放置：房间边缘不相通")
	}

	// 创建房间实例
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

	// 放置房间并移动玩家
	state.FullState.Map[targetKey] = newTile
	player.Position.X = newX
	player.Position.Y = newY
	state.FullState.MovesRemaining--

	// 添加日志
	state.FullState.Logs = append(state.FullState.Logs, LogEntry{
		ID:        generateLogID(),
		Timestamp: time.Now().UnixMilli(),
		Text:      fmt.Sprintf("%s 探索发现了 %s", player.Character.Name, tileDef.Name),
		Type:      "success",
	})

	// 触发房间事件（包含 EventTrigger 和 CardSymbol）
	newTile.HasEventTriggered = true
	g.TriggerRoomEvent(roomID, playerID, tileDef.ID)

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

	player, ok := state.FullState.Players[playerID]
	if !ok {
		return errors.New("玩家不存在")
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

	fromPlayer, ok := state.FullState.Players[fromPlayerID]
	if !ok {
		return errors.New("发送者不存在")
	}

	toPlayer, ok := state.FullState.Players[toPlayerID]
	if !ok {
		return errors.New("接收者不存在")
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
	fromPlayer.Items = append(fromPlayer.Items[:foundIdx], fromPlayer.Items[foundIdx+1:]...)
	toPlayer.Items = append(toPlayer.Items, item)

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

	player, ok := state.FullState.Players[playerID]
	if !ok {
		return errors.New("玩家不存在")
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

	// 验证是否是当前玩家
	if state.FullState.ActivePlayerID != playerID {
		return errors.New("还没轮到你")
	}

	player, ok := state.FullState.Players[playerID]
	if !ok {
		return errors.New("玩家不存在")
	}

	if player.IsDead {
		return errors.New("已死亡的玩家无法行动")
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
			Text:       fmt.Sprintf("%s 强行破坏墙壁，力量 -1", player.Character.Name),
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
