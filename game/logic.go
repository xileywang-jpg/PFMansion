package game

import (
	"errors"
	"fmt"
	"time"
)

// ==================== 游戏核心逻辑 ====================

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
			g.clearLastRollResultUnlocked(state.FullState)

			// ===== Phase 3: 作祟回合计数 =====
			// 当叛徒开始其回合时，表示新一轮作祟回合开始
			if state.FullState.IsHauntActive && nextPlayerID == state.FullState.TraitorID {
				if winner := g.incrementHauntTurnsUnlocked(state.FullState); winner != "" {
					return nil
				}
			}

			// ===== 回合开始处理：下一玩家状态效果 =====
			// 处理回合开始时的状态效果
			removedEffects := g.ProcessStatusEffectsOnTurnStart(player)
			if len(removedEffects) > 0 {
				state.FullState.Logs = append(state.FullState.Logs, LogEntry{
					ID:        generateLogID(),
					Timestamp: time.Now().UnixMilli(),
					Text:      fmt.Sprintf("%s 的状态效果结束: %v", player.Character.Name, removedEffects),
					Type:      "info",
				})
			}

			// 检查石化状态 - 无法行动，跳过该玩家
			isPetrified := false
			for _, effect := range player.StatusEffects {
				if effect.Type == "PETRIFIED" {
					isPetrified = true
					break
				}
			}
			if isPetrified {
				state.FullState.Logs = append(state.FullState.Logs, LogEntry{
					ID:        generateLogID(),
					Timestamp: time.Now().UnixMilli(),
					Text:      fmt.Sprintf("%s 处于石化状态，无法行动！", player.Character.Name),
					Type:      "alert",
				})
				attempts++
				continue // 跳过这个玩家，继续找下一个
			}

			// Phase 3: 作祟阶段检查即时胜利
			if state.FullState.IsHauntActive {
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

func (g *GameManager) resolveHauntRollUnlocked(room *Room, results []int) (map[string]interface{}, error) {
	state := room.GameState
	if state == nil || state.FullState == nil {
		return nil, errors.New("游戏未开始")
	}
	if state.FullState.Phase != GamePhaseHauntRoll {
		return nil, errors.New("当前不是作祟检定阶段")
	}
	if len(results) == 0 {
		results = g.RollDice(6)
	}

	omenCount := state.FullState.OmenCount
	g.clearLastRollResultUnlocked(state.FullState)
	sum := 0
	for _, v := range results {
		sum += v
	}

	// Bug Fix: 设置 LastRollResult 以便前端同步显示
	g.setLastRollResultUnlocked(state.FullState, sum)

	state.FullState.Logs = append(state.FullState.Logs, LogEntry{
		ID:        generateLogID(),
		Timestamp: time.Now().UnixMilli(),
		Text:      fmt.Sprintf("作祟检定: %v = %d vs %d", results, sum, omenCount),
		Type:      "alert",
	})

	actionResult := map[string]interface{}{
		"checkType":      string(PendingActionTypeHauntRoll),
		"difficulty":     omenCount,
		"result":         sum,
		"success":        sum >= omenCount,
		"hauntTriggered": sum < omenCount,
	}

	if sum < omenCount {
		// 作祟爆发
		state.FullState.Phase = GamePhaseHauntReveal
		if err := g.triggerHaunt(room); err != nil {
			return nil, err
		}
		return actionResult, nil
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
		if err := g.nextTurnInternal(room); err != nil {
			return nil, err
		}
		g.setLastRollResultUnlocked(state.FullState, sum)
		return actionResult, nil
	}
}

// processHauntRoll 处理作祟检定
func (g *GameManager) processHauntRoll(room *Room) error {
	_, err := g.resolveHauntRollUnlocked(room, g.RollDice(6))
	return err
}

// triggerHaunt 触发作祟（内部使用，不处理预兆卡）
func (g *GameManager) triggerHaunt(room *Room) error {
	return g.triggerHauntWithOmen(room, nil)
}

// triggerHauntRoom 触发作祟（由预兆揭示触发，包含预兆卡）
func (g *GameManager) triggerHauntRoom(room *Room, omenCard *Card) error {
	return g.triggerHauntWithOmen(room, omenCard)
}

// triggerHauntWithOmen 触发作祟（通用版本）
// omenCard: 如果不为 nil，表示由预兆揭示触发，叛徒将获得该预兆卡
func (g *GameManager) triggerHauntWithOmen(room *Room, omenCard *Card) error {
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
	themeHauntMatrix := GetHauntMatrixByTheme(theme)
	if len(themeHauntMatrix) == 0 {
		return errors.New("作祟剧本矩阵不可用")
	}

	// 确定剧本（优先使用预兆卡ID，否则使用触发房间）
	var scenarioID string
	if omenCard != nil {
		// 使用预兆卡ID确定剧本（如果矩阵中有对应条目）
		scenarioID = themeHauntMatrix[omenCard.ID]
	}
	if scenarioID == "" {
		// 回退到使用触发房间的 tile ID
		tileID := state.FullState.LastTriggeredTile
		scenarioID = themeHauntMatrix[tileID]
		if scenarioID == "" {
			scenarioID = themeHauntMatrix["default"]
		}
	}

	scenario := GetScenarioByID(scenarioID)
	if scenario == nil {
		return fmt.Errorf("剧本不存在: %s", scenarioID)
	}
	state.FullState.CurrentScenario = scenario
	state.FullState.IsHauntActive = true

	// 确定叛徒
	traitorID := g.determineTraitor(*scenario, state.FullState)

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
			// 如果是由预兆触发的作祟，叛徒获得预兆卡
			if omenCard != nil {
				player.Items = append(player.Items, *omenCard)
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
	if omenCard != nil {
		state.FullState.Logs = append(state.FullState.Logs, LogEntry{
			ID:        generateLogID(),
			Timestamp: time.Now().UnixMilli(),
			Text:      fmt.Sprintf("%s 获得了预兆：%s", traitor.Character.Name, omenCard.Name),
			Type:      "alert",
		})
	}

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
			heroTurnLimit := objectiveTurnLimit(scenario.HeroObjective)
			state.Logs = append(state.Logs, LogEntry{
				ID:        generateLogID(),
				Timestamp: time.Now().UnixMilli(),
				Text: fmt.Sprintf("【英雄目标】%s: %s (%d回合内)",
					scenario.HeroObjective.Name,
					scenario.HeroObjective.Description,
					heroTurnLimit),
				Type: "info",
			})
		}

		if scenario.TraitorObjective != nil {
			traitorTurnLimit := objectiveTurnLimit(scenario.TraitorObjective)
			state.Logs = append(state.Logs, LogEntry{
				ID:        generateLogID(),
				Timestamp: time.Now().UnixMilli(),
				Text: fmt.Sprintf("【叛徒目标】%s: %s (%d回合内)",
					scenario.TraitorObjective.Name,
					scenario.TraitorObjective.Description,
					traitorTurnLimit),
				Type: "alert",
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

// ==================== 作祟系统（公开接口）====================

// TriggerHauntRoll 执行作祟检定（公开接口）
// 当玩家在 HAUNT_ROLL 阶段投骰子时调用
func (g *GameManager) TriggerHauntRoll(roomID string) error {
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

	// 验证阶段
	if state.FullState.Phase != GamePhaseHauntRoll {
		return errors.New("当前不是作祟检定阶段")
	}

	return g.processHauntRoll(room)
}

// ResolveHauntRoll 使用指定骰子结果结算作祟检定（供 WebSocket 投骰动画链路使用）
func (g *GameManager) ResolveHauntRoll(roomID string, results []int) (map[string]interface{}, error) {
	g.mu.Lock()
	defer g.mu.Unlock()

	room, ok := g.Rooms[roomID]
	if !ok {
		return nil, errors.New("房间不存在")
	}

	return g.resolveHauntRollUnlocked(room, results)
}

// ForceTriggerHaunt 强制触发作祟（调试用）
// 绕过作祟检定，直接进入作祟阶段
func (g *GameManager) ForceTriggerHaunt(roomID string) error {
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

	// 直接设置阶段为 HauntReveal 并触发作祟
	state.FullState.Phase = GamePhaseHauntReveal
	return g.triggerHaunt(room)
}

// GetHauntState 获取作祟状态（用于前端判断）
func (g *GameManager) GetHauntState(roomID string) (bool, string, error) {
	g.mu.RLock()
	defer g.mu.RUnlock()

	room, ok := g.Rooms[roomID]
	if !ok {
		return false, "", errors.New("房间不存在")
	}

	state := room.GameState
	if state == nil || state.FullState == nil {
		return false, "", errors.New("游戏未开始")
	}

	return state.FullState.IsHauntActive, string(state.FullState.Phase), nil
}

// ==================== NPC 系统 ====================

// generateNPCID 生成唯一 NPC 实例 ID
func generateNPCID() string {
	return fmt.Sprintf("npc_%d", time.Now().UnixNano())
}

// SpawnNPC 生成 NPC 实例
func (g *GameManager) SpawnNPC(roomID, defID string, x, y int) (*GameNPC, error) {
	// 获取 NPC 模板
	def := GetNPCDef(defID)
	if def == nil {
		return nil, errors.New("未知的 NPC 类型: " + defID)
	}

	// 创建 NPC 实例
	npc := &GameNPC{
		InstanceID:    generateNPCID(),
		DefID:         def.ID,
		Name:          def.Name,
		Type:          def.Type,
		Position:      Position{X: x, Y: y},
		Health:        def.Health,
		MaxHealth:     def.Health,
		IsDead:        false,
		StatusEffects: []StatusEffect{},
	}

	return npc, nil
}

// SpawnNPCEffect 生成 NPC（通过效果触发）
// 返回生成的 NPC 实例
func (g *GameManager) SpawnNPCEffect(roomID, playerID, npcDefID string) (*GameNPC, error) {
	g.mu.Lock()
	defer g.mu.Unlock()

	room, ok := g.Rooms[roomID]
	if !ok {
		return nil, errors.New("房间不存在")
	}

	state := room.GameState
	if state == nil || state.FullState == nil {
		return nil, errors.New("游戏未开始")
	}

	// 获取玩家位置
	player, ok := state.FullState.Players[playerID]
	if !ok {
		return nil, errors.New("玩家不存在")
	}

	// 生成 NPC
	npc, err := g.SpawnNPC(roomID, npcDefID, player.Position.X, player.Position.Y)
	if err != nil {
		return nil, err
	}

	// 初始化 NPCs map 如果为空
	if state.FullState.NPCs == nil {
		state.FullState.NPCs = make(map[string]*GameNPC)
	}

	// 添加到游戏状态
	state.FullState.NPCs[npc.InstanceID] = npc

	// 记录日志
	state.FullState.Logs = append(state.FullState.Logs, LogEntry{
		ID:        generateLogID(),
		Timestamp: time.Now().UnixMilli(),
		Text:      fmt.Sprintf("%s 遭遇了 %s！", player.Character.Name, npc.Name),
		Type:      "alert",
	})

	return npc, nil
}

// AttackNPC 玩家攻击 NPC
// 规则：双方同时投骰，点数低的一方受到差值伤害，平局则无人受伤
func (g *GameManager) AttackNPC(roomID, playerID, npcInstanceID string) (map[string]interface{}, error) {
	g.mu.Lock()
	defer g.mu.Unlock()

	room, ok := g.Rooms[roomID]
	if !ok {
		return nil, errors.New("房间不存在")
	}

	state := room.GameState
	if state == nil || state.FullState == nil {
		return nil, errors.New("游戏未开始")
	}

	// 获取 NPC
	npc, ok := state.FullState.NPCs[npcInstanceID]
	if !ok || npc.IsDead {
		return nil, errors.New("NPC 不存在或已死亡")
	}

	// 获取玩家
	player, ok := state.FullState.Players[playerID]
	if !ok {
		return nil, errors.New("玩家不存在")
	}

	// 双方各投 1 骰子
	playerRoll := g.RollDice(1)[0] // 玩家
	npcRoll := g.RollDice(1)[0]    // NPC

	// Bug Fix: 同步战斗骰子结果到 LastRollResult
	g.setLastRollResultUnlocked(state.FullState, playerRoll+npcRoll)

	result := map[string]interface{}{
		"playerRoll":    playerRoll,
		"npcRoll":       npcRoll,
		"npcInstanceId": npcInstanceID,
	}

	// 结算伤害：点数低的一方受伤
	if playerRoll == npcRoll {
		// 平局，无人受伤
		state.FullState.Logs = append(state.FullState.Logs, LogEntry{
			ID:        generateLogID(),
			Timestamp: time.Now().UnixMilli(),
			Text:      fmt.Sprintf("%s 与 %s 交锋，平局！", player.Character.Name, npc.Name),
			Type:      "info",
		})
		result["draw"] = true
	} else if playerRoll < npcRoll {
		// 玩家点数低，玩家受伤
		damage := npcRoll - playerRoll
		// 玩家受到的是精神/恐惧伤害（NPC的诡异力量）
		attr := player.Character.Attributes["sanity"]
		attr.Current -= damage
		if attr.Current < attr.Floor {
			attr.Current = attr.Floor
		}
		player.Character.Attributes["sanity"] = attr

		state.FullState.Logs = append(state.FullState.Logs, LogEntry{
			ID:        generateLogID(),
			Timestamp: time.Now().UnixMilli(),
			Text: fmt.Sprintf("%s 与 %s 交锋失败！受到 %d 点理智伤害！",
				player.Character.Name, npc.Name, damage),
			Type: "alert",
		})
		result["loser"] = playerID
		result["damage"] = damage
		result["attribute"] = "sanity"
	} else {
		// NPC 点数低，NPC 受伤
		damage := playerRoll - npcRoll
		if bonus := g.calculatePassiveDamageBonus(player, "", "ATTACK", npc); bonus > 0 {
			damage += bonus
			state.FullState.Logs = append(state.FullState.Logs, LogEntry{
				ID:        generateLogID(),
				Timestamp: time.Now().UnixMilli(),
				Text:      fmt.Sprintf("%s 的被动效果额外造成了 %d 点伤害！", player.Character.Name, bonus),
				Type:      "info",
			})
		}
		npc.Health -= damage

		npcStatus := fmt.Sprintf("%s 剩余 %d/%d HP", npc.Name, npc.Health, npc.MaxHealth)
		state.FullState.Logs = append(state.FullState.Logs, LogEntry{
			ID:        generateLogID(),
			Timestamp: time.Now().UnixMilli(),
			Text: fmt.Sprintf("%s 击败了 %s！造成 %d 点伤害！%s",
				player.Character.Name, npc.Name, damage, npcStatus),
			Type: "info",
		})

		result["loser"] = npcInstanceID
		result["damage"] = damage
		result["npcHealth"] = npc.Health
		result["npcMaxHealth"] = npc.MaxHealth

		// 检查 NPC 是否死亡
		if npc.Health <= 0 {
			npc.IsDead = true
			delete(state.FullState.NPCs, npcInstanceID)
			state.FullState.Logs = append(state.FullState.Logs, LogEntry{
				ID:        generateLogID(),
				Timestamp: time.Now().UnixMilli(),
				Text:      fmt.Sprintf("%s 击败了 %s！", player.Character.Name, npc.Name),
				Type:      "success",
			})
			result["defeated"] = true
		}
	}

	return result, nil
}

// NPCAttackPlayer NPC 攻击玩家
// NPCAttackPlayer NPC 攻击玩家
// 规则：双方同时投骰，点数低的一方受到差值伤害，平局则无人受伤
func (g *GameManager) NPCAttackPlayer(roomID, npcInstanceID, playerID string) (map[string]interface{}, error) {
	g.mu.Lock()
	defer g.mu.Unlock()

	room, ok := g.Rooms[roomID]
	if !ok {
		return nil, errors.New("房间不存在")
	}

	state := room.GameState
	if state == nil || state.FullState == nil {
		return nil, errors.New("游戏未开始")
	}

	// 获取 NPC
	npc, ok := state.FullState.NPCs[npcInstanceID]
	if !ok || npc.IsDead {
		return nil, errors.New("NPC 不存在或已死亡")
	}

	// 获取玩家
	player, ok := state.FullState.Players[playerID]
	if !ok {
		return nil, errors.New("玩家不存在")
	}

	// 获取 NPC 属性
	npcDef := GetNPCDef(npc.DefID)
	if npcDef == nil || !npcDef.CanAttack {
		return nil, errors.New("该 NPC 无法攻击")
	}

	// 双方各投 1 骰子
	npcRoll := g.RollDice(1)[0]    // NPC
	playerRoll := g.RollDice(1)[0] // 玩家

	// Bug Fix: 同步战斗骰子结果到 LastRollResult
	g.setLastRollResultUnlocked(state.FullState, playerRoll+npcRoll)

	result := map[string]interface{}{
		"npcInstanceId": npcInstanceID,
		"npcName":       npc.Name,
		"npcRoll":       npcRoll,
		"playerRoll":    playerRoll,
	}

	attrName := npcDef.AttackAttr
	if attrName == "" {
		attrName = "might"
	}

	// 结算伤害：点数低的一方受伤
	if npcRoll == playerRoll {
		// 平局，无人受伤
		state.FullState.Logs = append(state.FullState.Logs, LogEntry{
			ID:        generateLogID(),
			Timestamp: time.Now().UnixMilli(),
			Text:      fmt.Sprintf("%s 与 %s 交锋，平局！", npc.Name, player.Character.Name),
			Type:      "info",
		})
		result["draw"] = true
	} else if npcRoll < playerRoll {
		// NPC 点数低，NPC 受伤
		damage := playerRoll - npcRoll
		if bonus := g.calculatePassiveDamageBonus(player, "", "DEFENSE", npc); bonus > 0 {
			damage += bonus
			state.FullState.Logs = append(state.FullState.Logs, LogEntry{
				ID:        generateLogID(),
				Timestamp: time.Now().UnixMilli(),
				Text:      fmt.Sprintf("%s 的被动效果额外造成了 %d 点伤害！", player.Character.Name, bonus),
				Type:      "info",
			})
		}
		npc.Health -= damage

		state.FullState.Logs = append(state.FullState.Logs, LogEntry{
			ID:        generateLogID(),
			Timestamp: time.Now().UnixMilli(),
			Text: fmt.Sprintf("%s 攻击失败！被 %s 反击，受到 %d 点伤害！",
				npc.Name, player.Character.Name, damage),
			Type: "alert",
		})

		result["loser"] = npcInstanceID
		result["damage"] = damage

		// 检查 NPC 是否死亡
		if npc.Health <= 0 {
			npc.IsDead = true
			delete(state.FullState.NPCs, npcInstanceID)
			state.FullState.Logs = append(state.FullState.Logs, LogEntry{
				ID:        generateLogID(),
				Timestamp: time.Now().UnixMilli(),
				Text:      fmt.Sprintf("%s 击败了 %s！", player.Character.Name, npc.Name),
				Type:      "success",
			})
			result["npcDefeated"] = true
		}
	} else {
		// 玩家点数低，玩家受伤
		damage := npcRoll - playerRoll
		attr := player.Character.Attributes[attrName]
		attr.Current -= damage
		if attr.Current < attr.Floor {
			attr.Current = attr.Floor
		}
		player.Character.Attributes[attrName] = attr

		state.FullState.Logs = append(state.FullState.Logs, LogEntry{
			ID:        generateLogID(),
			Timestamp: time.Now().UnixMilli(),
			Text: fmt.Sprintf("%s 被 %s 击败！受到 %d 点%s伤害！",
				player.Character.Name, npc.Name, damage, attrName),
			Type: "alert",
		})

		result["loser"] = playerID
		result["damage"] = damage
		result["attribute"] = attrName

		// 检查玩家是否死亡
		if attr.Current <= attr.Floor && attrName == "might" && !player.IsDead {
			player.IsDead = true
			state.FullState.Logs = append(state.FullState.Logs, LogEntry{
				ID:        generateLogID(),
				Timestamp: time.Now().UnixMilli(),
				Text:      fmt.Sprintf("%s 被 %s 杀死了...", player.Character.Name, npc.Name),
				Type:      "alert",
			})
			g.handlePlayerDeathObjectiveUpdateUnlocked(state.FullState, playerID)
			result["playerDied"] = true
		}
	}

	return result, nil
}

// GetNPCAtPosition 获取指定位置的 NPC
func (g *GameManager) GetNPCAtPosition(roomID string, x, y int) (*GameNPC, error) {
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

	if state.FullState.NPCs == nil {
		return nil, nil
	}

	for _, npc := range state.FullState.NPCs {
		if npc.Position.X == x && npc.Position.Y == y && !npc.IsDead {
			return npc, nil
		}
	}

	return nil, nil
}
