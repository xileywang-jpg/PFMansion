package game

import (
	"encoding/json"
	"testing"
)

func TestObjectiveParamHelpers_PreferStructuredParams(t *testing.T) {
	obj := &Objective{
		Type: "REACH",
		Params: map[string]interface{}{
			"target":   "tile_exit",
			"turns":    8,
			"required": 2,
			"customId": "ritual_v2",
		},
	}

	if got := objectiveTarget(obj); got != "tile_exit" {
		t.Fatalf("objectiveTarget 应优先读取 params.target, 实际是 %s", got)
	}
	if got := objectiveTurnLimit(obj); got != 8 {
		t.Fatalf("objectiveTurnLimit 应优先读取 params.turns, 实际是 %d", got)
	}
	if got := objectiveRequiredProgress(obj); got != 2 {
		t.Fatalf("objectiveRequiredProgress 应优先读取 params.required, 实际是 %d", got)
	}
	if got := objectiveCustomID(obj); got != "ritual_v2" {
		t.Fatalf("objectiveCustomID 应优先读取 params.customId, 实际是 %s", got)
	}
}

func TestObjectiveRequiredProgress_UsesStructuredParams(t *testing.T) {
	survive := &Objective{Type: "SURVIVE", Params: map[string]interface{}{"turns": 12, "required": 12}}
	if got := objectiveRequiredProgress(survive); got != 12 {
		t.Fatalf("SURVIVE 应读取显式 params.required, 实际是 %d", got)
	}

	reach := &Objective{Type: "REACH", Params: map[string]interface{}{"turns": 12}}
	if got := objectiveRequiredProgress(reach); got != 1 {
		t.Fatalf("REACH 无 params.required 时应默认 1, 实际是 %d", got)
	}

	custom := &Objective{Type: "CUSTOM", Params: map[string]interface{}{"turns": 3}}
	if got := objectiveRequiredProgress(custom); got != 1 {
		t.Fatalf("CUSTOM 无 params.required 时应默认 1, 实际是 %d", got)
	}
}

func TestObjectiveRequiredProgress_CustomNeedsExplicitRequired(t *testing.T) {
	obj := &Objective{
		Type: "CUSTOM",
		Params: map[string]interface{}{
			"turns": 9,
		},
	}

	if got := objectiveRequiredProgress(obj); got != 1 {
		t.Fatalf("CUSTOM 无 params.required 时应默认 1, 实际是 %d", got)
	}
}

func TestObjectiveAllowsDynamicRequired_PlayerDeathTargets(t *testing.T) {
	allHeroes := &Objective{Type: "ELIMINATE", Params: map[string]interface{}{"eventType": "PLAYER_DEATH", "target": "ALL_HEROES"}}
	if !objectiveAllowsDynamicRequired(allHeroes) {
		t.Fatal("PLAYER_DEATH + ALL_HEROES 应允许运行时推导 required")
	}

	allEnemies := &Objective{Type: "ELIMINATE", Params: map[string]interface{}{"eventType": "PLAYER_DEATH", "target": "ALL_ENEMIES"}}
	if !objectiveAllowsDynamicRequired(allEnemies) {
		t.Fatal("PLAYER_DEATH + ALL_ENEMIES 应允许运行时推导 required")
	}

	reach := &Objective{Type: "REACH", Params: map[string]interface{}{"eventType": "TILE_REACHED", "target": "tile_exit"}}
	if objectiveAllowsDynamicRequired(reach) {
		t.Fatal("非 PLAYER_DEATH 多目标 objective 不应允许省略 required")
	}
}

func TestObjectiveParamHelpers_DoNotFallbackToLegacyTopLevelFields(t *testing.T) {
	var obj Objective
	err := json.Unmarshal([]byte(`{
		"name": "Legacy Objective",
		"type": "CUSTOM",
		"target": "legacy_target",
		"turns": 12,
		"customId": "legacy_custom"
	}`), &obj)
	if err != nil {
		t.Fatalf("legacy objective JSON 应该可被解析以供校验, 实际错误: %v", err)
	}

	if got := objectiveTarget(&obj); got != "" {
		t.Fatalf("objectiveTarget 不应再 fallback 到顶层 target, 实际是 %s", got)
	}
	if got := objectiveTurnLimit(&obj); got != 0 {
		t.Fatalf("objectiveTurnLimit 不应再 fallback 到顶层 turns, 实际是 %d", got)
	}
	if got := objectiveCustomID(&obj); got != "" {
		t.Fatalf("objectiveCustomID 不应再 fallback 到顶层 customId, 实际是 %s", got)
	}
	if !objectiveUsesLegacyScenarioFields(&obj) {
		t.Fatal("legacy objective JSON 应标记为使用了顶层旧字段")
	}
}
