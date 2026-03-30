package game

import (
	"encoding/json"
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

// ConfigJSON 配置文件结构
type ConfigJSON struct {
	Themes []ThemeConfig `json:"themes"`
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
	Items  []Card `json:"items"`
	Omens  []Card `json:"omens"`
	Skills []Card `json:"skills"`
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

// CharactersJSON 角色 JSON 结构
type CharactersJSON struct {
	Original []CharacterJSON `json:"original"`
	Volantis []CharacterJSON `json:"volantis"`
}

// SkillTreeNodeJSON 技能树节点 JSON 结构
type SkillTreeNodeJSON struct {
	ID            string   `json:"id"`
	Name          string   `json:"name"`
	Description   string   `json:"description"`
	Cost          int      `json:"cost"`
	Icon          string   `json:"icon"`
	Prerequisites []string `json:"prerequisites,omitempty"`
	RequiredTrait string   `json:"requiredTrait,omitempty"`
	GrantsSkillID string   `json:"grantsSkillId,omitempty"`
	GrantsBuff    string   `json:"grantsBuff,omitempty"`
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
	Config     ConfigJSON
	Tiles      TileDeckJSON
	Events     EventsJSON
	Items      ItemsJSON
	Scenarios  HauntMatrixJSON
	Characters CharactersJSON
	SkillTrees SkillTreesJSON
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

	// 加载物品数据
	if err := json.Unmarshal(itemsData, &dataLoader.Items); err != nil {
		log.Printf("⚠️ 加载物品数据失败: %v", err)
		return err
	}

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

	log.Printf("✅ 数据加载完成: %d 主题, %d 房间, %d 事件, %d 物品, %d 厄运, %d 技能, %d 剧本, %d 角色, %d 技能树",
		len(dataLoader.Config.Themes),
		len(dataLoader.Tiles.Original)+len(dataLoader.Tiles.Volantis),
		len(dataLoader.Events.Events),
		len(dataLoader.Items.Items),
		len(dataLoader.Items.Omens),
		len(dataLoader.Items.Skills),
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
	return nil
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
	GrantsSkillID string // 给予的技能ID
	GrantsBuff    string // 给予的buff描述
}

// GetSkillNodeGrant 获取技能节点增益（供 data.go 调用）
func GetSkillNodeGrant(nodeId string) *SkillNodeGrant {
	node := GetSkillNode(nodeId)
	if node == nil {
		return nil
	}
	return &SkillNodeGrant{
		GrantsSkillID: node.GrantsSkillID,
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
