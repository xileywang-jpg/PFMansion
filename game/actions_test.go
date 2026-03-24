package game

import (
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
				Phase:           GamePhaseExploration,
				ActivePlayerID:  "player_1",
				Players:         make(map[string]*GamePlayer),
				PlayerIDs:       []string{"player_1", "player_2"},
				Map:             make(map[string]*TileInstance),
				Logs:            []LogEntry{},
				MovesRemaining:  4,
				PendingAction:   nil,
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
		Edges: map[Direction]string{DirectionNorth: "WALL", DirectionSouth: "WALL", DirectionEast: "OPEN", DirectionWest: "WALL"},
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
		{ID: "item_flashlight", Type: "ITEM", Title: "手电筒"},
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
