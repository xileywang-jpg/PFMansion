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
	rand.Seed(time.Now().UnixNano())
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
	
	// 简单计算：基础速度 + buff
	speed := speedAttr.Current
	
	// 检查 buffs (简化版)
	for _, buff := range player.Buffs {
		if buff == "速度+" || buff == "speed+" {
			speed++
		}
	}
	
	return speed
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

		// 检查是否有事件
		if !existingTile.HasEventTriggered {
			// 触发事件（暂时跳过，留给后续）
			existingTile.HasEventTriggered = true
		}
	} else {
		// 需要放置新房间（暂不实现，留给前端处理）
		return errors.New("需要放置新房间")
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
		Text:      fmt.Sprintf("%s 的 %s %s%d (当前: %d)", player.Character.Name, attribute, formatSign(amount), attr.Current),
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
