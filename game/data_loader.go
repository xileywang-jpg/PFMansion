package game

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"strings"

	_ "embed"
)

//go:embed data/config.json
var configData []byte

//go:embed data/tiles.json
var tilesData []byte

//go:embed data/events.json
var eventsData []byte

//go:embed data/items.json
var itemsData []byte

//go:embed data/scenarios.json
var scenariosData []byte

//go:embed data/characters.json
var charactersData []byte

//go:embed data/skillTrees.json
var skillTreesData []byte

// ==================== 配置结构 ====================

// ThemeConfig 主题配置
type ThemeConfig struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Description  string `json:"description"`
	PrimaryColor string `json:"primaryColor"`
	Enabled      bool   `json:"enabled"`
}

type CardPoolConfig struct {
	ID      string   `json:"id"`
	CardIDs []string `json:"cardIds"`
}

type NamedLocationConfig struct {
	ID string `json:"id"`
	X  int    `json:"x"`
	Y  int    `json:"y"`
}

// ConfigJSON 配置文件结构
type ConfigJSON struct {
	Themes         []ThemeConfig         `json:"themes"`
	CardPools      []CardPoolConfig      `json:"cardPools,omitempty"`
	NamedLocations []NamedLocationConfig `json:"namedLocations,omitempty"`
}

// ==================== 数据加载器 ====================

// TileDeckJSON 房间牌堆 JSON 结构
type TileDeckJSON struct {
	Original []TileDef `json:"original"`
	Volantis []TileDef `json:"volantis"`
}

// EventsJSON 事件卡 JSON 结构
type EventsJSON struct {
	Events []Card `json:"events"`
}

// ItemsJSON 物品 JSON 结构
type ItemsJSON struct {
	Items       []Card `json:"items"`
	RewardItems []Card `json:"rewardItems,omitempty"`
	Omens       []Card `json:"omens"`
	Skills      []Card `json:"skills"`
}

// HauntMatrixJSON 剧本矩阵 JSON 结构
type HauntMatrixJSON struct {
	HauntMatrix map[string]map[string]string `json:"hauntMatrix"`
	Scenarios   map[string]Scenario          `json:"scenarios"`
}

// CharacterAttributeJSON 角色属性 JSON 结构
type CharacterAttributeJSON struct {
	Values     []int `json:"values"`
	StartIndex int   `json:"startIndex"`
}

// CharacterJSON 角色 JSON 结构
type CharacterJSON struct {
	ID          string                            `json:"id"`
	Name        string                            `json:"name"`
	Description string                            `json:"description"`
	Traits      []string                          `json:"traits"`
	Attributes  map[string]CharacterAttributeJSON `json:"attributes"`
}

type SkillNodeGrantEffectJSON struct {
	Type        string `json:"type"`
	Stat        string `json:"stat,omitempty"`
	Amount      int    `json:"amount,omitempty"`
	Buff        string `json:"buff,omitempty"`
	Description string `json:"description,omitempty"`
}

// CharactersJSON 角色 JSON 结构
type CharactersJSON struct {
	Original []CharacterJSON `json:"original"`
	Volantis []CharacterJSON `json:"volantis"`
}

// SkillTreeNodeJSON 技能树节点 JSON 结构
type SkillTreeNodeJSON struct {
	ID            string                     `json:"id"`
	Name          string                     `json:"name"`
	Description   string                     `json:"description"`
	Cost          int                        `json:"cost"`
	Icon          string                     `json:"icon"`
	Prerequisites []string                   `json:"prerequisites,omitempty"`
	RequiredTrait string                     `json:"requiredTrait,omitempty"`
	GrantsSkillID string                     `json:"grantsSkillId,omitempty"`
	GrantsEffects []SkillNodeGrantEffectJSON `json:"grantsEffects,omitempty"`
	GrantsBuff    string                     `json:"grantsBuff,omitempty"`
	Position      struct {
		Row int `json:"row"`
		Col int `json:"col"`
	} `json:"position"`
}

// SkillTreeCategoryJSON 技能树类别 JSON 结构
type SkillTreeCategoryJSON struct {
	ID          string              `json:"id"`
	Name        string              `json:"name"`
	Description string              `json:"description"`
	Nodes       []SkillTreeNodeJSON `json:"nodes"`
}

// SkillTreesJSON 技能树 JSON 结构
type SkillTreesJSON struct {
	Trees []SkillTreeCategoryJSON `json:"trees"`
}

// DataLoader 数据加载器
var dataLoader *DataLoader

// DataLoader 数据加载器
type DataLoader struct {
	Config           ConfigJSON
	Tiles            TileDeckJSON
	Events           EventsJSON
	Items            ItemsJSON
	Scenarios        HauntMatrixJSON
	Characters       CharactersJSON
	SkillTrees       SkillTreesJSON
	CardPoolMap      map[string][]Card
	NamedLocationMap map[string]Position
}

func ensureDataLoaded() {
	if dataLoader != nil {
		return
	}
	if err := LoadData(); err != nil {
		log.Printf("⚠️ 懒加载游戏数据失败: %v", err)
	}
}

func normalizeTileTrigger(trigger *TileTrigger) {
	if trigger == nil {
		return
	}
	trigger.Type = strings.ToUpper(trigger.Type)
	if trigger.Attribute != "" {
		trigger.Attribute = strings.ToLower(trigger.Attribute)
	}
	if trigger.Deck != "" {
		trigger.Deck = strings.ToUpper(trigger.Deck)
	}
	for i := range trigger.Success {
		trigger.Success[i] = normalizeEffect(trigger.Success[i])
	}
	for i := range trigger.Failure {
		trigger.Failure[i] = normalizeEffect(trigger.Failure[i])
	}
	for i := range trigger.Effects {
		trigger.Effects[i] = normalizeEffect(trigger.Effects[i])
	}
	for i := range trigger.Possibilities {
		trigger.Possibilities[i].Effect = normalizeEffect(trigger.Possibilities[i].Effect)
		if trigger.Possibilities[i].Weight <= 0 {
			trigger.Possibilities[i].Weight = 1
		}
	}
}

func normalizeTileInteraction(interaction *TileInteraction) {
	if interaction == nil {
		return
	}
	interaction.Type = strings.ToUpper(interaction.Type)
	if interaction.PoolID != "" {
		interaction.PoolID = strings.ToLower(strings.TrimSpace(interaction.PoolID))
	}
	if interaction.Attribute != "" {
		interaction.Attribute = strings.ToLower(interaction.Attribute)
	}
	for i := range interaction.Effects {
		interaction.Effects[i] = normalizeEffect(interaction.Effects[i])
	}
	for i := range interaction.Success {
		interaction.Success[i] = normalizeEffect(interaction.Success[i])
	}
	for i := range interaction.Failure {
		interaction.Failure[i] = normalizeEffect(interaction.Failure[i])
	}
}

func normalizeTileDef(tile *TileDef) {
	if tile == nil {
		return
	}
	for i := range tile.Effects {
		tile.Effects[i] = normalizeEffect(tile.Effects[i])
	}
	for i := range tile.OnEnterEffects {
		tile.OnEnterEffects[i] = normalizeEffect(tile.OnEnterEffects[i])
	}
	for i := range tile.OnExitEffects {
		tile.OnExitEffects[i] = normalizeEffect(tile.OnExitEffects[i])
	}
	if tile.OnEnter == nil && len(tile.OnEnterEffects) > 0 {
		effects := make([]Effect, len(tile.OnEnterEffects))
		copy(effects, tile.OnEnterEffects)
		tile.OnEnter = &TileTrigger{Type: "EFFECTS", Effects: effects}
	}
	if tile.OnLeave == nil && len(tile.OnExitEffects) > 0 {
		effects := make([]Effect, len(tile.OnExitEffects))
		copy(effects, tile.OnExitEffects)
		tile.OnLeave = &TileTrigger{Type: "EFFECTS", Effects: effects}
	}
	normalizeTileTrigger(tile.OnEnter)
	normalizeTileTrigger(tile.OnLeave)
	normalizeTileInteraction(tile.Interact)
}

func normalizeTileDefs(tiles []TileDef) {
	for i := range tiles {
		normalizeTileDef(&tiles[i])
	}
}

func normalizeSkillNodeGrantEffect(effect *SkillNodeGrantEffectJSON) {
	if effect == nil {
		return
	}
	effect.Type = strings.ToUpper(strings.TrimSpace(effect.Type))
	if effect.Stat != "" {
		effect.Stat = strings.ToLower(strings.TrimSpace(effect.Stat))
	}
	effect.Buff = strings.TrimSpace(effect.Buff)
	effect.Description = strings.TrimSpace(effect.Description)
}

func normalizeSkillTrees(trees []SkillTreeCategoryJSON) {
	for treeIndex := range trees {
		for nodeIndex := range trees[treeIndex].Nodes {
			node := &trees[treeIndex].Nodes[nodeIndex]
			for effectIndex := range node.GrantsEffects {
				normalizeSkillNodeGrantEffect(&node.GrantsEffects[effectIndex])
			}
		}
	}
}

func normalizePassiveEffect(effect *PassiveEffect) {
	if effect == nil {
		return
	}
	effect.Type = strings.ToLower(strings.TrimSpace(effect.Type))
	effect.Text = strings.TrimSpace(effect.Text)
	effect.Stat = strings.ToLower(strings.TrimSpace(effect.Stat))
	effect.SkillID = strings.TrimSpace(effect.SkillID)
	effect.SpecialKey = strings.TrimSpace(effect.SpecialKey)
	effect.Trigger = normalizePassiveTrigger(effect.Trigger)
	for i := range effect.NPCTypes {
		effect.NPCTypes[i] = strings.ToUpper(strings.TrimSpace(effect.NPCTypes[i]))
	}
}

func normalizeCards(cards []Card) {
	for i := range cards {
		for p := range cards[i].PassiveEffects {
			normalizePassiveEffect(&cards[i].PassiveEffects[p])
		}
		if cards[i].Interaction != nil {
			cards[i].Interaction.Type = strings.ToUpper(strings.TrimSpace(cards[i].Interaction.Type))
			cards[i].Interaction.Attribute = strings.ToLower(strings.TrimSpace(cards[i].Interaction.Attribute))
			for e := range cards[i].Interaction.Success {
				cards[i].Interaction.Success[e] = normalizeEffect(cards[i].Interaction.Success[e])
			}
			for e := range cards[i].Interaction.Failure {
				cards[i].Interaction.Failure[e] = normalizeEffect(cards[i].Interaction.Failure[e])
			}
			for o := range cards[i].Interaction.Options {
				for e := range cards[i].Interaction.Options[o].Effects {
					cards[i].Interaction.Options[o].Effects[e] = normalizeEffect(cards[i].Interaction.Options[o].Effects[e])
				}
			}
		}
		if cards[i].Usage != nil {
			for e := range cards[i].Usage.Effects {
				cards[i].Usage.Effects[e] = normalizeEffect(cards[i].Usage.Effects[e])
			}
		}
	}
}

func (d *DataLoader) findCardByID(id string) *Card {
	for i := range d.Events.Events {
		if d.Events.Events[i].ID == id {
			return &d.Events.Events[i]
		}
	}
	for i := range d.Items.Items {
		if d.Items.Items[i].ID == id {
			return &d.Items.Items[i]
		}
	}
	for i := range d.Items.RewardItems {
		if d.Items.RewardItems[i].ID == id {
			return &d.Items.RewardItems[i]
		}
	}
	for i := range d.Items.Omens {
		if d.Items.Omens[i].ID == id {
			return &d.Items.Omens[i]
		}
	}
	for i := range d.Items.Skills {
		if d.Items.Skills[i].ID == id {
			return &d.Items.Skills[i]
		}
	}
	return nil
}

func (d *DataLoader) compileCardPools() error {
	d.CardPoolMap = make(map[string][]Card)
	for _, pool := range d.Config.CardPools {
		poolID := strings.ToLower(strings.TrimSpace(pool.ID))
		if poolID == "" {
			return fmt.Errorf("配置卡池缺少 id")
		}
		if len(pool.CardIDs) == 0 {
			return fmt.Errorf("配置卡池 %s 没有 cardIds", pool.ID)
		}

		cards := make([]Card, 0, len(pool.CardIDs))
		for _, cardID := range pool.CardIDs {
			card := d.findCardByID(cardID)
			if card == nil {
				return fmt.Errorf("配置卡池 %s 引用了不存在的卡牌 %s", pool.ID, cardID)
			}
			cards = append(cards, *card)
		}

		d.CardPoolMap[poolID] = cards
	}
	return nil
}

func (d *DataLoader) compileNamedLocations() error {
	d.NamedLocationMap = make(map[string]Position)
	for _, location := range d.Config.NamedLocations {
		locationID := strings.ToLower(strings.TrimSpace(location.ID))
		if locationID == "" {
			return fmt.Errorf("配置命名位置缺少 id")
		}
		if _, exists := d.NamedLocationMap[locationID]; exists {
			return fmt.Errorf("配置命名位置重复: %s", location.ID)
		}
		d.NamedLocationMap[locationID] = Position{X: location.X, Y: location.Y}
	}
	return nil
}

func (d *DataLoader) isKnownItemID(itemID string) bool {
	itemID = strings.TrimSpace(itemID)
	if itemID == "" {
		return false
	}
	for _, card := range d.Items.Items {
		if card.ID == itemID {
			return true
		}
	}
	for _, card := range d.Items.RewardItems {
		if card.ID == itemID {
			return true
		}
	}
	for _, card := range d.Items.Omens {
		if card.ID == itemID {
			return true
		}
	}
	return false
}

func (d *DataLoader) isKnownSkillID(skillID string) bool {
	skillID = strings.TrimSpace(skillID)
	if skillID == "" {
		return false
	}
	for _, card := range d.Items.Skills {
		if card.ID == skillID {
			return true
		}
	}
	return false
}

func (d *DataLoader) findSkillIDByName(skillName string) string {
	skillName = strings.TrimSpace(skillName)
	if skillName == "" {
		return ""
	}
	for _, skill := range d.Items.Skills {
		if strings.Contains(skill.Name, skillName) || strings.Contains(skillName, skill.Name) {
			return skill.ID
		}
	}
	return ""
}

func isValidAttributeName(attr string) bool {
	switch strings.ToLower(strings.TrimSpace(attr)) {
	case "might", "speed", "sanity", "knowledge":
		return true
	default:
		return false
	}
}

func isValidPassiveTrigger(trigger string) bool {
	switch normalizePassiveTrigger(trigger) {
	case "", "ATTACK", "DEFENSE", "END_TURN", "ENTER_ROOM":
		return true
	default:
		return false
	}
}

func isValidNPCTypeName(npcType string) bool {
	switch strings.ToUpper(strings.TrimSpace(npcType)) {
	case string(NPCType_Ghost), string(NPCType_Beast), string(NPCType_Spirit), string(NPCType_Zombie):
		return true
	default:
		return false
	}
}

func isSupportedLegacyPassiveBuffText(text string) bool {
	text = strings.TrimSpace(text)
	if text == "" {
		return false
	}

	_, strippedText := inferLegacyPassiveTrigger(text)
	strippedText = strings.ReplaceAll(strippedText, "，", ",")
	parts := strings.Split(strippedText, ",")
	matched := false

	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		attrName, amount := parseAttributeChange(part)
		if attrName == "" || amount == 0 {
			return false
		}
		matched = true
	}

	return matched
}

func (d *DataLoader) validatePassiveEffect(passive PassiveEffect, context string) error {
	typeName := strings.ToLower(strings.TrimSpace(passive.Type))
	text := strings.TrimSpace(passive.Text)
	trigger := normalizePassiveTrigger(passive.Trigger)
	if !isValidPassiveTrigger(trigger) {
		return fmt.Errorf("%s: passiveEffects.trigger 非法: %s", context, passive.Trigger)
	}

	switch typeName {
	case "buff", "debuff":
		hasStructured := strings.TrimSpace(passive.Stat) != "" || passive.Amount != 0
		if hasStructured {
			if !isValidAttributeName(passive.Stat) {
				return fmt.Errorf("%s: passiveEffects.%s 的 stat 非法: %s", context, typeName, passive.Stat)
			}
			if passive.Amount == 0 {
				return fmt.Errorf("%s: passiveEffects.%s 缺少 amount", context, typeName)
			}
		}
		if !hasStructured && text == "" {
			return fmt.Errorf("%s: passiveEffects.%s 缺少 text 或结构化字段", context, typeName)
		}
		if !hasStructured && !isSupportedLegacyPassiveBuffText(text) {
			return fmt.Errorf("%s: passiveEffects.%s 文本当前不会被后端执行，请迁移为结构化字段或改用 special/skill/combat_* 类型: %s", context, typeName, text)
		}
	case "skill":
		if strings.TrimSpace(passive.SkillID) != "" {
			if !d.isKnownSkillID(passive.SkillID) {
				return fmt.Errorf("%s: passiveEffects.skill 引用了不存在的 skillId=%s", context, passive.SkillID)
			}
			return nil
		}
		if strings.HasPrefix(text, "获得技能：") {
			skillName := strings.TrimSpace(strings.TrimPrefix(text, "获得技能："))
			if d.findSkillIDByName(skillName) == "" {
				return fmt.Errorf("%s: passiveEffects.skill 文本无法匹配技能: %s", context, skillName)
			}
			return nil
		}
		return fmt.Errorf("%s: passiveEffects.skill 缺少 skillId 或兼容 text", context)
	case "special":
		if strings.TrimSpace(passive.SpecialKey) == "" && text == "" {
			return fmt.Errorf("%s: passiveEffects.special 缺少 specialKey 或 text", context)
		}
	case "combat_buff", "combat_modifier":
		if passive.Modifier == 0 {
			return fmt.Errorf("%s: passiveEffects.%s 缺少 modifier", context, typeName)
		}
		if strings.TrimSpace(passive.Stat) != "" && !isValidAttributeName(passive.Stat) {
			return fmt.Errorf("%s: passiveEffects.%s 的 stat 非法: %s", context, typeName, passive.Stat)
		}
	case "combat_damage_bonus":
		if passive.Amount == 0 {
			return fmt.Errorf("%s: passiveEffects.%s 缺少 amount", context, typeName)
		}
		if strings.TrimSpace(passive.Stat) != "" && !isValidAttributeName(passive.Stat) {
			return fmt.Errorf("%s: passiveEffects.%s 的 stat 非法: %s", context, typeName, passive.Stat)
		}
		for _, npcType := range passive.NPCTypes {
			if !isValidNPCTypeName(npcType) {
				return fmt.Errorf("%s: passiveEffects.%s 的 npcTypes 非法: %s", context, typeName, npcType)
			}
		}
	default:
		return fmt.Errorf("%s: passiveEffects.type 不支持: %s", context, passive.Type)
	}

	return nil
}

func (d *DataLoader) validateEffectCondition(condition *Condition, context string) error {
	if condition == nil {
		return nil
	}

	op := strings.ToUpper(strings.TrimSpace(condition.Op))
	switch op {
	case "HAS_ITEM":
		if strings.TrimSpace(condition.ItemID) == "" {
			return fmt.Errorf("%s: IF 条件 HAS_ITEM 缺少 itemId", context)
		}
		if !d.isKnownItemID(condition.ItemID) {
			return fmt.Errorf("%s: IF 条件引用了不存在的 itemId=%s", context, condition.ItemID)
		}
	case "HAS_SKILL":
		if strings.TrimSpace(condition.SkillID) == "" {
			return fmt.Errorf("%s: IF 条件 HAS_SKILL 缺少 skillId", context)
		}
		if !d.isKnownSkillID(condition.SkillID) {
			return fmt.Errorf("%s: IF 条件引用了不存在的 skillId=%s", context, condition.SkillID)
		}
	default:
		return fmt.Errorf("%s: IF 条件不支持 op=%s", context, condition.Op)
	}

	return nil
}

func (d *DataLoader) validateEffect(effect Effect, context string) error {
	effect = normalizeEffect(effect)

	switch effect.Type {
	case "GIVE_ITEM":
		itemID := strings.TrimSpace(effect.ItemID)
		if itemID == "" {
			itemID = strings.TrimSpace(effect.Message)
		}
		if itemID == "" {
			return fmt.Errorf("%s: GIVE_ITEM 缺少 itemId", context)
		}
		if !d.isKnownItemID(itemID) {
			return fmt.Errorf("%s: GIVE_ITEM 引用了不存在的 itemId=%s", context, itemID)
		}
	case "GIVE_SKILL":
		skillID := strings.TrimSpace(effect.SkillID)
		if skillID == "" {
			skillID = strings.TrimSpace(effect.Message)
		}
		if skillID == "" {
			return fmt.Errorf("%s: GIVE_SKILL 缺少 skillId", context)
		}
		if !d.isKnownSkillID(skillID) {
			return fmt.Errorf("%s: GIVE_SKILL 引用了不存在的 skillId=%s", context, skillID)
		}
	case "MOVE_PLAYER":
		hasExplicitPosition := effect.X != 0 || effect.Y != 0
		location := strings.ToLower(strings.TrimSpace(effect.Location))
		if !hasExplicitPosition && location != "" && location != "random" {
			if _, ok := d.NamedLocationMap[location]; !ok {
				return fmt.Errorf("%s: MOVE_PLAYER 引用了不存在的命名位置 location=%s", context, effect.Location)
			}
		}
	case "ADD_STATUS":
		statusType := strings.ToUpper(strings.TrimSpace(effect.StatusType))
		if statusType == "" {
			statusType = strings.ToUpper(strings.TrimSpace(effect.Attribute))
		}
		if statusType == "" {
			statusType = strings.ToUpper(strings.TrimSpace(effect.Message))
		}
		if statusType == "" {
			return fmt.Errorf("%s: ADD_STATUS 缺少 statusType", context)
		}
	case "ADD_BUFF", "REMOVE_BUFF":
		if strings.TrimSpace(effect.Buff) == "" && strings.TrimSpace(effect.Message) == "" {
			return fmt.Errorf("%s: %s 缺少 buff", context, effect.Type)
		}
	case "IF":
		if err := d.validateEffectCondition(effect.Condition, context); err != nil {
			return err
		}
	}

	for i := range effect.Then {
		if err := d.validateEffect(effect.Then[i], fmt.Sprintf("%s.then[%d]", context, i)); err != nil {
			return err
		}
	}
	for i := range effect.Else {
		if err := d.validateEffect(effect.Else[i], fmt.Sprintf("%s.else[%d]", context, i)); err != nil {
			return err
		}
	}

	return nil
}

func (d *DataLoader) validateEffectSlice(effects []Effect, context string) error {
	for i := range effects {
		if err := d.validateEffect(effects[i], fmt.Sprintf("%s[%d]", context, i)); err != nil {
			return err
		}
	}
	return nil
}

func (d *DataLoader) validateCardEffects(card Card, context string) error {
	for i := range card.PassiveEffects {
		if err := d.validatePassiveEffect(card.PassiveEffects[i], fmt.Sprintf("%s.passiveEffects[%d]", context, i)); err != nil {
			return err
		}
	}

	if card.Interaction != nil {
		if err := d.validateEffectSlice(card.Interaction.Success, context+".interaction.success"); err != nil {
			return err
		}
		if err := d.validateEffectSlice(card.Interaction.Failure, context+".interaction.failure"); err != nil {
			return err
		}
		for optionIndex := range card.Interaction.Options {
			if err := d.validateEffectSlice(card.Interaction.Options[optionIndex].Effects, fmt.Sprintf("%s.interaction.options[%d].effects", context, optionIndex)); err != nil {
				return err
			}
		}
	}

	if card.Usage != nil {
		if err := d.validateEffectSlice(card.Usage.Effects, context+".usage.effects"); err != nil {
			return err
		}
	}

	return nil
}

func (d *DataLoader) validateTileEffects(tiles []TileDef, theme string) error {
	for tileIndex := range tiles {
		tile := &tiles[tileIndex]
		base := fmt.Sprintf("tiles[%s:%s]", theme, tile.ID)

		if err := d.validateEffectSlice(tile.Effects, base+".effects"); err != nil {
			return err
		}
		if err := d.validateEffectSlice(tile.OnEnterEffects, base+".onEnterEffects"); err != nil {
			return err
		}
		if err := d.validateEffectSlice(tile.OnExitEffects, base+".onExitEffects"); err != nil {
			return err
		}

		if tile.OnEnter != nil {
			if err := d.validateEffectSlice(tile.OnEnter.Success, base+".onEnter.success"); err != nil {
				return err
			}
			if err := d.validateEffectSlice(tile.OnEnter.Failure, base+".onEnter.failure"); err != nil {
				return err
			}
			if err := d.validateEffectSlice(tile.OnEnter.Effects, base+".onEnter.effects"); err != nil {
				return err
			}
			for posIndex := range tile.OnEnter.Possibilities {
				if err := d.validateEffect(tile.OnEnter.Possibilities[posIndex].Effect, fmt.Sprintf("%s.onEnter.possibilities[%d]", base, posIndex)); err != nil {
					return err
				}
			}
		}

		if tile.OnLeave != nil {
			if err := d.validateEffectSlice(tile.OnLeave.Success, base+".onLeave.success"); err != nil {
				return err
			}
			if err := d.validateEffectSlice(tile.OnLeave.Failure, base+".onLeave.failure"); err != nil {
				return err
			}
			if err := d.validateEffectSlice(tile.OnLeave.Effects, base+".onLeave.effects"); err != nil {
				return err
			}
			for posIndex := range tile.OnLeave.Possibilities {
				if err := d.validateEffect(tile.OnLeave.Possibilities[posIndex].Effect, fmt.Sprintf("%s.onLeave.possibilities[%d]", base, posIndex)); err != nil {
					return err
				}
			}
		}

		if tile.Interact != nil {
			if err := d.validateEffectSlice(tile.Interact.Effects, base+".interact.effects"); err != nil {
				return err
			}
			if err := d.validateEffectSlice(tile.Interact.Success, base+".interact.success"); err != nil {
				return err
			}
			if err := d.validateEffectSlice(tile.Interact.Failure, base+".interact.failure"); err != nil {
				return err
			}
		}
	}
	return nil
}

func (d *DataLoader) validateSkillTreeGrantEffects() error {
	for treeIndex := range d.SkillTrees.Trees {
		tree := &d.SkillTrees.Trees[treeIndex]
		for nodeIndex := range tree.Nodes {
			node := &tree.Nodes[nodeIndex]
			for effectIndex := range node.GrantsEffects {
				effect := node.GrantsEffects[effectIndex]
				context := fmt.Sprintf("skillTrees[%s].nodes[%s].grantsEffects[%d]", tree.ID, node.ID, effectIndex)
				switch effect.Type {
				case "MODIFY_ATTRIBUTE":
					if effect.Stat == "" {
						return fmt.Errorf("%s: MODIFY_ATTRIBUTE 缺少 stat", context)
					}
					if effect.Amount == 0 {
						return fmt.Errorf("%s: MODIFY_ATTRIBUTE 缺少 amount", context)
					}
				case "ADD_BUFF":
					if strings.TrimSpace(effect.Buff) == "" {
						return fmt.Errorf("%s: ADD_BUFF 缺少 buff", context)
					}
				default:
					return fmt.Errorf("%s: 不支持的 grantsEffects.type=%s", context, effect.Type)
				}
			}
		}
	}
	return nil
}

func (d *DataLoader) validateObjectiveDefinition(obj *Objective, context string) error {
	if obj == nil {
		return nil
	}

	if strings.TrimSpace(obj.Type) == "" {
		return fmt.Errorf("%s: objective.type 不能为空", context)
	}

	if obj.Params == nil {
		return fmt.Errorf("%s: objective.params 不能为空；runtime scenario objective 必须使用 params", context)
	}

	if objectiveUsesLegacyScenarioFields(obj) {
		return fmt.Errorf("%s: objective 不应再使用顶层 target/turns/customId，请迁移到 params", context)
	}

	turnLimit := objectiveParamInt(obj, "turns")
	if turnLimit <= 0 {
		return fmt.Errorf("%s: params.turns 必须大于 0", context)
	}

	required := objectiveRequiredProgress(obj)
	if required <= 0 {
		return fmt.Errorf("%s: objective required 必须大于 0", context)
	}

	eventType := objectiveParamString(obj, "eventType")
	if strings.TrimSpace(eventType) == "" {
		return fmt.Errorf("%s: params.eventType 不能为空", context)
	}
	if !isSupportedObjectiveEventType(eventType) {
		return fmt.Errorf("%s: params.eventType 不支持: %s", context, eventType)
	}

	switch strings.ToUpper(strings.TrimSpace(obj.Type)) {
	case "ELIMINATE", "CONVERT", "REACH", "COLLECT", "OPEN_GATE":
		if strings.TrimSpace(objectiveParamString(obj, "target")) == "" {
			return fmt.Errorf("%s: %s 目标缺少 params.target", context, obj.Type)
		}
	case "CUSTOM":
		if strings.TrimSpace(objectiveParamString(obj, "customId")) == "" {
			return fmt.Errorf("%s: CUSTOM 目标缺少 params.customId", context)
		}
	}

	return nil
}

func (d *DataLoader) validateAllScenarioObjectives() error {
	for id, scenario := range d.Scenarios.Scenarios {
		if err := d.validateObjectiveDefinition(scenario.HeroObjective, fmt.Sprintf("scenarios[%s].heroObjective", id)); err != nil {
			return err
		}
		if err := d.validateObjectiveDefinition(scenario.TraitorObjective, fmt.Sprintf("scenarios[%s].traitorObjective", id)); err != nil {
			return err
		}
	}
	return nil
}

func (d *DataLoader) validateAllEffects() error {
	if err := d.validateTileEffects(d.Tiles.Original, "original"); err != nil {
		return err
	}
	if err := d.validateTileEffects(d.Tiles.Volantis, "volantis"); err != nil {
		return err
	}

	for i := range d.Events.Events {
		if err := d.validateCardEffects(d.Events.Events[i], fmt.Sprintf("events[%s]", d.Events.Events[i].ID)); err != nil {
			return err
		}
	}
	for i := range d.Items.Items {
		if err := d.validateCardEffects(d.Items.Items[i], fmt.Sprintf("items[%s]", d.Items.Items[i].ID)); err != nil {
			return err
		}
	}
	for i := range d.Items.RewardItems {
		if err := d.validateCardEffects(d.Items.RewardItems[i], fmt.Sprintf("rewardItems[%s]", d.Items.RewardItems[i].ID)); err != nil {
			return err
		}
	}
	for i := range d.Items.Omens {
		if err := d.validateCardEffects(d.Items.Omens[i], fmt.Sprintf("omens[%s]", d.Items.Omens[i].ID)); err != nil {
			return err
		}
	}
	for i := range d.Items.Skills {
		if err := d.validateCardEffects(d.Items.Skills[i], fmt.Sprintf("skills[%s]", d.Items.Skills[i].ID)); err != nil {
			return err
		}
	}

	if err := d.validateSkillTreeGrantEffects(); err != nil {
		return err
	}

	if err := d.validateAllScenarioObjectives(); err != nil {
		return err
	}

	return nil
}

// LoadData 加载所有数据
func LoadData() error {
	dataLoader = &DataLoader{}

	// 加载配置
	if err := json.Unmarshal(configData, &dataLoader.Config); err != nil {
		log.Printf("⚠️ 加载配置失败: %v", err)
	}

	// 加载房间数据
	if err := json.Unmarshal(tilesData, &dataLoader.Tiles); err != nil {
		log.Printf("⚠️ 加载房间数据失败: %v", err)
		return err
	}
	normalizeTileDefs(dataLoader.Tiles.Original)
	normalizeTileDefs(dataLoader.Tiles.Volantis)

	// 加载事件数据
	if err := json.Unmarshal(eventsData, &dataLoader.Events); err != nil {
		log.Printf("⚠️ 加载事件数据失败: %v", err)
		return err
	}
	normalizeCards(dataLoader.Events.Events)

	// 加载物品数据
	if err := json.Unmarshal(itemsData, &dataLoader.Items); err != nil {
		log.Printf("⚠️ 加载物品数据失败: %v", err)
		return err
	}
	normalizeCards(dataLoader.Items.Items)
	normalizeCards(dataLoader.Items.RewardItems)
	normalizeCards(dataLoader.Items.Omens)
	normalizeCards(dataLoader.Items.Skills)

	// 加载剧本数据
	if err := json.Unmarshal(scenariosData, &dataLoader.Scenarios); err != nil {
		log.Printf("⚠️ 加载剧本数据失败: %v", err)
		return err
	}

	// 加载角色数据
	if err := json.Unmarshal(charactersData, &dataLoader.Characters); err != nil {
		log.Printf("⚠️ 加载角色数据失败: %v", err)
		return err
	}

	// 加载技能树数据
	if err := json.Unmarshal(skillTreesData, &dataLoader.SkillTrees); err != nil {
		log.Printf("⚠️ 加载技能树数据失败: %v", err)
		// 不返回错误，保持向后兼容
	}
	normalizeSkillTrees(dataLoader.SkillTrees.Trees)

	if err := dataLoader.compileNamedLocations(); err != nil {
		log.Printf("⚠️ 编译命名位置失败: %v", err)
		return err
	}

	if err := dataLoader.compileCardPools(); err != nil {
		log.Printf("⚠️ 编译配置卡池失败: %v", err)
		return err
	}

	if err := dataLoader.validateAllEffects(); err != nil {
		log.Printf("⚠️ 校验效果配置失败: %v", err)
		return err
	}

	log.Printf("✅ 数据加载完成: %d 主题, %d 房间, %d 事件, %d 牌堆物品, %d 奖励物品, %d 厄运, %d 技能, %d 配置卡池, %d 命名位置, %d 剧本, %d 角色, %d 技能树",
		len(dataLoader.Config.Themes),
		len(dataLoader.Tiles.Original)+len(dataLoader.Tiles.Volantis),
		len(dataLoader.Events.Events),
		len(dataLoader.Items.Items),
		len(dataLoader.Items.RewardItems),
		len(dataLoader.Items.Omens),
		len(dataLoader.Items.Skills),
		len(dataLoader.CardPoolMap),
		len(dataLoader.NamedLocationMap),
		len(dataLoader.Scenarios.Scenarios),
		len(dataLoader.Characters.Original)+len(dataLoader.Characters.Volantis),
		len(dataLoader.SkillTrees.Trees))

	return nil
}

// ==================== 主题管理 ====================

// GetThemes 获取所有主题配置
func GetThemes() []ThemeConfig {
	if dataLoader == nil {
		return []ThemeConfig{
			{ID: "original", Name: "原版", Description: "经典山屋惊魂", Enabled: true},
			{ID: "volantis", Name: "翁法罗斯", Description: "崩坏星穹铁道 - 永恒之地", Enabled: true},
		}
	}
	return dataLoader.Config.Themes
}

// GetThemeByID 根据ID获取主题配置
func GetThemeByID(id string) *ThemeConfig {
	for _, theme := range GetThemes() {
		if theme.ID == id {
			return &theme
		}
	}
	return nil
}

// IsThemeEnabled 检查主题是否启用
func IsThemeEnabled(id string) bool {
	theme := GetThemeByID(id)
	if theme == nil {
		return false
	}
	return theme.Enabled
}

// GetEnabledThemes 获取所有启用的主题
func GetEnabledThemes() []ThemeConfig {
	var themes []ThemeConfig
	for _, theme := range GetThemes() {
		if theme.Enabled {
			themes = append(themes, theme)
		}
	}
	return themes
}

// GetDefaultThemeID 获取默认主题ID（优先 original，其次第一个启用主题）
func GetDefaultThemeID() string {
	enabledThemes := GetEnabledThemes()
	for _, theme := range enabledThemes {
		if theme.ID == "original" {
			return theme.ID
		}
	}
	if len(enabledThemes) > 0 {
		return enabledThemes[0].ID
	}

	allThemes := GetThemes()
	for _, theme := range allThemes {
		if theme.ID == "original" {
			return theme.ID
		}
	}
	if len(allThemes) > 0 {
		return allThemes[0].ID
	}

	return "original"
}

// GetThemeIDs 获取所有主题ID
func GetThemeIDs() []string {
	themes := GetThemes()
	ids := make([]string, len(themes))
	for i, theme := range themes {
		ids[i] = theme.ID
	}
	return ids
}

// ==================== 数据获取 ====================

// GetTileDeckByTheme 获取房间牌堆
func GetTileDeckByTheme(theme string) []TileDef {
	ensureDataLoaded()
	if dataLoader != nil {
		switch theme {
		case "volantis":
			return dataLoader.Tiles.Volantis
		default:
			return dataLoader.Tiles.Original
		}
	}
	// 降级使用内存数据
	if deck, ok := ThemeTileDecks[theme]; ok {
		return deck
	}
	return OriginalTileDeck
}

// GetEvents 获取事件卡
func GetEvents() []Card {
	ensureDataLoaded()
	if dataLoader == nil {
		return nil
	}
	return dataLoader.Events.Events
}

// GetEventByID 根据ID获取事件
func GetEventByID(id string) *Card {
	ensureDataLoaded()
	if dataLoader == nil {
		return nil
	}
	for _, card := range dataLoader.Events.Events {
		if card.ID == id {
			return &card
		}
	}
	return nil
}

// GetScenarios 获取所有剧本
func GetScenarios() map[string]Scenario {
	ensureDataLoaded()
	if dataLoader == nil {
		return nil
	}
	return dataLoader.Scenarios.Scenarios
}

// GetItems 获取物品
func GetItems() []Card {
	ensureDataLoaded()
	if dataLoader == nil {
		return nil
	}
	return dataLoader.Items.Items
}

// GetItemByID 根据ID获取物品
func GetItemByID(id string) *Card {
	ensureDataLoaded()
	if dataLoader == nil {
		return nil
	}
	for _, card := range dataLoader.Items.Items {
		if card.ID == id {
			return &card
		}
	}
	for _, card := range dataLoader.Items.RewardItems {
		if card.ID == id {
			return &card
		}
	}
	return nil
}

func GetCardPoolByID(id string) []Card {
	ensureDataLoaded()
	if dataLoader == nil {
		return nil
	}
	pool, ok := dataLoader.CardPoolMap[strings.ToLower(strings.TrimSpace(id))]
	if !ok {
		return nil
	}
	result := make([]Card, len(pool))
	copy(result, pool)
	return result
}

func GetNamedLocationByID(id string) (Position, bool) {
	ensureDataLoaded()
	if dataLoader == nil {
		return Position{}, false
	}
	position, ok := dataLoader.NamedLocationMap[strings.ToLower(strings.TrimSpace(id))]
	if !ok {
		return Position{}, false
	}
	return position, true
}

// GetOmens 获取厄运卡
func GetOmens() []Card {
	ensureDataLoaded()
	if dataLoader == nil {
		return nil
	}
	return dataLoader.Items.Omens
}

// GetOmenByID 根据ID获取厄运
func GetOmenByID(id string) *Card {
	ensureDataLoaded()
	if dataLoader == nil {
		return nil
	}
	for _, card := range dataLoader.Items.Omens {
		if card.ID == id {
			return &card
		}
	}
	return nil
}

// GetSkills 获取技能
func GetSkills() []Card {
	ensureDataLoaded()
	if dataLoader == nil {
		return nil
	}
	return dataLoader.Items.Skills
}

// GetSkillByID 根据ID获取技能
func GetSkillByID(id string) *Card {
	ensureDataLoaded()
	if dataLoader == nil {
		return nil
	}
	for _, card := range dataLoader.Items.Skills {
		if card.ID == id {
			return &card
		}
	}
	return nil
}

// GetHauntMatrixByTheme 获取剧本矩阵
func GetHauntMatrixByTheme(theme string) map[string]string {
	ensureDataLoaded()
	if dataLoader == nil {
		return nil
	}
	if matrix, ok := dataLoader.Scenarios.HauntMatrix[theme]; ok {
		return matrix
	}
	return dataLoader.Scenarios.HauntMatrix["original"]
}

// GetScenarioByID 获取剧本
func GetScenarioByID(id string) *Scenario {
	ensureDataLoaded()
	if dataLoader == nil {
		return nil
	}
	if scenario, ok := dataLoader.Scenarios.Scenarios[id]; ok {
		return &scenario
	}
	return nil
}

// GetCharactersByTheme 获取主题角色列表
func GetCharactersByTheme(theme string) []CharacterJSON {
	ensureDataLoaded()
	if dataLoader == nil {
		return nil
	}
	switch theme {
	case "volantis":
		return dataLoader.Characters.Volantis
	default:
		return dataLoader.Characters.Original
	}
}

// GetCharacterByID 根据ID获取角色定义
func GetCharacterByID(id string) *CharacterJSON {
	ensureDataLoaded()
	if dataLoader == nil {
		return nil
	}
	// 先在 original 中查找
	for i, char := range dataLoader.Characters.Original {
		if char.ID == id {
			return &dataLoader.Characters.Original[i]
		}
	}
	// 再在 volantis 中查找
	for i, char := range dataLoader.Characters.Volantis {
		if char.ID == id {
			return &dataLoader.Characters.Volantis[i]
		}
	}
	return nil
}

// GetCharacterAttributeValues 获取角色的属性 values 数组
func GetCharacterAttributeValues(characterID, attributeName string) ([]int, int) {
	char := GetCharacterByID(characterID)
	if char == nil {
		return nil, 0
	}
	attr, ok := char.Attributes[attributeName]
	if !ok {
		return nil, 0
	}
	return attr.Values, attr.StartIndex
}

// ==================== 技能树管理 ====================

// GetSkillTrees 获取所有技能树
func GetSkillTrees() []SkillTreeCategoryJSON {
	ensureDataLoaded()
	if dataLoader == nil || len(dataLoader.SkillTrees.Trees) == 0 {
		return []SkillTreeCategoryJSON{}
	}
	return dataLoader.SkillTrees.Trees
}

// GetSkillTreeByID 根据ID获取技能树
func GetSkillTreeByID(treeID string) *SkillTreeCategoryJSON {
	for _, tree := range GetSkillTrees() {
		if tree.ID == treeID {
			return &tree
		}
	}
	return nil
}

// GetSkillNode 获取技能树节点
func GetSkillNode(nodeId string) *SkillTreeNodeJSON {
	for _, tree := range GetSkillTrees() {
		for i, node := range tree.Nodes {
			if node.ID == nodeId {
				return &tree.Nodes[i]
			}
		}
	}
	return nil
}

// SkillNodeGrant 技能节点增益
type SkillNodeGrant struct {
	GrantsSkillID string
	GrantsEffects []SkillNodeGrantEffectJSON
	GrantsBuff    string
}

// GetSkillNodeGrant 获取技能节点增益（供 data.go 调用）
func GetSkillNodeGrant(nodeId string) *SkillNodeGrant {
	node := GetSkillNode(nodeId)
	if node == nil {
		return nil
	}
	return &SkillNodeGrant{
		GrantsSkillID: node.GrantsSkillID,
		GrantsEffects: append([]SkillNodeGrantEffectJSON(nil), node.GrantsEffects...),
		GrantsBuff:    node.GrantsBuff,
	}
}

// GetSkillNodeGrantFromJSON 获取技能节点增益（别名，供外部调用）
func GetSkillNodeGrantFromJSON(nodeId string) *SkillNodeGrant {
	return GetSkillNodeGrant(nodeId)
}

// ==================== 卡牌堆管理 ====================

// InitDeck 初始化牌堆（从 JSON 加载数据）
func InitDeck(cardType string) []Card {
	var cards []Card

	switch cardType {
	case "EVENT":
		// 事件卡从单独的事件数据加载
		for _, card := range dataLoader.Events.Events {
			cards = append(cards, card)
		}
	case "ITEM":
		for _, card := range dataLoader.Items.Items {
			cards = append(cards, card)
		}
	case "OMEN":
		for _, card := range dataLoader.Items.Omens {
			cards = append(cards, card)
		}
	}

	// 洗牌
	rand.Shuffle(len(cards), func(i, j int) {
		cards[i], cards[j] = cards[j], cards[i]
	})

	return cards
}

// GetAllSkills 获取所有技能
func GetAllSkills() []Card {
	return dataLoader.Items.Skills
}

// FindSkillByName 模糊匹配技能名称
func FindSkillByName(skillName string) string {
	for _, skill := range dataLoader.Items.Skills {
		if strings.Contains(skill.Name, skillName) || strings.Contains(skillName, skill.Name) {
			return skill.ID
		}
	}
	return ""
}
