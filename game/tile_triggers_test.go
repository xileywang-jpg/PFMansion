package game

import "testing"

func TestTriggerRoomEvent_OnEnterAttributeCheckCreatesPendingAction(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)

	originalTileDeck := append([]TileDef(nil), TileDeck...)
	defer func() {
		TileDeck = originalTileDeck
	}()

	TileDeck = append(TileDeck, TileDef{
		ID: "tile_test_attribute_trigger",
		OnEnter: &TileTrigger{
			Type:       "ATTRIBUTE_CHECK",
			Attribute:  "knowledge",
			Difficulty: 5,
			Message:    "你感到墙壁在低语。",
		},
	})

	if err := gm.TriggerRoomEvent(roomID, "player_1", "tile_test_attribute_trigger"); err != nil {
		t.Fatalf("TriggerRoomEvent 失败: %v", err)
	}

	pending := gm.Rooms[roomID].GameState.FullState.PendingAction
	if pending == nil {
		t.Fatal("应创建地块属性检定 PendingAction")
	}
	if pending.Type != PendingActionTypeTileAttributeCheck {
		t.Fatalf("PendingAction 类型错误: %s", pending.Type)
	}
	if pending.Target != "player_1" {
		t.Fatalf("PendingAction 目标错误: %s", pending.Target)
	}
	if pending.Message != "你感到墙壁在低语。" {
		t.Fatalf("PendingAction message 未同步: %s", pending.Message)
	}
	if pending.Attribute != "knowledge" {
		t.Fatalf("结构化 attribute 错误: %s", pending.Attribute)
	}
	if pending.Difficulty != 5 {
		t.Fatalf("结构化 difficulty 错误: %d", pending.Difficulty)
	}
	attribute, ok := pending.Data["attribute"].(string)
	if !ok || attribute != "knowledge" {
		t.Fatalf("检定属性错误: %#v", pending.Data["attribute"])
	}
	difficulty, ok := pending.Data["difficulty"].(int)
	if !ok || difficulty != 5 {
		t.Fatalf("检定难度错误: %#v", pending.Data["difficulty"])
	}
}

func TestResolvePendingTileCheck_AppliesFailureEffects(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)
	state := gm.Rooms[roomID].GameState.FullState
	player := gm.Rooms[roomID].GameState.FullState.Players["player_1"]
	result := 5
	state.LastRollResult = &result

	before := player.Character.Attributes["sanity"].Current
	wait, err := gm.executeTileTriggerUnlocked(roomID, "player_1", &TileTrigger{
		Type:       "ATTRIBUTE_CHECK",
		Attribute:  "sanity",
		Difficulty: 6,
		Failure: []Effect{{
			Type:      "modify_stat",
			Attribute: "sanity",
			Amount:    -2,
		}},
	})
	if err != nil {
		t.Fatalf("executeTileTriggerUnlocked 失败: %v", err)
	}
	if !wait {
		t.Fatal("属性检定触发应进入等待状态")
	}

	if err := gm.ResolvePendingTileCheck(roomID, "player_1", false); err != nil {
		t.Fatalf("ResolvePendingTileCheck 失败: %v", err)
	}

	after := player.Character.Attributes["sanity"].Current
	if after != before-2 {
		t.Fatalf("失败效果未生效, 期望 %d, 实际 %d", before-2, after)
	}
	if gm.Rooms[roomID].GameState.FullState.PendingAction != nil {
		t.Fatal("地块检定结算后应清除 PendingAction")
	}
	if state.LastRollResult != nil {
		t.Fatal("地块检定结算后应清除 LastRollResult")
	}
}

func TestProcessMove_OnLeaveCheckWaitsAndResumes(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)
	room := gm.Rooms[roomID]
	room.GameState.FullState.TurnPhase = TurnPhaseMoving
	room.GameState.FullState.Map["0,0"].DefID = "tile_leave_source"
	room.GameState.FullState.Map["1,0"] = &TileInstance{
		InstanceID:   "tile_leave_target_instance",
		DefID:        "tile_leave_target",
		X:            1,
		Y:            0,
		Edges:        map[Direction]string{DirectionWest: "OPEN", DirectionNorth: "WALL", DirectionSouth: "WALL", DirectionEast: "WALL"},
		DroppedItems: []Card{},
	}

	originalTileDeck := append([]TileDef(nil), TileDeck...)
	defer func() {
		TileDeck = originalTileDeck
	}()
	TileDeck = append(TileDeck,
		TileDef{
			ID: "tile_leave_source",
			OnLeave: &TileTrigger{
				Type:       "ATTRIBUTE_CHECK",
				Attribute:  "speed",
				Difficulty: 5,
				Failure: []Effect{{
					Type:    "MODIFY_STAT",
					Stat:    "sanity",
					Amount:  -1,
					Message: "你在离开时被阴影划伤。",
				}},
			},
		},
		TileDef{ID: "tile_leave_target"},
	)

	if err := gm.ProcessMove(roomID, "player_1", "E"); err != nil {
		t.Fatalf("ProcessMove 失败: %v", err)
	}

	player := room.GameState.FullState.Players["player_1"]
	if player.Position.X != 0 || player.Position.Y != 0 {
		t.Fatalf("离场检定等待时不应提前移动, 实际位置: %+v", player.Position)
	}
	if room.GameState.FullState.MovesRemaining != 4 {
		t.Fatalf("离场检定等待时不应提前扣步数, 实际为 %d", room.GameState.FullState.MovesRemaining)
	}
	if room.GameState.FullState.PendingAction == nil || room.GameState.FullState.PendingAction.Type != PendingActionTypeTileAttributeCheck {
		t.Fatal("移动前 onLeave 应创建地块检定 PendingAction")
	}
	if room.GameState.FullState.PendingAction.Continuation == nil {
		t.Fatal("移动前 onLeave 应写入结构化 continuation")
	}

	if err := gm.ResolvePendingTileCheck(roomID, "player_1", false); err != nil {
		t.Fatalf("ResolvePendingTileCheck 失败: %v", err)
	}

	if player.Position.X != 1 || player.Position.Y != 0 {
		t.Fatalf("离场检定完成后应继续移动, 实际位置: %+v", player.Position)
	}
	if room.GameState.FullState.MovesRemaining != 3 {
		t.Fatalf("继续移动后应扣除步数, 实际为 %d", room.GameState.FullState.MovesRemaining)
	}
	if player.Character.Attributes["sanity"].Current != 3 {
		t.Fatalf("离场失败效果应生效, 实际理智为 %d", player.Character.Attributes["sanity"].Current)
	}
	if !room.GameState.FullState.Map["1,0"].HasEventTriggered {
		t.Fatal("继续移动后目标房间应标记为已触发")
	}
	if room.GameState.FullState.PendingAction != nil {
		t.Fatal("续行动作完成后不应残留 PendingAction")
	}
}

func TestPlaceTile_OnLeaveCheckWaitsAndResumes(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)
	room := gm.Rooms[roomID]
	room.GameState.FullState.TurnPhase = TurnPhaseMoving
	room.GameState.FullState.Map["0,0"].DefID = "tile_place_source"
	room.GameState.FullState.TileDeck = []TileDef{{
		ID:    "tile_new_room",
		Name:  "New Room",
		Edges: map[Direction]string{DirectionWest: "OPEN", DirectionNorth: "WALL", DirectionSouth: "WALL", DirectionEast: "WALL"},
	}}

	originalTileDeck := append([]TileDef(nil), TileDeck...)
	defer func() {
		TileDeck = originalTileDeck
	}()
	TileDeck = append(TileDeck, TileDef{
		ID: "tile_place_source",
		OnLeave: &TileTrigger{
			Type:       "ATTRIBUTE_CHECK",
			Attribute:  "speed",
			Difficulty: 4,
		},
	})

	if err := gm.ProcessMove(roomID, "player_1", "E"); err != nil {
		t.Fatalf("ProcessMove 失败: %v", err)
	}
	if room.GameState.FullState.PendingTile == nil {
		t.Fatal("探索新区域后应产生 PendingTile")
	}

	if err := gm.PlaceTile(roomID, "player_1", "E", 0); err != nil {
		t.Fatalf("PlaceTile 失败: %v", err)
	}
	if room.GameState.FullState.PendingAction == nil || room.GameState.FullState.PendingAction.Type != PendingActionTypeTileAttributeCheck {
		t.Fatal("放置前 onLeave 应创建地块检定 PendingAction")
	}
	if room.GameState.FullState.PendingTile == nil {
		t.Fatal("等待离场检定时不应清除 PendingTile")
	}

	if err := gm.ResolvePendingTileCheck(roomID, "player_1", true); err != nil {
		t.Fatalf("ResolvePendingTileCheck 失败: %v", err)
	}

	player := room.GameState.FullState.Players["player_1"]
	if player.Position.X != 1 || player.Position.Y != 0 {
		t.Fatalf("离场检定完成后应继续放置并移动, 实际位置: %+v", player.Position)
	}
	if room.GameState.FullState.PendingTile != nil {
		t.Fatal("放置完成后 PendingTile 应被清除")
	}
	if _, ok := room.GameState.FullState.Map["1,0"]; !ok {
		t.Fatal("离场检定完成后应成功放置新房间")
	}
	if room.GameState.FullState.PendingAction != nil {
		t.Fatal("放置续行动作完成后不应残留 PendingAction")
	}
}

func TestTeleportPlayer_OnLeaveCheckWaitsAndResumes(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)
	room := gm.Rooms[roomID]
	room.GameState.FullState.Map["0,0"].DefID = "tile_teleport_source"
	room.GameState.FullState.Map["1,0"] = &TileInstance{
		InstanceID:   "tile_teleport_target_instance",
		DefID:        "tile_teleport_target",
		X:            1,
		Y:            0,
		Visibility:   "VISIBLE",
		Edges:        map[Direction]string{DirectionWest: "OPEN", DirectionNorth: "WALL", DirectionSouth: "WALL", DirectionEast: "WALL"},
		DroppedItems: []Card{},
	}

	originalTileDeck := append([]TileDef(nil), TileDeck...)
	defer func() {
		TileDeck = originalTileDeck
	}()
	TileDeck = append(TileDeck,
		TileDef{
			ID: "tile_teleport_source",
			Interact: &TileInteraction{
				Type:        "TELEPORT",
				Description: "使用传送门",
			},
			OnLeave: &TileTrigger{
				Type:       "ATTRIBUTE_CHECK",
				Attribute:  "speed",
				Difficulty: 4,
				Failure: []Effect{{
					Type:   "DAMAGE",
					Stat:   "sanity",
					Amount: 1,
				}},
			},
		},
		TileDef{ID: "tile_teleport_target"},
	)

	if err := gm.TeleportPlayer(roomID, "player_1", 1, 0); err != nil {
		t.Fatalf("TeleportPlayer 失败: %v", err)
	}

	player := room.GameState.FullState.Players["player_1"]
	if player.Position.X != 0 || player.Position.Y != 0 {
		t.Fatalf("离场检定等待时不应提前传送, 实际位置: %+v", player.Position)
	}
	if room.GameState.FullState.PendingAction == nil || room.GameState.FullState.PendingAction.Type != PendingActionTypeTileAttributeCheck {
		t.Fatal("传送前 onLeave 应创建地块检定 PendingAction")
	}

	if err := gm.ResolvePendingTileCheck(roomID, "player_1", false); err != nil {
		t.Fatalf("ResolvePendingTileCheck 失败: %v", err)
	}

	if player.Position.X != 1 || player.Position.Y != 0 {
		t.Fatalf("离场检定完成后应继续传送, 实际位置: %+v", player.Position)
	}
	if player.Character.Attributes["sanity"].Current != 3 {
		t.Fatalf("传送离场失败效果应生效, 实际理智为 %d", player.Character.Attributes["sanity"].Current)
	}
	if room.GameState.FullState.PendingAction != nil {
		t.Fatal("传送续行动作完成后不应残留 PendingAction")
	}
}

func TestApplyEffect_MovePlayerOnLeaveResumesAndTriggersOnEnter(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)
	room := gm.Rooms[roomID]
	room.GameState.FullState.Map["0,0"].DefID = "tile_forced_move_source"
	room.GameState.FullState.Map["1,0"] = &TileInstance{
		InstanceID:   "tile_forced_move_target_instance",
		DefID:        "tile_forced_move_target",
		X:            1,
		Y:            0,
		Edges:        map[Direction]string{DirectionWest: "OPEN", DirectionNorth: "WALL", DirectionSouth: "WALL", DirectionEast: "WALL"},
		DroppedItems: []Card{},
	}

	originalTileDeck := append([]TileDef(nil), TileDeck...)
	defer func() {
		TileDeck = originalTileDeck
	}()
	TileDeck = append(TileDeck,
		TileDef{
			ID: "tile_forced_move_source",
			OnLeave: &TileTrigger{
				Type:       "ATTRIBUTE_CHECK",
				Attribute:  "speed",
				Difficulty: 4,
			},
		},
		TileDef{
			ID: "tile_forced_move_target",
			OnEnter: &TileTrigger{
				Type:       "ATTRIBUTE_CHECK",
				Attribute:  "knowledge",
				Difficulty: 5,
			},
		},
	)

	gm.applyEffect(roomID, "player_1", Effect{Type: "MOVE_PLAYER", X: 1, Y: 0})

	player := room.GameState.FullState.Players["player_1"]
	if player.Position.X != 0 || player.Position.Y != 0 {
		t.Fatalf("强制位移等待离场检定时不应提前移动, 实际位置: %+v", player.Position)
	}
	pending := room.GameState.FullState.PendingAction
	if pending == nil || pending.Type != PendingActionTypeTileAttributeCheck {
		t.Fatal("强制位移前 onLeave 应创建地块检定 PendingAction")
	}
	if pending.Continuation == nil {
		t.Fatal("强制位移前 onLeave 应写入结构化 continuation")
	}
	if pending.Data["attribute"] != "speed" {
		t.Fatalf("离场检定属性错误: %#v", pending.Data["attribute"])
	}

	if err := gm.ResolvePendingTileCheck(roomID, "player_1", true); err != nil {
		t.Fatalf("ResolvePendingTileCheck 失败: %v", err)
	}

	if player.Position.X != 1 || player.Position.Y != 0 {
		t.Fatalf("离场检定完成后应继续强制位移, 实际位置: %+v", player.Position)
	}
	pending = room.GameState.FullState.PendingAction
	if pending == nil || pending.Type != PendingActionTypeTileAttributeCheck {
		t.Fatal("进入目标房间后 onEnter 应创建新的地块检定")
	}
	if pending.Data["attribute"] != "knowledge" {
		t.Fatalf("入场检定属性错误: %#v", pending.Data["attribute"])
	}
	if !room.GameState.FullState.Map["1,0"].HasEventTriggered {
		t.Fatal("强制位移进入房间后应标记为已触发")
	}
}

func TestNormalizeTileDef_PromotesLegacyTriggersAndAliases(t *testing.T) {
	tile := TileDef{
		OnEnterEffects: []Effect{{
			Type:      "modify_stat",
			Attribute: "sanity",
			Amount:    -1,
		}},
		OnExitEffects: []Effect{{
			Type:   "damage",
			Amount: 1,
		}},
		Interact: &TileInteraction{
			Type:      "teleport",
			Attribute: "Knowledge",
			Effects: []Effect{{
				Type:   "heal",
				Amount: 1,
			}},
		},
	}

	normalizeTileDef(&tile)

	if tile.OnEnter == nil || tile.OnEnter.Type != "EFFECTS" {
		t.Fatalf("OnEnter 应从 legacy effects 升级为 EFFECTS trigger: %#v", tile.OnEnter)
	}
	if tile.OnLeave == nil || tile.OnLeave.Type != "EFFECTS" {
		t.Fatalf("OnLeave 应从 legacy effects 升级为 EFFECTS trigger: %#v", tile.OnLeave)
	}
	if tile.OnEnter.Effects[0].Type != "MODIFY_STAT" {
		t.Fatalf("OnEnter effect 类型未归一化: %#v", tile.OnEnter.Effects[0])
	}
	if tile.OnEnter.Effects[0].Stat != "sanity" {
		t.Fatalf("OnEnter effect stat 未归一化: %#v", tile.OnEnter.Effects[0])
	}
	if tile.OnLeave.Effects[0].Type != "DAMAGE" {
		t.Fatalf("OnLeave effect 类型未归一化: %#v", tile.OnLeave.Effects[0])
	}
	if tile.Interact == nil || tile.Interact.Type != "TELEPORT" {
		t.Fatalf("Interact 类型未归一化: %#v", tile.Interact)
	}
	if tile.Interact.Attribute != "knowledge" {
		t.Fatalf("Interact attribute 未归一化: %#v", tile.Interact.Attribute)
	}
	if tile.Interact.Effects[0].Type != "HEAL" {
		t.Fatalf("Interact effect 类型未归一化: %#v", tile.Interact.Effects[0])
	}
}
