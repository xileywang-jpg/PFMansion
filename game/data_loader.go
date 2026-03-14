package game

import (
	"encoding/json"
	"log"

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

// ==================== 配置结构 ====================

// ThemeConfig 主题配置
type ThemeConfig struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	PrimaryColor string `json:"primaryColor"`
	Enabled     bool   `json:"enabled"`
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
	Items   []Card `json:"items"`
	Omens   []Card `json:"omens"`
	Skills  []Card `json:"skills"`
}

// HauntMatrixJSON 剧本矩阵 JSON 结构
type HauntMatrixJSON struct {
	HauntMatrix map[string]map[string]string `json:"hauntMatrix"`
	Scenarios   map[string]Scenario        `json:"scenarios"`
}

// DataLoader 数据加载器
var dataLoader *DataLoader

// DataLoader 数据加载器
type DataLoader struct {
	Config    ConfigJSON
	Tiles     TileDeckJSON
	Events    EventsJSON
	Items     ItemsJSON
	Scenarios HauntMatrixJSON
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

	log.Printf("✅ 数据加载完成: %d 主题, %d 房间, %d 事件, %d 物品, %d 厄运, %d 技能, %d 剧本",
		len(dataLoader.Config.Themes),
		len(dataLoader.Tiles.Original)+len(dataLoader.Tiles.Volantis),
		len(dataLoader.Events.Events),
		len(dataLoader.Items.Items),
		len(dataLoader.Items.Omens),
		len(dataLoader.Items.Skills),
		len(dataLoader.Scenarios.Scenarios))

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
	if dataLoader == nil {
		return nil
	}
	return dataLoader.Events.Events
}

// GetEventByID 根据ID获取事件
func GetEventByID(id string) *Card {
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

// GetItems 获取物品
func GetItems() []Card {
	if dataLoader == nil {
		return nil
	}
	return dataLoader.Items.Items
}

// GetItemByID 根据ID获取物品
func GetItemByID(id string) *Card {
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
	if dataLoader == nil {
		return nil
	}
	return dataLoader.Items.Omens
}

// GetOmenByID 根据ID获取厄运
func GetOmenByID(id string) *Card {
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
	if dataLoader == nil {
		return nil
	}
	return dataLoader.Items.Skills
}

// GetSkillByID 根据ID获取技能
func GetSkillByID(id string) *Card {
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
	if dataLoader == nil {
		return GetHauntMatrix(theme)
	}
	if matrix, ok := dataLoader.Scenarios.HauntMatrix[theme]; ok {
		return matrix
	}
	return dataLoader.Scenarios.HauntMatrix["original"]
}

// GetScenarioByID 获取剧本
func GetScenarioByID(id string) *Scenario {
	if dataLoader == nil {
		return nil
	}
	if scenario, ok := dataLoader.Scenarios.Scenarios[id]; ok {
		return &scenario
	}
	return nil
}
