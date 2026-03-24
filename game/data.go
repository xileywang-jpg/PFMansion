package game

import (
	"fmt"
	"strings"
)

// ==================== 数据类型定义 ====================

// PassiveEffect 被动效果
type PassiveEffect struct {
	Type string `json:"type"` // buff, debuff, special, skill
	Text string `json:"text"`
}

// Card 事件卡牌（完整定义）
type Card struct {
	ID           string       `json:"id"`
	Type         string       `json:"type"` // EVENT, ITEM, OMEN
	Name         string       `json:"name,omitempty"` // 物品/技能/厄运名称
	Title        string       `json:"title,omitempty"` // 事件标题（向后兼容）
	Description  string       `json:"description"`
	FlavorText   string       `json:"flavorText,omitempty"`
	Icon         string       `json:"icon,omitempty"`
	TriggerType  string       `json:"triggerType,omitempty"` // ON_ENTER, ON_EXIT, MANUAL
	Interaction  *Interaction `json:"interaction,omitempty"`
	Usage        *ItemUsage   `json:"usage,omitempty"`
	PassiveEffects []PassiveEffect `json:"passiveEffects,omitempty"`
	CardSymbol   string       `json:"cardSymbol,omitempty"` // EVENT, ITEM, OMEN, NONE (用于物品/厄运)
}

// GetDisplayName 获取显示用的名称（优先 Name，其次 Title）
func (c *Card) GetDisplayName() string {
	if c.Name != "" {
		return c.Name
	}
	return c.Title
}

// Interaction 交互类型
type Interaction struct {
	Type       string   `json:"type"` // ATTRIBUTE_CHECK, CHOICE, NONE
	Attribute  string   `json:"attribute,omitempty"` // might, speed, sanity, knowledge
	Difficulty int      `json:"difficulty,omitempty"`
	Success    []Effect `json:"success,omitempty"`
	Failure    []Effect `json:"failure,omitempty"`
	Options    []Choice `json:"options,omitempty"`
}

// Choice 选择选项
type Choice struct {
	Label   string   `json:"label"`
	Effects []Effect `json:"effects"`
}

// Effect 效果定义（完整版）
type Effect struct {
	Type      string      `json:"type"` // MODIFY_STAT, DAMAGE, HEAL, DRAW_CARD, MOVE_PLAYER, LOG, IF, GIVE_ITEM, GIVE_SKILL, ROLL, ADD_STATUS, ADD_BUFF, REMOVE_BUFF
	Stat      string      `json:"stat,omitempty"`
	Amount    int         `json:"amount,omitempty"`
	Target    string      `json:"target,omitempty"` // SELF, SELECTED_PARTNER
	Deck      string      `json:"deck,omitempty"` // EVENT, ITEM, OMEN
	Message   string      `json:"message,omitempty"`
	Style     string      `json:"style,omitempty"` // info, alert, success, narrative
	Location  string      `json:"location,omitempty"` // basement, entry 等命名位置
	X         int         `json:"x,omitempty"` // 移动到指定 X 坐标
	Y         int         `json:"y,omitempty"` // 移动到指定 Y 坐标
	Condition *Condition  `json:"condition,omitempty"`
	Then      []Effect    `json:"then,omitempty"`
	Else      []Effect    `json:"else,omitempty"`
	Attribute string      `json:"attribute,omitempty"`
	Difficulty int        `json:"difficulty,omitempty"`
}

// Condition 条件
type Condition struct {
	Op      string `json:"op"` // HAS_ITEM, HAS_SKILL
	ItemID  string `json:"itemId,omitempty"`
	SkillID string `json:"skillId,omitempty"`
}

// ItemUsage 物品使用
type ItemUsage struct {
	ActionLabel  string   `json:"actionLabel,omitempty"`
	IsConsumable bool    `json:"isConsumable"`
	Target      string   `json:"target,omitempty"` // SELF, OPPONENT
	Effects     []Effect `json:"effects"`
}

// ==================== 数据获取函数 ====================
// 所有数据现在从 JSON 文件加载，通过 data_loader.go 提供
// 此文件保留类型定义和辅助函数

// GetEvent 获取事件卡（委托给 data_loader）
func GetEvent(eventID string) *Card {
	return GetEventByID(eventID)
}

// GetItem 获取物品（委托给 data_loader）
func GetItem(itemID string) *Card {
	return GetItemByID(itemID)
}

// GetOmen 获取厄运卡（委托给 data_loader）
func GetOmen(omenID string) *Card {
	return GetOmenByID(omenID)
}

// GetSkill 获取技能（委托给 data_loader）
func GetSkill(skillID string) *Card {
	return GetSkillByID(skillID)
}

// ApplySkillNodeBuff 应用技能节点buff到玩家
// buff描述格式: "速度 +1", "力量 +1", "防御 +1", "暴击 +1"
func ApplySkillNodeBuff(player *GamePlayer, buffDesc string) {
	// 属性buff映射
	buffAttrMap := map[string]string{
		"速度":   "speed",
		"力量":   "might",
		"理智":   "sanity",
		"知识":   "knowledge",
		"防御":   "defense", // 特殊属性
		"暴击":   "critical", // 特殊属性
	}

	// 查找属性名
	var attrName string
	for cn, en := range buffAttrMap {
		if strings.Contains(buffDesc, cn) {
			attrName = en
			break
		}
	}

	if attrName == "" {
		return
	}

	// 提取数值
	numStr := buffDesc
	for _, c := range "速度力量理智知识防御暴击+" {
		numStr = strings.ReplaceAll(numStr, string(c), "")
	}
	numStr = strings.TrimSpace(numStr)

	amount := 0
	if numStr != "" {
		fmt.Sscanf(numStr, "%d", &amount)
	}

	if amount == 0 {
		return
	}

	// 应用到对应属性
	switch attrName {
	case "speed":
		if attr, ok := player.Character.Attributes["speed"]; ok {
			attr.Current += amount
			attr.Max += amount
			if attr.Current > attr.Max {
				attr.Current = attr.Max
			}
		}
	case "might":
		if attr, ok := player.Character.Attributes["might"]; ok {
			attr.Max += amount
			attr.Current += amount
			if attr.Current > attr.Max {
				attr.Current = attr.Max
			}
		}
	case "sanity":
		if attr, ok := player.Character.Attributes["sanity"]; ok {
			attr.Current += amount
			attr.Max += amount
			if attr.Current > attr.Max {
				attr.Current = attr.Max
			}
		}
	case "knowledge":
		if attr, ok := player.Character.Attributes["knowledge"]; ok {
			attr.Current += amount
			attr.Max += amount
			if attr.Current > attr.Max {
				attr.Current = attr.Max
			}
		}
	case "defense":
		// 防御属性（非标准属性，使用buff列表记录）
		player.Buffs = append(player.Buffs, fmt.Sprintf("防御 +%d", amount))
	case "critical":
		// 暴击属性（非标准属性，使用buff列表记录）
		player.Buffs = append(player.Buffs, fmt.Sprintf("暴击 +%d", amount))
	}
}
