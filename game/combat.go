package game

import (
	"errors"
	"fmt"
	"time"
)

// ==================== 战斗系统 ====================

// CombatState 战斗状态
type CombatState struct {
	AttackerID string `json:"attackerId"`
	DefenderID string `json:"defenderId"`
	Attribute  string `json:"attribute"`
	Phase      string `json:"phase"` // ATTACKING, DEFENDING, RESOLUTION
}

// StartCombat 开始战斗
func (g *GameManager) StartCombat(roomID, attackerID, defenderID, attribute string) error {
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
	if state.FullState.ActivePlayerID != attackerID {
		return errors.New("还没轮到你")
	}

	// 验证攻击者和防御者存在
	attacker, ok := state.FullState.Players[attackerID]
	if !ok {
		return errors.New("攻击者不存在")
	}
	defender, ok := state.FullState.Players[defenderID]
	if !ok {
		return errors.New("防御者不存在")
	}

	// 设置战斗状态
	state.FullState.ActiveCombat = &CombatState{
		AttackerID: attackerID,
		DefenderID: defenderID,
		Attribute:  attribute,
		Phase:      "ATTACKING",
	}

	state.FullState.Logs = append(state.FullState.Logs, LogEntry{
		ID:        generateLogID(),
		Timestamp: time.Now().UnixMilli(),
		Text:      fmt.Sprintf("%s 对 %s 发起%s战斗！", attacker.Character.Name, defender.Character.Name, attribute),
		Type:      "alert",
	})

	return nil
}

// ResolveCombat 战斗结算 - 后端统一生成骰子结果
func (g *GameManager) ResolveCombat(roomID, playerID string) (map[string]interface{}, error) {
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

	combat := state.FullState.ActiveCombat
	if combat == nil {
		return nil, errors.New("没有进行中的战斗")
	}

	// 🔒 安全修复：后端统一生成骰子结果，不接受前端传入
	attackRoll := g.RollDice(1)[0]
	defenseRoll := g.RollDice(1)[0]

	attacker, _ := state.FullState.Players[combat.AttackerID]
	defender, _ := state.FullState.Players[combat.DefenderID]

	result := map[string]interface{}{
		"attackerRoll": attackRoll,
		"defenderRoll": defenseRoll,
		"attackerWon":  attackRoll > defenseRoll,
	}

	// 结算伤害
	if attackRoll > defenseRoll {
		// 攻击成功
		damage := attackRoll - defenseRoll
		if damageAttr, ok := defender.Character.Attributes[combat.Attribute]; ok {
			damageAttr.Current -= damage
			if damageAttr.Current < damageAttr.Floor {
				damageAttr.Current = damageAttr.Floor
			}
			state.FullState.Logs = append(state.FullState.Logs, LogEntry{
				ID:        generateLogID(),
				Timestamp: time.Now().UnixMilli(),
				Text:      fmt.Sprintf("%s 对 %s 造成 %d 点%s伤害！", attacker.Character.Name, defender.Character.Name, damage, combat.Attribute),
				Type:      "alert",
			})

			// 检查死亡
			if damageAttr.Current <= damageAttr.Floor {
				state.FullState.Players[combat.DefenderID].IsDead = true
				state.FullState.Logs = append(state.FullState.Logs, LogEntry{
					ID:        generateLogID(),
					Timestamp: time.Now().UnixMilli(),
					Text:      fmt.Sprintf("%s 在战斗中陨落了！", defender.Character.Name),
					Type:      "alert",
				})
			}
		}
	} else {
		// 防御成功
		state.FullState.Logs = append(state.FullState.Logs, LogEntry{
			ID:        generateLogID(),
			Timestamp: time.Now().UnixMilli(),
			Text:      fmt.Sprintf("%s 成功防御了 %s 的攻击！", defender.Character.Name, attacker.Character.Name),
			Type:      "info",
		})
	}

	// 清除战斗状态
	state.FullState.ActiveCombat = nil

	return result, nil
}
