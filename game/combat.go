package game

import (
	"errors"
	"fmt"
	"time"
)

// ==================== 战斗系统 ====================
// 山屋惊魂原版战斗规则:
// - 力量战斗: 双方各投 Might 个骰子
// - 速度战斗: 双方各投 Speed 个骰子
// - 使用骰子之和比较（不是最高骰子）
// - 输家受到差值伤害

// CombatState 战斗状态
type CombatState struct {
	AttackerID    string `json:"attackerId"`
	DefenderID   string `json:"defenderId"`
	Attribute     string `json:"attribute"` // "might" 或 "speed"
	Phase         string `json:"phase"`   // ATTACKING, RESOLUTION
	AttackerRolls []int  `json:"attackerRolls,omitempty"`  // 攻击方骰子结果
	DefenderRolls []int  `json:"defenderRolls,omitempty"`  // 防御方骰子结果
}

// CombatResult 战斗结果
type CombatResult struct {
	AttackerRolls   []int  `json:"attackerRolls"`
	AttackerSum     int    `json:"attackerSum"`
	DefenderRolls   []int  `json:"defenderRolls"`
	DefenderSum     int    `json:"defenderSum"`
	Damage          int    `json:"damage"`
	Loser           string `json:"loser"`        // attacker, defender, 或 "" (平局)
	Draw            bool   `json:"draw"`        // 平局标记
	Attribute       string `json:"attribute"`  // 战斗属性 (might/speed)
	AttackerDied    bool   `json:"attackerDied"`
	DefenderDied    bool   `json:"defenderDied"`
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

	// 验证属性
	if attribute != "might" && attribute != "speed" {
		return errors.New("战斗属性必须是 might 或 speed")
	}

	// 获取各方投骰子数量（基于对应属性）
	attackerAttr, ok := attacker.Character.Attributes[attribute]
	if !ok {
		return errors.New("攻击者没有该属性")
	}
	defenderAttr, ok := defender.Character.Attributes[attribute]
	if !ok {
		return errors.New("防御者没有该属性")
	}

	attackerDiceCount := attackerAttr.Current
	defenderDiceCount := defenderAttr.Current

	// 设置战斗状态
	state.FullState.ActiveCombat = &CombatState{
		AttackerID:    attackerID,
		DefenderID:    defenderID,
		Attribute:     attribute,
		Phase:        "ATTACKING",
		AttackerRolls: make([]int, 0),
		DefenderRolls: make([]int, 0),
	}

	state.FullState.Logs = append(state.FullState.Logs, LogEntry{
		ID:        generateLogID(),
		Timestamp: time.Now().UnixMilli(),
		Text:      fmt.Sprintf("%s 对 %s 发起%s战斗！", attacker.Character.Name, defender.Character.Name, attribute),
		Type:      "alert",
	})
	state.FullState.Logs = append(state.FullState.Logs, LogEntry{
		ID:        generateLogID(),
		Timestamp: time.Now().UnixMilli(),
		Text:      fmt.Sprintf("%s 投出 %d 个骰子，%s 投出 %d 个骰子", attacker.Character.Name, attackerDiceCount, defender.Character.Name, defenderDiceCount),
		Type:      "info",
	})

	return nil
}

// ResolveCombat 战斗结算 - 山屋惊魂规则
// 规则：双方各投与属性值相等数量的骰子，比较骰子之和，输家受到差值伤害
func (g *GameManager) ResolveCombat(roomID, playerID string) (*CombatResult, error) {
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

	attacker, ok := state.FullState.Players[combat.AttackerID]
	if !ok {
		return nil, errors.New("攻击者不存在")
	}
	defender, ok := state.FullState.Players[combat.DefenderID]
	if !ok {
		return nil, errors.New("防御者不存在")
	}

	// 获取各方投骰子数量
	attackerAttr, _ := attacker.Character.Attributes[combat.Attribute]
	defenderAttr, _ := defender.Character.Attributes[combat.Attribute]

	attackerDiceCount := attackerAttr.Current
	defenderDiceCount := defenderAttr.Current

	// 投骰子
	attackerRolls := g.RollDice(attackerDiceCount)
	defenderRolls := g.RollDice(defenderDiceCount)

	// 计算骰子之和
	attackerSum := 0
	for _, v := range attackerRolls {
		attackerSum += v
	}
	defenderSum := 0
	for _, v := range defenderRolls {
		defenderSum += v
	}

	// 记录骰子结果
	state.FullState.Logs = append(state.FullState.Logs, LogEntry{
		ID:        generateLogID(),
		Timestamp: time.Now().UnixMilli(),
		Text:      fmt.Sprintf("骰子结果: %s = %v(%d), %s = %v(%d)", attacker.Character.Name, attackerRolls, attackerSum, defender.Character.Name, defenderRolls, defenderSum),
		Type:      "info",
	})

	// 同步战斗骰子结果到 LastRollResult
	g.SetLastRollResult(roomID, attackerSum+defenderSum)

	// 更新战斗状态的骰子记录
	combat.AttackerRolls = attackerRolls
	combat.DefenderRolls = defenderRolls

	result := &CombatResult{
		AttackerRolls: attackerRolls,
		AttackerSum:   attackerSum,
		DefenderRolls: defenderRolls,
		DefenderSum:   defenderSum,
		Damage:        0,
		Loser:         "",
		Draw:          false,
		Attribute:     combat.Attribute,
	}

	// 结算伤害：骰子之差为伤害，点数低者受伤
	if attackerSum == defenderSum {
		// 平局，无人受伤
		state.FullState.Logs = append(state.FullState.Logs, LogEntry{
			ID:        generateLogID(),
			Timestamp: time.Now().UnixMilli(),
			Text:      fmt.Sprintf("%s 与 %s 交锋，平局收场！", attacker.Character.Name, defender.Character.Name),
			Type:      "info",
		})
		result.Draw = true
	} else if attackerSum < defenderSum {
		// 攻击方点数低，攻击方受伤
		damage := defenderSum - attackerSum
		result.Damage = damage
		result.Loser = combat.AttackerID

		damageAttr, ok := attacker.Character.Attributes[combat.Attribute]
		if ok {
			damageAttr.Current -= damage
			if damageAttr.Current < damageAttr.Floor {
				damageAttr.Current = damageAttr.Floor
			}
			state.FullState.Logs = append(state.FullState.Logs, LogEntry{
				ID:        generateLogID(),
				Timestamp: time.Now().UnixMilli(),
				Text:      fmt.Sprintf("%s 交锋失败，受到 %d 点%s伤害！", attacker.Character.Name, damage, combat.Attribute),
				Type:      "alert",
			})

			// 检查死亡（以 might 为例，力量归零则死亡）
			if combat.Attribute == "might" && damageAttr.Current <= damageAttr.Floor {
				state.FullState.Players[combat.AttackerID].IsDead = true
				result.AttackerDied = true
				state.FullState.Logs = append(state.FullState.Logs, LogEntry{
					ID:        generateLogID(),
					Timestamp: time.Now().UnixMilli(),
					Text:      fmt.Sprintf("%s 在战斗中陨落了！", attacker.Character.Name),
					Type:      "alert",
				})
			}
		}
	} else {
		// 防御方点数低，防御方受伤
		damage := attackerSum - defenderSum
		result.Damage = damage
		result.Loser = combat.DefenderID

		damageAttr, ok := defender.Character.Attributes[combat.Attribute]
		if ok {
			damageAttr.Current -= damage
			if damageAttr.Current < damageAttr.Floor {
				damageAttr.Current = damageAttr.Floor
			}
			state.FullState.Logs = append(state.FullState.Logs, LogEntry{
				ID:        generateLogID(),
				Timestamp: time.Now().UnixMilli(),
				Text:      fmt.Sprintf("%s 交锋失败，受到 %d 点%s伤害！", defender.Character.Name, damage, combat.Attribute),
				Type:      "alert",
			})

			// 检查死亡
			if combat.Attribute == "might" && damageAttr.Current <= damageAttr.Floor {
				state.FullState.Players[combat.DefenderID].IsDead = true
				result.DefenderDied = true
				state.FullState.Logs = append(state.FullState.Logs, LogEntry{
					ID:        generateLogID(),
					Timestamp: time.Now().UnixMilli(),
					Text:      fmt.Sprintf("%s 在战斗中陨落了！", defender.Character.Name),
					Type:      "alert",
				})
			}
		}
	}

	// 清除战斗状态
	state.FullState.ActiveCombat = nil

	return result, nil
}

// GetCombatState 获取当前战斗状态
func (g *GameManager) GetCombatState(roomID string) (*CombatState, error) {
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

	return state.FullState.ActiveCombat, nil
}
