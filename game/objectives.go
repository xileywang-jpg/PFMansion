package game

import (
	"fmt"
	"strings"
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

	if winner := g.checkTurnLimitVictory(state.FullState); winner != "" {
		return winner
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

	if objectiveIsComplete(state, scenario.TraitorObjective, false) {
		return g.markObjectiveWinner(state, scenario.TraitorObjective, false)
	}

	if objectiveIsComplete(state, scenario.HeroObjective, true) {
		return g.markObjectiveWinner(state, scenario.HeroObjective, true)
	}

	return ""
}

func upsertObjectiveProgress(progressMap map[string]*PlayerObjective, key, objectiveID string, required int, delta int) *PlayerObjective {
	if existing, ok := progressMap[key]; ok {
		existing.Required = required
		existing.Progress += delta
		existing.Completed = existing.Progress >= existing.Required
		return existing
	}

	entry := &PlayerObjective{
		ObjectiveID: objectiveID,
		Progress:    delta,
		Required:    required,
		Completed:   delta >= required,
	}
	progressMap[key] = entry
	return entry
}

func setObjectiveProgress(progressMap map[string]*PlayerObjective, key, objectiveID string, required int, progress int) *PlayerObjective {
	if existing, ok := progressMap[key]; ok {
		existing.Required = required
		existing.Progress = progress
		existing.Completed = existing.Progress >= existing.Required
		return existing
	}

	entry := &PlayerObjective{
		ObjectiveID: objectiveID,
		Progress:    progress,
		Required:    required,
		Completed:   progress >= required,
	}
	progressMap[key] = entry
	return entry
}

func objectiveProgressMap(state *GameStateFull, isHero bool) map[string]*PlayerObjective {
	if state == nil {
		return nil
	}
	if isHero {
		return state.HeroObjectives
	}
	return state.TraitorObjectives
}

func ensureObjectiveProgressMap(state *GameStateFull, isHero bool) map[string]*PlayerObjective {
	if state == nil {
		return nil
	}
	if isHero {
		if state.HeroObjectives == nil {
			state.HeroObjectives = make(map[string]*PlayerObjective)
		}
		return state.HeroObjectives
	}
	if state.TraitorObjectives == nil {
		state.TraitorObjectives = make(map[string]*PlayerObjective)
	}
	return state.TraitorObjectives
}

func objectiveSharedProgressKey(state *GameStateFull, isHero bool, eventType string) string {
	switch eventType {
	case "TURNS_SURVIVED":
		return "survived"
	case "PLAYER_DEATH", "RITUAL_COMPLETED", "OMEN_USED", "ROOM_EXPLORED":
		if isHero {
			return "heroes"
		}
		if state != nil {
			return state.TraitorID
		}
	}
	if isHero {
		return "heroes"
	}
	if state != nil {
		return state.TraitorID
	}
	return ""
}

func objectiveUsesSharedProgressKey(eventType string) bool {
	switch eventType {
	case "PLAYER_DEATH", "RITUAL_COMPLETED", "TURNS_SURVIVED", "OMEN_USED", "ROOM_EXPLORED":
		return true
	default:
		return false
	}
}

func objectiveProgressKeyForEvent(state *GameStateFull, obj *Objective, isHero bool, event ObjectiveEvent) (string, bool) {
	eventType := objectiveEventType(obj)
	if objectiveUsesSharedProgressKey(eventType) {
		key := objectiveSharedProgressKey(state, isHero, eventType)
		return key, key != ""
	}

	playerID := strings.TrimSpace(event.PlayerID)
	if playerID == "" || state == nil {
		return "", false
	}
	player, ok := state.Players[playerID]
	if !ok {
		return "", false
	}

	if isHero {
		if player.Team != "HERO" {
			return "", false
		}
		return playerID, true
	}

	if playerID != state.TraitorID {
		return "", false
	}
	return state.TraitorID, true
}

func objectiveProgressTotal(state *GameStateFull, obj *Objective, isHero bool) int {
	if state == nil || obj == nil {
		return 0
	}

	progressMap := objectiveProgressMap(state, isHero)
	if len(progressMap) == 0 {
		return 0
	}

	eventType := objectiveEventType(obj)
	if isHero && !objectiveUsesSharedProgressKey(eventType) {
		total := 0
		for _, objective := range progressMap {
			total += objective.Progress
		}
		return total
	}

	key := objectiveSharedProgressKey(state, isHero, eventType)
	if !isHero && !objectiveUsesSharedProgressKey(eventType) {
		key = state.TraitorID
	}
	if key == "" {
		return 0
	}
	if entry := progressMap[key]; entry != nil {
		return entry.Progress
	}
	return 0
}

func objectiveIsComplete(state *GameStateFull, obj *Objective, isHero bool) bool {
	if state == nil || obj == nil {
		return false
	}
	return objectiveProgressTotal(state, obj, isHero) >= objectiveRuntimeRequiredProgress(state, obj, isHero)
}

func objectiveVictoryLogText(state *GameStateFull, obj *Objective, isHero bool) string {
	if obj == nil {
		return ""
	}

	if objectiveEventType(obj) == "TURNS_SURVIVED" && isHero {
		return fmt.Sprintf("英雄们成功生存 %d 回合！胜利！", objectiveProgressTotal(state, obj, true))
	}
	if !isHero {
		return fmt.Sprintf("叛徒完成了目标：%s！叛徒胜利！", obj.Name)
	}
	return fmt.Sprintf("英雄完成了目标：%s！英雄胜利！", obj.Name)
}

func (g *GameManager) markObjectiveWinner(state *GameStateFull, obj *Objective, isHero bool) string {
	if state == nil || obj == nil {
		return ""
	}

	winner := "TRAITOR"
	logType := "alert"
	if isHero {
		winner = "HERO"
	}

	state.GameWinner = winner
	state.Phase = GamePhaseGameOver
	state.Logs = append(state.Logs, LogEntry{
		ID:        generateLogID(),
		Timestamp: time.Now().UnixMilli(),
		Text:      objectiveVictoryLogText(state, obj, isHero),
		Type:      logType,
	})
	return winner
}

func objectiveRequiresTurnLimitCompletion(obj *Objective, isHero bool) bool {
	if obj == nil {
		return false
	}
	return objectiveEventType(obj) != ""
}

func timedVictoryLogText(state *GameStateFull, obj *Objective, isHero bool) string {
	turnsSinceHaunt := 0
	if state != nil {
		turnsSinceHaunt = state.TurnsSinceHaunt
	}

	if isHero {
		if obj != nil && objectiveEventType(obj) == "TURNS_SURVIVED" {
			return fmt.Sprintf("英雄们在 %d 回合内成功生存！胜利！", turnsSinceHaunt)
		}
		return fmt.Sprintf("英雄们在 %d 回合内阻止了叛徒！胜利！", turnsSinceHaunt)
	}

	if obj != nil && objectiveRequiresTurnLimitCompletion(obj, false) {
		return fmt.Sprintf("叛徒在 %d 回合内完成了目标：%s！叛徒胜利！", turnsSinceHaunt, obj.Name)
	}
	return fmt.Sprintf("叛徒在 %d 回合内完成了目标！叛徒胜利！", turnsSinceHaunt)
}

func (g *GameManager) markTimedWinner(state *GameStateFull, obj *Objective, isHero bool) string {
	if state == nil {
		return ""
	}
	winner := "TRAITOR"
	if isHero {
		winner = "HERO"
	}
	state.GameWinner = winner
	state.Phase = GamePhaseGameOver
	state.Logs = append(state.Logs, LogEntry{
		ID:        generateLogID(),
		Timestamp: time.Now().UnixMilli(),
		Text:      timedVictoryLogText(state, obj, isHero),
		Type:      "alert",
	})
	return winner
}

func (g *GameManager) checkTurnLimitVictory(state *GameStateFull) string {
	if state == nil || state.CurrentScenario == nil {
		return ""
	}

	turnsSinceHaunt := state.TurnsSinceHaunt
	scenario := state.CurrentScenario

	if scenario.TraitorObjective != nil && turnsSinceHaunt >= objectiveTurnLimit(scenario.TraitorObjective) {
		if !objectiveRequiresTurnLimitCompletion(scenario.TraitorObjective, false) || objectiveIsComplete(state, scenario.TraitorObjective, false) {
			return g.markTimedWinner(state, scenario.TraitorObjective, false)
		}
	}

	if scenario.HeroObjective != nil && turnsSinceHaunt >= objectiveTurnLimit(scenario.HeroObjective) {
		if !objectiveRequiresTurnLimitCompletion(scenario.HeroObjective, true) || objectiveIsComplete(state, scenario.HeroObjective, true) {
			return g.markTimedWinner(state, scenario.HeroObjective, true)
		}
	}

	return ""
}

func objectiveEventMatches(state *GameStateFull, obj *Objective, isHero bool, event ObjectiveEvent) bool {
	if state == nil || obj == nil {
		return false
	}

	switch objectiveEventType(obj) {
	case "PLAYER_DEATH":
		playerID := strings.TrimSpace(event.PlayerID)
		player, ok := state.Players[playerID]
		if !ok || !player.IsDead {
			return false
		}
		target := objectiveTarget(obj)
		switch targetTeam := objectivePlayerDeathTargetTeam(isHero, target); targetTeam {
		case "HERO", "TRAITOR":
			return player.Team == targetTeam
		default:
			if strings.TrimSpace(target) != "" {
				return playerID == strings.TrimSpace(target)
			}
			if isHero {
				return player.Team == "TRAITOR"
			}
			return player.Team == "HERO"
		}

	case "TILE_REACHED":
		tileID := objectiveEventTargetID(obj, event)
		return tileID != "" && objectiveTarget(obj) == tileID

	case "ITEM_COLLECTED":
		itemID := objectiveEventTargetID(obj, event)
		return itemID != "" && objectiveTarget(obj) == itemID

	case "RITUAL_COMPLETED":
		customID := objectiveCustomID(obj)
		if customID == "" {
			return true
		}
		if eventCustomID := strings.TrimSpace(event.CustomID); eventCustomID != "" {
			return eventCustomID == customID
		}
		return true

	case "TURNS_SURVIVED":
		_, ok := objectiveEventProgressValue(obj, event)
		return ok

	case "OMEN_USED":
		_, ok := objectiveEventProgressValue(obj, event)
		return ok

	case "ROOM_EXPLORED":
		_, ok := objectiveEventProgressValue(obj, event)
		return ok
	}

	return false
}

func (g *GameManager) logObjectiveEventProgressUnlocked(state *GameStateFull, obj *Objective, isHero bool) {
	if state == nil || obj == nil {
		return
	}

	eventType := objectiveEventType(obj)
	switch eventType {
	case "PLAYER_DEATH":
		text := fmt.Sprintf("叛徒目标 %s 进度 +1", obj.Name)
		logType := "alert"
		if isHero {
			text = fmt.Sprintf("英雄目标 %s 进度 +1", obj.Name)
			logType = "success"
		}
		state.Logs = append(state.Logs, LogEntry{ID: generateLogID(), Timestamp: time.Now().UnixMilli(), Text: text, Type: logType})

	case "TILE_REACHED":
		text := fmt.Sprintf("叛徒目标 %s 进度已更新。", obj.Name)
		logType := "alert"
		if isHero {
			text = fmt.Sprintf("英雄目标 %s 进度已更新。", obj.Name)
			logType = "info"
		}
		state.Logs = append(state.Logs, LogEntry{ID: generateLogID(), Timestamp: time.Now().UnixMilli(), Text: text, Type: logType})

	case "ITEM_COLLECTED":
		text := fmt.Sprintf("叛徒目标 %s 进度已更新。", obj.Name)
		logType := "alert"
		if isHero {
			text = fmt.Sprintf("英雄目标 %s 进度已更新。", obj.Name)
			logType = "info"
		}
		state.Logs = append(state.Logs, LogEntry{ID: generateLogID(), Timestamp: time.Now().UnixMilli(), Text: text, Type: logType})

	case "RITUAL_COMPLETED":
		text := fmt.Sprintf("叛徒完成了目标：%s。", obj.Name)
		logType := "alert"
		if isHero {
			text = fmt.Sprintf("英雄完成了目标：%s。", obj.Name)
			logType = "success"
		}
		state.Logs = append(state.Logs, LogEntry{ID: generateLogID(), Timestamp: time.Now().UnixMilli(), Text: text, Type: logType})
	}
}

func (g *GameManager) applyObjectiveEventProgressUnlocked(state *GameStateFull, obj *Objective, isHero bool, event ObjectiveEvent) bool {
	if state == nil || obj == nil || !objectiveEventMatches(state, obj, isHero, event) {
		return false
	}

	progressMap := ensureObjectiveProgressMap(state, isHero)
	if progressMap == nil {
		return false
	}

	required := objectiveRuntimeRequiredProgress(state, obj, isHero)
	eventType := objectiveEventType(obj)
	key, ok := objectiveProgressKeyForEvent(state, obj, isHero, event)
	if !ok {
		return false
	}

	switch eventType {
	case "PLAYER_DEATH", "TILE_REACHED", "ITEM_COLLECTED":
		upsertObjectiveProgress(progressMap, key, obj.Name, required, 1)
		g.logObjectiveEventProgressUnlocked(state, obj, isHero)
		return true

	case "RITUAL_COMPLETED":
		setObjectiveProgress(progressMap, key, obj.Name, required, required)
		g.logObjectiveEventProgressUnlocked(state, obj, isHero)
		return true

	case "TURNS_SURVIVED":
		turnsSurvived, ok := objectiveEventProgressValue(obj, event)
		if !ok {
			return false
		}
		setObjectiveProgress(progressMap, key, obj.Name, required, turnsSurvived)
		remaining := objectiveTurnLimit(obj) - turnsSurvived
		if remaining > 0 && remaining <= 3 {
			state.Logs = append(state.Logs, LogEntry{
				ID:        generateLogID(),
				Timestamp: time.Now().UnixMilli(),
				Text:      fmt.Sprintf("英雄们已生存 %d/%d 回合！坚持住！", turnsSurvived, objectiveTurnLimit(obj)),
				Type:      "info",
			})
		}
		return true

	case "OMEN_USED":
		omenCount, ok := objectiveEventProgressValue(obj, event)
		if !ok {
			return false
		}
		setObjectiveProgress(progressMap, key, obj.Name, required, omenCount)
		return true

	case "ROOM_EXPLORED":
		exploredCount, ok := objectiveEventProgressValue(obj, event)
		if !ok {
			return false
		}
		setObjectiveProgress(progressMap, key, obj.Name, required, exploredCount)
		return true
	}

	return false
}

func (g *GameManager) applyObjectiveEventUpdatesUnlocked(state *GameStateFull, event ObjectiveEvent) bool {
	if state == nil || state.CurrentScenario == nil || event.Type == "" {
		return false
	}

	scenario := state.CurrentScenario
	updated := false

	if scenario.TraitorObjective != nil && objectiveEventType(scenario.TraitorObjective) == event.Type {
		if g.applyObjectiveEventProgressUnlocked(state, scenario.TraitorObjective, false, event) {
			updated = true
		}
	}

	if scenario.HeroObjective != nil && objectiveEventType(scenario.HeroObjective) == event.Type {
		if g.applyObjectiveEventProgressUnlocked(state, scenario.HeroObjective, true, event) {
			updated = true
		}
	}

	return updated
}

func (g *GameManager) handlePlayerDeathObjectiveUpdateUnlocked(state *GameStateFull, playerID string) string {
	if state == nil || state.CurrentScenario == nil {
		return ""
	}

	player, ok := state.Players[playerID]
	if !ok || !player.IsDead {
		return ""
	}

	g.applyObjectiveEventUpdatesUnlocked(state, NewObjectivePlayerDeathEvent(playerID))

	return g.checkObjectiveVictory(state)
}

func (g *GameManager) updateObjectivesUnlocked(state *GameStateFull, event ObjectiveEvent) string {
	if state == nil || state.CurrentScenario == nil || event.Type == "" {
		return ""
	}

	if event.Type == "PLAYER_DEATH" {
		if targetPID := strings.TrimSpace(event.PlayerID); targetPID != "" {
			if _, ok := state.Players[targetPID]; !ok {
				return ""
			}
			if winner := g.handlePlayerDeathObjectiveUpdateUnlocked(state, targetPID); winner != "" {
				return winner
			}
		}
		return ""
	}

	g.applyObjectiveEventUpdatesUnlocked(state, event)

	if state.Phase == GamePhaseGameOver {
		return state.GameWinner
	}

	return g.checkObjectiveVictory(state)
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

	g.updateObjectivesUnlocked(state.FullState, objectiveEventFromLegacy(eventType, data))
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
	state.FullState.HeroObjectives = make(map[string]*PlayerObjective)
	state.FullState.TraitorObjectives = make(map[string]*PlayerObjective)

	// 记录目标
	if scenario := state.FullState.CurrentScenario; scenario != nil {
		if scenario.HeroObjective != nil {
			heroTurnLimit := objectiveTurnLimit(scenario.HeroObjective)
			state.FullState.Logs = append(state.FullState.Logs, LogEntry{
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
			state.FullState.Logs = append(state.FullState.Logs, LogEntry{
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

	g.incrementHauntTurnsUnlocked(state.FullState)
}

func (g *GameManager) incrementHauntTurnsUnlocked(state *GameStateFull) string {
	if state == nil || !state.IsHauntActive {
		return ""
	}

	state.TurnsSinceHaunt++
	g.updateObjectivesUnlocked(state, NewObjectiveTurnsSurvivedEvent(state.TurnsSinceHaunt))

	if state.Phase == GamePhaseGameOver {
		return state.GameWinner
	}

	if winner := g.checkVictoryInternal(state); winner != "" {
		return winner
	}

	if scenario := state.CurrentScenario; scenario != nil && scenario.TraitorObjective != nil {
		remaining := objectiveTurnLimit(scenario.TraitorObjective) - state.TurnsSinceHaunt
		if remaining > 0 {
			state.Logs = append(state.Logs, LogEntry{
				ID:        generateLogID(),
				Timestamp: time.Now().UnixMilli(),
				Text:      fmt.Sprintf("作祟第 %d 回合。叛徒目标剩余 %d 回合。", state.TurnsSinceHaunt, remaining),
				Type:      "info",
			})
		}
	}

	return ""
}

// checkVictoryInternal 内部胜利检查（需要持有锁）
func (g *GameManager) checkVictoryInternal(state *GameStateFull) string {
	if state == nil || state.CurrentScenario == nil {
		return ""
	}

	if state.Phase == GamePhaseGameOver && state.GameWinner != "" {
		return state.GameWinner
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

	if winner := g.checkObjectiveVictory(state); winner != "" {
		return winner
	}

	if winner := g.checkTurnLimitVictory(state); winner != "" {
		return winner
	}

	return ""
}
