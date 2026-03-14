package game

import (
	"errors"
	"fmt"
	"math/rand"
	"strings"
	"time"
)

// ==================== 物品系统 ====================

// UseItem 使用物品
func (g *GameManager) UseItem(roomID, playerID, itemID, targetID string) error {
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

	// 从数据中获取物品定义
	item := GetItem(itemID)
	if item == nil {
		return errors.New("物品不存在")
	}

	// 检查是否是消耗品且玩家没有
	if item.Usage != nil && item.Usage.IsConsumable {
		hasItem := false
		for _, i := range player.Items {
			if i == itemID {
				hasItem = true
				break
			}
		}
		if !hasItem {
			return errors.New("没有该物品")
		}
	}

	// 确定目标玩家
	targetPlayerID := playerID
	if targetID != "" {
		targetPlayerID = targetID
	}

	playerName := player.Character.Name

	// 记录日志
	state.FullState.Logs = append(state.FullState.Logs, LogEntry{
		ID:        generateLogID(),
		Timestamp: time.Now().UnixMilli(),
		Text:      fmt.Sprintf("%s 使用了 %s", playerName, item.Title),
		Type:      "info",
	})

	// 应用物品效果
	if item.Usage != nil {
		for _, effect := range item.Usage.Effects {
			g.applyEffect(roomID, targetPlayerID, effect)
		}

		// 如果是消耗品，移除物品
		if item.Usage.IsConsumable {
			for i, iID := range player.Items {
				if iID == itemID {
					player.Items = append(player.Items[:i], player.Items[i+1:]...)
					break
				}
			}
		}
	}

	// 应用被动效果（如果有）
	for _, passive := range item.PassiveEffects {
		state.FullState.Logs = append(state.FullState.Logs, LogEntry{
			ID:        generateLogID(),
			Timestamp: time.Now().UnixMilli(),
			Text:      fmt.Sprintf("%s 获得了被动效果: %s", playerName, passive),
			Type:      "info",
		})
	}

	return nil
}

// ==================== 技能系统 ====================

// ExecuteSkill 执行技能
func (g *GameManager) ExecuteSkill(roomID, playerID, skillID, targetID string) error {
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

	// 检查技能是否已解锁
	hasSkill := false
	for _, s := range player.Skills {
		if s == skillID {
			hasSkill = true
			break
		}
	}

	if !hasSkill {
		return errors.New("未解锁该技能")
	}

	// 从数据中获取技能定义
	skill := GetSkill(skillID)
	if skill == nil {
		return errors.New("技能不存在")
	}

	// 确定目标玩家
	targetPlayerID := playerID
	if targetID != "" {
		targetPlayerID = targetID
	}

	// 记录日志
	state.FullState.Logs = append(state.FullState.Logs, LogEntry{
		ID:        generateLogID(),
		Timestamp: time.Now().UnixMilli(),
		Text:      fmt.Sprintf("%s 使用了技能: %s", player.Character.Name, skill.Title),
		Type:      "info",
	})

	// 应用技能效果
	if skill.Usage != nil {
		for _, effect := range skill.Usage.Effects {
			g.applyEffect(roomID, targetPlayerID, effect)
		}
	}

	return nil
}

// ==================== 效果应用 ====================

// applyEffect 应用效果（完整版）
func (g *GameManager) applyEffect(roomID, playerID string, effect Effect) {
	room, ok := g.Rooms[roomID]
	if !ok {
		return
	}

	state := room.GameState
	if state == nil || state.FullState == nil {
		return
	}

	// 获取目标玩家
	targetID := playerID
	if effect.Target == "SELECTED_PARTNER" {
		// 需要外部传入 target，这里暂时用 playerID
		targetID = playerID
	}

	player, ok := state.FullState.Players[targetID]
	if !ok {
		return
	}

	switch effect.Type {
	case "MODIFY_STAT":
		// 修改属性（可正可负）
		attrName := effect.Stat
		if attrName == "" {
			attrName = effect.Attribute // 兼容
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
			// 记录日志
			if amount != 0 {
				logMsg := fmt.Sprintf("%s 的 %s %s%d (当前: %d)", 
					player.Character.Name, attrName, formatSign(amount), amount, attr.Current)
				g.addLog(roomID, logMsg, "info")
			}
			// 检查死亡
			if attrName == "might" && attr.Current <= attr.Floor {
				player.IsDead = true
				g.addLog(roomID, fmt.Sprintf("%s 在大厦中殒落了...", player.Character.Name), "alert")
			}
		}

	case "DAMAGE":
		// 伤害 = 属性减少
		attrName := effect.Stat
		if attrName == "" {
			attrName = "might" // 默认
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
			g.addLog(roomID, fmt.Sprintf("%s 受到 %d 点%s伤害！", player.Character.Name, damage, attrName), "alert")
			// 检查死亡
			if attr.Current <= attr.Floor {
				player.IsDead = true
				g.addLog(roomID, fmt.Sprintf("%s 在伤害中陨落了...", player.Character.Name), "alert")
			}
		}

	case "HEAL":
		// 治疗 = 属性增加
		attrName := effect.Stat
		if attrName == "" {
			attrName = "might" // 默认
		}
		if attr, ok := player.Character.Attributes[attrName]; ok {
			attr.Current += effect.Amount
			if attr.Current > attr.Max {
				attr.Current = attr.Max
			}
			g.addLog(roomID, fmt.Sprintf("%s 恢复了 %d 点%s！", player.Character.Name, effect.Amount, attrName), "success")
		}

	case "DRAW_CARD":
		// 抽卡
		deckName := effect.Deck
		if deckName == "" {
			deckName = "ITEM" // 默认
		}
		deck := state.FullState.Decks[deckName]
		if len(deck) > 0 {
			card := deck[0]
			state.FullState.Decks[deckName] = deck[1:]
			g.addLog(roomID, fmt.Sprintf("%s 抽到了 %s", player.Character.Name, card.Title), "success")
			
			// 添加到玩家物品栏（如果是物品卡或厄运卡）
			if card.Type == "ITEM" {
				player.Items = append(player.Items, card.ID)
				g.addLog(roomID, fmt.Sprintf("%s 获得了物品: %s", player.Character.Name, card.Title), "info")
				
				// 检查并应用被动效果
				g.applyPassiveEffects(roomID, playerID, card)
			}
			if card.Type == "OMEN" {
				player.Items = append(player.Items, card.ID)
				g.addLog(roomID, fmt.Sprintf("%s 获得了厄运: %s", player.Character.Name, card.Title), "info")
				
				// 检查并应用被动效果
				g.applyPassiveEffects(roomID, playerID, card)
			}
		} else {
			g.addLog(roomID, fmt.Sprintf("%s 牌堆已空！", deckName), "alert")
		}

	case "MOVE_PLAYER":
		// 移动玩家到特定位置
		newX := player.Position.X
		newY := player.Position.Y
		
		// 优先使用坐标，其次使用命名位置
		if effect.X != 0 || effect.Y != 0 {
			// 使用指定坐标
			newX = effect.X
			newY = effect.Y
		} else if effect.Location != "" {
			// 使用命名位置
			switch effect.Location {
			case "basement":
				newX, newY = 0, 0 // 简化为入口，实际应该到地下室
			case "entry", "start":
				newX, newY = 0, 0
			case "random":
				// 随机移动 - 简单实现：随机偏移
				newX += rand.Intn(5) - 2
				newY += rand.Intn(5) - 2
			default:
				newX, newY = 0, 0
			}
		}
		
		// 检查目标位置是否有效（在地图内）
		targetKey := fmt.Sprintf("%d,%d", newX, newY)
		if _, exists := state.FullState.Map[targetKey]; exists {
			oldX, oldY := player.Position.X, player.Position.Y
			player.Position.X = newX
			player.Position.Y = newY
			g.addLog(roomID, fmt.Sprintf("%s 从 (%d,%d) 移动到了 (%d,%d)", 
				player.Character.Name, oldX, oldY, newX, newY), "info")
		} else {
			// 目标位置不存在，随机找一个可达位置
			g.addLog(roomID, fmt.Sprintf("%s 被传送到了未知区域", player.Character.Name), "alert")
			// 移动到入口
			player.Position.X = 0
			player.Position.Y = 0
		}

	case "LOG", "narrative_log":
		// 日志消息
		logType := "info"
		if effect.Style != "" {
			logType = effect.Style
		}
		if effect.Message != "" {
			g.addLog(roomID, effect.Message, logType)
		}

	case "IF":
		// 条件分支
		conditionMet := false
		if effect.Condition != nil {
			switch effect.Condition.Op {
			case "HAS_ITEM":
				// 检查玩家是否有物品
				for _, itemID := range player.Items {
					if itemID == effect.Condition.ItemID {
						conditionMet = true
						break
					}
				}
			case "HAS_SKILL":
				// 检查玩家是否有技能
				for _, skillID := range player.Skills {
					if skillID == effect.Condition.SkillID {
						conditionMet = true
						break
					}
				}
			}

			// 执行对应效果
			if conditionMet {
				for _, thenEffect := range effect.Then {
					g.applyEffect(roomID, playerID, thenEffect)
				}
			} else {
				for _, elseEffect := range effect.Else {
					g.applyEffect(roomID, playerID, elseEffect)
				}
			}
		}

	case "GIVE_ITEM":
		// 给予物品
		itemID := effect.Message // 用 Message 存物品ID
		if itemID != "" {
			player.Items = append(player.Items, itemID)
			item := GetItem(itemID)
			itemName := itemID
			if item != nil {
				itemName = item.Title
			}
			g.addLog(roomID, fmt.Sprintf("%s 获得了物品: %s", player.Character.Name, itemName), "success")
		}

	case "GIVE_SKILL":
		// 给予技能
		skillID := effect.Message // 用 Message 存技能ID
		if skillID != "" {
			// 检查是否已有
			hasSkill := false
			for _, s := range player.Skills {
				if s == skillID {
					hasSkill = true
					break
				}
			}
			if !hasSkill {
				player.Skills = append(player.Skills, skillID)
				skill := GetSkill(skillID)
				skillName := skillID
				if skill != nil {
					skillName = skill.Title
				}
				g.addLog(roomID, fmt.Sprintf("%s 习得了技能: %s", player.Character.Name, skillName), "success")
			}
		}

	case "ROLL":
		// 投骰子检定 - 设置待处理动作
		attrName := effect.Attribute
		if attrName == "" {
			attrName = "might"
		}
		difficulty := effect.Difficulty
		if difficulty == 0 {
			difficulty = 3
		}
		state.FullState.PendingAction = &PendingAction{
			Type: "ATTRIBUTE_CHECK",
			Target: playerID,
			Data: map[string]interface{}{
				"attribute":  attrName,
				"difficulty": difficulty,
			},
		}
		g.addLog(roomID, fmt.Sprintf("%s 需要进行 %s 检定 (难度 %d)", player.Character.Name, attrName, difficulty), "info")
	}
}

// addLog 辅助函数：添加日志
func (g *GameManager) addLog(roomID, text, logType string) {
	room, ok := g.Rooms[roomID]
	if !ok {
		return
	}

	state := room.GameState
	if state == nil || state.FullState == nil {
		return
	}

	state.FullState.Logs = append(state.FullState.Logs, LogEntry{
		ID:        generateLogID(),
		Timestamp: time.Now().UnixMilli(),
		Text:      text,
		Type:      logType,
	})
}

// ==================== 被动效果系统 ====================

// applyPassiveEffects 检查并应用物品/厄运的被动效果
// 被动效果格式示例：
// - "理智 +1"           // 简单属性加成
// - "力量 +1，速度 +1"  // 多重属性加成
// - "攻击时力量 +2"     // 条件触发（需要在特定动作时检查）
// - "获得技能：嗜血打击" // 获得技能
// - "知识 +2，理智 -1"  // 正负属性
func (g *GameManager) applyPassiveEffects(roomID, playerID string, card Card) {
	room, ok := g.Rooms[roomID]
	if !ok {
		return
	}

	state := room.GameState
	if state == nil || state.FullState == nil {
		return
	}

	player, ok := state.FullState.Players[playerID]
	if !ok {
		return
	}

	// 解析并应用每个被动效果
	for _, passive := range card.PassiveEffects {
		g.parseAndApplyPassiveEffect(roomID, playerID, passive, player)
	}
}

// parseAndApplyPassiveEffect 解析并应用单个被动效果
func (g *GameManager) parseAndApplyPassiveEffect(roomID, playerID string, passive string, player *GamePlayer) {
	// 解析格式："属性 +1" 或 "属性 -1" 或 "属性 +1，速度 +1"
	// 解析格式："获得技能：xxx"
	// 解析格式："攻击时力量 +2" (条件触发，暂存)
	
	// 检查是否是"获得技能"类型
	if strings.HasPrefix(passive, "获得技能：") {
		skillName := strings.TrimPrefix(passive, "获得技能：")
		skillID := g.getSkillIDByName(skillName)
		if skillID != "" {
			// 检查是否已有
			hasSkill := false
			for _, s := range player.Skills {
				if s == skillID {
					hasSkill = true
					break
				}
			}
			if !hasSkill {
				player.Skills = append(player.Skills, skillID)
				g.addLog(roomID, fmt.Sprintf("%s 习得了技能: %s", player.Character.Name, skillName), "success")
			}
		}
		return
	}

	// 检查是否是条件触发类型（如"攻击时力量 +2"）
	if strings.Contains(passive, "攻击时") {
		// 条件触发，暂存到玩家的条件buff中
		// 格式："攻击时力量 +2"
		player.Buffs = append(player.Buffs, passive)
		g.addLog(roomID, fmt.Sprintf("%s 获得增益: %s", player.Character.Name, passive), "info")
		return
	}

	// 解析属性加成/减少
	// 支持格式: "力量 +1" "速度 +1" "理智 -1" "知识 +2"
	// 多重: "知识 +2，理智 -1" 或 "知识+2,理智-1"
	passive = strings.ReplaceAll(passive, "，", ",")
	parts := strings.Split(passive, ",")

	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}

		// 解析 "属性 +N" 或 "属性 -N"
		attrName, amount := parseAttributeChange(part)
		if attrName != "" && amount != 0 {
			if attr, ok := player.Character.Attributes[attrName]; ok {
				attr.Current += amount
				if attr.Current < attr.Floor {
					attr.Current = attr.Floor
				}
				if attr.Current > attr.Max {
					attr.Current = attr.Max
				}
				sign := "+"
				if amount < 0 {
					sign = ""
				}
				g.addLog(roomID, fmt.Sprintf("%s 的 %s %s%d (被动效果)", 
					player.Character.Name, attrName, sign, amount), "info")
			}
		}
	}
}

// parseAttributeChange 解析属性变化字符串
// 返回: 属性名, 变化值
func parseAttributeChange(s string) (string, int) {
	s = strings.TrimSpace(s)
	
	// 属性名映射
	attrMap := map[string]string{
		"力量": "might",
		"速度": "speed",
		"理智": "sanity",
		"知识": "knowledge",
		"might": "might",
		"speed": "speed",
		"sanity": "sanity",
		"knowledge": "knowledge",
	}

	// 查找属性名
	var attrName string
	var attrCN string
	for cn, en := range attrMap {
		if strings.HasPrefix(s, cn) || strings.HasPrefix(s, en) {
			attrName = en
			attrCN = cn
			break
		}
	}

	if attrName == "" {
		return "", 0
	}

	// 提取数字部分
	numStr := strings.TrimPrefix(s, attrCN)
	numStr = strings.TrimPrefix(s, attrName)
	numStr = strings.TrimSpace(numStr)
	numStr = strings.TrimPrefix(numStr, "+")

	if numStr == "" {
		return "", 0
	}

	amount := 0
	fmt.Sscanf(numStr, "%d", &amount)

	return attrName, amount
}

// getSkillIDByName 根据技能名获取技能ID
func (g *GameManager) getSkillIDByName(skillName string) string {
	// 简单匹配
	nameToID := map[string]string{
		"嗜血打击": "skill_vampiric_strike",
		"爆发":     "skill_sprint",
		"冥想":     "skill_meditate",
		"闪避":     "skill_dodge",
	}

	if id, ok := nameToID[skillName]; ok {
		return id
	}

	// 尝试模糊匹配
	for id, skill := range SkillsData {
		if strings.Contains(skill.Title, skillName) || strings.Contains(skillName, skill.Title) {
			return id
		}
	}

	return ""
}

// ApplyConditionalBuffs 应用条件触发的增益（需要在特定动作时调用）
// 例如：攻击时触发"攻击时力量 +2"
func (g *GameManager) ApplyConditionalBuffs(roomID, playerID, trigger string) {
	room, ok := g.Rooms[roomID]
	if !ok {
		return
	}

	state := room.GameState
	if state == nil || state.FullState == nil {
		return
	}

	player, ok := state.FullState.Players[playerID]
	if !ok {
		return
	}

	// 遍历所有条件buff
	var remainingBuffs []string
	for _, buff := range player.Buffs {
		shouldApply := false

		// 检查触发条件
		switch trigger {
		case "ATTACK":
			if strings.Contains(buff, "攻击时") {
				shouldApply = true
			}
		case "END_TURN":
			if strings.Contains(buff, "回合结束时") {
				shouldApply = true
			}
		case "ENTER_ROOM":
			if strings.Contains(buff, "进入房间时") {
				shouldApply = true
			}
		}

		if shouldApply {
			// 应用buff效果
			// 提取属性变化: "攻击时力量 +2" -> "力量 +2"
			effectStr := strings.TrimPrefix(buff, "攻击时")
			effectStr = strings.TrimPrefix(effectStr, "回合结束时")
			effectStr = strings.TrimPrefix(effectStr, "进入房间时")
			effectStr = strings.TrimSpace(effectStr)

			if attrName, amount := parseAttributeChange(effectStr); attrName != "" && amount != 0 {
				if attr, ok := player.Character.Attributes[attrName]; ok {
					attr.Current += amount
					if attr.Current > attr.Max {
						attr.Current = attr.Max
					}
					g.addLog(roomID, fmt.Sprintf("%s 的 %s %s%d (条件触发)", 
						player.Character.Name, attrName, formatSign(amount), amount), "info")
				}
			}

			// 永久buff保留，临时buff移除
			if !strings.Contains(buff, "限一次") {
				remainingBuffs = append(remainingBuffs, buff)
			}
		} else {
			remainingBuffs = append(remainingBuffs, buff)
		}
	}

	player.Buffs = remainingBuffs
}
