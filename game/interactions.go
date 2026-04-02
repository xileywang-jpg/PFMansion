package game

import (
	"errors"
	"fmt"
	"math/rand"
	"strings"
	"time"
)

func (g *GameManager) getCurrentTileUnlocked(state *GameStateFull, player *GamePlayer) (*TileInstance, error) {
	if state == nil || player == nil {
		return nil, errors.New("游戏未开始")
	}

	posKey := fmt.Sprintf("%d,%d", player.Position.X, player.Position.Y)
	tile, ok := state.Map[posKey]
	if !ok {
		return nil, errors.New("当前位置没有房间")
	}

	return tile, nil
}

func (g *GameManager) getTileInteractionUnlocked(roomID string, state *GameStateFull, player *GamePlayer, interactionType string) (*TileInstance, *TileInteraction, error) {
	tile, err := g.getCurrentTileUnlocked(state, player)
	if err != nil {
		return nil, nil, err
	}

	tileDef := g.getTileDef(roomID, tile.DefID)
	if tileDef == nil || tileDef.Interact == nil {
		return nil, nil, errors.New("当前房间没有可用互动")
	}

	interaction := tileDef.Interact
	if !strings.EqualFold(interaction.Type, interactionType) {
		return nil, nil, errors.New("当前房间不支持该互动")
	}

	return tile, interaction, nil
}

func (g *GameManager) applyInteractionCostUnlocked(roomID string, playerID string, interaction *TileInteraction) error {
	if interaction.Cost == nil || interaction.Cost.Amount <= 0 {
		return nil
	}

	room, ok := g.Rooms[roomID]
	if !ok || room.GameState == nil || room.GameState.FullState == nil {
		return errors.New("游戏未开始")
	}

	player, ok := room.GameState.FullState.Players[playerID]
	if !ok {
		return errors.New("玩家不存在")
	}

	attr, ok := player.Character.Attributes[interaction.Cost.Type]
	if !ok {
		return errors.New("互动消耗属性不存在")
	}
	if attr.Current < interaction.Cost.Amount {
		return fmt.Errorf("需要 %d 点 %s", interaction.Cost.Amount, interaction.Cost.Type)
	}

	g.applyEffect(roomID, playerID, Effect{Type: "MODIFY_STAT", Stat: interaction.Cost.Type, Amount: -interaction.Cost.Amount})
	return nil
}

func (g *GameManager) checkInteractionConditionUnlocked(player *GamePlayer, interaction *TileInteraction) error {
	if interaction.Condition == nil {
		return nil
	}

	condition := interaction.Condition
	attr, ok := player.Character.Attributes[condition.Stat]
	if !ok {
		return errors.New("互动条件属性不存在")
	}

	passed := false
	switch condition.Op {
	case "GT":
		passed = attr.Current > condition.Value
	case "LT":
		passed = attr.Current < condition.Value
	case "EQ":
		passed = attr.Current == condition.Value
	default:
		return errors.New("不支持的互动条件")
	}

	if !passed {
		return errors.New("条件不满足，无法进行此互动")
	}

	return nil
}

func (g *GameManager) applyTileInteractionEffectsUnlocked(roomID string, playerID string, player *GamePlayer, effects []Effect) {
	for _, effect := range effects {
		switch effect.Type {
		case "REVEAL_MAP":
			room := g.Rooms[roomID]
			if room == nil || room.GameState == nil || room.GameState.FullState == nil {
				continue
			}
			for _, tile := range room.GameState.FullState.Map {
				tile.Visibility = "VISIBLE"
			}
			g.addLog(roomID, "地图上的迷雾被完全揭开。", "success")
		case "REVEAL_TRAIL":
			player.ShowTrail = true
			g.addLog(roomID, fmt.Sprintf("%s 的足迹被命运标记在地图上。", player.Character.Name), "info")
		case "CLEAR_LAST_ROLL":
			room := g.Rooms[roomID]
			if room != nil && room.GameState != nil {
				g.clearLastRollResultUnlocked(room.GameState.FullState)
			}
		default:
			g.applyEffect(roomID, playerID, effect)
		}
	}
}

func (g *GameManager) TradeItems(roomID, playerID, targetPlayerID, playerItemID, targetItemID string) error {
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

	targetPlayer, ok := state.FullState.Players[targetPlayerID]
	if !ok {
		return errors.New("交易对象不存在")
	}
	if targetPlayer.IsDead {
		return errors.New("已死亡的玩家无法交易")
	}
	if player.Position != targetPlayer.Position {
		return errors.New("只能与同一房间的玩家交易")
	}

	playerIdx := -1
	for i, item := range player.Items {
		if item.ID == playerItemID {
			playerIdx = i
			break
		}
	}
	if playerIdx == -1 {
		return errors.New("你没有选择的交易物品")
	}

	targetIdx := -1
	for i, item := range targetPlayer.Items {
		if item.ID == targetItemID {
			targetIdx = i
			break
		}
	}
	if targetIdx == -1 {
		return errors.New("对方没有选择的交易物品")
	}

	playerItem := player.Items[playerIdx]
	targetItem := targetPlayer.Items[targetIdx]

	if len(playerItem.PassiveEffects) > 0 {
		g.removePassiveEffects(roomID, playerID, playerItem)
	}
	if len(targetItem.PassiveEffects) > 0 {
		g.removePassiveEffects(roomID, targetPlayerID, targetItem)
	}

	player.Items[playerIdx] = targetItem
	targetPlayer.Items[targetIdx] = playerItem

	if len(targetItem.PassiveEffects) > 0 {
		g.applyPassiveEffects(roomID, playerID, targetItem)
	}
	if len(playerItem.PassiveEffects) > 0 {
		g.applyPassiveEffects(roomID, targetPlayerID, playerItem)
	}

	state.FullState.Logs = append(state.FullState.Logs, LogEntry{
		ID:        generateLogID(),
		Timestamp: time.Now().UnixMilli(),
		Text:      fmt.Sprintf("%s 与 %s 完成了交易", player.Character.Name, targetPlayer.Character.Name),
		Type:      "success",
	})
	g.addPersonalLogUnlocked(state.FullState, playerID, fmt.Sprintf("与 %s 完成了物品交换。", targetPlayer.Character.Name), "success")
	g.addPersonalLogUnlocked(state.FullState, targetPlayerID, fmt.Sprintf("与 %s 完成了物品交换。", player.Character.Name), "success")

	return nil
}

func (g *GameManager) TeleportPlayer(roomID, playerID string, targetX, targetY int) error {
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

	_, interaction, err := g.getTileInteractionUnlocked(roomID, state.FullState, player, "TELEPORT")
	if err != nil {
		return err
	}
	if err := g.applyInteractionCostUnlocked(roomID, playerID, interaction); err != nil {
		return err
	}

	targetKey := fmt.Sprintf("%d,%d", targetX, targetY)
	targetTile, ok := state.FullState.Map[targetKey]
	if !ok {
		return errors.New("目标房间不存在")
	}
	if targetTile.Visibility != "VISIBLE" {
		return errors.New("只能传送到已揭示的房间")
	}
	for id, other := range state.FullState.Players {
		if id == playerID || other.IsDead {
			continue
		}
		if other.Position.X == targetX && other.Position.Y == targetY {
			return errors.New("目标房间已被占据")
		}
	}

	currentTile, err := g.getCurrentTileUnlocked(state.FullState, player)
	if err != nil {
		return err
	}
	continuation := map[string]interface{}{
		"type": "TELEPORT",
		"x":    targetX,
		"y":    targetY,
	}
	wait, err := g.triggerTileLeaveUnlocked(roomID, playerID, currentTile.DefID, continuation)
	if err != nil {
		return err
	}
	if wait {
		return nil
	}

	return g.finalizeRelocationUnlocked(roomID, playerID, state.FullState, player, "TELEPORT", targetX, targetY)
}

func (g *GameManager) PerformDivination(roomID, playerID, action string) error {
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

	_, interaction, err := g.getTileInteractionUnlocked(roomID, state.FullState, player, "DIVINATION")
	if err != nil {
		return err
	}

	deck := state.FullState.Decks["EVENT"]
	if len(deck) == 0 {
		return errors.New("事件牌堆为空")
	}

	switch action {
	case "toTop":
		// 保持不变
	case "toBottom":
		card := deck[0]
		state.FullState.Decks["EVENT"] = append(deck[1:], card)
	default:
		return errors.New("无效的占卜操作")
	}

	g.applyTileInteractionEffectsUnlocked(roomID, playerID, player, interaction.Effects)
	state.FullState.Logs = append(state.FullState.Logs, LogEntry{
		ID:        generateLogID(),
		Timestamp: time.Now().UnixMilli(),
		Text:      fmt.Sprintf("%s 完成了占卜，并重新安放了下一张事件牌", player.Character.Name),
		Type:      "info",
	})
	g.addPersonalLogUnlocked(state.FullState, playerID, "完成了占卜，并重新安放了下一张事件牌。", "info")

	return nil
}

func (g *GameManager) ExecuteTileInteraction(roomID, playerID, interactionType string) (map[string]interface{}, error) {
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

	player, err := g.requireActivePlayerUnlocked(state.FullState, playerID)
	if err != nil {
		return nil, err
	}

	_, interaction, err := g.getTileInteractionUnlocked(roomID, state.FullState, player, interactionType)
	if err != nil {
		return nil, err
	}
	if err := g.checkInteractionConditionUnlocked(player, interaction); err != nil {
		return nil, err
	}
	if err := g.applyInteractionCostUnlocked(roomID, playerID, interaction); err != nil {
		return nil, err
	}

	switch interaction.Type {
	case "HEAL":
		g.applyTileInteractionEffectsUnlocked(roomID, playerID, player, interaction.Effects)
		g.addLog(roomID, fmt.Sprintf("%s 使用了房间互动：%s", player.Character.Name, interaction.Description), "success")
		g.addPersonalLogUnlocked(state.FullState, playerID, fmt.Sprintf("使用了房间互动：%s。", interaction.Description), "success")
		return nil, nil

	case "REVEAL_MAP":
		g.applyTileInteractionEffectsUnlocked(roomID, playerID, player, append([]Effect{{Type: "REVEAL_MAP"}}, interaction.Effects...))
		g.addLog(roomID, fmt.Sprintf("%s 揭示了地图上的全部区域", player.Character.Name), "success")
		g.addPersonalLogUnlocked(state.FullState, playerID, "揭示了地图上的全部区域。", "success")
		return nil, nil

	case "MIRROR":
		g.applyTileInteractionEffectsUnlocked(roomID, playerID, player, append([]Effect{{Type: "REVEAL_TRAIL"}}, interaction.Effects...))
		g.addLog(roomID, fmt.Sprintf("%s 凝视了镜中的命运", player.Character.Name), "alert")
		g.addPersonalLogUnlocked(state.FullState, playerID, "凝视了镜中的命运。", "alert")
		return nil, nil

	case "FORGE":
		poolID := interaction.PoolID
		if poolID == "" {
			poolID = "forge_legendary_weapons"
		}
		pool := GetCardPoolByID(poolID)
		if len(pool) == 0 {
			return nil, fmt.Errorf("互动卡池未配置: %s", poolID)
		}
		weapon := pool[rand.Intn(len(pool))]
		player.Items = append(player.Items, weapon)
		g.addLog(roomID, fmt.Sprintf("%s 在泰坦锻铁炉中打造了 %s", player.Character.Name, weapon.Name), "success")
		g.addPersonalLogUnlocked(state.FullState, playerID, fmt.Sprintf("在锻铁炉中打造了 %s。", weapon.Name), "success")
		return nil, nil

	case "CROSS":
		attr, ok := player.Character.Attributes[interaction.Attribute]
		if !ok {
			return nil, errors.New("互动检定属性不存在")
		}
		results := g.RollDice(attr.Current)
		sum := 0
		for _, value := range results {
			sum += value
		}
		g.setLastRollResultUnlocked(state.FullState, sum)
		success := sum >= interaction.Difficulty
		if success {
			if interaction.SuccessMessage != "" {
				g.addLog(roomID, interaction.SuccessMessage, "success")
			}
			g.applyTileInteractionEffectsUnlocked(roomID, playerID, player, interaction.Success)
			g.addPersonalLogUnlocked(state.FullState, playerID, fmt.Sprintf("通过了 %s 检定（%d/%d）。", interaction.Description, sum, interaction.Difficulty), "success")
		} else {
			if interaction.FailureMessage != "" {
				g.addLog(roomID, interaction.FailureMessage, "alert")
			}
			g.applyTileInteractionEffectsUnlocked(roomID, playerID, player, interaction.Failure)
			g.addPersonalLogUnlocked(state.FullState, playerID, fmt.Sprintf("未通过 %s 检定（%d/%d）。", interaction.Description, sum, interaction.Difficulty), "alert")
		}
		return map[string]interface{}{
			"results": results,
			"sum":     sum,
			"actionResult": map[string]interface{}{
				"checkType":       "TILE_INTERACTION",
				"interactionType": interaction.Type,
				"difficulty":      interaction.Difficulty,
				"attribute":       interaction.Attribute,
				"success":         success,
			},
		}, nil

	case "TIME_REWIND":
		results := g.RollDice(6)
		sum := 0
		for _, value := range results {
			sum += value
		}
		g.setLastRollResultUnlocked(state.FullState, sum)
		g.addLog(roomID, fmt.Sprintf("%s 扭动了时间的残响：%v = %d", player.Character.Name, results, sum), "info")
		g.addPersonalLogUnlocked(state.FullState, playerID, fmt.Sprintf("聆听了时间残响：%v = %d。", results, sum), "info")
		return map[string]interface{}{
			"results": results,
			"sum":     sum,
			"actionResult": map[string]interface{}{
				"checkType":       "TILE_INTERACTION",
				"interactionType": interaction.Type,
				"success":         true,
			},
		}, nil

	default:
		return nil, errors.New("该互动需要专用操作")
	}
}
