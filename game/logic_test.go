package game

import (
	"testing"
)

// ==================== 测试辅助函数 ====================

func createTestRoomForLogic(gm *GameManager) string {
	room := &Room{
		ID:    "test_logic_room",
		Name:  "Test Logic Room",
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
				TurnPhase:      TurnPhaseMoving,
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
		ID: "player_2", Character: char2, Position: Position{X: 1, Y: 0},
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

// ==================== nextTurnInternal 测试 ====================

func TestNextTurnInternal_SwitchesToNextPlayer(t *testing.T) {
	gm := &GameManager{Rooms: make(map[string]*Room)}
	roomID := createTestRoomForLogic(gm)
	room := gm.Rooms[roomID]

	room.GameState.FullState.ActivePlayerID = "player_1"
	room.GameState.FullState.TurnIndex = 1
	room.GameState.FullState.MovesRemaining = 2

	err := gm.nextTurnInternal(room)
	if err != nil {
		t.Fatalf("nextTurnInternal 失败: %v", err)
	}

	if room.GameState.FullState.ActivePlayerID != "player_2" {
		t.Errorf("当前玩家应该是 player_2, 实际是 %s", room.GameState.FullState.ActivePlayerID)
	}

	if room.GameState.FullState.TurnIndex != 2 {
		t.Errorf("回合索引应该是 2, 实际是 %d", room.GameState.FullState.TurnIndex)
	}
}

func TestNextTurnInternal_CirclesBackToFirstPlayer(t *testing.T) {
	gm := &GameManager{Rooms: make(map[string]*Room)}
	roomID := createTestRoomForLogic(gm)
	room := gm.Rooms[roomID]

	room.GameState.FullState.ActivePlayerID = "player_2"
	room.GameState.FullState.TurnIndex = 2

	err := gm.nextTurnInternal(room)
	if err != nil {
		t.Fatalf("nextTurnInternal 失败: %v", err)
	}

	if room.GameState.FullState.ActivePlayerID != "player_1" {
		t.Errorf("当前玩家应该是 player_1, 实际是 %s", room.GameState.FullState.ActivePlayerID)
	}
}

func TestNextTurnInternal_ResetsMovesRemaining(t *testing.T) {
	gm := &GameManager{Rooms: make(map[string]*Room)}
	roomID := createTestRoomForLogic(gm)
	room := gm.Rooms[roomID]

	room.GameState.FullState.ActivePlayerID = "player_1"
	room.GameState.FullState.MovesRemaining = 0

	err := gm.nextTurnInternal(room)
	if err != nil {
		t.Fatalf("nextTurnInternal 失败: %v", err)
	}

	if room.GameState.FullState.MovesRemaining != 4 {
		t.Errorf("体力应该重置为 4, 实际是 %d", room.GameState.FullState.MovesRemaining)
	}
}

func TestNextTurnInternal_ClearsPendingAction(t *testing.T) {
	gm := &GameManager{Rooms: make(map[string]*Room)}
	roomID := createTestRoomForLogic(gm)
	room := gm.Rooms[roomID]

	room.GameState.FullState.ActivePlayerID = "player_1"
	room.GameState.FullState.PendingAction = &PendingAction{
		Type:   "ATTRIBUTE_CHECK",
		Target: "player_1",
		Data:   map[string]interface{}{"attribute": "might", "difficulty": 3},
	}

	err := gm.nextTurnInternal(room)
	if err != nil {
		t.Fatalf("nextTurnInternal 失败: %v", err)
	}

	if room.GameState.FullState.PendingAction != nil {
		t.Errorf("PendingAction 应该被清除")
	}
}

func TestNextTurnInternal_ClearsLastRollResult(t *testing.T) {
	gm := &GameManager{Rooms: make(map[string]*Room)}
	roomID := createTestRoomForLogic(gm)
	room := gm.Rooms[roomID]

	result := 7
	room.GameState.FullState.LastRollResult = &result

	err := gm.nextTurnInternal(room)
	if err != nil {
		t.Fatalf("nextTurnInternal 失败: %v", err)
	}

	if room.GameState.FullState.LastRollResult != nil {
		t.Error("LastRollResult 应该在切换回合时被清除")
	}
}

func TestNextTurnInternal_LogsTurnChange(t *testing.T) {
	gm := &GameManager{Rooms: make(map[string]*Room)}
	roomID := createTestRoomForLogic(gm)
	room := gm.Rooms[roomID]

	initialLogCount := len(room.GameState.FullState.Logs)
	room.GameState.FullState.ActivePlayerID = "player_1"

	err := gm.nextTurnInternal(room)
	if err != nil {
		t.Fatalf("nextTurnInternal 失败: %v", err)
	}

	if len(room.GameState.FullState.Logs) <= initialLogCount {
		t.Error("nextTurnInternal 应该添加日志")
	}
}

// ==================== ProcessStatusEffectsOnTurnStart 测试 ====================

func TestProcessStatusEffectsOnTurnStart_DecrementsDuration(t *testing.T) {
	gm := &GameManager{Rooms: make(map[string]*Room)}
	roomID := createTestRoomForLogic(gm)

	player := gm.Rooms[roomID].GameState.FullState.Players["player_1"]
	player.StatusEffects = []StatusEffect{
		{Type: "BURNING", Duration: 3, Damage: 1},
		{Type: "BLESSED", Duration: 5, Amount: 1},
	}

	gm.ProcessStatusEffectsOnTurnStart(player)

	if player.StatusEffects[0].Duration != 2 {
		t.Errorf("BURNING 持续时间应该是 2, 实际是 %d", player.StatusEffects[0].Duration)
	}
	if player.StatusEffects[1].Duration != 4 {
		t.Errorf("BLESSED 持续时间应该是 4, 实际是 %d", player.StatusEffects[1].Duration)
	}
	_ = roomID
}

func TestProcessStatusEffectsOnTurnStart_RemovesExpiredEffects(t *testing.T) {
	gm := &GameManager{Rooms: make(map[string]*Room)}
	roomID := createTestRoomForLogic(gm)

	player := gm.Rooms[roomID].GameState.FullState.Players["player_1"]
	player.StatusEffects = []StatusEffect{
		{Type: "BURNING", Duration: 1, Damage: 1},
		{Type: "INVISIBLE", Duration: 3},
	}

	gm.ProcessStatusEffectsOnTurnStart(player)

	if len(player.StatusEffects) != 1 {
		t.Errorf("应该只剩 1 个状态效果, 实际是 %d", len(player.StatusEffects))
	}
	if player.StatusEffects[0].Type != "INVISIBLE" {
		t.Errorf("剩余的应该是 INVISIBLE, 实际是 %s", player.StatusEffects[0].Type)
	}
	_ = roomID
}

func TestProcessStatusEffectsOnTurnStart_PermanentEffectsNotRemoved(t *testing.T) {
	gm := &GameManager{Rooms: make(map[string]*Room)}
	roomID := createTestRoomForLogic(gm)

	player := gm.Rooms[roomID].GameState.FullState.Players["player_1"]
	player.StatusEffects = []StatusEffect{
		{Type: "INVISIBLE", Duration: -1},
	}

	gm.ProcessStatusEffectsOnTurnStart(player)

	if len(player.StatusEffects) != 1 {
		t.Errorf("永久效果应该保留, 实际剩 %d 个", len(player.StatusEffects))
	}
	_ = roomID
}

// ==================== ProcessStatusEffectsOnTurnEnd 测试 ====================

func TestProcessStatusEffectsOnTurnEnd_PerformsEndOfTurnEffects(t *testing.T) {
	gm := &GameManager{Rooms: make(map[string]*Room)}
	roomID := createTestRoomForLogic(gm)

	player := gm.Rooms[roomID].GameState.FullState.Players["player_1"]
	player.StatusEffects = []StatusEffect{
		{Type: "PHASING", Duration: 2},
	}

	gm.ProcessStatusEffectsOnTurnEnd(player)

	// PHASING 是回合开始移除，效果应该还在
	if len(player.StatusEffects) != 1 {
		t.Errorf("PHASING 应该保留, 实际剩 %d 个", len(player.StatusEffects))
	}
	_ = roomID
}

// ==================== SetPendingAction / ClearPendingAction / CheckPendingAction 测试 ====================

func TestSetPendingAction_Success(t *testing.T) {
	gm := &GameManager{Rooms: make(map[string]*Room)}
	roomID := createTestRoomForLogic(gm)

	action := &PendingAction{
		Type:   "ATTRIBUTE_CHECK",
		Target: "player_1",
		Data:   map[string]interface{}{"attribute": "might", "difficulty": 3},
	}

	err := gm.SetPendingAction(roomID, action)
	if err != nil {
		t.Fatalf("SetPendingAction 失败: %v", err)
	}

	room := gm.Rooms[roomID]
	if room.GameState.FullState.PendingAction == nil {
		t.Fatal("PendingAction 应该被设置")
	}
	if room.GameState.FullState.PendingAction.Type != "ATTRIBUTE_CHECK" {
		t.Errorf("PendingAction 类型应该是 ATTRIBUTE_CHECK, 实际是 %s", room.GameState.FullState.PendingAction.Type)
	}
}

func TestSetPendingAction_ClearsLastRollResult(t *testing.T) {
	gm := &GameManager{Rooms: make(map[string]*Room)}
	roomID := createTestRoomForLogic(gm)
	room := gm.Rooms[roomID]
	result := 5
	room.GameState.FullState.LastRollResult = &result

	action := &PendingAction{
		Type:   "ATTRIBUTE_CHECK",
		Target: "player_1",
		Data:   map[string]interface{}{"attribute": "might", "difficulty": 3},
	}

	err := gm.SetPendingAction(roomID, action)
	if err != nil {
		t.Fatalf("SetPendingAction 失败: %v", err)
	}

	if room.GameState.FullState.LastRollResult != nil {
		t.Error("SetPendingAction 应该清除旧的 LastRollResult")
	}
}

func TestSetPendingAction_RoomNotFound(t *testing.T) {
	gm := &GameManager{Rooms: make(map[string]*Room)}

	err := gm.SetPendingAction("nonexistent_room", &PendingAction{Type: "TEST"})
	if err == nil {
		t.Error("应该返回错误当房间不存在")
	}
}

func TestClearPendingAction_Success(t *testing.T) {
	gm := &GameManager{Rooms: make(map[string]*Room)}
	roomID := createTestRoomForLogic(gm)

	gm.Rooms[roomID].GameState.FullState.PendingAction = &PendingAction{Type: "ATTRIBUTE_CHECK"}

	err := gm.ClearPendingAction(roomID)
	if err != nil {
		t.Fatalf("ClearPendingAction 失败: %v", err)
	}

	if gm.Rooms[roomID].GameState.FullState.PendingAction != nil {
		t.Error("PendingAction 应该被清除")
	}
}

func TestCheckPendingAction_ReturnsAction(t *testing.T) {
	gm := &GameManager{Rooms: make(map[string]*Room)}
	roomID := createTestRoomForLogic(gm)

	expectedAction := &PendingAction{
		Type:   "CHOICE",
		Target: "player_1",
		Data:   map[string]interface{}{"eventID": "event_1"},
	}
	gm.Rooms[roomID].GameState.FullState.PendingAction = expectedAction

	action, err := gm.CheckPendingAction(roomID)
	if err != nil {
		t.Fatalf("CheckPendingAction 失败: %v", err)
	}

	if action == nil {
		t.Fatal("CheckPendingAction 应该返回 PendingAction")
	}
	if action.Type != "CHOICE" {
		t.Errorf("PendingAction 类型应该是 CHOICE, 实际是 %s", action.Type)
	}
}

func TestCheckPendingAction_ReturnsNilWhenNone(t *testing.T) {
	gm := &GameManager{Rooms: make(map[string]*Room)}
	roomID := createTestRoomForLogic(gm)

	gm.Rooms[roomID].GameState.FullState.PendingAction = nil

	action, err := gm.CheckPendingAction(roomID)
	if err != nil {
		t.Fatalf("CheckPendingAction 失败: %v", err)
	}

	if action != nil {
		t.Error("CheckPendingAction 应该返回 nil 当没有 PendingAction")
	}
}

// ==================== EndTurn 测试 ====================

func TestEndTurn_ValidatesCurrentPlayer(t *testing.T) {
	gm := &GameManager{Rooms: make(map[string]*Room)}
	roomID := createTestRoomForLogic(gm)
	room := gm.Rooms[roomID]

	room.GameState.FullState.ActivePlayerID = "player_1"

	err := gm.EndTurn(roomID, "player_2")
	if err == nil {
		t.Error("EndTurn 应该返回错误当不是当前玩家")
	}
}

func TestEndTurn_Success(t *testing.T) {
	gm := &GameManager{Rooms: make(map[string]*Room)}
	roomID := createTestRoomForLogic(gm)
	room := gm.Rooms[roomID]

	room.GameState.FullState.ActivePlayerID = "player_1"

	err := gm.EndTurn(roomID, "player_1")
	if err != nil {
		t.Fatalf("EndTurn 失败: %v", err)
	}

	if room.GameState.FullState.ActivePlayerID == "player_1" {
		t.Error("EndTurn 后应该切换到下一玩家")
	}
}

// ==================== RollDiceSum 测试 ====================

func TestRollDiceSum(t *testing.T) {
	gm := &GameManager{}

	sum := gm.RollDiceSum(1)
	if sum < 0 || sum > 2 {
		t.Errorf("RollDiceSum(1) 超出范围: %d", sum)
	}

	sum = gm.RollDiceSum(3)
	if sum < 0 || sum > 6 {
		t.Errorf("RollDiceSum(3) 超出范围: %d", sum)
	}
}

// ==================== 辅助函数测试 ====================

func TestGetOppositeDirection(t *testing.T) {
	if getOppositeDirection(DirectionNorth) != DirectionSouth {
		t.Error("North 的相反方向应该是 South")
	}
	if getOppositeDirection(DirectionEast) != DirectionWest {
		t.Error("East 的相反方向应该是 West")
	}
	if getOppositeDirection(DirectionSouth) != DirectionNorth {
		t.Error("South 的相反方向应该是 North")
	}
	if getOppositeDirection(DirectionWest) != DirectionEast {
		t.Error("West 的相反方向应该是 East")
	}
}

func TestFormatSign(t *testing.T) {
	if formatSign(5) != "+5" {
		t.Errorf("formatSign(5) 应该是 '+5', 实际是 '%s'", formatSign(5))
	}
	if formatSign(-3) != "-3" {
		t.Errorf("formatSign(-3) 应该是 '-3', 实际是 '%s'", formatSign(-3))
	}
	if formatSign(0) != "+0" {
		t.Errorf("formatSign(0) 应该是 '+0', 实际是 '%s'", formatSign(0))
	}
}
