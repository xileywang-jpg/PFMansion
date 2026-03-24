package game

import (
	"errors"
	"fmt"
	"time"
)

// ==================== 游戏核心逻辑 ====================

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

// getEffectiveSpeed 获取有效速度
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

// nextTurnInternal 内部回合切换
func (g *GameManager) nextTurnInternal(room *Room) error {
	state := room.GameState
	if state == nil || state.FullState == nil {
		return errors.New("游戏未开始")
	}

	// 如果在作祟阶段，需要处理作祟检定
	if state.FullState.Phase == GamePhaseHauntRoll {
		return g.processHauntRoll(room)
	}

	// Phase 3: 检查胜利条件（在切换玩家前）
	if state.FullState.Phase == GamePhaseHaunt {
		winner := g.checkVictoryInternal(state.FullState)
		if winner != "" {
			return nil // 游戏已结束
		}
	}

	// ===== 回合结束处理：当前玩家状态效果 =====
	currentPlayer := state.FullState.Players[state.FullState.ActivePlayerID]
	if currentPlayer != nil && len(currentPlayer.StatusEffects) > 0 {
		removedEffects := g.ProcessStatusEffectsOnTurnEnd(currentPlayer)
		if len(removedEffects) > 0 {
			state.FullState.Logs = append(state.FullState.Logs, LogEntry{
				ID:        generateLogID(),
				Timestamp: time.Now().UnixMilli(),
				Text:      fmt.Sprintf("%s 的状态效果结束: %v", currentPlayer.Character.Name, removedEffects),
				Type:      "info",
			})
		}
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
			
			// 清除待处理动作（跨玩家状态）
			state.FullState.PendingAction = nil

			// ===== Phase 3: 作祟回合计数 =====
			// 当叛徒开始其回合时，表示新一轮作祟回合开始
			if state.FullState.IsHauntActive && nextPlayerID == state.FullState.TraitorID {
				g.IncrementHauntTurns(room.ID)
			}

			// ===== 回合开始处理：下一玩家状态效果 =====
			if len(player.StatusEffects) > 0 {
				removedEffects := g.ProcessStatusEffectsOnTurnStart(player)
				if len(removedEffects) > 0 {
					state.FullState.Logs = append(state.FullState.Logs, LogEntry{
						ID:        generateLogID(),
						Timestamp: time.Now().UnixMilli(),
						Text:      fmt.Sprintf("%s 的状态效果结束: %v", player.Character.Name, removedEffects),
						Type:      "info",
					})
				}
				
				// 检查石化状态 - 无法行动
				for _, effect := range player.StatusEffects {
					if effect.Type == "PETRIFIED" {
						state.FullState.Logs = append(state.FullState.Logs, LogEntry{
							ID:        generateLogID(),
							Timestamp: time.Now().UnixMilli(),
							Text:      fmt.Sprintf("%s 处于石化状态，无法行动！", player.Character.Name),
							Type:      "alert",
						})
						// 石化状态：跳过该玩家，继续找下一个
						continue
					}
				}
			}

			// Phase 3: 作祟阶段增加回合计数
			if state.FullState.IsHauntActive {
				state.FullState.TurnsSinceHaunt++
				
				// 回合开始时显示剩余回合
				if scenario := state.FullState.CurrentScenario; scenario != nil && scenario.TraitorObjective != nil {
					remaining := scenario.TraitorObjective.Turns - state.FullState.TurnsSinceHaunt
					if remaining > 0 && remaining <= 3 {
						state.FullState.Logs = append(state.FullState.Logs, LogEntry{
							ID:        generateLogID(),
							Timestamp: time.Now().UnixMilli(),
							Text:      fmt.Sprintf("⚠️ 叛徒目标剩余 %d 回合！", remaining),
							Type:      "alert",
						})
					}
				}
				
				// 检查胜利条件
				winner := g.checkVictoryInternal(state.FullState)
				if winner != "" {
					return nil
				}
			}

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

// processHauntRoll 处理作祟检定
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

// triggerHaunt 触发作祟
func (g *GameManager) triggerHaunt(room *Room) error {
	state := room.GameState
	if state == nil || state.FullState == nil {
		return errors.New("游戏未开始")
	}

	// 获取主题
	theme := room.Theme
	if theme == "" {
		theme = "original"
	}
	
	// 根据主题获取剧本矩阵
	themeHauntMatrix := GetHauntMatrix(theme)

	// 确定剧本
	tileID := state.FullState.LastTriggeredTile
	scenarioID := themeHauntMatrix[tileID]
	if scenarioID == "" {
		scenarioID = themeHauntMatrix["default"]
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
	
	// Phase 3: 初始化目标系统
	state.FullState.TraitorID = traitorID
	state.FullState.TurnsSinceHaunt = 0
	state.FullState.GameWinner = ""
	g.initializeObjectivesInternal(state.FullState)

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

// determineTraitor 确定叛徒
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

// initializeObjectivesInternal 内部初始化目标（需要持有锁）
func (g *GameManager) initializeObjectivesInternal(state *GameStateFull) {
	// 初始化目标进度
	state.HeroObjectives = make(map[string]*PlayerObjective)
	state.TraitorObjectives = make(map[string]*PlayerObjective)

	// 记录目标
	if scenario := state.CurrentScenario; scenario != nil {
		if scenario.HeroObjective != nil {
			state.Logs = append(state.Logs, LogEntry{
				ID:        generateLogID(),
				Timestamp: time.Now().UnixMilli(),
				Text:      fmt.Sprintf("【英雄目标】%s: %s (%d回合内)", 
					scenario.HeroObjective.Name, 
					scenario.HeroObjective.Description,
					scenario.HeroObjective.Turns),
				Type:      "info",
			})
		}

		if scenario.TraitorObjective != nil {
			state.Logs = append(state.Logs, LogEntry{
				ID:        generateLogID(),
				Timestamp: time.Now().UnixMilli(),
				Text:      fmt.Sprintf("【叛徒目标】%s: %s (%d回合内)", 
					scenario.TraitorObjective.Name,
					scenario.TraitorObjective.Description,
					scenario.TraitorObjective.Turns),
				Type:      "alert",
			})
		}
	}
}

// ==================== 状态效果处理 ====================

// ProcessStatusEffectsOnTurnEnd 回合结束时处理状态效果
// 返回被移除的效果列表
func (g *GameManager) ProcessStatusEffectsOnTurnEnd(player *GamePlayer) []string {
	if player == nil || len(player.StatusEffects) == 0 {
		return nil
	}

	var removed []string
	var remaining []StatusEffect

	for _, effect := range player.StatusEffects {
		// duration 为 -1 表示永久效果，不递减
		if effect.Duration > 0 {
			effect.Duration--
		}

		// 燃烧效果每回合结束造成伤害
		if effect.Type == "BURNING" && effect.Damage > 0 {
			if attr, ok := player.Character.Attributes["might"]; ok {
				attr.Current -= effect.Damage
				if attr.Current < attr.Floor {
					attr.Current = attr.Floor
				}
			}
		}

		if effect.Duration == 0 {
			removed = append(removed, effect.Type)
		} else {
			remaining = append(remaining, effect)
		}
	}

	player.StatusEffects = remaining
	return removed
}

// ProcessStatusEffectsOnTurnStart 回合开始时处理状态效果
// 返回被移除的效果列表
func (g *GameManager) ProcessStatusEffectsOnTurnStart(player *GamePlayer) []string {
	if player == nil || len(player.StatusEffects) == 0 {
		return nil
	}

	var removed []string
	var remaining []StatusEffect

	for _, effect := range player.StatusEffects {
		// duration 为 -1 表示永久效果，不递减
		if effect.Duration > 0 {
			effect.Duration--
		}

		if effect.Duration == 0 {
			removed = append(removed, effect.Type)
		} else {
			remaining = append(remaining, effect)
		}
	}

	player.StatusEffects = remaining
	return removed
}

// ApplyStatusEffect 应用状态效果到玩家
func (g *GameManager) ApplyStatusEffect(roomID, playerID string, effect StatusEffect) error {
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

	player.StatusEffects = append(player.StatusEffects, effect)
	return nil
}
