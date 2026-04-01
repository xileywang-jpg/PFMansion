package game

import (
	"strings"
	"testing"
)

func TestApplyEffect_ModifyStatUsesCoreHandler(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)
	player := gm.Rooms[roomID].GameState.FullState.Players["player_1"]
	before := player.Character.Attributes["sanity"].Current

	gm.applyEffect(roomID, "player_1", Effect{Type: "MODIFY_STAT", Attribute: "sanity", Amount: -2})

	after := player.Character.Attributes["sanity"].Current
	if after != before-2 {
		t.Fatalf("MODIFY_STAT 应减少理智, 期望 %d, 实际 %d", before-2, after)
	}

	logs := gm.Rooms[roomID].GameState.FullState.Logs
	if len(logs) == 0 || !strings.Contains(logs[len(logs)-1].Text, "sanity -2") {
		t.Fatalf("MODIFY_STAT 应追加属性变化日志, 实际日志: %+v", logs)
	}
}

func TestApplyEffect_RollCreatesPendingAction(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)
	room := gm.Rooms[roomID]
	result := 7
	room.GameState.FullState.LastRollResult = &result

	gm.applyEffect(roomID, "player_1", Effect{Type: "ROLL", Attribute: "knowledge", Difficulty: 5})

	pending := room.GameState.FullState.PendingAction
	if pending == nil || pending.Type != PendingActionTypeAttributeCheck {
		t.Fatalf("ROLL 应创建 ATTRIBUTE_CHECK pendingAction, 实际为 %+v", pending)
	}
	if pending.Attribute != "knowledge" {
		t.Fatalf("ROLL pendingAction 结构化 attribute 应为 knowledge, 实际为 %#v", pending.Attribute)
	}
	if pending.Difficulty != 5 {
		t.Fatalf("ROLL pendingAction 结构化 difficulty 应为 5, 实际为 %#v", pending.Difficulty)
	}
	if pending.Data["attribute"] != "knowledge" {
		t.Fatalf("ROLL pendingAction attribute 应为 knowledge, 实际为 %#v", pending.Data["attribute"])
	}
	if pending.Data["difficulty"] != 5 {
		t.Fatalf("ROLL pendingAction difficulty 应为 5, 实际为 %#v", pending.Data["difficulty"])
	}
	if room.GameState.FullState.LastRollResult != nil {
		t.Fatal("ROLL 应清除旧的 LastRollResult")
	}
}

func TestDrawCard_ItemUsesUnifiedCollection(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)
	room := gm.Rooms[roomID]
	state := room.GameState.FullState
	player := state.Players["player_1"]

	state.Decks = map[string][]Card{
		"ITEM": {{
			ID:             "item_amulet",
			Type:           "ITEM",
			Name:           "神圣护身符",
			PassiveEffects: []PassiveEffect{{Type: "buff", Text: "sanity +1"}},
		}},
		"EVENT": {},
		"OMEN":  {},
	}

	before := player.Character.Attributes["sanity"].Current
	result, err := gm.DrawCard(roomID, "player_1", "ITEM")
	if err != nil {
		t.Fatalf("DrawCard ITEM 失败: %v", err)
	}

	if len(player.Items) != 1 || player.Items[0].ID != "item_amulet" {
		t.Fatalf("ITEM 抽卡后应直接进入玩家背包, 实际物品: %+v", player.Items)
	}
	if len(state.Map["0,0"].DroppedItems) != 0 {
		t.Fatalf("ITEM 抽卡后不应再掉落到地面, 实际: %+v", state.Map["0,0"].DroppedItems)
	}
	if state.ActiveCard != nil {
		t.Fatal("ITEM 抽卡后 ActiveCard 应清空")
	}
	if player.Character.Attributes["sanity"].Current != before+1 {
		t.Fatalf("ITEM 被动效果应已生效, 期望理智 %d, 实际 %d", before+1, player.Character.Attributes["sanity"].Current)
	}
	if result["deck"] != "ITEM" {
		t.Fatalf("返回的 deck 应为 ITEM, 实际是 %v", result["deck"])
	}
	if _, ok := result["card"]; ok {
		t.Fatal("ITEM 抽卡不应再通过 card_drawn 暴露旧拾取弹窗")
	}
}

func TestDrawCard_OmenUsesUnifiedCollection(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)
	room := gm.Rooms[roomID]
	state := room.GameState.FullState
	player := state.Players["player_1"]

	state.OmenCount = -1
	state.Decks = map[string][]Card{
		"ITEM":  {},
		"EVENT": {},
		"OMEN": {{
			ID:   "omen_ring",
			Type: "OMEN",
			Name: "所罗门之戒",
		}},
	}

	result, err := gm.DrawCard(roomID, "player_1", "OMEN")
	if err != nil {
		t.Fatalf("DrawCard OMEN 失败: %v", err)
	}

	if len(player.Items) != 1 || player.Items[0].ID != "omen_ring" {
		t.Fatalf("OMEN 抽卡后应直接进入玩家背包, 实际物品: %+v", player.Items)
	}
	if len(state.Map["0,0"].DroppedItems) != 0 {
		t.Fatalf("OMEN 抽卡后不应落地等待 pickup, 实际: %+v", state.Map["0,0"].DroppedItems)
	}
	if state.LastTriggeredOmen != "omen_ring" {
		t.Fatalf("OMEN 抽卡后应记录 LastTriggeredOmen, 实际是 %s", state.LastTriggeredOmen)
	}
	if state.OmenCount != 0 {
		t.Fatalf("OMEN 计数应从 -1 增加到 0, 实际是 %d", state.OmenCount)
	}
	if state.ActiveCard != nil {
		t.Fatal("OMEN 抽卡完成后 ActiveCard 应清空")
	}
	if result["deck"] != "OMEN" {
		t.Fatalf("返回的 deck 应为 OMEN, 实际是 %v", result["deck"])
	}
	if _, ok := result["card"]; ok {
		t.Fatal("OMEN 抽卡不应再通过 card_drawn 暴露旧拾取弹窗")
	}
}

func TestDrawCard_EventPreservesRevealAndPendingAction(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)
	room := gm.Rooms[roomID]
	state := room.GameState.FullState

	state.Decks = map[string][]Card{
		"ITEM": {},
		"EVENT": {{
			ID:          "event_test_check",
			Type:        "EVENT",
			Title:       "古老低语",
			Description: "你听见墙里有声音。",
			Interaction: &Interaction{
				Type:       "ATTRIBUTE_CHECK",
				Attribute:  "knowledge",
				Difficulty: 5,
			},
		}},
		"OMEN": {},
	}

	result, err := gm.DrawCard(roomID, "player_1", "EVENT")
	if err != nil {
		t.Fatalf("DrawCard EVENT 失败: %v", err)
	}

	if state.ActiveCard == nil || state.ActiveCard.ID != "event_test_check" {
		t.Fatalf("EVENT 抽卡后应保留 ActiveCard, 实际是 %+v", state.ActiveCard)
	}
	if state.PendingAction == nil || state.PendingAction.Type != PendingActionTypeAttributeCheck {
		t.Fatalf("EVENT 抽卡后应创建 ATTRIBUTE_CHECK pendingAction, 实际是 %+v", state.PendingAction)
	}
	if state.PendingAction.Attribute != "knowledge" {
		t.Fatalf("EVENT pendingAction 结构化 attribute 应为 knowledge, 实际是 %v", state.PendingAction.Attribute)
	}
	if state.PendingAction.Difficulty != 5 {
		t.Fatalf("EVENT pendingAction 结构化 difficulty 应为 5, 实际是 %v", state.PendingAction.Difficulty)
	}
	if state.PendingAction.Data["attribute"] != "knowledge" {
		t.Fatalf("EVENT pendingAction 的 attribute 应为 knowledge, 实际是 %v", state.PendingAction.Data["attribute"])
	}
	card, ok := result["card"].(Card)
	if !ok {
		t.Fatalf("EVENT 抽卡应返回可广播的 card, 实际是 %#v", result["card"])
	}
	if card.ID != "event_test_check" {
		t.Fatalf("返回的 card ID 应为 event_test_check, 实际是 %s", card.ID)
	}
	if result["deck"] != "EVENT" {
		t.Fatalf("返回的 deck 应为 EVENT, 实际是 %v", result["deck"])
	}
}

func TestResolveEventChoice_ClearsLastRollResultAfterAttributeCheck(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)
	state := gm.Rooms[roomID].GameState.FullState
	result := 6

	state.ActiveCard = &Card{
		ID:   "event_test_check",
		Type: "EVENT",
		Interaction: &Interaction{
			Type:       "ATTRIBUTE_CHECK",
			Attribute:  "sanity",
			Difficulty: 4,
			Success:    []Effect{{Type: "LOG", Message: "检定成功"}},
			Failure:    []Effect{{Type: "LOG", Message: "检定失败"}},
		},
	}
	state.PendingAction = NewPendingAttributeCheck("player_1", "sanity", 4, nil)
	state.LastRollResult = &result

	if err := gm.ResolveEventChoice(roomID, "player_1", 0); err != nil {
		t.Fatalf("ResolveEventChoice 失败: %v", err)
	}

	if state.LastRollResult != nil {
		t.Fatal("事件检定结算后应清除 LastRollResult")
	}
	if state.PendingAction != nil {
		t.Fatal("事件检定结算后应清除 PendingAction")
	}
	if state.ActiveCard != nil {
		t.Fatal("事件检定结算后应清除 ActiveCard")
	}
}
