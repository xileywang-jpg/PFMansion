package game

import (
	"fmt"
	"time"
)

// ==================== Phase 3: 目标系统 ====================

// CheckVictory 检查胜利条件
func (g *GameManager) CheckVictory(roomID string) string {
	g.mu.Lock()
	defer g.mu.Unlock()

	room, ok := g.Rooms[roomID]
	if !ok {
		return ""
	}

	state := room.GameState
	if state == nil || state.FullState == nil {
		return ""
	}

	// 只有在作祟阶段才检查胜利条件
	if state.FullState.Phase != GamePhaseHaunt {
		return ""
	}

	scenario := state.FullState.CurrentScenario
	if scenario == nil {
		return ""
	}

	// 先检查基本胜利条件（玩家死亡）
	winner := g.checkBasicVictory(state.FullState)
	if winner != "" {
		return winner
	}

	// 检查目标完成情况
	winner = g.checkObjectiveVictory(state.FullState)
	if winner != "" {
		return winner
	}

	// 检查回合限制
	turnsSinceHaunt := state.FullState.TurnsSinceHaunt
	
	// 叛徒胜利：达成回合限制 且 目标已完成
	if scenario.TraitorObjective != nil && turnsSinceHaunt >= scenario.TraitorObjective.Turns {
		traitorProgress := 0
		if state.FullState.TraitorObjectives != nil {
			traitorProgress = state.FullState.TraitorObjectives[state.FullState.TraitorID]
		}
		// 检查目标是否需要额外进度
		if scenario.TraitorObjective.Type == "REACH" || scenario.TraitorObjective.Type == "COLLECT" {
			if traitorProgress >= 1 {
				state.FullState.GameWinner = "TRAITOR"
				state.FullState.Phase = GamePhaseGameOver
				state.FullState.Logs = append(state.FullState.Logs, LogEntry{
					ID:        generateLogID(),
					Timestamp: time.Now().UnixMilli(),
					Text:      fmt.Sprintf("叛徒在 %d 回合内完成了目标：%s！叛徒胜利！", turnsSinceHaunt, scenario.TraitorObjective.Name),
					Type:      "alert",
				})
				return "TRAITOR"
			}
		} else if scenario.TraitorObjective.Type == "CUSTOM" {
			// CUSTOM 类型直接检查进度是否等于回合数（表示完成）
			if traitorProgress >= scenario.TraitorObjective.Turns {
				state.FullState.GameWinner = "TRAITOR"
				state.FullState.Phase = GamePhaseGameOver
				state.FullState.Logs = append(state.FullState.Logs, LogEntry{
					ID:        generateLogID(),
					Timestamp: time.Now().UnixMilli(),
					Text:      fmt.Sprintf("叛徒完成了 %s！叛徒胜利！", scenario.TraitorObjective.Name),
					Type:      "alert",
				})
				return "TRAITOR"
			}
		} else {
			// 默认叛徒胜利（达成回合限制）
			state.FullState.GameWinner = "TRAITOR"
			state.FullState.Phase = GamePhaseGameOver
			state.FullState.Logs = append(state.FullState.Logs, LogEntry{
				ID:        generateLogID(),
				Timestamp: time.Now().UnixMilli(),
				Text:      fmt.Sprintf("叛徒在 %d 回合内完成了目标！叛徒胜利！", turnsSinceHaunt),
				Type:      "alert",
			})
			return "TRAITOR"
		}
	}

	// 英雄胜利：叛徒未能在回合限制内达成目标
	if scenario.HeroObjective != nil && turnsSinceHaunt >= scenario.HeroObjective.Turns {
		// 检查生存目标
		if scenario.HeroObjective.Type == "SURVIVE" {
			survived := 0
			if state.FullState.HeroObjectives != nil {
				survived = state.FullState.HeroObjectives["survived"]
			}
			if survived >= scenario.HeroObjective.Turns {
				state.FullState.GameWinner = "HERO"
				state.FullState.Phase = GamePhaseGameOver
				state.FullState.Logs = append(state.FullState.Logs, LogEntry{
					ID:        generateLogID(),
					Timestamp: time.Now().UnixMilli(),
					Text:      fmt.Sprintf("英雄们在 %d 回合内成功生存！胜利！", turnsSinceHaunt),
					Type:      "alert",
				})
				return "HERO"
			}
		}
		
		// 默认英雄胜利（叛徒未达成目标）
		state.FullState.GameWinner = "HERO"
		state.FullState.Phase = GamePhaseGameOver
		state.FullState.Logs = append(state.FullState.Logs, LogEntry{
			ID:        generateLogID(),
			Timestamp: time.Now().UnixMilli(),
			Text:      fmt.Sprintf("英雄们在 %d 回合内阻止了叛徒！胜利！", turnsSinceHaunt),
			Type:      "alert",
		})
		return "HERO"
	}

	return ""
}

// checkBasicVictory 检查基本胜利条件（玩家死亡）
func (g *GameManager) checkBasicVictory(state *GameStateFull) string {
	aliveHeroes := 0
	aliveTraitors := 0
	
	for _, player := range state.Players {
		if player.IsDead {
			continue
		}
		if player.Team == "HERO" {
			aliveHeroes++
		} else if player.Team == "TRAITOR" {
			aliveTraitors++
		}
	}

	// 叛徒胜利：所有英雄死亡
	if aliveHeroes == 0 {
		state.GameWinner = "TRAITOR"
		state.Phase = GamePhaseGameOver
		state.Logs = append(state.Logs, LogEntry{
			ID:        generateLogID(),
			Timestamp: time.Now().UnixMilli(),
			Text:      "所有英雄都已陨落。叛徒获得了胜利！",
			Type:      "alert",
		})
		return "TRAITOR"
	}

	// 英雄胜利：叛徒死亡
	if aliveTraitors == 0 {
		state.GameWinner = "HERO"
		state.Phase = GamePhaseGameOver
		state.Logs = append(state.Logs, LogEntry{
			ID:        generateLogID(),
			Timestamp: time.Now().UnixMilli(),
			Text:      "叛徒已被击败！英雄们获得了胜利！",
			Type:      "alert",
		})
		return "HERO"
	}

	return ""
}

// checkObjectiveVictory 检查目标完成情况
func (g *GameManager) checkObjectiveVictory(state *GameStateFull) string {
	scenario := state.CurrentScenario
	if scenario == nil {
		return ""
	}

	// 检查叛徒目标
	if scenario.TraitorObjective != nil {
		traitorProgress := 0
		if state.TraitorObjectives != nil {
			traitorProgress = state.TraitorObjectives[state.TraitorID]
		}

		switch scenario.TraitorObjective.Type {
		case "ELIMINATE":
			// 目标已在 checkBasicVictory 中处理
			if scenario.TraitorObjective.Target == "ALL_HEROES" {
				// 检查所有英雄是否死亡
				aliveHeroes := 0
				for _, player := range state.Players {
					if player.Team == "HERO" && !player.IsDead {
						aliveHeroes++
					}
				}
				if aliveHeroes == 0 {
					state.GameWinner = "TRAITOR"
					state.Phase = GamePhaseGameOver
					state.Logs = append(state.Logs, LogEntry{
						ID:        generateLogID(),
						Timestamp: time.Now().UnixMilli(),
						Text:      "叛徒杀死了所有英雄！叛徒胜利！",
						Type:      "alert",
					})
					return "TRAITOR"
				}
			}

		case "REACH":
			// 叛徒到达目标房间
			if traitorProgress >= 1 {
				state.GameWinner = "TRAITOR"
				state.Phase = GamePhaseGameOver
				state.Logs = append(state.Logs, LogEntry{
					ID:        generateLogID(),
					Timestamp: time.Now().UnixMilli(),
					Text:      fmt.Sprintf("叛徒到达了 %s！目标完成，叛徒胜利！", scenario.TraitorObjective.Target),
					Type:      "alert",
				})
				return "TRAITOR"
			}

		case "COLLECT":
			// 收集指定数量物品
			targetCount := 1
			if scenario.TraitorObjective.Target != "" {
				// 可以从目标字符串解析数量
			}
			if traitorProgress >= targetCount {
				state.GameWinner = "TRAITOR"
				state.Phase = GamePhaseGameOver
				state.Logs = append(state.Logs, LogEntry{
					ID:        generateLogID(),
					Timestamp: time.Now().UnixMilli(),
					Text:      "叛徒收集了所有关键物品！叛徒胜利！",
					Type:      "alert",
				})
				return "TRAITOR"
			}

		case "CUSTOM":
			// 自定义目标，检查进度是否达到回合数
			if traitorProgress >= scenario.TraitorObjective.Turns {
				state.GameWinner = "TRAITOR"
				state.Phase = GamePhaseGameOver
				state.Logs = append(state.Logs, LogEntry{
					ID:        generateLogID(),
					Timestamp: time.Now().UnixMilli(),
					Text:      fmt.Sprintf("叛徒完成了 %s！叛徒胜利！", scenario.TraitorObjective.Name),
					Type:      "alert",
				})
				return "TRAITOR"
			}
		}
	}

	// 检查英雄目标
	if scenario.HeroObjective != nil {
		switch scenario.HeroObjective.Type {
		case "SURVIVE":
			// 生存指定回合数
			survived := 0
			if state.HeroObjectives != nil {
				survived = state.HeroObjectives["survived"]
			}
			if survived >= scenario.HeroObjective.Turns {
				state.GameWinner = "HERO"
				state.Phase = GamePhaseGameOver
				state.Logs = append(state.Logs, LogEntry{
					ID:        generateLogID(),
					Timestamp: time.Now().UnixMilli(),
					Text:      fmt.Sprintf("英雄们成功生存 %d 回合！胜利！", survived),
					Type:      "alert",
				})
				return "HERO"
			}
		}
	}

	return ""
}

// UpdateObjectives 更新目标进度
func (g *GameManager) UpdateObjectives(roomID string, eventType string, data map[string]interface{}) {
	g.mu.Lock()
	defer g.mu.Unlock()

	room, ok := g.Rooms[roomID]
	if !ok {
		return
	}

	state := room.GameState
	if state == nil || state.FullState == nil {
		return
	}

	if state.FullState.CurrentScenario == nil {
		return
	}

	scenario := state.FullState.CurrentScenario

	// 根据事件类型更新目标进度
	switch eventType {
	case "PLAYER_DEATH":
		// 玩家死亡可能影响目标
		if targetPID, ok := data["playerId"].(string); ok {
			player, ok := state.FullState.Players[targetPID]
			if !ok {
				return
			}

			// 叛徒死亡 -> 英雄胜利进度
			if player.Team == "TRAITOR" {
				// 可以添加击杀计数等
				state.FullState.Logs = append(state.FullState.Logs, LogEntry{
					ID:        generateLogID(),
					Timestamp: time.Now().UnixMilli(),
					Text:      fmt.Sprintf("叛徒 %s 已阵亡！距离胜利更近一步！", player.Character.Name),
					Type:      "success",
				})
			}
			// 英雄死亡 -> 叛徒胜利进度
			if player.Team == "HERO" {
				state.FullState.Logs = append(state.FullState.Logs, LogEntry{
					ID:        generateLogID(),
					Timestamp: time.Now().UnixMilli(),
					Text:      fmt.Sprintf("英雄 %s 已阵亡！叛徒目标进度 +1", player.Character.Name),
					Type:      "alert",
				})
			}
		}

	case "TILE_REACHED":
		// 到达特定房间
		if tileID, ok := data["tileId"].(string); ok {
			playerID, _ := data["playerId"].(string)
			
			// 检查叛徒目标
			if scenario.TraitorObjective != nil && scenario.TraitorObjective.Type == "REACH" {
				if scenario.TraitorObjective.Target == tileID && playerID == state.FullState.TraitorID {
					// 叛徒到达目标房间
					if state.FullState.TraitorObjectives == nil {
						state.FullState.TraitorObjectives = make(map[string]int)
					}
					state.FullState.TraitorObjectives[state.FullState.TraitorID]++
					state.FullState.Logs = append(state.FullState.Logs, LogEntry{
						ID:        generateLogID(),
						Timestamp: time.Now().UnixMilli(),
						Text:      "叛徒到达了目标地点！目标进度 +1",
						Type:      "alert",
					})
				}
			}

			// 检查英雄目标 (到达某处阻止叛徒)
			if scenario.HeroObjective != nil && scenario.HeroObjective.Type == "REACH" {
				if scenario.HeroObjective.Target == tileID {
					if state.FullState.HeroObjectives == nil {
						state.FullState.HeroObjectives = make(map[string]int)
					}
					state.FullState.HeroObjectives[playerID]++
					state.FullState.Logs = append(state.FullState.Logs, LogEntry{
						ID:        generateLogID(),
						Timestamp: time.Now().UnixMilli(),
						Text:      "英雄到达了指定位置！",
						Type:      "info",
					})
				}
			}
		}

	case "ITEM_COLLECTED":
		// 收集物品
		if itemID, ok := data["itemId"].(string); ok {
			playerID, _ := data["playerId"].(string)
			
			if scenario.TraitorObjective != nil && scenario.TraitorObjective.Type == "COLLECT" {
				if scenario.TraitorObjective.Target == itemID && playerID == state.FullState.TraitorID {
					if state.FullState.TraitorObjectives == nil {
						state.FullState.TraitorObjectives = make(map[string]int)
					}
					state.FullState.TraitorObjectives[state.FullState.TraitorID]++
					state.FullState.Logs = append(state.FullState.Logs, LogEntry{
						ID:        generateLogID(),
						Timestamp: time.Now().UnixMilli(),
						Text:      "叛徒获得了关键物品！",
						Type:      "alert",
					})
				}
			}
		}

	case "RITUAL_COMPLETED":
		// 仪式完成 (CUSTOM 类型目标)
		if scenario.TraitorObjective != nil && scenario.TraitorObjective.Type == "CUSTOM" {
			if state.FullState.TraitorObjectives == nil {
				state.FullState.TraitorObjectives = make(map[string]int)
			}
			state.FullState.TraitorObjectives[state.FullState.TraitorID] = scenario.TraitorObjective.Turns // 标记完成
			state.FullState.Logs = append(state.FullState.Logs, LogEntry{
				ID:        generateLogID(),
				Timestamp: time.Now().UnixMilli(),
				Text:      "叛徒完成了仪式！",
				Type:      "alert",
			})
		}

	case "TURNS_SURVIVED":
		// 生存回合更新 (SURVIVE 类型)
		if scenario.HeroObjective != nil && scenario.HeroObjective.Type == "SURVIVE" {
			turnsSurvived, _ := data["turns"].(int)
			if state.FullState.HeroObjectives == nil {
				state.FullState.HeroObjectives = make(map[string]int)
			}
			state.FullState.HeroObjectives["survived"] = turnsSurvived
			
			remaining := scenario.HeroObjective.Turns - turnsSurvived
			if remaining > 0 && remaining <= 3 {
				state.FullState.Logs = append(state.FullState.Logs, LogEntry{
					ID:        generateLogID(),
					Timestamp: time.Now().UnixMilli(),
					Text:      fmt.Sprintf("英雄们已生存 %d/%d 回合！坚持住！", turnsSurvived, scenario.HeroObjective.Turns),
					Type:      "info",
				})
			}
		}

	case "OMEN_USED":
		// 使用预兆 (某些目标需要)
		if scenario.TraitorObjective != nil && scenario.TraitorObjective.Type == "USE_OMEN" {
			omenCount, _ := data["omenCount"].(int)
			if state.FullState.TraitorObjectives == nil {
				state.FullState.TraitorObjectives = make(map[string]int)
			}
			state.FullState.TraitorObjectives[state.FullState.TraitorID] = omenCount
		}

	case "ROOM_EXPLORED":
		// 探索房间数量 (某些目标需要探索)
		if scenario.TraitorObjective != nil && scenario.TraitorObjective.Type == "EXPLORE" {
			exploredCount, _ := data["count"].(int)
			if state.FullState.TraitorObjectives == nil {
				state.FullState.TraitorObjectives = make(map[string]int)
			}
			state.FullState.TraitorObjectives[state.FullState.TraitorID] = exploredCount
		}
	}
}

// InitializeObjectives 初始化目标
func (g *GameManager) InitializeObjectives(roomID string) {
	g.mu.Lock()
	defer g.mu.Unlock()

	room, ok := g.Rooms[roomID]
	if !ok {
		return
	}

	state := room.GameState
	if state == nil || state.FullState == nil {
		return
	}

	// 初始化回合计数
	state.FullState.TurnsSinceHaunt = 0

	// 初始化目标进度
	state.FullState.HeroObjectives = make(map[string]int)
	state.FullState.TraitorObjectives = make(map[string]int)

	// 记录目标
	if scenario := state.FullState.CurrentScenario; scenario != nil {
		if scenario.HeroObjective != nil {
			state.FullState.Logs = append(state.FullState.Logs, LogEntry{
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
			state.FullState.Logs = append(state.FullState.Logs, LogEntry{
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

// IncrementHauntTurns 增加作祟回合数
func (g *GameManager) IncrementHauntTurns(roomID string) {
	g.mu.Lock()
	defer g.mu.Unlock()

	room, ok := g.Rooms[roomID]
	if !ok {
		return
	}

	state := room.GameState
	if state == nil || state.FullState == nil {
		return
	}

	if state.FullState.IsHauntActive {
		state.FullState.TurnsSinceHaunt++
		
		// 回合开始时检查胜利条件
		winner := g.checkVictoryInternal(state.FullState)
		if winner != "" {
			return
		}

		// 显示剩余回合提示
		if scenario := state.FullState.CurrentScenario; scenario != nil {
			var remaining int
			if scenario.TraitorObjective != nil {
				remaining = scenario.TraitorObjective.Turns - state.FullState.TurnsSinceHaunt
				if remaining > 0 {
					state.FullState.Logs = append(state.FullState.Logs, LogEntry{
						ID:        generateLogID(),
						Timestamp: time.Now().UnixMilli(),
						Text:      fmt.Sprintf("作祟第 %d 回合。叛徒目标剩余 %d 回合。", 
							state.FullState.TurnsSinceHaunt, remaining),
						Type:      "info",
					})
				}
			}
		}
	}
}

// checkVictoryInternal 内部胜利检查（需要持有锁）
func (g *GameManager) checkVictoryInternal(state *GameStateFull) string {
	if state.CurrentScenario == nil {
		return ""
	}

	// 检查玩家死亡
	aliveHeroes := 0
	aliveTraitors := 0

	for _, player := range state.Players {
		if player.IsDead {
			continue
		}
		if player.Team == "HERO" {
			aliveHeroes++
		} else if player.Team == "TRAITOR" {
			aliveTraitors++
		}
	}

	// 叛徒胜利：所有英雄死亡
	if aliveHeroes == 0 {
		state.GameWinner = "TRAITOR"
		state.Phase = GamePhaseGameOver
		state.Logs = append(state.Logs, LogEntry{
			ID:        generateLogID(),
			Timestamp: time.Now().UnixMilli(),
			Text:      "所有英雄都已陨落。叛徒获得了胜利！",
			Type:      "alert",
		})
		return "TRAITOR"
	}

	// 英雄胜利：叛徒死亡
	if aliveTraitors == 0 {
		state.GameWinner = "HERO"
		state.Phase = GamePhaseGameOver
		state.Logs = append(state.Logs, LogEntry{
			ID:        generateLogID(),
			Timestamp: time.Now().UnixMilli(),
			Text:      "叛徒已被击败！英雄们获得了胜利！",
			Type:      "alert",
		})
		return "HERO"
	}

	// 回合限制胜利判定
	turnsSinceHaunt := state.TurnsSinceHaunt
	scenario := state.CurrentScenario

	if scenario.TraitorObjective != nil && turnsSinceHaunt >= scenario.TraitorObjective.Turns {
		state.GameWinner = "TRAITOR"
		state.Phase = GamePhaseGameOver
		state.Logs = append(state.Logs, LogEntry{
			ID:        generateLogID(),
			Timestamp: time.Now().UnixMilli(),
			Text:      fmt.Sprintf("叛徒在 %d 回合内完成了目标！叛徒胜利！", turnsSinceHaunt),
			Type:      "alert",
		})
		return "TRAITOR"
	}

	if scenario.HeroObjective != nil && turnsSinceHaunt >= scenario.HeroObjective.Turns {
		state.GameWinner = "HERO"
		state.Phase = GamePhaseGameOver
		state.Logs = append(state.Logs, LogEntry{
			ID:        generateLogID(),
			Timestamp: time.Now().UnixMilli(),
			Text:      fmt.Sprintf("英雄们在 %d 回合内阻止了叛徒！胜利！", turnsSinceHaunt),
			Type:      "alert",
		})
		return "HERO"
	}

	return ""
}
