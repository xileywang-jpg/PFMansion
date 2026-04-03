package game

import "testing"

func TestHandleGiveItemEffect_UsesExplicitItemID(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)
	state := gm.Rooms[roomID].GameState.FullState
	player := state.Players["player_1"]

	gm.applyEffect(roomID, "player_1", Effect{Type: "GIVE_ITEM", ItemID: "item_amulet"})

	if len(player.Items) != 1 || player.Items[0].ID != "item_amulet" {
		t.Fatalf("GIVE_ITEM 应按显式 itemId 发放物品, 实际为 %#v", player.Items)
	}
}

func TestHandleGiveSkillEffect_UsesExplicitSkillID(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)
	state := gm.Rooms[roomID].GameState.FullState
	player := state.Players["player_1"]

	gm.applyEffect(roomID, "player_1", Effect{Type: "GIVE_SKILL", SkillID: "skill_sprint"})

	if len(player.Skills) != 1 || player.Skills[0] != "skill_sprint" {
		t.Fatalf("GIVE_SKILL 应按显式 skillId 发放技能, 实际为 %#v", player.Skills)
	}
}

func TestHandleGiveItemEffect_MessageFallbackRemainsCompatible(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)
	state := gm.Rooms[roomID].GameState.FullState
	player := state.Players["player_1"]

	gm.applyEffect(roomID, "player_1", Effect{Type: "GIVE_ITEM", Message: "item_amulet"})

	if len(player.Items) != 1 || player.Items[0].ID != "item_amulet" {
		t.Fatalf("GIVE_ITEM 旧版 message 兼容路径失效, 实际为 %#v", player.Items)
	}
}

func TestResolveMovePlayerTarget_UsesConfiguredNamedLocation(t *testing.T) {
	player := &GamePlayer{Position: Position{X: 2, Y: 3}}
	expected, ok := GetNamedLocationByID("basement")
	if !ok {
		t.Fatal("basement 命名位置应已配置")
	}

	x, y, err := resolveMovePlayerTarget(player, Effect{Type: "MOVE_PLAYER", Location: "basement"})
	if err != nil {
		t.Fatalf("resolveMovePlayerTarget 返回错误: %v", err)
	}
	if x != expected.X || y != expected.Y {
		t.Fatalf("命名位置解析错误: got=(%d,%d) want=(%d,%d)", x, y, expected.X, expected.Y)
	}
}

func TestResolveMovePlayerTarget_RejectsUnknownNamedLocation(t *testing.T) {
	player := &GamePlayer{Position: Position{X: 2, Y: 3}}

	_, _, err := resolveMovePlayerTarget(player, Effect{Type: "MOVE_PLAYER", Location: "missing_alias"})
	if err == nil {
		t.Fatal("未知命名位置应返回错误")
	}
}

func TestResolveMovePlayerTarget_ExplicitCoordinatesOverrideLocation(t *testing.T) {
	player := &GamePlayer{Position: Position{X: 2, Y: 3}}

	x, y, err := resolveMovePlayerTarget(player, Effect{Type: "MOVE_PLAYER", Location: "basement", X: 5, Y: -1})
	if err != nil {
		t.Fatalf("显式坐标不应返回错误: %v", err)
	}
	if x != 5 || y != -1 {
		t.Fatalf("显式坐标应优先生效: got=(%d,%d)", x, y)
	}
}

func TestHandleAddBuffEffect_UsesExplicitBuffField(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)
	state := gm.Rooms[roomID].GameState.FullState
	player := state.Players["player_1"]

	gm.applyEffect(roomID, "player_1", Effect{Type: "ADD_BUFF", Buff: "防御 +1"})

	if len(player.Buffs) != 1 || player.Buffs[0] != "防御 +1" {
		t.Fatalf("ADD_BUFF 应按显式 buff 生效, 实际为 %#v", player.Buffs)
	}
}

func TestHandleRemoveBuffEffect_UsesExplicitBuffField(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)
	state := gm.Rooms[roomID].GameState.FullState
	player := state.Players["player_1"]
	player.Buffs = []string{"防御 +1", "速度 +1"}

	gm.applyEffect(roomID, "player_1", Effect{Type: "REMOVE_BUFF", Buff: "防御 +1"})

	if len(player.Buffs) != 1 || player.Buffs[0] != "速度 +1" {
		t.Fatalf("REMOVE_BUFF 应按显式 buff 移除, 实际为 %#v", player.Buffs)
	}
}

func TestHandleAddStatusEffect_UsesExplicitStatusFields(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)
	state := gm.Rooms[roomID].GameState.FullState
	player := state.Players["player_1"]

	gm.applyEffect(roomID, "player_1", Effect{
		Type:       "ADD_STATUS",
		StatusType: "burning",
		Duration:   2,
		Damage:     1,
		Faction:    "enemy",
		Source:     "event_fire",
		StatusAmt:  3,
	})

	if len(player.StatusEffects) != 1 {
		t.Fatalf("ADD_STATUS 后状态数量错误: %#v", player.StatusEffects)
	}
	status := player.StatusEffects[0]
	if status.Type != "BURNING" {
		t.Fatalf("状态类型应标准化为 BURNING, 实际为 %s", status.Type)
	}
	if status.Duration != 2 || status.Damage != 1 || status.Faction != "enemy" || status.Source != "event_fire" || status.Amount != 3 {
		t.Fatalf("状态字段映射错误: %#v", status)
	}
}

func TestHandleAddBuffEffect_MessageFallbackRemainsCompatible(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)
	state := gm.Rooms[roomID].GameState.FullState
	player := state.Players["player_1"]

	gm.applyEffect(roomID, "player_1", Effect{Type: "ADD_BUFF", Message: "速度 +1"})

	if len(player.Buffs) != 1 || player.Buffs[0] != "速度 +1" {
		t.Fatalf("ADD_BUFF 旧版 message 兼容路径失效, 实际为 %#v", player.Buffs)
	}
}
