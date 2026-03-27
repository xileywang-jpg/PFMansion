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
// 规则：双方各将与属性值相等数量的骰子，比较骰子之和，输家受到差值伤害
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

	// ===== 战斗前钩子：允许技能/效果修改骰子点数 =====
	// 这个接口在正式结算前被调用，允许技能、物品、状态效果等修改骰子
	modifiedAttackerRolls, modifiedDefenderRolls := g.ModifyCombatRolls(
		roomID,
		combat.AttackerID,
		combat.DefenderID,
		attackerRolls,
		defenderRolls,
		combat.Attribute,
	)

	// 计算骰子之和（使用可能被修改过的骰子）
	attackerSum := 0
	for _, v := range modifiedAttackerRolls {
		attackerSum += v
	}
	defenderSum := 0
	for _, v := range modifiedDefenderRolls {
		defenderSum += v
	}

	// 记录骰子结果（区分原始和修改后的）
	if !slicesEqual(attackerRolls, modifiedAttackerRolls) || !slicesEqual(defenderRolls, modifiedDefenderRolls) {
		state.FullState.Logs = append(state.FullState.Logs, LogEntry{
			ID:        generateLogID(),
			Timestamp: time.Now().UnixMilli(),
			Text:      fmt.Sprintf("骰子被效果修改: %s = %v → %v(%d), %s = %v → %v(%d)",
				attacker.Character.Name, attackerRolls, modifiedAttackerRolls, attackerSum,
				defender.Character.Name, defenderRolls, modifiedDefenderRolls, defenderSum),
			Type:      "info",
		})
	} else {
		state.FullState.Logs = append(state.FullState.Logs, LogEntry{
			ID:        generateLogID(),
			Timestamp: time.Now().UnixMilli(),
			Text:      fmt.Sprintf("骰子结果: %s = %v(%d), %s = %v(%d)", attacker.Character.Name, modifiedAttackerRolls, attackerSum, defender.Character.Name, modifiedDefenderRolls, defenderSum),
			Type:      "info",
		})
	}

	// 同步战斗骰子结果到 LastRollResult
	g.SetLastRollResult(roomID, attackerSum+defenderSum)

	// 更新战斗状态的骰子记录（使用修改后的结果）
	combat.AttackerRolls = modifiedAttackerRolls
	combat.DefenderRolls = modifiedDefenderRolls

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

// ===== 战斗前钩子：骰子修改接口 =====
// 这个函数在战斗结算前被调用，允许技能/效果修改骰子点数
// 游戏设计师可以通过注册效果来修改骰子行为

// ModifyCombatRolls 战斗前骰子修改钩子
// 参数:
//   - roomID: 房间ID
//   - attackerID: 攻击方玩家ID
//   - defenderID: 防御方玩家ID
//   - attackerRolls: 攻击方原始骰子点数
//   - defenderRolls: 防御方原始骰子点数
//   - attribute: 战斗属性 (might/speed)
// 返回: (修改后的攻击方骰子, 修改后的防御方骰子)
func (g *GameManager) ModifyCombatRolls(
	roomID, attackerID, defenderID string,
	attackerRolls, defenderRolls []int,
	attribute string,
) ([]int, []int) {
	room, ok := g.Rooms[roomID]
	if !ok {
		return attackerRolls, defenderRolls
	}

	state := room.GameState
	if state == nil || state.FullState == nil {
		return attackerRolls, defenderRolls
	}

	// 深拷贝以避免修改原始数据
	modifiedAttackerRolls := make([]int, len(attackerRolls))
	copy(modifiedAttackerRolls, attackerRolls)
	modifiedDefenderRolls := make([]int, len(defenderRolls))
	copy(modifiedDefenderRolls, defenderRolls)

	attacker, hasAttacker := state.FullState.Players[attackerID]
	defender, hasDefender := state.FullState.Players[defenderID]

	// ===== 应用攻击方效果 =====
	if hasAttacker {
		modifiedDefenderRolls = g.applyCombatModifiersToRolls(attacker, modifiedDefenderRolls, attribute, "defender")
	}

	// ===== 应用防御方效果 =====
	if hasDefender {
		modifiedAttackerRolls = g.applyCombatModifiersToRolls(defender, modifiedAttackerRolls, attribute, "attacker")
	}

	// ===== 应用攻击方对自身骰子的效果 =====
	if hasAttacker {
		modifiedAttackerRolls = g.applySelfCombatModifiers(attacker, modifiedAttackerRolls, attribute)
	}

	// ===== 应用防御方对自身骰子的效果 =====
	if hasDefender {
		modifiedDefenderRolls = g.applySelfCombatModifiers(defender, modifiedDefenderRolls, attribute)
	}

	return modifiedAttackerRolls, modifiedDefenderRolls
}

// applyCombatModifiersToRolls 应用对对手骰子的修改效果
// 例如：某些物品效果可以降低对手的骰子点数
func (g *GameManager) applyCombatModifiersToRolls(
	player *GamePlayer,
	rolls []int, attribute string, target string,
) []int {
	modifiedRolls := make([]int, len(rolls))
	copy(modifiedRolls, rolls)

	// 检查玩家持有的物品被动效果 (combat_modifier 类型)
	for _, item := range player.Items {
		if len(item.PassiveEffects) > 0 {
			for _, effect := range item.PassiveEffects {
				if effect.Type == "combat_modifier" && effect.Modifier != 0 {
					// 对对手骰子的修改
					for i := range modifiedRolls {
						modifiedRolls[i] += effect.Modifier
						// 确保骰子点数在有效范围内 [0, 2]
						if modifiedRolls[i] < 0 {
							modifiedRolls[i] = 0
						}
						if modifiedRolls[i] > 2 {
							modifiedRolls[i] = 2
						}
					}
				}
			}
		}
	}

	return modifiedRolls
}

// applySelfCombatModifiers 应用对自身骰子的修改效果
// 例如：祝福状态可以增加自己的骰子点数
func (g *GameManager) applySelfCombatModifiers(
	player *GamePlayer,
	rolls []int, attribute string,
) []int {
	modifiedRolls := make([]int, len(rolls))
	copy(modifiedRolls, rolls)

	// 检查状态效果
	for _, statusEffect := range player.StatusEffects {
		switch statusEffect.Type {
		case "BLESSED":
			// 祝福：所有骰子 +1
			for i := range modifiedRolls {
				modifiedRolls[i] += 1
				if modifiedRolls[i] > 2 {
					modifiedRolls[i] = 2
				}
			}
		case "CURSED":
			// 诅咒：所有骰子 -1
			for i := range modifiedRolls {
				modifiedRolls[i] -= 1
				if modifiedRolls[i] < 0 {
					modifiedRolls[i] = 0
				}
			}
		}
	}

	// 检查物品被动效果 - 自身战斗加成
	for _, item := range player.Items {
		if len(item.PassiveEffects) > 0 {
			for _, effect := range item.PassiveEffects {
				if effect.Type == "combat_buff" && effect.Modifier != 0 {
					// 战斗加成效果
					for i := range modifiedRolls {
						modifiedRolls[i] += effect.Modifier
						if modifiedRolls[i] > 2 {
							modifiedRolls[i] = 2
						}
						if modifiedRolls[i] < 0 {
							modifiedRolls[i] = 0
						}
					}
				}
			}
		}
	}

	return modifiedRolls
}

// slicesEqual 判断两个整数切片是否相等
func slicesEqual(a, b []int) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}
