package game

import (
	"fmt"
	"math/rand"
	"strings"
)

type effectHandler func(g *GameManager, roomID, playerID string, state *GameStateFull, player *GamePlayer, effect Effect)

func coreEffectHandler(effectType string) effectHandler {
	switch effectType {
	case "MODIFY_STAT":
		return handleModifyStatEffect
	case "DAMAGE":
		return handleDamageEffect
	case "HEAL":
		return handleHealEffect
	case "DRAW_CARD":
		return handleDrawCardEffect
	case "MOVE_PLAYER":
		return handleMovePlayerEffect
	case "LOG":
		return handleLogEffect
	case "IF":
		return handleConditionalEffect
	case "GIVE_ITEM":
		return handleGiveItemEffect
	case "GIVE_SKILL":
		return handleGiveSkillEffect
	case "ROLL":
		return handleRollEffect
	case "ADD_STATUS":
		return handleAddStatusEffect
	case "ADD_BUFF":
		return handleAddBuffEffect
	case "REMOVE_BUFF":
		return handleRemoveBuffEffect
	default:
		return nil
	}
}

func handleModifyStatEffect(g *GameManager, roomID, playerID string, state *GameStateFull, player *GamePlayer, effect Effect) {
	attrName := effect.Stat
	if attrName == "" {
		attrName = effect.Attribute
	}
	if attr, ok := player.Character.Attributes[attrName]; ok {
		amount := effect.Amount
		attr.Current += amount
		if attr.Current < attr.Floor {
			attr.Current = attr.Floor
		}
		if attr.Current > attr.Max {
			attr.Current = attr.Max
		}
		player.Character.Attributes[attrName] = attr
		if amount != 0 {
			logMsg := fmt.Sprintf("%s 的 %s %s (结算后有效值: %d)",
				player.Character.Name, attrName, formatSign(amount), attr.Current)
			g.addLog(roomID, logMsg, "info")
		}
		if attrName == "might" && attr.Current <= attr.Floor && !player.IsDead {
			player.IsDead = true
			g.addLog(roomID, fmt.Sprintf("%s 在大厦中殒落了...", player.Character.Name), "alert")
			if state != nil {
				g.handlePlayerDeathObjectiveUpdateUnlocked(state, playerID)
			}
		}
	}
}

func handleDamageEffect(g *GameManager, roomID, playerID string, state *GameStateFull, player *GamePlayer, effect Effect) {
	attrName := effect.Stat
	if attrName == "" {
		attrName = "might"
	}
	if attr, ok := player.Character.Attributes[attrName]; ok {
		damage := effect.Amount
		if damage < 0 {
			damage = 0
		}
		attr.Current -= damage
		if attr.Current < attr.Floor {
			attr.Current = attr.Floor
		}
		player.Character.Attributes[attrName] = attr
		g.addLog(roomID, fmt.Sprintf("%s 受到 %d 点%s伤害！", player.Character.Name, damage, attrName), "alert")
		if attr.Current <= attr.Floor && !player.IsDead {
			player.IsDead = true
			g.addLog(roomID, fmt.Sprintf("%s 在伤害中陨落了...", player.Character.Name), "alert")
			if state != nil {
				g.handlePlayerDeathObjectiveUpdateUnlocked(state, playerID)
			}
		}
	}
}

func handleHealEffect(g *GameManager, roomID, _ string, _ *GameStateFull, player *GamePlayer, effect Effect) {
	attrName := effect.Stat
	if attrName == "" {
		attrName = "might"
	}
	if attr, ok := player.Character.Attributes[attrName]; ok {
		attr.Current += effect.Amount
		if attr.Current > attr.Max {
			attr.Current = attr.Max
		}
		player.Character.Attributes[attrName] = attr
		g.addLog(roomID, fmt.Sprintf("%s 恢复了 %d 点%s！", player.Character.Name, effect.Amount, attrName), "success")
	}
}

func handleDrawCardEffect(g *GameManager, roomID, playerID string, state *GameStateFull, player *GamePlayer, effect Effect) {
	deckName := effect.Deck
	if deckName == "" {
		deckName = "ITEM"
	}
	deck := state.Decks[deckName]
	if len(deck) == 0 {
		g.addLog(roomID, fmt.Sprintf("%s 牌堆已空！", deckName), "alert")
		return
	}

	card := deck[0]
	state.Decks[deckName] = deck[1:]
	g.addLog(roomID, fmt.Sprintf("%s 抽到了 %s", player.Character.Name, card.Name), "success")

	if card.Type == "ITEM" {
		player.Items = append(player.Items, card)
		g.addLog(roomID, fmt.Sprintf("%s 获得了物品: %s", player.Character.Name, card.Name), "info")
		g.applyPassiveEffects(roomID, playerID, card)
	}
	if card.Type == "OMEN" {
		player.Items = append(player.Items, card)
		g.addLog(roomID, fmt.Sprintf("%s 获得了厄运: %s", player.Character.Name, card.Name), "info")
		g.applyPassiveEffects(roomID, playerID, card)
	}
}

func resolveMovePlayerTarget(player *GamePlayer, effect Effect) (int, int, error) {
	newX := player.Position.X
	newY := player.Position.Y

	if effect.X != 0 || effect.Y != 0 {
		return effect.X, effect.Y, nil
	}

	locationID := strings.ToLower(strings.TrimSpace(effect.Location))
	switch locationID {
	case "":
		return newX, newY, nil
	case "random":
		return newX + rand.Intn(5) - 2, newY + rand.Intn(5) - 2, nil
	}

	if position, ok := GetNamedLocationByID(locationID); ok {
		return position.X, position.Y, nil
	}

	return 0, 0, fmt.Errorf("未知的命名位置: %s", effect.Location)
}

func handleMovePlayerEffect(g *GameManager, roomID, playerID string, state *GameStateFull, player *GamePlayer, effect Effect) {
	newX, newY, err := resolveMovePlayerTarget(player, effect)
	if err != nil {
		g.addLog(roomID, err.Error(), "alert")
		return
	}

	currentTile, err := g.getCurrentTileUnlocked(state, player)
	if err != nil {
		g.addLog(roomID, err.Error(), "alert")
		return
	}

	continuation := map[string]interface{}{
		"type": "FORCED_MOVE",
		"x":    newX,
		"y":    newY,
	}
	wait, err := g.triggerTileLeaveUnlocked(roomID, playerID, currentTile.DefID, continuation)
	if err != nil {
		g.addLog(roomID, err.Error(), "alert")
		return
	}
	if wait {
		return
	}
	if err := g.finalizeRelocationUnlocked(roomID, playerID, state, player, "FORCED_MOVE", newX, newY); err != nil {
		g.addLog(roomID, err.Error(), "alert")
	}
}

func handleLogEffect(g *GameManager, roomID, _ string, _ *GameStateFull, _ *GamePlayer, effect Effect) {
	logType := "info"
	if effect.Style != "" {
		logType = effect.Style
	}
	if effect.Message != "" {
		g.addLog(roomID, effect.Message, logType)
	}
}

func handleConditionalEffect(g *GameManager, roomID, playerID string, _ *GameStateFull, player *GamePlayer, effect Effect) {
	conditionMet := false
	if effect.Condition == nil {
		return
	}

	switch effect.Condition.Op {
	case "HAS_ITEM":
		for _, item := range player.Items {
			if item.ID == effect.Condition.ItemID {
				conditionMet = true
				break
			}
		}
	case "HAS_SKILL":
		for _, skillID := range player.Skills {
			if skillID == effect.Condition.SkillID {
				conditionMet = true
				break
			}
		}
	}

	if conditionMet {
		for _, thenEffect := range effect.Then {
			g.applyEffect(roomID, playerID, thenEffect)
		}
		return
	}

	for _, elseEffect := range effect.Else {
		g.applyEffect(roomID, playerID, elseEffect)
	}
}

func handleGiveItemEffect(g *GameManager, roomID, _ string, _ *GameStateFull, player *GamePlayer, effect Effect) {
	itemID := effect.ItemID
	if itemID == "" {
		return
	}
	item := GetItem(itemID)
	if item == nil {
		return
	}
	player.Items = append(player.Items, *item)
	g.addLog(roomID, fmt.Sprintf("%s 获得了物品: %s", player.Character.Name, item.Name), "success")
}

func handleGiveSkillEffect(g *GameManager, roomID, _ string, _ *GameStateFull, player *GamePlayer, effect Effect) {
	skillID := effect.SkillID
	if skillID == "" {
		return
	}
	for _, skill := range player.Skills {
		if skill == skillID {
			return
		}
	}
	player.Skills = append(player.Skills, skillID)
	skill := GetSkill(skillID)
	skillName := skillID
	if skill != nil {
		skillName = skill.Name
	}
	g.addLog(roomID, fmt.Sprintf("%s 习得了技能: %s", player.Character.Name, skillName), "success")
}

func handleRollEffect(g *GameManager, roomID, playerID string, state *GameStateFull, player *GamePlayer, effect Effect) {
	attrName := effect.Attribute
	if attrName == "" {
		attrName = "might"
	}
	difficulty := effect.Difficulty
	if difficulty == 0 {
		difficulty = 3
	}
	g.clearLastRollResultUnlocked(state)
	state.PendingAction = NewPendingAttributeCheck(playerID, attrName, difficulty, nil)
	g.addLog(roomID, fmt.Sprintf("%s 需要进行 %s 检定 (难度 %d)", player.Character.Name, attrName, difficulty), "info")
}

func handleAddStatusEffect(g *GameManager, roomID, _ string, _ *GameStateFull, player *GamePlayer, effect Effect) {
	statusType := strings.ToUpper(strings.TrimSpace(effect.StatusType))
	if statusType == "" {
		return
	}
	duration := effect.Duration
	if duration == 0 {
		duration = -1
	}
	status := StatusEffect{
		Type:     statusType,
		Duration: duration,
		Source:   effect.Source,
		Damage:   effect.Damage,
		Faction:  effect.Faction,
		Amount:   effect.StatusAmt,
	}
	player.StatusEffects = append(player.StatusEffects, status)
	g.addLog(roomID, fmt.Sprintf("%s 获得了状态: %s (持续 %d 回合)", player.Character.Name, statusType, duration), "info")
}

func handleAddBuffEffect(g *GameManager, roomID, _ string, _ *GameStateFull, player *GamePlayer, effect Effect) {
	buffText := strings.TrimSpace(effect.Buff)
	if buffText == "" {
		return
	}
	player.Buffs = append(player.Buffs, buffText)
	g.addLog(roomID, fmt.Sprintf("%s 获得了增益: %s", player.Character.Name, buffText), "success")
}

func handleRemoveBuffEffect(g *GameManager, roomID, _ string, _ *GameStateFull, player *GamePlayer, effect Effect) {
	buffText := strings.TrimSpace(effect.Buff)
	if buffText == "" {
		return
	}
	for i, buff := range player.Buffs {
		if buff == buffText {
			player.Buffs = append(player.Buffs[:i], player.Buffs[i+1:]...)
			g.addLog(roomID, fmt.Sprintf("%s 失去了增益: %s", player.Character.Name, buffText), "info")
			return
		}
	}
}
