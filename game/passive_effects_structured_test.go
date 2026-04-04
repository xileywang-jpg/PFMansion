package game

import "testing"

func TestApplyPassiveEffects_UsesStructuredBuffFields(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)
	player := gm.Rooms[roomID].GameState.FullState.Players["player_1"]
	before := player.Character.Attributes["sanity"]

	gm.applyPassiveEffects(roomID, "player_1", Card{
		ID:   "item_test_structured_buff",
		Type: "ITEM",
		Name: "结构化护符",
		PassiveEffects: []PassiveEffect{{
			Type:   "buff",
			Stat:   "sanity",
			Amount: 1,
			Text:   "理智 +1",
		}},
	})

	after := player.Character.Attributes["sanity"]
	if after.Current != before.Current+1 {
		t.Fatalf("结构化被动效果未生效: before=%d after=%d", before.Current, after.Current)
	}
}

func TestApplyPassiveEffects_UsesStructuredSkillID(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)
	player := gm.Rooms[roomID].GameState.FullState.Players["player_1"]

	gm.applyPassiveEffects(roomID, "player_1", Card{
		ID:   "item_test_structured_skill",
		Type: "ITEM",
		Name: "结构化技能遗物",
		PassiveEffects: []PassiveEffect{{
			Type:    "skill",
			SkillID: "skill_sprint",
			Text:    "获得技能：爆发",
		}},
	})

	if len(player.Skills) != 1 || player.Skills[0] != "skill_sprint" {
		t.Fatalf("结构化 skillId 被动效果未生效: %#v", player.Skills)
	}
}

func TestApplyPassiveEffects_UsesStructuredSpecialKey(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)
	player := gm.Rooms[roomID].GameState.FullState.Players["player_1"]

	gm.applyPassiveEffects(roomID, "player_1", Card{
		ID:   "item_test_structured_special",
		Type: "ITEM",
		Name: "结构化特性遗物",
		PassiveEffects: []PassiveEffect{{
			Type:       "special",
			SpecialKey: "wall_break",
			Text:       "允许破坏墙壁",
		}},
	})

	if len(player.Buffs) != 1 || player.Buffs[0] != "允许破坏墙壁" {
		t.Fatalf("结构化 specialKey 被动效果未生效: %#v", player.Buffs)
	}
}

func TestRemovePassiveEffects_RevertsStructuredBuffFields(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)
	player := gm.Rooms[roomID].GameState.FullState.Players["player_1"]

	card := Card{
		ID:   "item_test_structured_buff",
		Type: "ITEM",
		Name: "结构化护符",
		PassiveEffects: []PassiveEffect{{
			Type:   "buff",
			Stat:   "sanity",
			Amount: 1,
			Text:   "理智 +1",
		}},
	}

	baseline := player.Character.Attributes["sanity"]
	gm.applyPassiveEffects(roomID, "player_1", card)
	gm.removePassiveEffects(roomID, "player_1", card)
	final := player.Character.Attributes["sanity"]

	if final.Current != baseline.Current {
		t.Fatalf("结构化被动效果回退失败: baseline=%d final=%d", baseline.Current, final.Current)
	}
}

func TestRemovePassiveEffects_RevertsStructuredSpecialKey(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)
	player := gm.Rooms[roomID].GameState.FullState.Players["player_1"]

	card := Card{
		ID:   "item_test_structured_special",
		Type: "ITEM",
		Name: "结构化特性遗物",
		PassiveEffects: []PassiveEffect{{
			Type:       "special",
			SpecialKey: "wall_break",
			Text:       "允许破坏墙壁",
		}},
	}

	gm.applyPassiveEffects(roomID, "player_1", card)
	gm.removePassiveEffects(roomID, "player_1", card)

	if len(player.Buffs) != 0 {
		t.Fatalf("结构化 specialKey 被动效果回退失败: %#v", player.Buffs)
	}
}

func TestApplyPassiveEffects_RegistersTriggeredBuffFromStructuredFields(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)
	player := gm.Rooms[roomID].GameState.FullState.Players["player_1"]

	gm.applyPassiveEffects(roomID, "player_1", Card{
		ID:   "item_test_triggered_buff",
		Type: "ITEM",
		Name: "触发护符",
		PassiveEffects: []PassiveEffect{{
			Type:    "buff",
			Trigger: "ATTACK",
			Stat:    "might",
			Amount:  2,
		}},
	})

	found := false
	for _, buff := range player.Buffs {
		if buff == "攻击时 might +2" {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("触发型结构化被动应注册为条件增益: %#v", player.Buffs)
	}
}

func TestApplyConditionalBuffs_AppliesTriggeredStructuredBuff(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)
	player := gm.Rooms[roomID].GameState.FullState.Players["player_1"]

	gm.applyPassiveEffects(roomID, "player_1", Card{
		ID:   "item_test_triggered_buff",
		Type: "ITEM",
		Name: "触发护符",
		PassiveEffects: []PassiveEffect{{
			Type:    "buff",
			Trigger: "ATTACK",
			Stat:    "might",
			Amount:  1,
		}},
	})

	before := player.Character.Attributes["might"].Current
	gm.ApplyConditionalBuffs(roomID, "player_1", "ATTACK")
	after := player.Character.Attributes["might"].Current

	if after != before+1 {
		t.Fatalf("条件触发被动未生效: before=%d after=%d", before, after)
	}
}
