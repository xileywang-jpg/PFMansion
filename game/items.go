package game

import (
	"errors"
	"fmt"
	"strings"
	"time"
)

func normalizeEffectType(effectType string) string {
	switch strings.ToUpper(effectType) {
	case "MODIFY_STAT", "DAMAGE", "HEAL", "DRAW_CARD", "MOVE_PLAYER", "LOG", "IF", "GIVE_ITEM", "GIVE_SKILL", "ROLL", "REVEAL_MAP", "REVEAL_TRAIL", "CLEAR_LAST_ROLL", "REVEAL_NEXT_EVENT":
		return strings.ToUpper(effectType)
	}

	switch strings.ToLower(effectType) {
	case "modify_stat":
		return "MODIFY_STAT"
	case "damage":
		return "DAMAGE"
	case "heal":
		return "HEAL"
	case "draw_card":
		return "DRAW_CARD"
	case "move_player", "teleport":
		return "MOVE_PLAYER"
	case "log", "narrative_log":
		return "LOG"
	case "if":
		return "IF"
	case "give_item", "gain_item":
		return "GIVE_ITEM"
	case "give_skill":
		return "GIVE_SKILL"
	case "roll":
		return "ROLL"
	case "reveal_all", "reveal_map":
		return "REVEAL_MAP"
	case "reveal_trail":
		return "REVEAL_TRAIL"
	case "clear_last_roll":
		return "CLEAR_LAST_ROLL"
	case "reveal_next_event":
		return "REVEAL_NEXT_EVENT"
	default:
		return strings.ToUpper(effectType)
	}
}

func normalizeEffect(effect Effect) Effect {
	effect.Type = normalizeEffectType(effect.Type)
	if effect.Location != "" {
		effect.Location = strings.ToLower(strings.TrimSpace(effect.Location))
	}
	if effect.Stat == "" && effect.Attribute != "" {
		effect.Stat = strings.ToLower(effect.Attribute)
	}
	if effect.Attribute == "" && effect.Stat != "" {
		effect.Attribute = strings.ToLower(effect.Stat)
	}
	if effect.Deck != "" {
		effect.Deck = strings.ToUpper(effect.Deck)
	}
	for i := range effect.Then {
		effect.Then[i] = normalizeEffect(effect.Then[i])
	}
	for i := range effect.Else {
		effect.Else[i] = normalizeEffect(effect.Else[i])
	}
	return effect
}

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

	player, err := g.requireActivePlayerUnlocked(state.FullState, playerID)
	if err != nil {
		return err
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
			if i.ID == itemID {
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
	targetPlayer, ok := state.FullState.Players[targetPlayerID]
	if !ok {
		return errors.New("目标玩家不存在")
	}
	if targetPlayer.IsDead {
		return errors.New("已死亡的玩家不能成为目标")
	}
	if targetPlayerID != playerID && targetPlayer.Position != player.Position {
		return errors.New("目标不在同一房间")
	}

	playerName := player.Character.Name

	// 记录日志
	state.FullState.Logs = append(state.FullState.Logs, LogEntry{
		ID:        generateLogID(),
		Timestamp: time.Now().UnixMilli(),
		Text:      fmt.Sprintf("%s 使用了 %s", playerName, item.Name),
		Type:      "info",
	})

	// 应用物品效果
	if item.Usage != nil {
		for _, effect := range item.Usage.Effects {
			g.applyEffect(roomID, targetPlayerID, effect)
		}

		// 如果是消耗品，移除物品
		if item.Usage.IsConsumable {
			for i, iCard := range player.Items {
				if iCard.ID == itemID {
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
			Text:      fmt.Sprintf("%s 获得了被动效果: %s", playerName, passive.Text),
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

	player, err := g.requireActivePlayerUnlocked(state.FullState, playerID)
	if err != nil {
		return err
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
	targetPlayer, ok := state.FullState.Players[targetPlayerID]
	if !ok {
		return errors.New("目标玩家不存在")
	}
	if targetPlayer.IsDead {
		return errors.New("已死亡的玩家不能成为目标")
	}
	if targetPlayerID != playerID && targetPlayer.Position != player.Position {
		return errors.New("目标不在同一房间")
	}

	// 记录日志
	state.FullState.Logs = append(state.FullState.Logs, LogEntry{
		ID:        generateLogID(),
		Timestamp: time.Now().UnixMilli(),
		Text:      fmt.Sprintf("%s 使用了技能: %s", player.Character.Name, skill.Name),
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
	effect = normalizeEffect(effect)

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

	if handler := coreEffectHandler(effect.Type); handler != nil {
		handler(g, roomID, playerID, state.FullState, player, effect)
		return
	}

	switch effect.Type {
	case "SPAWN_NPC":
		// 生成 NPC 怪物
		npcDefID := effect.NPCDefID
		if npcDefID == "" {
			npcDefID = "npc_ghost" // 默认幽灵
		}
		_, err := g.SpawnNPCEffect(roomID, playerID, npcDefID)
		if err != nil {
			g.addLog(roomID, fmt.Sprintf("生成 NPC 失败: %s", err.Error()), "alert")
		}

	case "ATTACK_NPC":
		// 攻击 NPC（玩家主动攻击）
		npcInstanceID := effect.NPCInstanceID
		if npcInstanceID != "" {
			result, err := g.AttackNPC(roomID, playerID, npcInstanceID)
			if err != nil {
				g.addLog(roomID, fmt.Sprintf("攻击 NPC 失败: %s", err.Error()), "alert")
			} else {
				if result["defeated"] == true {
					g.addLog(roomID, fmt.Sprintf("%s 击败了怪物！", player.Character.Name), "success")
				}
			}
		}
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

func (g *GameManager) addPersonalLogUnlocked(state *GameStateFull, playerID, text, logType string) {
	if state == nil {
		return
	}

	player, ok := state.Players[playerID]
	if !ok || player == nil {
		return
	}

	player.PersonalLogs = append(player.PersonalLogs, PersonalLog{
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

// removePassiveEffects 回退物品/厄运离开玩家时带来的被动效果
func (g *GameManager) removePassiveEffects(roomID, playerID string, card Card) {
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

	for _, passive := range card.PassiveEffects {
		g.parseAndRemovePassiveEffect(roomID, passive, player)
	}
}

// parseAndApplyPassiveEffect 解析并应用单个被动效果
func (g *GameManager) parseAndApplyPassiveEffect(roomID, playerID string, passive PassiveEffect, player *GamePlayer) {
	text := passive.Text

	// 根据效果类型处理
	switch passive.Type {
	case "skill":
		// 获得技能类型
		if strings.HasPrefix(text, "获得技能：") {
			skillName := strings.TrimPrefix(text, "获得技能：")
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
		}

	case "buff", "debuff":
		// 属性加成/减少
		// 支持格式: "力量 +1" "速度 +1" "理智 -1" "知识 +2"
		// 多重: "知识 +2，理智 -1" 或 "知识+2,理智-1"
		text = strings.ReplaceAll(text, "，", ",")
		parts := strings.Split(text, ",")

		for _, part := range parts {
			part = strings.TrimSpace(part)
			if part == "" {
				continue
			}

			// 解析 "属性 +N" 或 "属性 -N"
			attrName, amount := parseAttributeChange(part)
			if attrName != "" && amount != 0 {
				if attr, ok := player.Character.Attributes[attrName]; ok {
					// debuff 类型取反数值
					if passive.Type == "debuff" {
						amount = -amount
					}
					attr.Current += amount
					if attr.Current < attr.Floor {
						attr.Current = attr.Floor
					}
					if attr.Current > attr.Max {
						attr.Current = attr.Max
					}
					// 将修改后的属性存回 map
					player.Character.Attributes[attrName] = attr
					logMsg := fmt.Sprintf("%s 的 %s %s%d", player.Character.Name, attrName, formatSignForPassive(amount), amount)
					g.addLog(roomID, logMsg, "info")
				}
			}
		}

	case "special":
		// 特殊效果（如"允许破坏墙壁"）
		player.Buffs = append(player.Buffs, text)
		g.addLog(roomID, fmt.Sprintf("%s 获得效果: %s", player.Character.Name, text), "info")
	}
}

func (g *GameManager) parseAndRemovePassiveEffect(roomID string, passive PassiveEffect, player *GamePlayer) {
	text := passive.Text

	switch passive.Type {
	case "skill":
		if strings.HasPrefix(text, "获得技能：") {
			skillName := strings.TrimPrefix(text, "获得技能：")
			skillID := g.getSkillIDByName(skillName)
			if skillID == "" {
				return
			}
			for i, existing := range player.Skills {
				if existing == skillID {
					player.Skills = append(player.Skills[:i], player.Skills[i+1:]...)
					g.addLog(roomID, fmt.Sprintf("%s 失去了技能: %s", player.Character.Name, skillName), "info")
					break
				}
			}
		}

	case "buff", "debuff":
		text = strings.ReplaceAll(text, "，", ",")
		parts := strings.Split(text, ",")
		for _, part := range parts {
			part = strings.TrimSpace(part)
			if part == "" {
				continue
			}

			attrName, amount := parseAttributeChange(part)
			if attrName == "" || amount == 0 {
				continue
			}
			if attr, ok := player.Character.Attributes[attrName]; ok {
				if passive.Type == "debuff" {
					amount = -amount
				}
				attr.Current -= amount
				if attr.Current < attr.Floor {
					attr.Current = attr.Floor
				}
				if attr.Current > attr.Max {
					attr.Current = attr.Max
				}
				player.Character.Attributes[attrName] = attr
				g.addLog(roomID, fmt.Sprintf("%s 的 %s 失去了 %d 点加成", player.Character.Name, attrName, amount), "info")
			}
		}

	case "special":
		for i, buff := range player.Buffs {
			if buff == text {
				player.Buffs = append(player.Buffs[:i], player.Buffs[i+1:]...)
				g.addLog(roomID, fmt.Sprintf("%s 失去了效果: %s", player.Character.Name, text), "info")
				break
			}
		}
	}
}

// formatSignForPassive 格式化正负号（用于日志）
func formatSignForPassive(amount int) string {
	if amount > 0 {
		return "+"
	}
	return ""
}

// parseAttributeChange 解析属性变化字符串
// 返回: 属性名, 变化值
func parseAttributeChange(s string) (string, int) {
	s = strings.TrimSpace(s)

	// 属性名映射
	attrMap := map[string]string{
		"力量":        "might",
		"速度":        "speed",
		"理智":        "sanity",
		"知识":        "knowledge",
		"might":     "might",
		"speed":     "speed",
		"sanity":    "sanity",
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
		"爆发":   "skill_sprint",
		"冥想":   "skill_meditate",
		"闪避":   "skill_dodge",
	}

	if id, ok := nameToID[skillName]; ok {
		return id
	}

	// 尝试模糊匹配
	return FindSkillByName(skillName)
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
					// 将修改后的属性存回 map
					player.Character.Attributes[attrName] = attr
					g.addLog(roomID, fmt.Sprintf("%s 的 %s %s (条件触发)",
						player.Character.Name, attrName, formatSign(amount)), "info")
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

// UnlockSkillNode 解锁技能树节点
func (g *GameManager) UnlockSkillNode(roomID, playerID, nodeId string) error {
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

	// 检查是否已解锁
	for _, unlocked := range player.UnlockedSkillNodes {
		if unlocked == nodeId {
			return errors.New("该节点已解锁")
		}
	}

	// 添加到已解锁列表
	player.UnlockedSkillNodes = append(player.UnlockedSkillNodes, nodeId)

	// 应用技能节点增益
	if grant := GetSkillNodeGrant(nodeId); grant != nil {
		// 应用技能
		if grant.GrantsSkillID != "" {
			// 检查是否已有该技能
			hasSkill := false
			for _, s := range player.Skills {
				if s == grant.GrantsSkillID {
					hasSkill = true
					break
				}
			}
			if !hasSkill {
				player.Skills = append(player.Skills, grant.GrantsSkillID)
				skill := GetSkill(grant.GrantsSkillID)
				skillName := grant.GrantsSkillID
				if skill != nil {
					skillName = skill.Name
				}
				g.addLog(roomID, fmt.Sprintf("%s 习得了技能: %s", player.Character.Name, skillName), "success")
			}
		}

		for _, effect := range grant.GrantsEffects {
			message := applySkillNodeGrantEffect(player, effect)
			if message != "" {
				g.addLog(roomID, fmt.Sprintf("%s 获得了增益: %s", player.Character.Name, message), "info")
			}
		}

		if len(grant.GrantsEffects) == 0 && grant.GrantsBuff != "" {
			g.addLog(roomID, fmt.Sprintf("%s 的技能节点 %s 仍使用旧版 grantsBuff 配置，请迁移到 grantsEffects", player.Character.Name, nodeId), "alert")
		}
	}

	// 记录日志
	g.addLog(roomID, fmt.Sprintf("%s 习得了技能节点: %s", player.Character.Name, nodeId), "success")

	return nil
}

func applySkillNodeGrantEffect(player *GamePlayer, effect SkillNodeGrantEffectJSON) string {
	switch effect.Type {
	case "MODIFY_ATTRIBUTE":
		if effect.Stat == "" || effect.Amount == 0 {
			return ""
		}
		attr, ok := player.Character.Attributes[effect.Stat]
		if !ok {
			return ""
		}
		attr.Max += effect.Amount
		if attr.Max < attr.Floor {
			attr.Max = attr.Floor
		}
		attr.Current += effect.Amount
		if attr.Current < attr.Floor {
			attr.Current = attr.Floor
		}
		if attr.Current > attr.Max {
			attr.Current = attr.Max
		}
		player.Character.Attributes[effect.Stat] = attr
		if effect.Description != "" {
			return effect.Description
		}
		return fmt.Sprintf("%s %+d", effect.Stat, effect.Amount)
	case "ADD_BUFF":
		if effect.Buff == "" {
			return ""
		}
		player.Buffs = append(player.Buffs, effect.Buff)
		if effect.Description != "" {
			return effect.Description
		}
		return effect.Buff
	default:
		return ""
	}
}
