package game

import (
	"encoding/json"
	"testing"
)

func buildEffectValidationLoader() *DataLoader {
	return &DataLoader{
		Items: ItemsJSON{
			Items:       []Card{{ID: "item_amulet", Type: "ITEM", Name: "护符"}},
			RewardItems: []Card{{ID: "forge_athena_spear", Type: "WEAPON", Name: "雅典娜之矛"}},
			Omens:       []Card{{ID: "omen_crystal_ball", Type: "OMEN", Name: "水晶球"}},
			Skills:      []Card{{ID: "skill_sprint", Type: "SKILL", Name: "疾跑"}},
		},
		NamedLocationMap: map[string]Position{
			"entry": {X: 0, Y: 0},
		},
	}
}

func TestValidateEffect_GiveItemRejectsUnknownReference(t *testing.T) {
	d := buildEffectValidationLoader()
	err := d.validateEffect(Effect{Type: "GIVE_ITEM", ItemID: "item_missing"}, "test")
	if err == nil {
		t.Fatal("GIVE_ITEM 引用不存在 itemId 时应失败")
	}
}

func TestValidateEffect_MovePlayerRejectsUnknownNamedLocation(t *testing.T) {
	d := buildEffectValidationLoader()
	err := d.validateEffect(Effect{Type: "MOVE_PLAYER", Location: "basement"}, "test")
	if err == nil {
		t.Fatal("MOVE_PLAYER 引用不存在命名位置时应失败")
	}
}

func TestValidateEffect_AddBuffRequiresBuffText(t *testing.T) {
	d := buildEffectValidationLoader()
	err := d.validateEffect(Effect{Type: "ADD_BUFF"}, "test")
	if err == nil {
		t.Fatal("ADD_BUFF 缺少 buff/message 时应失败")
	}
}

func TestValidateEffect_AddStatusRequiresStatusType(t *testing.T) {
	d := buildEffectValidationLoader()
	err := d.validateEffect(Effect{Type: "ADD_STATUS", Duration: 2}, "test")
	if err == nil {
		t.Fatal("ADD_STATUS 缺少 statusType 时应失败")
	}
}

func TestValidateEffect_AcceptsExplicitFields(t *testing.T) {
	d := buildEffectValidationLoader()
	err := d.validateEffect(Effect{Type: "GIVE_SKILL", SkillID: "skill_sprint"}, "test")
	if err != nil {
		t.Fatalf("显式字段合法时不应失败: %v", err)
	}
}

func TestValidatePassiveEffect_AcceptsStructuredBuff(t *testing.T) {
	d := buildEffectValidationLoader()
	err := d.validatePassiveEffect(PassiveEffect{Type: "buff", Stat: "sanity", Amount: 1}, "test")
	if err != nil {
		t.Fatalf("结构化 passive buff 不应失败: %v", err)
	}
}

func TestValidatePassiveEffect_RejectsUnknownSkillID(t *testing.T) {
	d := buildEffectValidationLoader()
	err := d.validatePassiveEffect(PassiveEffect{Type: "skill", SkillID: "skill_missing"}, "test")
	if err == nil {
		t.Fatal("passive skill 引用不存在 skillId 时应失败")
	}
}

func TestValidatePassiveEffect_RejectsUnknownTrigger(t *testing.T) {
	d := buildEffectValidationLoader()
	err := d.validatePassiveEffect(PassiveEffect{Type: "buff", Trigger: "ON_HIT", Text: "力量 +1"}, "test")
	if err == nil {
		t.Fatal("passive trigger 非法时应失败")
	}
}

func TestValidatePassiveEffect_AcceptsCombatBuffWithTriggerAndStat(t *testing.T) {
	d := buildEffectValidationLoader()
	err := d.validatePassiveEffect(PassiveEffect{Type: "combat_buff", Modifier: 1, Trigger: "ATTACK", Stat: "might"}, "test")
	if err != nil {
		t.Fatalf("合法 combat_buff passive 不应失败: %v", err)
	}
}

func TestValidatePassiveEffect_AcceptsCombatDamageBonusWithNPCTypes(t *testing.T) {
	d := buildEffectValidationLoader()
	err := d.validatePassiveEffect(PassiveEffect{Type: "combat_damage_bonus", Amount: 2, Trigger: "ATTACK", NPCTypes: []string{"GHOST", "SPIRIT"}}, "test")
	if err != nil {
		t.Fatalf("合法 combat_damage_bonus passive 不应失败: %v", err)
	}
}

func TestValidatePassiveEffect_RejectsUnsupportedLegacyPassiveText(t *testing.T) {
	d := buildEffectValidationLoader()
	err := d.validatePassiveEffect(PassiveEffect{Type: "buff", Text: "攻击时额外造成 1 点伤害"}, "test")
	if err == nil {
		t.Fatal("不会被后端执行的 legacy passive 文本应失败")
	}
}

func TestValidateAllScenarioObjectives_RejectsReachWithoutTarget(t *testing.T) {
	d := buildEffectValidationLoader()
	d.Scenarios = HauntMatrixJSON{
		Scenarios: map[string]Scenario{
			"s1": {
				ID:   "s1",
				Name: "Scenario 1",
				TraitorObjective: &Objective{
					Name: "Reach",
					Type: "REACH",
					Params: map[string]interface{}{
						"turns":     10,
						"eventType": "TILE_REACHED",
					},
				},
			},
		},
	}

	err := d.validateAllScenarioObjectives()
	if err == nil {
		t.Fatal("REACH 缺少 target/params.target 时应失败")
	}
}

func TestValidateAllScenarioObjectives_AcceptsStructuredParams(t *testing.T) {
	d := buildEffectValidationLoader()
	d.Scenarios = HauntMatrixJSON{
		Scenarios: map[string]Scenario{
			"s1": {
				ID:   "s1",
				Name: "Scenario 1",
				HeroObjective: &Objective{
					Name: "Survive",
					Type: "SURVIVE",
					Params: map[string]interface{}{
						"turns":     6,
						"required":  6,
						"eventType": "TURNS_SURVIVED",
					},
				},
				TraitorObjective: &Objective{
					Name: "Reach",
					Type: "REACH",
					Params: map[string]interface{}{
						"target":    "tile_exit",
						"turns":     6,
						"required":  1,
						"eventType": "TILE_REACHED",
					},
				},
			},
		},
	}

	if err := d.validateAllScenarioObjectives(); err != nil {
		t.Fatalf("结构化 params 的 scenario objectives 不应失败: %v", err)
	}
}

func TestValidateAllScenarioObjectives_RejectsUnknownEventType(t *testing.T) {
	d := buildEffectValidationLoader()
	d.Scenarios = HauntMatrixJSON{
		Scenarios: map[string]Scenario{
			"s1": {
				ID:   "s1",
				Name: "Scenario 1",
				TraitorObjective: &Objective{
					Name: "Reach",
					Type: "REACH",
					Params: map[string]interface{}{
						"target":    "tile_exit",
						"turns":     6,
						"eventType": "UNKNOWN_EVENT",
					},
				},
			},
		},
	}

	if err := d.validateAllScenarioObjectives(); err == nil {
		t.Fatal("params.eventType 非法时应失败")
	}
}

func TestValidateAllScenarioObjectives_AcceptsValidEventType(t *testing.T) {
	d := buildEffectValidationLoader()
	d.Scenarios = HauntMatrixJSON{
		Scenarios: map[string]Scenario{
			"s1": {
				ID:   "s1",
				Name: "Scenario 1",
				TraitorObjective: &Objective{
					Name: "Reach",
					Type: "REACH",
					Params: map[string]interface{}{
						"target":    "tile_exit",
						"turns":     6,
						"eventType": "tile_reached",
					},
				},
			},
		},
	}

	if err := d.validateAllScenarioObjectives(); err != nil {
		t.Fatalf("合法 params.eventType 不应失败: %v", err)
	}
}

func TestValidateAllScenarioObjectives_RejectsLegacyTopLevelObjectiveFields(t *testing.T) {
	d := buildEffectValidationLoader()
	var legacyObjective Objective
	err := json.Unmarshal([]byte(`{
		"name": "Reach",
		"type": "REACH",
		"target": "legacy_tile",
		"turns": 6,
		"params": {
			"target": "tile_exit",
			"turns": 6,
			"eventType": "TILE_REACHED"
		}
	}`), &legacyObjective)
	if err != nil {
		t.Fatalf("legacy objective JSON 解析失败: %v", err)
	}

	d.Scenarios = HauntMatrixJSON{
		Scenarios: map[string]Scenario{
			"s1": {
				ID:               "s1",
				Name:             "Scenario 1",
				TraitorObjective: &legacyObjective,
			},
		},
	}

	if err := d.validateAllScenarioObjectives(); err == nil {
		t.Fatal("runtime scenario objective 仍使用顶层 target/turns 时应失败")
	}
}
