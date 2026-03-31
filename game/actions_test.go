package game

import (
	"strings"
	"testing"
)

// ==================== 测试辅助函数 ====================

func setupTestGameManager() *GameManager {
	return &GameManager{Rooms: make(map[string]*Room)}
}

func createTestRoom(gm *GameManager) string {
	room := &Room{
		ID:    "test_room_1",
		Name:  "Test Room",
		Theme: "original",
		Players: map[string]*Player{
			"player_1": {ID: "player_1", Name: "Player 1", SessionID: "session_1", IsReady: true, IsHost: true},
			"player_2": {ID: "player_2", Name: "Player 2", SessionID: "session_2", IsReady: true},
		},
		GameState: &RoomGameState{
			Phase:     "PLAYING",
			TurnIndex: 1,
			FullState: &GameStateFull{
				Phase:          GamePhaseExploration,
				ActivePlayerID: "player_1",
				Players:        make(map[string]*GamePlayer),
				PlayerIDs:      []string{"player_1", "player_2"},
				Map:            make(map[string]*TileInstance),
				Logs:           []LogEntry{},
				MovesRemaining: 4,
				PendingAction:  nil,
			},
		},
	}

	char1 := CharacterDef{Name: "Hero 1", Attributes: map[string]Attribute{
		"might":     {Current: 4, Max: 10, Floor: 0, Values: []int{0, 1, 2, 3, 4}},
		"speed":     {Current: 4, Max: 10, Floor: 0, Values: []int{0, 1, 2, 3, 4}},
		"sanity":    {Current: 4, Max: 10, Floor: 0, Values: []int{0, 1, 2, 3, 4}},
		"knowledge": {Current: 4, Max: 10, Floor: 0, Values: []int{0, 1, 2, 3, 4}},
	}}
	char2 := CharacterDef{Name: "Hero 2", Attributes: map[string]Attribute{
		"might":     {Current: 4, Max: 10, Floor: 0, Values: []int{0, 1, 2, 3, 4}},
		"speed":     {Current: 4, Max: 10, Floor: 0, Values: []int{0, 1, 2, 3, 4}},
		"sanity":    {Current: 4, Max: 10, Floor: 0, Values: []int{0, 1, 2, 3, 4}},
		"knowledge": {Current: 4, Max: 10, Floor: 0, Values: []int{0, 1, 2, 3, 4}},
	}}

	room.GameState.FullState.Players["player_1"] = &GamePlayer{
		ID: "player_1", Character: char1, Position: Position{X: 0, Y: 0},
		Items: []Card{}, DroppedItems: []Card{}, IsDead: false, Team: "UNASSIGNED",
		Buffs: []string{}, Skills: []string{}, SkillPoints: 4, StatusEffects: []StatusEffect{}, ShowTrail: false,
	}
	room.GameState.FullState.Players["player_2"] = &GamePlayer{
		ID: "player_2", Character: char2, Position: Position{X: 0, Y: 0},
		Items: []Card{}, DroppedItems: []Card{}, IsDead: false, Team: "UNASSIGNED",
		Buffs: []string{}, Skills: []string{}, SkillPoints: 4, StatusEffects: []StatusEffect{}, ShowTrail: false,
	}

	room.GameState.FullState.Map["0,0"] = &TileInstance{
		InstanceID: "start_tile", DefID: "tile_start", X: 0, Y: 0,
		Edges:        map[Direction]string{DirectionNorth: "WALL", DirectionSouth: "WALL", DirectionEast: "OPEN", DirectionWest: "WALL"},
		DroppedItems: []Card{},
	}

	gm.Rooms[room.ID] = room
	return room.ID
}

// ==================== PickupItem 测试 ====================

func TestPickupItem_Success(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)

	// 把物品放在玩家当前位置 (0,0)
	gm.Rooms[roomID].GameState.FullState.Map["0,0"].DroppedItems = []Card{
		{ID: "item_flashlight", Type: "ITEM", Name: "手电筒", Title: "手电筒"},
	}

	err := gm.PickupItem(roomID, "player_1", "item_flashlight")
	if err != nil {
		t.Fatalf("PickupItem 失败: %v", err)
	}

	player := gm.Rooms[roomID].GameState.FullState.Players["player_1"]
	if len(player.Items) != 1 || player.Items[0].ID != "item_flashlight" {
		t.Errorf("物品未正确添加到玩家")
	}

	tile := gm.Rooms[roomID].GameState.FullState.Map["0,0"]
	if len(tile.DroppedItems) != 0 {
		t.Errorf("地面物品未移除")
	}
	if len(player.PersonalLogs) == 0 {
		t.Fatalf("拾取物品后应写入个人日志")
	}
	if got := player.PersonalLogs[len(player.PersonalLogs)-1].Text; got != "捡起了 手电筒。" {
		t.Fatalf("拾取物品个人日志不正确: %s", got)
	}
}

func TestPickupItem_ItemNotOnGround(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)

	err := gm.PickupItem(roomID, "player_1", "nonexistent_item")
	if err == nil {
		t.Error("应该返回错误")
	}
}

func TestPickupItem_PlayerNotFound(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)

	err := gm.PickupItem(roomID, "nonexistent_player", "item_flashlight")
	if err == nil {
		t.Error("应该返回错误")
	}
}

func TestPickupItem_RoomNotFound(t *testing.T) {
	gm := setupTestGameManager()

	err := gm.PickupItem("nonexistent_room", "any_player", "item_flashlight")
	if err == nil {
		t.Error("应该返回错误")
	}
}

func TestPickupItem_RequiresCurrentPlayer(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)

	gm.Rooms[roomID].GameState.FullState.Map["0,0"].DroppedItems = []Card{{ID: "item_flashlight", Type: "ITEM", Title: "手电筒"}}

	err := gm.PickupItem(roomID, "player_2", "item_flashlight")
	if err == nil {
		t.Fatal("非当前玩家拾取物品应该失败")
	}
}

func TestPickupItem_AppliesPassiveEffectsAndEndsTurn(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)
	room := gm.Rooms[roomID]
	player := room.GameState.FullState.Players["player_1"]

	room.GameState.FullState.TurnPhase = TurnPhaseMoving
	room.GameState.FullState.ActiveCard = &Card{ID: "item_amulet", Type: "ITEM", Name: "神圣护身符"}
	room.GameState.FullState.Map["0,0"].DroppedItems = []Card{{
		ID:             "item_amulet",
		Type:           "ITEM",
		Name:           "神圣护身符",
		PassiveEffects: []PassiveEffect{{Type: "buff", Text: "sanity +1"}},
	}}

	before := player.Character.Attributes["sanity"].Current
	err := gm.PickupItem(roomID, "player_1", "item_amulet")
	if err != nil {
		t.Fatalf("PickupItem 失败: %v", err)
	}

	after := player.Character.Attributes["sanity"].Current
	if after != before+1 {
		t.Fatalf("拾取被动物品后理智应该 +1, 实际从 %d 到 %d", before, after)
	}
	if room.GameState.FullState.ActiveCard != nil {
		t.Fatal("拾取后 ActiveCard 应该被清除")
	}
	if room.GameState.FullState.TurnPhase != TurnPhaseDone {
		t.Fatalf("普通物品拾取后回合阶段应该结束, 实际是 %s", room.GameState.FullState.TurnPhase)
	}
}

func TestPickupItem_OmenStartsHauntRoll(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)
	room := gm.Rooms[roomID]

	room.GameState.FullState.Phase = GamePhaseExploration
	room.GameState.FullState.TurnPhase = TurnPhaseMoving
	room.GameState.FullState.ActiveCard = &Card{ID: "omen_ring", Type: "OMEN", Name: "所罗门之戒"}
	room.GameState.FullState.Map["0,0"].DroppedItems = []Card{{
		ID:   "omen_ring",
		Type: "OMEN",
		Name: "所罗门之戒",
	}}

	err := gm.PickupItem(roomID, "player_1", "omen_ring")
	if err != nil {
		t.Fatalf("PickupItem 失败: %v", err)
	}

	if room.GameState.FullState.Phase != GamePhaseHauntRoll {
		t.Fatalf("拾取预兆后应进入 HAUNT_ROLL, 实际是 %s", room.GameState.FullState.Phase)
	}
	if room.GameState.FullState.OmenCount != 1 {
		t.Fatalf("拾取预兆后 OmenCount 应该为 1, 实际是 %d", room.GameState.FullState.OmenCount)
	}
	if room.GameState.FullState.LastTriggeredOmen != "omen_ring" {
		t.Fatalf("LastTriggeredOmen 应该记录拾取的预兆")
	}
	if room.GameState.FullState.LastTriggeredTile != "tile_start" {
		t.Fatalf("LastTriggeredTile 应该记录当前房间, 实际是 %s", room.GameState.FullState.LastTriggeredTile)
	}
	if room.GameState.FullState.ActiveCard != nil {
		t.Fatal("预兆拾取后 ActiveCard 应该被清除")
	}
}

func TestPickupItem_CollectObjectiveWinsImmediately(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)
	room := gm.Rooms[roomID]

	room.GameState.FullState.Phase = GamePhaseHaunt
	room.GameState.FullState.IsHauntActive = true
	room.GameState.FullState.TraitorID = "player_1"
	room.GameState.FullState.CurrentScenario = &Scenario{
		Name: "Collect Relic",
		TraitorObjective: &Objective{
			Name:   "Collect Relic",
			Type:   "COLLECT",
			Target: "item_amulet",
			Turns:  8,
		},
	}
	room.GameState.FullState.Map["0,0"].DroppedItems = []Card{{ID: "item_amulet", Type: "ITEM", Name: "神圣护身符"}}

	err := gm.PickupItem(roomID, "player_1", "item_amulet")
	if err != nil {
		t.Fatalf("PickupItem 失败: %v", err)
	}

	if room.GameState.FullState.GameWinner != "TRAITOR" {
		t.Fatalf("收集目标物品后应立即判定叛徒胜利, 实际是 %s", room.GameState.FullState.GameWinner)
	}
	if room.GameState.FullState.Phase != GamePhaseGameOver {
		t.Fatalf("目标完成后应立即 GAME_OVER, 实际是 %s", room.GameState.FullState.Phase)
	}
}

func TestProcessMove_ReachObjectiveWinsImmediately(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)
	room := gm.Rooms[roomID]

	room.GameState.FullState.Phase = GamePhaseHaunt
	room.GameState.FullState.IsHauntActive = true
	room.GameState.FullState.TurnPhase = TurnPhaseMoving
	room.GameState.FullState.TraitorID = "player_1"
	room.GameState.FullState.CurrentScenario = &Scenario{
		Name: "Reach Exit",
		TraitorObjective: &Objective{
			Name:   "Reach Exit",
			Type:   "REACH",
			Target: "tile_exit",
			Turns:  8,
		},
	}
	room.GameState.FullState.Map["1,0"] = &TileInstance{
		InstanceID:   "exit_tile",
		DefID:        "tile_exit",
		X:            1,
		Y:            0,
		Edges:        map[Direction]string{DirectionWest: "OPEN", DirectionNorth: "WALL", DirectionSouth: "WALL", DirectionEast: "WALL"},
		DroppedItems: []Card{},
	}

	err := gm.ProcessMove(roomID, "player_1", "E")
	if err != nil {
		t.Fatalf("ProcessMove 失败: %v", err)
	}

	if room.GameState.FullState.GameWinner != "TRAITOR" {
		t.Fatalf("到达目标房间后应立即判定叛徒胜利, 实际是 %s", room.GameState.FullState.GameWinner)
	}
	if room.GameState.FullState.Phase != GamePhaseGameOver {
		t.Fatalf("目标完成后应立即 GAME_OVER, 实际是 %s", room.GameState.FullState.Phase)
	}
}

func TestProcessMove_AppendsPersonalLog(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)
	room := gm.Rooms[roomID]
	player := room.GameState.FullState.Players["player_1"]

	room.GameState.FullState.TurnPhase = TurnPhaseMoving
	room.GameState.FullState.Map["1,0"] = &TileInstance{
		InstanceID:   "library_tile",
		DefID:        "tile_library",
		X:            1,
		Y:            0,
		Edges:        map[Direction]string{DirectionWest: "OPEN", DirectionNorth: "WALL", DirectionSouth: "WALL", DirectionEast: "WALL"},
		DroppedItems: []Card{},
	}

	err := gm.ProcessMove(roomID, "player_1", "E")
	if err != nil {
		t.Fatalf("ProcessMove 失败: %v", err)
	}

	if len(player.PersonalLogs) == 0 {
		t.Fatal("移动后应写入个人日志")
	}
	lastLog := player.PersonalLogs[len(player.PersonalLogs)-1].Text
	if !strings.HasPrefix(lastLog, "进入了") {
		t.Fatalf("移动个人日志不正确: %s", lastLog)
	}
}

// ==================== GiveItem 测试 ====================

func TestGiveItem_Success(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)

	player := gm.Rooms[roomID].GameState.FullState.Players["player_1"]
	player.Items = []Card{{ID: "item_key", Type: "ITEM", Title: "钥匙"}}

	err := gm.GiveItem(roomID, "player_1", "player_2", "item_key")
	if err != nil {
		t.Fatalf("GiveItem 失败: %v", err)
	}

	if len(player.Items) != 0 {
		t.Errorf("发送者物品未移除")
	}

	toPlayer := gm.Rooms[roomID].GameState.FullState.Players["player_2"]
	if len(toPlayer.Items) != 1 || toPlayer.Items[0].ID != "item_key" {
		t.Errorf("接收者未收到物品")
	}
}

func TestGiveItem_ItemNotOwned(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)

	err := gm.GiveItem(roomID, "player_1", "player_2", "nonexistent_item")
	if err == nil {
		t.Error("应该返回错误")
	}
}

func TestGiveItem_TargetNotFound(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)

	gm.Rooms[roomID].GameState.FullState.Players["player_1"].Items = []Card{{ID: "item_key", Type: "ITEM", Title: "钥匙"}}

	err := gm.GiveItem(roomID, "player_1", "nonexistent_target", "item_key")
	if err == nil {
		t.Error("应该返回错误")
	}
}

func TestGiveItem_RequiresCurrentPlayer(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)
	gm.Rooms[roomID].GameState.FullState.Players["player_2"].Items = []Card{{ID: "item_key", Type: "ITEM", Title: "钥匙"}}

	err := gm.GiveItem(roomID, "player_2", "player_1", "item_key")
	if err == nil {
		t.Fatal("非当前玩家给予物品应该失败")
	}
}

func TestGiveItem_TransfersPassiveEffects(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)
	room := gm.Rooms[roomID]
	fromPlayer := room.GameState.FullState.Players["player_1"]
	toPlayer := room.GameState.FullState.Players["player_2"]
	toPlayer.Position = fromPlayer.Position

	fromPlayer.Items = []Card{{
		ID:             "item_amulet",
		Type:           "ITEM",
		Name:           "神圣护身符",
		PassiveEffects: []PassiveEffect{{Type: "buff", Text: "sanity +1"}},
	}}
	gm.applyPassiveEffects(roomID, "player_1", fromPlayer.Items[0])

	err := gm.GiveItem(roomID, "player_1", "player_2", "item_amulet")
	if err != nil {
		t.Fatalf("GiveItem 失败: %v", err)
	}

	if fromPlayer.Character.Attributes["sanity"].Current != 4 {
		t.Fatalf("发送者离开物品后不应保留被动加成, 实际为 %d", fromPlayer.Character.Attributes["sanity"].Current)
	}
	if toPlayer.Character.Attributes["sanity"].Current != 5 {
		t.Fatalf("接收者应获得被动加成, 实际为 %d", toPlayer.Character.Attributes["sanity"].Current)
	}
}

// ==================== DropItem 测试 ====================

func TestDropItem_Success(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)

	player := gm.Rooms[roomID].GameState.FullState.Players["player_1"]
	player.Items = []Card{{ID: "item_map", Type: "ITEM", Title: "地图"}}
	player.Position = Position{X: 0, Y: 0}

	err := gm.DropItem(roomID, "player_1", "item_map")
	if err != nil {
		t.Fatalf("DropItem 失败: %v", err)
	}

	if len(player.Items) != 0 {
		t.Errorf("玩家物品未移除")
	}

	tile := gm.Rooms[roomID].GameState.FullState.Map["0,0"]
	if len(tile.DroppedItems) != 1 || tile.DroppedItems[0].ID != "item_map" {
		t.Errorf("物品未正确放到地面")
	}
}

func TestDropItem_ItemNotOwned(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)

	err := gm.DropItem(roomID, "player_1", "nonexistent_item")
	if err == nil {
		t.Error("应该返回错误")
	}
}

func TestDropItem_RemovesPassiveEffects(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)
	room := gm.Rooms[roomID]
	player := room.GameState.FullState.Players["player_1"]

	player.Items = []Card{{
		ID:             "item_amulet",
		Type:           "ITEM",
		Name:           "神圣护身符",
		PassiveEffects: []PassiveEffect{{Type: "buff", Text: "sanity +1"}},
	}}
	gm.applyPassiveEffects(roomID, "player_1", player.Items[0])

	err := gm.DropItem(roomID, "player_1", "item_amulet")
	if err != nil {
		t.Fatalf("DropItem 失败: %v", err)
	}

	if player.Character.Attributes["sanity"].Current != 4 {
		t.Fatalf("丢弃物品后不应保留被动加成, 实际为 %d", player.Character.Attributes["sanity"].Current)
	}
}

func TestTradeItems_SwapsItemsAndPassiveEffects(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)
	room := gm.Rooms[roomID]
	p1 := room.GameState.FullState.Players["player_1"]
	p2 := room.GameState.FullState.Players["player_2"]
	p2.Position = p1.Position

	p1.Items = []Card{{ID: "item_amulet", Type: "ITEM", Name: "神圣护身符", PassiveEffects: []PassiveEffect{{Type: "buff", Text: "sanity +1"}}}}
	p2.Items = []Card{{ID: "omen_dog", Type: "OMEN", Name: "幽灵猎犬", PassiveEffects: []PassiveEffect{{Type: "buff", Text: "speed +1"}}}}
	gm.applyPassiveEffects(roomID, "player_1", p1.Items[0])
	gm.applyPassiveEffects(roomID, "player_2", p2.Items[0])

	err := gm.TradeItems(roomID, "player_1", "player_2", "item_amulet", "omen_dog")
	if err != nil {
		t.Fatalf("TradeItems 失败: %v", err)
	}

	if p1.Items[0].ID != "omen_dog" || p2.Items[0].ID != "item_amulet" {
		t.Fatal("交易后双方物品没有正确交换")
	}
	if p1.Character.Attributes["sanity"].Current != 4 {
		t.Fatalf("交易后 player_1 不应保留旧的理智加成, 实际为 %d", p1.Character.Attributes["sanity"].Current)
	}
	if p1.Character.Attributes["speed"].Current != 5 {
		t.Fatalf("交易后 player_1 应获得新的速度加成, 实际为 %d", p1.Character.Attributes["speed"].Current)
	}
	if p2.Character.Attributes["speed"].Current != 4 {
		t.Fatalf("交易后 player_2 不应保留旧的速度加成, 实际为 %d", p2.Character.Attributes["speed"].Current)
	}
	if p2.Character.Attributes["sanity"].Current != 5 {
		t.Fatalf("交易后 player_2 应获得新的理智加成, 实际为 %d", p2.Character.Attributes["sanity"].Current)
	}
}

func TestTeleportPlayer_Success(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)
	room := gm.Rooms[roomID]
	room.Theme = "volantis"
	room.GameState.FullState.Map["0,0"].DefID = "vol_tile_portal_chamber"
	room.GameState.FullState.Map["1,0"] = &TileInstance{
		InstanceID:   "portal_target",
		DefID:        "tile_exit",
		X:            1,
		Y:            0,
		Edges:        map[Direction]string{DirectionWest: "OPEN", DirectionNorth: "WALL", DirectionSouth: "WALL", DirectionEast: "WALL"},
		Visibility:   "VISIBLE",
		DroppedItems: []Card{},
	}

	err := gm.TeleportPlayer(roomID, "player_1", 1, 0)
	if err != nil {
		t.Fatalf("TeleportPlayer 失败: %v", err)
	}

	player := room.GameState.FullState.Players["player_1"]
	if player.Position.X != 1 || player.Position.Y != 0 {
		t.Fatalf("传送后玩家位置错误: %+v", player.Position)
	}
	if player.Character.Attributes["sanity"].Current != 3 {
		t.Fatalf("传送应扣除 1 点理智, 实际为 %d", player.Character.Attributes["sanity"].Current)
	}
}

func TestPerformDivination_ToBottom(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)
	room := gm.Rooms[roomID]
	room.Theme = "volantis"
	room.GameState.FullState.Map["0,0"].DefID = "vol_tile_starry_observatory"
	room.GameState.FullState.Decks = map[string][]Card{
		"EVENT": {
			{ID: "event_a", Type: "EVENT", Name: "A", Description: "A"},
			{ID: "event_b", Type: "EVENT", Name: "B", Description: "B"},
		},
	}

	err := gm.PerformDivination(roomID, "player_1", "toBottom")
	if err != nil {
		t.Fatalf("PerformDivination 失败: %v", err)
	}

	deck := room.GameState.FullState.Decks["EVENT"]
	if len(deck) != 2 || deck[0].ID != "event_b" || deck[1].ID != "event_a" {
		t.Fatalf("占卜后牌堆顺序不正确: %#v", deck)
	}
	if room.GameState.FullState.Players["player_1"].Character.Attributes["knowledge"].Current != 5 {
		t.Fatalf("占卜应给予知识 +1, 实际为 %d", room.GameState.FullState.Players["player_1"].Character.Attributes["knowledge"].Current)
	}
}

func TestExecuteTileInteraction_Heal(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)
	room := gm.Rooms[roomID]
	room.Theme = "volantis"
	room.GameState.FullState.Map["0,0"].DefID = "vol_tile_sacred_spring"
	player := room.GameState.FullState.Players["player_1"]
	might := player.Character.Attributes["might"]
	might.Current = 2
	player.Character.Attributes["might"] = might
	sanity := player.Character.Attributes["sanity"]
	sanity.Current = 1
	player.Character.Attributes["sanity"] = sanity

	_, err := gm.ExecuteTileInteraction(roomID, "player_1", "HEAL")
	if err != nil {
		t.Fatalf("ExecuteTileInteraction 失败: %v", err)
	}

	if player.Character.Attributes["might"].Current != player.Character.Attributes["might"].Max {
		t.Fatalf("圣泉互动后力量应回满, 实际为 %d", player.Character.Attributes["might"].Current)
	}
	if player.Character.Attributes["sanity"].Current != player.Character.Attributes["sanity"].Max {
		t.Fatalf("圣泉互动后理智应回满, 实际为 %d", player.Character.Attributes["sanity"].Current)
	}
}

func TestResolveCombat_RequiresAttacker(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)

	err := gm.StartCombat(roomID, "player_1", "player_2", "might")
	if err != nil {
		t.Fatalf("StartCombat 失败: %v", err)
	}

	_, err = gm.ResolveCombat(roomID, "player_2")
	if err == nil {
		t.Fatal("非攻击方结算战斗应该失败")
	}
}

func TestResolveCombat_ReturnsAuthoritativeParticipants(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)

	err := gm.StartCombat(roomID, "player_1", "player_2", "might")
	if err != nil {
		t.Fatalf("StartCombat 失败: %v", err)
	}

	result, err := gm.ResolveCombat(roomID, "player_1")
	if err != nil {
		t.Fatalf("ResolveCombat 失败: %v", err)
	}

	if result.AttackerID != "player_1" || result.DefenderID != "player_2" {
		t.Fatalf("战斗结果应包含权威参与者ID, 实际 attacker=%s defender=%s", result.AttackerID, result.DefenderID)
	}
	if len(result.AttackerRolls) == 0 || len(result.DefenderRolls) == 0 {
		t.Fatal("战斗结果应包含权威骰子数组")
	}
}

func TestUseItem_RequiresCurrentPlayer(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)
	gm.Rooms[roomID].GameState.FullState.Players["player_2"].Items = []Card{{ID: "item_adrenaline", Type: "ITEM", Name: "肾上腺素针剂"}}

	err := gm.UseItem(roomID, "player_2", "item_adrenaline", "")
	if err == nil {
		t.Fatal("非当前玩家使用物品应该失败")
	}
}

func TestExecuteSkill_RequiresCurrentPlayer(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)
	gm.Rooms[roomID].GameState.FullState.Players["player_2"].Skills = []string{"skill_sprint"}

	err := gm.ExecuteSkill(roomID, "player_2", "skill_sprint", "")
	if err == nil {
		t.Fatal("非当前玩家释放技能应该失败")
	}
}

// ==================== InteractWithWall 测试 ====================

func TestInteractWithWall_WithPickaxe(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)

	player := gm.Rooms[roomID].GameState.FullState.Players["player_1"]
	player.Items = []Card{{ID: "item_pickaxe", Type: "ITEM", Title: "镐子"}}
	player.Position = Position{X: 0, Y: 0}

	tile := gm.Rooms[roomID].GameState.FullState.Map["0,0"]
	if tile.Edges[DirectionNorth] != "WALL" {
		t.Skip("需要墙壁为 WALL")
	}

	err := gm.InteractWithWall(roomID, "player_1", "N")
	if err != nil {
		t.Fatalf("InteractWithWall 失败: %v", err)
	}

	if tile.Edges[DirectionNorth] != "RUBBLE" {
		t.Errorf("墙壁未改变")
	}
}

func TestInteractWithWall_WithoutPickaxe_HighMight(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)

	player := gm.Rooms[roomID].GameState.FullState.Players["player_1"]
	player.Items = []Card{}
	player.Position = Position{X: 0, Y: 0}

	// 获取属性副本并修改后存回
	attr := player.Character.Attributes["might"]
	attr.Current = 6
	player.Character.Attributes["might"] = attr

	tile := gm.Rooms[roomID].GameState.FullState.Map["0,0"]

	err := gm.InteractWithWall(roomID, "player_1", "N")
	if err != nil {
		t.Fatalf("InteractWithWall 失败: %v", err)
	}

	if tile.Edges[DirectionNorth] != "RUBBLE" {
		t.Errorf("墙壁未改变")
	}

	// 验证力量被扣除
	attr = player.Character.Attributes["might"]
	if attr.Current != 5 {
		t.Errorf("力量未正确扣除: 期望 5, 实际 %d", attr.Current)
	}
}

func TestInteractWithWall_WithoutPickaxe_LowMight(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)

	player := gm.Rooms[roomID].GameState.FullState.Players["player_1"]
	player.Items = []Card{}

	err := gm.InteractWithWall(roomID, "player_1", "N")
	if err == nil {
		t.Error("应该失败当力量不足")
	}
}

func TestInteractWithWall_NotCurrentPlayer(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)

	// player_1 是当前玩家
	player1 := gm.Rooms[roomID].GameState.FullState.Players["player_1"]
	attr1 := player1.Character.Attributes["might"]
	attr1.Current = 6
	player1.Character.Attributes["might"] = attr1
	player1.Items = []Card{}

	// player_2 不是当前玩家
	player2 := gm.Rooms[roomID].GameState.FullState.Players["player_2"]
	player2.Items = []Card{{ID: "item_pickaxe", Type: "ITEM", Title: "镐子"}}

	err := gm.InteractWithWall(roomID, "player_2", "N")
	if err == nil {
		t.Error("应该失败当不是当前玩家")
	}
}

func TestInteractWithWall_DeadPlayer(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)

	player := gm.Rooms[roomID].GameState.FullState.Players["player_1"]
	player.IsDead = true
	player.Items = []Card{{ID: "item_pickaxe", Type: "ITEM", Title: "镐子"}}

	err := gm.InteractWithWall(roomID, "player_1", "N")
	if err == nil {
		t.Error("应该失败当玩家已死亡")
	}
}

func TestInteractWithWall_AllowsExplorationAndPlacementAcrossRubble(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)
	room := gm.Rooms[roomID]
	player := room.GameState.FullState.Players["player_1"]
	player.Items = []Card{{ID: "item_pickaxe", Type: "ITEM", Title: "镐子"}}
	room.GameState.FullState.TurnPhase = TurnPhaseMoving
	room.GameState.FullState.TileDeck = []TileDef{{
		ID:   "tile_north_room",
		Name: "North Room",
		Edges: map[Direction]string{
			DirectionNorth: "WALL",
			DirectionEast:  "WALL",
			DirectionSouth: "OPEN",
			DirectionWest:  "WALL",
		},
	}}

	if err := gm.InteractWithWall(roomID, "player_1", "N"); err != nil {
		t.Fatalf("InteractWithWall 失败: %v", err)
	}

	if err := gm.ProcessMove(roomID, "player_1", "N"); err != nil {
		t.Fatalf("ProcessMove 失败: %v", err)
	}

	if room.GameState.FullState.PendingTile == nil {
		t.Fatal("破墙后朝该方向探索应产生 PendingTile")
	}
	if room.GameState.FullState.PendingTargetPos == nil || room.GameState.FullState.PendingTargetPos.Y != -1 {
		t.Fatalf("破墙后探索目标位置错误: %+v", room.GameState.FullState.PendingTargetPos)
	}

	if err := gm.PlaceTile(roomID, "player_1", "N", 0); err != nil {
		t.Fatalf("PlaceTile 失败: %v", err)
	}

	placedTile, ok := room.GameState.FullState.Map["0,-1"]
	if !ok {
		t.Fatal("破墙后应能在对应方向成功放置新房间")
	}
	if placedTile.DefID != "tile_north_room" {
		t.Fatalf("放置的房间错误: %+v", placedTile)
	}
	if player.Position.X != 0 || player.Position.Y != -1 {
		t.Fatalf("放置后玩家应移动到新房间, 实际位置: %+v", player.Position)
	}
	if room.GameState.FullState.Map["0,0"].Edges[DirectionNorth] != "RUBBLE" {
		t.Fatal("破坏后的边缘应保持为 RUBBLE 语义")
	}
}

func TestProcessMove_AllowsMovementThroughSecretDoor(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)
	room := gm.Rooms[roomID]
	room.GameState.FullState.TurnPhase = TurnPhaseMoving
	room.GameState.FullState.Map["0,0"].Edges[DirectionNorth] = "SECRET_DOOR"
	room.GameState.FullState.Map["0,-1"] = &TileInstance{
		InstanceID:   "secret_room",
		DefID:        "tile_secret_room",
		X:            0,
		Y:            -1,
		Edges:        map[Direction]string{DirectionNorth: "WALL", DirectionEast: "WALL", DirectionSouth: "SECRET_DOOR", DirectionWest: "WALL"},
		DroppedItems: []Card{},
	}

	if err := gm.ProcessMove(roomID, "player_1", "N"); err != nil {
		t.Fatalf("ProcessMove 失败: %v", err)
	}

	player := room.GameState.FullState.Players["player_1"]
	if player.Position.X != 0 || player.Position.Y != -1 {
		t.Fatalf("密门移动后玩家位置错误: %+v", player.Position)
	}
	if room.GameState.FullState.MovesRemaining != 3 {
		t.Fatalf("密门移动后应消耗 1 点移动力, 实际为 %d", room.GameState.FullState.MovesRemaining)
	}
}

func TestPlaceTile_AllowsPlacementAcrossSecretDoor(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)
	room := gm.Rooms[roomID]
	room.GameState.FullState.TurnPhase = TurnPhaseMoving
	room.GameState.FullState.Map["0,0"].Edges[DirectionNorth] = "SECRET_DOOR"
	room.GameState.FullState.TileDeck = []TileDef{{
		ID:   "tile_secret_destination",
		Name: "Secret Destination",
		Edges: map[Direction]string{
			DirectionNorth: "WALL",
			DirectionEast:  "WALL",
			DirectionSouth: "OPEN",
			DirectionWest:  "WALL",
		},
	}}

	if err := gm.ProcessMove(roomID, "player_1", "N"); err != nil {
		t.Fatalf("ProcessMove 失败: %v", err)
	}

	if err := gm.PlaceTile(roomID, "player_1", "N", 0); err != nil {
		t.Fatalf("PlaceTile 失败: %v", err)
	}

	placedTile, ok := room.GameState.FullState.Map["0,-1"]
	if !ok {
		t.Fatal("密门方向应允许放置新房间")
	}
	if placedTile.DefID != "tile_secret_destination" {
		t.Fatalf("密门放置的房间错误: %+v", placedTile)
	}
}

// ==================== ExecuteSkill 测试 ====================

func TestExecuteSkill_NotImplemented(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)

	// ExecuteSkill 目前返回 nil (未实现)
	err := gm.ExecuteSkill(roomID, "player_1", "skill_fireball", "player_2")
	// 这个测试记录当前状态：ExecuteSkill 尚未实现
	if err != nil {
		t.Logf("ExecuteSkill 返回错误 (可能未实现): %v", err)
	}
}

func TestExecuteSkill_PlayerMustOwnSkill(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)

	// 玩家没有这个技能
	player := gm.Rooms[roomID].GameState.FullState.Players["player_1"]
	player.Skills = []string{}

	// TODO: 当 ExecuteSkill 实现后，应该验证玩家是否拥有该技能
	t.Skip("ExecuteSkill 未实现，需要更新此测试当功能实现后")
}

// ==================== ModifyStat 测试 ====================

func TestModifyStat_IncreaseAttribute(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)

	err := gm.ModifyStat(roomID, "player_1", "might", 2)
	if err != nil {
		t.Fatalf("ModifyStat 失败: %v", err)
	}

	player := gm.Rooms[roomID].GameState.FullState.Players["player_1"]
	attr := player.Character.Attributes["might"]
	if attr.Current != 6 {
		t.Errorf("力量应该增加 2, 实际是 %d", attr.Current)
	}
}

func TestModifyStat_DecreaseAttribute(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)

	err := gm.ModifyStat(roomID, "player_1", "might", -2)
	if err != nil {
		t.Fatalf("ModifyStat 失败: %v", err)
	}

	player := gm.Rooms[roomID].GameState.FullState.Players["player_1"]
	attr := player.Character.Attributes["might"]
	if attr.Current != 2 {
		t.Errorf("力量应该减少 2, 实际是 %d", attr.Current)
	}
}

func TestModifyStat_FloorConstraint(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)

	// 先设置为1，然后-5应该到floor
	player := gm.Rooms[roomID].GameState.FullState.Players["player_1"]
	attr := player.Character.Attributes["might"]
	attr.Current = 1
	player.Character.Attributes["might"] = attr

	err := gm.ModifyStat(roomID, "player_1", "might", -5)
	if err != nil {
		t.Fatalf("ModifyStat 失败: %v", err)
	}

	attr = player.Character.Attributes["might"]
	if attr.Current < 0 {
		t.Errorf("力量不应该低于 floor (0), 实际是 %d", attr.Current)
	}
}

func TestModifyStat_MaxConstraint(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)

	// 先设置为9，然后+5应该到max
	player := gm.Rooms[roomID].GameState.FullState.Players["player_1"]
	attr := player.Character.Attributes["might"]
	attr.Current = 9
	player.Character.Attributes["might"] = attr

	err := gm.ModifyStat(roomID, "player_1", "might", 5)
	if err != nil {
		t.Fatalf("ModifyStat 失败: %v", err)
	}

	attr = player.Character.Attributes["might"]
	if attr.Current > 10 {
		t.Errorf("力量不应该超过 max (10), 实际是 %d", attr.Current)
	}
}

func TestModifyStat_InvalidAttribute(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)

	err := gm.ModifyStat(roomID, "player_1", "nonexistent", 1)
	if err == nil {
		t.Error("应该返回错误当属性不存在")
	}
}

func TestModifyStat_DeathOnMightZero(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)

	player := gm.Rooms[roomID].GameState.FullState.Players["player_1"]
	attr := player.Character.Attributes["might"]
	attr.Current = 1
	player.Character.Attributes["might"] = attr
	player.IsDead = false

	err := gm.ModifyStat(roomID, "player_1", "might", -1)
	if err != nil {
		t.Fatalf("ModifyStat 失败: %v", err)
	}

	// 力量降到 0 时玩家应该死亡
	if !player.IsDead {
		t.Error("力量降到 0 时玩家应该死亡")
	}
}
