package game

import (
	"errors"
	"fmt"
	"time"
)

// ==================== 事件系统 ====================

// CardChoice 卡牌选项 (使用 data.go 中的 Effect)
type CardChoice struct {
	Text    string   `json:"text"`
	Effects []Effect `json:"effects"`
}

// DrawCard 抽卡
func (g *GameManager) DrawCard(roomID, playerID, cardType string) (map[string]interface{}, error) {
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

	// 验证是否是当前玩家
	if state.FullState.ActivePlayerID != playerID {
		return nil, errors.New("还没轮到你")
	}

	// 牌堆已在 StartGame 中初始化

	deckName := ""
	switch cardType {
	case "EVENT":
		deckName = "EVENT"
	case "ITEM":
		deckName = "ITEM"
	case "OMEN":
		deckName = "OMEN"
	case "NONE", "":
		return nil, errors.New("该位置不需要抽卡")
	default:
		return nil, errors.New("无效的卡牌类型")
	}

	deck := state.FullState.Decks[deckName]
	if len(deck) == 0 {
		state.FullState.Logs = append(state.FullState.Logs, LogEntry{
			ID:        generateLogID(),
			Timestamp: time.Now().UnixMilli(),
			Text:      fmt.Sprintf("%s 牌堆已空！", deckName),
			Type:      "alert",
		})
		return nil, errors.New(fmt.Sprintf("%s 牌堆已空", deckName))
	}

	// 抽取卡牌
	card := deck[0]
	state.FullState.Decks[deckName] = deck[1:]

	return map[string]interface{}{
		"card": card,
		"deck": deckName,
	}, nil
}

// ResolveEventChoice 处理事件选择
func (g *GameManager) ResolveEventChoice(roomID, playerID string, choiceIndex int) error {
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

	if state.FullState.ActiveCard == nil {
		return errors.New("没有激活的事件")
	}

	card := state.FullState.ActiveCard

	// 根据交互类型处理
	if card.Interaction != nil {
		switch card.Interaction.Type {
		case "ATTRIBUTE_CHECK":
			// 属性检定：choiceIndex 0 = 成功, 1 = 失败
			if choiceIndex == 0 {
				// 成功效果
				for _, effect := range card.Interaction.Success {
					g.applyEffect(roomID, playerID, effect)
				}
			} else {
				// 失败效果
				for _, effect := range card.Interaction.Failure {
					g.applyEffect(roomID, playerID, effect)
				}
			}

		case "CHOICE":
			// 选择：choiceIndex 表示选项索引
			options := card.Interaction.Options
			if choiceIndex < 0 || choiceIndex >= len(options) {
				return errors.New("无效的选项")
			}
			choice := options[choiceIndex]
			state.FullState.Logs = append(state.FullState.Logs, LogEntry{
				ID:        generateLogID(),
				Timestamp: time.Now().UnixMilli(),
				Text:      fmt.Sprintf("%s 选择了: %s", g.getPlayerName(playerID, state.FullState), choice.Label),
				Type:      "info",
			})
			// 执行选择效果
			for _, effect := range choice.Effects {
				g.applyEffect(roomID, playerID, effect)
			}
		}
	}

	// 清除激活的卡牌和待处理动作
	state.FullState.ActiveCard = nil
	state.FullState.PendingAction = nil
	state.FullState.TurnPhase = TurnPhaseDone

	return nil
}

func (g *GameManager) getPlayerName(playerID string, state *GameStateFull) string {
	if player, ok := state.Players[playerID]; ok {
		return player.Character.Name
	}
	return "未知玩家"
}
