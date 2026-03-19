package game

import "math/rand"

// ==================== 完整数据定义 ====================

// Card 事件卡牌（完整定义）
type Card struct {
	ID           string       `json:"id"`
	Type         string       `json:"type"` // EVENT, ITEM, OMEN
	Title        string       `json:"title"`
	Description  string       `json:"description"`
	FlavorText   string       `json:"flavorText,omitempty"`
	Icon         string       `json:"icon,omitempty"`
	TriggerType  string       `json:"triggerType,omitempty"` // ON_ENTER, ON_EXIT, MANUAL
	Interaction  *Interaction `json:"interaction,omitempty"`
	Usage        *ItemUsage   `json:"usage,omitempty"`
	PassiveEffects []string   `json:"passiveEffects,omitempty"`
	CardSymbol   string       `json:"cardSymbol,omitempty"` // EVENT, ITEM, OMEN, NONE (用于物品/厄运)
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
	Type      string      `json:"type"` // MODIFY_STAT, DAMAGE, HEAL, DRAW_CARD, MOVE_PLAYER, LOG, IF, GIVE_ITEM, GIVE_SKILL, ROLL
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
	Op     string `json:"op"` // HAS_ITEM, HAS_SKILL
	ItemID string `json:"itemId,omitempty"`
	SkillID string `json:"skillId,omitempty"`
}

// ItemUsage 物品使用
type ItemUsage struct {
	ActionLabel  string   `json:"actionLabel,omitempty"`
	IsConsumable bool    `json:"isConsumable"`
	Target      string   `json:"target,omitempty"` // SELF, OPPONENT
	Effects     []Effect `json:"effects"`
}

// ==================== 数据存储 ====================

// 事件卡数据
var EventsData = map[string]Card{
	"event_burning_man": {
		ID:          "event_burning_man",
		Type:        "EVENT",
		Title:       "燃烧之人",
		Description: "一个被火焰包围的鬼魅人影在你面前无声地尖叫。",
		FlavorText:  "这火焰虽是幻象，但恐惧却真实无比。",
		Icon:        "Flame",
		TriggerType: "ON_ENTER",
		Interaction: &Interaction{
			Type:       "ATTRIBUTE_CHECK",
			Attribute:  "sanity",
			Difficulty: 4,
			Success: []Effect{
				{Type: "MODIFY_STAT", Stat: "knowledge", Amount: 1, Message: "你意识到这只是幻象并获得了洞察力。"},
				{Type: "LOG", Message: "火焰如同出现时一样迅速熄灭了。", Style: "narrative"},
			},
			Failure: []Effect{
				{Type: "MODIFY_STAT", Stat: "sanity", Amount: -1, Message: "剧烈的恐惧灼伤了你的精神。"},
				{Type: "LOG", Message: "你惊恐地逃离现场。", Style: "narrative"},
			},
		},
	},
	"event_creaky_floor": {
		ID:          "event_creaky_floor",
		Type:        "EVENT",
		Title:       "腐烂的地板",
		Description: "脚下的木头伴随着刺耳的断裂声突然崩塌。",
		FlavorText:  "下方的黑暗在等待着你。",
		Icon:        "ArrowDown",
		TriggerType: "ON_ENTER",
		Interaction: &Interaction{
			Type:       "ATTRIBUTE_CHECK",
			Attribute:  "speed",
			Difficulty: 3,
			Success: []Effect{
				{Type: "LOG", Message: "你千钧一发之际跳到了安全地带。", Style: "narrative"},
			},
			Failure: []Effect{
				{Type: "MODIFY_STAT", Stat: "might", Amount: -1, Message: "坠落造成了 1 点物理伤害。"},
				{Type: "LOG", Message: "你重重地摔在冰冷的石板地上。", Style: "narrative"},
			},
		},
	},
	"event_ghost_whisper": {
		ID:          "event_ghost_whisper",
		Type:        "EVENT",
		Title:       "幽灵低语",
		Description: "一个声音从阴影中低语着你的名字。\"离开这里...\"它嘶嘶作响。",
		Icon:        "Ghost",
		TriggerType: "ON_ENTER",
		Interaction: &Interaction{
			Type:       "ATTRIBUTE_CHECK",
			Attribute:  "sanity",
			Difficulty: 4,
			Success: []Effect{
				{Type: "MODIFY_STAT", Stat: "knowledge", Amount: 1, Message: "你稳住了心神，从低语中捕捉到了线索。"},
			},
			Failure: []Effect{
				{Type: "MODIFY_STAT", Stat: "sanity", Amount: -1, Message: "这声音像爪子一样撕扯着你的理智。"},
			},
		},
	},
	"event_vines": {
		ID:          "event_vines",
		Type:        "EVENT",
		Title:       "纠缠的藤蔓",
		Description: "枯死的植物突然像活了一样，紧紧缠住了你的双脚！",
		Icon:        "Trees",
		TriggerType: "ON_ENTER",
		Interaction: &Interaction{
			Type:       "ATTRIBUTE_CHECK",
			Attribute:  "might",
			Difficulty: 3,
			Success: []Effect{
				{Type: "LOG", Message: "你轻松挣脱了这些枯萎的藤蔓。", Style: "narrative"},
			},
			Failure: []Effect{
				{Type: "MODIFY_STAT", Stat: "speed", Amount: -1, Message: "长刺刺伤了你的腿，行动受阻。"},
			},
		},
	},
	"event_vault_chest": {
		ID:          "event_vault_chest",
		Type:        "EVENT",
		Title:       "上锁的宝箱",
		Description: "金库的中心放着一个沉重的铁箱，需要巨大的力量才能撬开。",
		Icon:        "Lock",
		TriggerType: "ON_ENTER",
		Interaction: &Interaction{
			Type:       "ATTRIBUTE_CHECK",
			Attribute:  "might",
			Difficulty: 3,
			Success: []Effect{
				{Type: "DRAW_CARD", Deck: "ITEM", Message: "你用力撬开了锁，发现了里面的宝藏！"},
			},
			Failure: []Effect{
				{Type: "LOG", Message: "锁纹丝不动。也许下次运气会好点。", Style: "narrative"},
			},
		},
	},
	"event_coffin": {
		ID:          "event_coffin",
		Type:        "EVENT",
		Title:       "漆黑的棺材",
		Description: "你发现了一个打开的棺材，里面躺着一具苍白的躯体。",
		Icon:        "Moon",
		TriggerType: "ON_ENTER",
		Interaction: &Interaction{
			Type: "CHOICE",
			Options: []Choice{
				{
					Label: "打入木桩 (需要匕首)",
					Effects: []Effect{
						{
							Type: "IF",
							Condition: &Condition{Op: "HAS_ITEM", ItemID: "item_dagger"},
							Then: []Effect{
								{Type: "LOG", Message: "怪物在尖叫中化为灰烬！你获得了它的力量。", Style: "success"},
								{Type: "MODIFY_STAT", Stat: "might", Amount: 1},
							},
							Else: []Effect{
								{Type: "LOG", Message: "你手里没有合适的武器！怪物苏醒了并袭击了你！", Style: "alert"},
								{Type: "MODIFY_STAT", Stat: "might", Amount: -2},
							},
						},
					},
				},
				{
					Label: "搜身",
					Effects: []Effect{
						{Type: "LOG", Message: "你忍着恐惧搜寻了一番，发现了一些有用的东西。", Style: "info"},
						{Type: "DRAW_CARD", Deck: "ITEM"},
					},
				},
				{
					Label: "悄悄离开",
					Effects: []Effect{
						{Type: "LOG", Message: "你屏住呼吸离开了房间，决定不打扰它。", Style: "narrative"},
					},
				},
			},
		},
	},
}

// 物品数据
var ItemsData = map[string]Card{
	"item_revolver": {
		ID:          "item_revolver",
		Type:        "ITEM",
		Title:       "生锈的左轮手枪",
		Description: "一把旧式勤务武器。握在手里沉稳可靠。",
		Icon:        "Crosshair",
		Usage: &ItemUsage{
			ActionLabel:  "开火",
			IsConsumable: false,
			Target:       "OPPONENT",
			Effects: []Effect{
				{Type: "DAMAGE", Stat: "might", Amount: 2, Target: "SELECTED_PARTNER"},
				{Type: "LOG", Message: "砰！你的左轮手枪喷出了火舌。", Style: "alert"},
			},
		},
		PassiveEffects: []string{"攻击时力量 +2"},
	},
	"item_dagger": {
		ID:          "item_dagger",
		Type:        "ITEM",
		Title:       "祭祀匕首",
		Description: "刀刃上刻有奇怪的凹槽，似乎渴望着鲜血。",
		Icon:        "Sword",
		Usage: &ItemUsage{
			ActionLabel:  "刺击",
			IsConsumable: false,
			Target:       "OPPONENT",
			Effects: []Effect{
				{Type: "DAMAGE", Stat: "might", Amount: 1, Target: "SELECTED_PARTNER"},
			},
		},
		PassiveEffects: []string{"获得技能：嗜血打击"},
	},
	"item_amulet": {
		ID:          "item_amulet",
		Type:        "ITEM",
		Title:       "神圣护身符",
		Description: "它在你的胸口散发着淡淡的暖意。",
		Icon:        "Gem",
		PassiveEffects: []string{"理智 +1"},
	},
	"item_adrenaline": {
		ID:          "item_adrenaline",
		Type:        "ITEM",
		Title:       "肾上腺素针剂",
		Description: "紧急医疗兴奋剂。请谨慎使用。",
		Icon:        "Syringe",
		Usage: &ItemUsage{
			ActionLabel:  "注射",
			IsConsumable: true,
			Target:       "SELF",
			Effects: []Effect{
				{Type: "MODIFY_STAT", Stat: "speed", Amount: 2},
				{Type: "MODIFY_STAT", Stat: "might", Amount: 1},
				{Type: "LOG", Message: "你感到一股力量涌遍全身！", Style: "success"},
			},
		},
	},
	"item_pickaxe": {
		ID:          "item_pickaxe",
		Type:        "ITEM",
		Title:       "矿工镐",
		Description: "不仅能挖矿，还能挖穿墙壁。",
		Icon:        "Hammer",
		Usage: &ItemUsage{
			ActionLabel:  "挖掘",
			IsConsumable: false,
			Target:       "SELF",
			Effects: []Effect{
				{Type: "LOG", Message: "你挥动镐头挖穿了墙壁！", Style: "success"},
			},
		},
		PassiveEffects: []string{"允许破坏墙壁"},
	},
	"item_health_potion": {
		ID:          "item_health_potion",
		Type:        "ITEM",
		Title:       "治疗药水",
		Description: "能恢复伤口的魔法药水。",
		Icon:        "Flask",
		Usage: &ItemUsage{
			ActionLabel:  "饮用",
			IsConsumable: true,
			Target:       "SELF",
			Effects: []Effect{
				{Type: "HEAL", Stat: "might", Amount: 2},
				{Type: "LOG", Message: "药水甘甜可口，伤口开始愈合。", Style: "success"},
			},
		},
	},
	"item_sanity_potion": {
		ID:          "item_sanity_potion",
		Type:        "ITEM",
		Title:       "清醒药剂",
		Description: "能让混乱的思绪重新清晰的药水。",
		Icon:        "Brain",
		Usage: &ItemUsage{
			ActionLabel:  "饮用",
			IsConsumable: true,
			Target:       "SELF",
			Effects: []Effect{
				{Type: "HEAL", Stat: "sanity", Amount: 2},
				{Type: "LOG", Message: "你的思绪变得清晰起来。", Style: "success"},
			},
		},
	},
}

// 厄运卡数据
var OmensData = map[string]Card{
	"omen_crystal_ball": {
		ID:          "omen_crystal_ball",
		Type:        "OMEN",
		Title:       "水晶球",
		Description: "球体深处闪烁着不详的微光，仿佛在揭示未来的终局。",
		Icon:        "Eye",
		PassiveEffects: []string{"知识 +2，理智 -1"},
	},
	"omen_girl": {
		ID:          "omen_girl",
		Type:        "OMEN",
		Title:       "镜中少女",
		Description: "镜中的倒影模仿着你... 几乎完美。她似乎想帮忙。",
		Icon:        "User",
		PassiveEffects: []string{"知识 +1"},
	},
	"omen_book": {
		ID:          "omen_book",
		Type:        "OMEN",
		Title:       "亡灵之书",
		Description: "封面的质感摸起来像极了人皮，让人感到极度不安。",
		Icon:        "BookOpen",
		PassiveEffects: []string{"知识 +2，理智 -1"},
	},
	"omen_ring": {
		ID:          "omen_ring",
		Type:        "OMEN",
		Title:       "所罗门之戒",
		Description: "上面刻满了令你双眼酸涩流泪的符号。",
		Icon:        "Circle",
		PassiveEffects: []string{"理智 +1"},
	},
	"omen_mask": {
		ID:          "omen_mask",
		Type:        "OMEN",
		Title:       "千面面具",
		Description: "它在你的脸上蠕动，仿佛要与你的皮肤融合。",
		Icon:        "Smile",
		PassiveEffects: []string{"理智 -1，知识 +1"},
	},
	"omen_skull": {
		ID:          "omen_skull",
		Type:        "OMEN",
		Title:       "低语头骨",
		Description: "它在你耳边不断诉说着疯狂的秘密。",
		Icon:        "Skull",
		PassiveEffects: []string{"知识 +2，理智 -2"},
	},
	"omen_dog": {
		ID:          "omen_dog",
		Type:        "OMEN",
		Title:       "幽灵猎犬",
		Description: "一只半透明的猎犬，它似乎只对你忠诚。",
		Icon:        "Dog",
		PassiveEffects: []string{"速度 +1，力量 +1"},
	},
}

// 技能数据
var SkillsData = map[string]Card{
	"skill_vampiric_strike": {
		ID:          "skill_vampiric_strike",
		Type:        "SKILL",
		Title:       "嗜血打击",
		Description: "攻击敌人并吸取其生命。",
		Icon:        "Zap",
		Usage: &ItemUsage{
			ActionLabel:  "使用",
			IsConsumable: false,
			Target:       "OPPONENT",
			Effects: []Effect{
				{Type: "DAMAGE", Stat: "might", Amount: 2, Target: "SELECTED_PARTNER"},
				{Type: "HEAL", Stat: "might", Amount: 1, Target: "SELF"},
				{Type: "LOG", Message: "你从敌人身上吸取了生命力！", Style: "success"},
			},
		},
	},
	"skill_sprint": {
		ID:          "skill_sprint",
		Type:        "SKILL",
		Title:       "爆发",
		Description: "消耗理智换取爆发移动。",
		Icon:        "Zap",
		Usage: &ItemUsage{
			ActionLabel:  "使用",
			IsConsumable: false,
			Target:       "SELF",
			Effects: []Effect{
				{Type: "MODIFY_STAT", Stat: "sanity", Amount: -1},
				{Type: "MODIFY_STAT", Stat: "speed", Amount: 2},
				{Type: "LOG", Message: "你感到一阵天旋地转，速度暴增！", Style: "alert"},
			},
		},
	},
	"skill_meditate": {
		ID:          "skill_meditate",
		Type:        "SKILL",
		Title:       "冥想",
		Description: "原地恢复理智。",
		Icon:        "Moon",
		Usage: &ItemUsage{
			ActionLabel:  "使用",
			IsConsumable: false,
			Target:       "SELF",
			Effects: []Effect{
				{Type: "HEAL", Stat: "sanity", Amount: 2},
				{Type: "LOG", Message: "你进入冥想状态，思绪逐渐平静。", Style: "success"},
			},
		},
	},
	"skill_dodge": {
		ID:          "skill_dodge",
		Type:        "SKILL",
		Title:       "闪避",
		Description: "提升防御闪避下一次攻击。",
		Icon:        "Wind",
		Usage: &ItemUsage{
			ActionLabel:  "使用",
			IsConsumable: false,
			Target:       "SELF",
			Effects: []Effect{
				{Type: "LOG", Message: "你进入闪避姿态。", Style: "info"},
			},
		},
	},
}

// ==================== 数据加载函数 ====================

// InitDeck 初始化牌堆（洗牌）
func InitDeck(cardType string) []Card {
	var cards []Card

	switch cardType {
	case "EVENT":
		for _, card := range EventsData {
			cards = append(cards, card)
		}
	case "ITEM":
		for _, card := range ItemsData {
			cards = append(cards, card)
		}
	case "OMEN":
		for _, card := range OmensData {
			cards = append(cards, card)
		}
	}

	// 洗牌
	rand.Shuffle(len(cards), func(i, j int) {
		cards[i], cards[j] = cards[j], cards[i]
	})

	return cards
}

// GetEvent 获取事件卡
func GetEvent(eventID string) *Card {
	// 优先从加载的数据中获取
	if card := GetEventByID(eventID); card != nil {
		return card
	}
	// 降级使用内存数据
	if card, ok := EventsData[eventID]; ok {
		return &card
	}
	return nil
}

// GetItem 获取物品
func GetItem(itemID string) *Card {
	// 优先从加载的数据中获取
	if card := GetItemByID(itemID); card != nil {
		return card
	}
	// 降级使用内存数据
	if card, ok := ItemsData[itemID]; ok {
		return &card
	}
	return nil
}

// GetOmen 获取厄运卡
func GetOmen(omenID string) *Card {
	// 优先从加载的数据中获取
	if card := GetOmenByID(omenID); card != nil {
		return card
	}
	// 降级使用内存数据
	if card, ok := OmensData[omenID]; ok {
		return &card
	}
	return nil
}

// GetSkill 获取技能
func GetSkill(skillID string) *Card {
	// 优先从加载的数据中获取
	if card := GetSkillByID(skillID); card != nil {
		return card
	}
	// 降级使用内存数据
	if card, ok := SkillsData[skillID]; ok {
		return &card
	}
	return nil
}
