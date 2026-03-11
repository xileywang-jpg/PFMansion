package game

import (
	"errors"
	"fmt"
	"math/rand"
	"time"
)

// ==================== 游戏核心逻辑 ====================

// RollDice 投骰子 (服务器端统一生成)
func (g *GameManager) RollDice(numDice int) []int {
	results := make([]int, numDice)
	for i := 0; i < numDice; i++ {
		results[i] = rand.Intn(6) + 1
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

// NextTurn 回合切换
func (g *GameManager) NextTurn(roomID string) error {
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

	// 找到当前玩家索引
	currentIndex := -1
	for i, pid := range state.FullState.PlayerIDs {
		if pid == state.FullState.ActivePlayerID {
			currentIndex = i
			break
		}
	}

	if currentIndex == -1 {
		return errors.New("当前玩家不存在")
	}

	// 切换到下一个活着的玩家
	players := state.FullState.PlayerIDs
	attempts := 0
	for attempts < len(players) {
		currentIndex = (currentIndex + 1) % len(players)
		nextPlayerID := players[currentIndex]
		
		if player, ok := state.FullState.Players[nextPlayerID]; ok && !player.IsDead {
			state.FullState.ActivePlayerID = nextPlayerID
			state.FullState.TurnIndex++
			state.FullState.TurnPhase = "MOVING"
			state.FullState.MovesRemaining = g.getEffectiveSpeed(nextPlayerID, state.FullState)
			
			// 添加日志
			state.FullState.Logs = append(state.FullState.Logs, LogEntry{
				ID:        generateLogID(),
				Timestamp: time.Now().UnixMilli(),
				Text:      fmt.Sprintf("第 %d 回合：%s 开始行动", state.FullState.TurnIndex, player.Character.Name),
				Type:      "info",
			})
			return nil
		}
		attempts++
	}

	// 所有玩家都死了
	state.FullState.Phase = GamePhaseGameOver
	state.FullState.Logs = append(state.FullState.Logs, LogEntry{
		ID:        generateLogID(),
		Timestamp: time.Now().UnixMilli(),
		Text:      "大厦赢了。所有人都在黑暗中陨落了...",
		Type:      "alert",
	})

	return nil
}

func (g *GameManager) getEffectiveSpeed(playerID string, state *GameStateFull) int {
	player, ok := state.Players[playerID]
	if !ok {
		return 3
	}
	
	speedAttr, ok := player.Character.Attributes["speed"]
	if !ok {
		return 3
	}
	
	return speedAttr.Current
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
			// 检查房间类型触发事件
			if tileDef := getTileDef(existingTile.DefID); tileDef != nil {
				if tileDef.CardSymbol != "" {
					state.FullState.OmenCount++
					state.FullState.Logs = append(state.FullState.Logs, LogEntry{
						ID:        generateLogID(),
						Timestamp: time.Now().UnixMilli(),
						Text:      fmt.Sprintf("发现了 %s！大厦变得更加躁动不安...", tileDef.CardSymbol),
						Type:      "alert",
					})
					
					// 检查是否触发作祟
					if state.FullState.OmenCount >= 6 && !state.FullState.IsHauntActive {
						state.FullState.Phase = GamePhaseHauntRoll
					}
				}
			}
		}
	} else {
		// 需要放置新房间
		return errors.New("需要放置新房间")
	}

	return nil
}

// PlaceTile 放置新房间
func (g *GameManager) PlaceTile(roomID, playerID, direction string) error {
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
	edge, ok := currentTile.Edges[dir]
	if !ok || edge == "WALL" {
		return errors.New("该方向不能放置房间")
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

	// 创建房间实例
	newTile := &TileInstance{
		InstanceID:       generateTileID(),
		DefID:            tileDef.ID,
		X:                newX,
		Y:                newY,
		Rotation:         0,
		Edges:            tileDef.Edges,
		HasEventTriggered: false,
		Visibility:       "VISIBLE",
		DroppedItems:     []string{},
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

	// 检查房间事件
	if tileDef.CardSymbol != "" {
		state.FullState.OmenCount++
		state.FullState.Logs = append(state.FullState.Logs, LogEntry{
			ID:        generateLogID(),
			Timestamp: time.Now().UnixMilli(),
			Text:      fmt.Sprintf("发现了 %s！大厦变得更加躁动不安...", tileDef.CardSymbol),
			Type:      "alert",
		})
		
		state.FullState.LastTriggeredTile = tileDef.ID

		// 检查是否触发作祟
		if state.FullState.OmenCount >= 6 && !state.FullState.IsHauntActive {
			state.FullState.Phase = GamePhaseHauntRoll
		}
	}

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

func (g *GameManager) nextTurnInternal(room *Room) error {
	state := room.GameState
	if state == nil || state.FullState == nil {
		return errors.New("游戏未开始")
	}

	// 如果在作祟阶段，需要处理作祟检定
	if state.FullState.Phase == GamePhaseHauntRoll {
		return g.processHauntRoll(room)
	}

	// 找到当前玩家索引
	currentIndex := -1
	for i, pid := range state.FullState.PlayerIDs {
		if pid == state.FullState.ActivePlayerID {
			currentIndex = i
			break
		}
	}

	if currentIndex == -1 {
		return errors.New("当前玩家不存在")
	}

	// 切换到下一个活着的玩家
	players := state.FullState.PlayerIDs
	attempts := 0
	for attempts < len(players) {
		currentIndex = (currentIndex + 1) % len(players)
		nextPlayerID := players[currentIndex]
		
		if player, ok := state.FullState.Players[nextPlayerID]; ok && !player.IsDead {
			state.FullState.ActivePlayerID = nextPlayerID
			state.FullState.TurnIndex++
			state.FullState.TurnPhase = "MOVING"
			state.FullState.MovesRemaining = g.getEffectiveSpeed(nextPlayerID, state.FullState)
			
			// 添加日志
			state.FullState.Logs = append(state.FullState.Logs, LogEntry{
				ID:        generateLogID(),
				Timestamp: time.Now().UnixMilli(),
				Text:      fmt.Sprintf("第 %d 回合：%s 开始行动", state.FullState.TurnIndex, player.Character.Name),
				Type:      "info",
			})
			return nil
		}
		attempts++
	}

	// 所有玩家都死了
	state.FullState.Phase = GamePhaseGameOver
	state.FullState.Logs = append(state.FullState.Logs, LogEntry{
		ID:        generateLogID(),
		Timestamp: time.Now().UnixMilli(),
		Text:      "大厦赢了。所有人都在黑暗中陨落了...",
		Type:      "alert",
	})

	return nil
}

// ProcessHauntRoll 处理作祟检定
func (g *GameManager) processHauntRoll(room *Room) error {
	state := room.GameState
	if state == nil || state.FullState == nil {
		return errors.New("游戏未开始")
	}

	// 6 骰子检定
	results := g.RollDice(6)
	sum := 0
	for _, v := range results {
		sum += v
	}

	state.FullState.Logs = append(state.FullState.Logs, LogEntry{
		ID:        generateLogID(),
		Timestamp: time.Now().UnixMilli(),
		Text:      fmt.Sprintf("作祟检定: %v = %d vs %d", results, sum, state.FullState.OmenCount),
		Type:      "alert",
	})

	if sum < state.FullState.OmenCount {
		// 作祟爆发
		state.FullState.Phase = GamePhaseHauntReveal
		return g.triggerHaunt(room)
	} else {
		// 暂时安全
		state.FullState.Phase = GamePhaseExploration
		state.FullState.Logs = append(state.FullState.Logs, LogEntry{
			ID:        generateLogID(),
			Timestamp: time.Now().UnixMilli(),
			Text:      "作祟检定通过，大厦暂时安静下来...",
			Type:      "info",
		})
		// 切换回合
		return g.nextTurnInternal(room)
	}
}

// TriggerHaunt 触发作祟
func (g *GameManager) triggerHaunt(room *Room) error {
	state := room.GameState
	if state == nil || state.FullState == nil {
		return errors.New("游戏未开始")
	}

	// 确定剧本
	tileID := state.FullState.LastTriggeredTile
	scenarioID := HauntMatrix[tileID]
	if scenarioID == "" {
		scenarioID = HauntMatrix["default"]
	}

	scenario := Scenarios[scenarioID]
	state.FullState.CurrentScenario = &scenario
	state.FullState.IsHauntActive = true

	// 确定叛徒
	traitorID := g.determineTraitor(scenario, state.FullState)

	// 更新玩家阵营
	for pid, player := range state.FullState.Players {
		if pid == traitorID {
			player.Team = "TRAITOR"
			// 叛徒回复所有属性
			for attrKey, attrVal := range player.Character.Attributes {
				player.Character.Attributes[attrKey] = Attribute{
					Current: attrVal.Max,
					Base:    attrVal.Base,
					Floor:   attrVal.Floor,
					Max:     attrVal.Max,
				}
			}
		} else {
			player.Team = "HERO"
		}
	}

	state.FullState.TraitorID = traitorID

	state.FullState.Logs = append(state.FullState.Logs, LogEntry{
		ID:        generateLogID(),
		Timestamp: time.Now().UnixMilli(),
		Text:      fmt.Sprintf("剧本已揭晓：%s", scenario.Name),
		Type:      "alert",
	})
	state.FullState.Logs = append(state.FullState.Logs, LogEntry{
		ID:        generateLogID(),
		Timestamp: time.Now().UnixMilli(),
		Text:      scenario.IntroText,
		Type:      "narrative",
	})

	traitor := state.FullState.Players[traitorID]
	state.FullState.Logs = append(state.FullState.Logs, LogEntry{
		ID:        generateLogID(),
		Timestamp: time.Now().UnixMilli(),
		Text:      fmt.Sprintf("叛徒已经产生：%s。英雄们，团结起来！", traitor.Character.Name),
		Type:      "alert",
	})

	// 进入作祟阶段
	state.FullState.Phase = GamePhaseHaunt

	return nil
}

// DetermineTraitor 确定叛徒
func (g *GameManager) determineTraitor(scenario Scenario, state *GameStateFull) string {
	switch scenario.TraitorRule {
	case "HIGHEST_MIGHT":
		// 力量最高者
		maxMight := -1
		traitorID := ""
		for pid, player := range state.Players {
			if player.IsDead {
				continue
			}
			might := player.Character.Attributes["might"].Current
			if might > maxMight {
				maxMight = might
				traitorID = pid
			}
		}
		return traitorID
	case "LOWEST_SANITY":
		// 理智最低者
		minSanity := 100
		traitorID := ""
		for pid, player := range state.Players {
			if player.IsDead {
				continue
			}
			sanity := player.Character.Attributes["sanity"].Current
			if sanity < minSanity {
				minSanity = sanity
				traitorID = pid
			}
		}
		return traitorID
	default:
		// 触发者
		return state.ActivePlayerID
	}
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

	// 记录日志
	state.FullState.Logs = append(state.FullState.Logs, LogEntry{
		ID:        generateLogID(),
		Timestamp: time.Now().UnixMilli(),
		Text:      fmt.Sprintf("%s 的 %s %s%d (当前: %d)", player.Character.Name, attribute, formatSign(amount), amount, attr.Current),
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

// GetTileDef 获取房间定义
func getTileDef(tileID string) *TileDef {
	for i := range TileDeck {
		if TileDeck[i].ID == tileID {
			return &TileDeck[i]
		}
	}
	return nil
}

// GenerateID 生成ID
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
