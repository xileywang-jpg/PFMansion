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
	room.GameState.FullState.PendingAction = NewPendingAttributeCheck("player_1", "might", 3, nil)

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

func TestResolveHauntRoll_UsesProvidedDiceResults(t *testing.T) {
	gm := &GameManager{Rooms: make(map[string]*Room)}
	roomID := createTestRoomForLogic(gm)
	room := gm.Rooms[roomID]

	room.GameState.FullState.Phase = GamePhaseHauntRoll
	room.GameState.FullState.OmenCount = 4
	room.GameState.FullState.ActivePlayerID = "player_1"

	actionResult, err := gm.ResolveHauntRoll(roomID, []int{1, 1, 1, 1, 0, 0})
	if err != nil {
		t.Fatalf("ResolveHauntRoll 失败: %v", err)
	}

	if actionResult["checkType"] != string(PendingActionTypeHauntRoll) {
		t.Fatalf("checkType 应为 HAUNT_ROLL, 实际为 %#v", actionResult["checkType"])
	}
	if success, ok := actionResult["success"].(bool); !ok || !success {
		t.Fatalf("sum == omenCount 时应判定为通过, 实际为 %#v", actionResult["success"])
	}
	if hauntTriggered, ok := actionResult["hauntTriggered"].(bool); !ok || hauntTriggered {
		t.Fatalf("通过检定时 hauntTriggered 应为 false, 实际为 %#v", actionResult["hauntTriggered"])
	}
	if room.GameState.FullState.LastRollResult == nil || *room.GameState.FullState.LastRollResult != 4 {
		t.Fatalf("LastRollResult 应记录指定骰子和, 实际为 %#v", room.GameState.FullState.LastRollResult)
	}
	if room.GameState.FullState.Phase != GamePhaseExploration {
		t.Fatalf("作祟检定通过后应回到探索阶段, 实际为 %s", room.GameState.FullState.Phase)
	}
}

func TestBuildInteractionState_FromPendingAction(t *testing.T) {
	gm := &GameManager{Rooms: make(map[string]*Room)}
	roomID := createTestRoomForLogic(gm)
	state := gm.Rooms[roomID].GameState.FullState
	state.PendingAction = NewPendingAttributeCheck("player_1", "knowledge", 5, map[string]interface{}{"eventId": "event_test"})

	interaction := state.BuildInteractionState()
	if interaction == nil {
		t.Fatal("PendingAction 存在时应派生 interactionState")
	}
	if interaction.Type != InteractionStateTypeAttributeCheck {
		t.Fatalf("interactionState 类型错误: %s", interaction.Type)
	}
	if interaction.PlayerID != "player_1" {
		t.Fatalf("interactionState playerId 错误: %s", interaction.PlayerID)
	}
	if interaction.Attribute != "knowledge" {
		t.Fatalf("interactionState attribute 错误: %s", interaction.Attribute)
	}
	if interaction.Difficulty != 5 {
		t.Fatalf("interactionState difficulty 错误: %d", interaction.Difficulty)
	}
	if interaction.EventID != "event_test" {
		t.Fatalf("interactionState eventId 错误: %s", interaction.EventID)
	}
}

func TestBuildInteractionState_FromActiveCombat(t *testing.T) {
	gm := &GameManager{Rooms: make(map[string]*Room)}
	roomID := createTestRoomForLogic(gm)
	state := gm.Rooms[roomID].GameState.FullState
	state.ActiveCombat = &CombatState{
		AttackerID: "player_1",
		DefenderID: "player_2",
		Attribute:  "might",
		Phase:      "ATTACKING",
	}

	interaction := state.BuildInteractionState()
	if interaction == nil {
		t.Fatal("ActiveCombat 存在时应派生 interactionState")
	}
	if interaction.Type != InteractionStateTypeCombat {
		t.Fatalf("interactionState 类型错误: %s", interaction.Type)
	}
	if interaction.PlayerID != "player_1" {
		t.Fatalf("interactionState playerId 错误: %s", interaction.PlayerID)
	}
	if interaction.AttackerID != "player_1" || interaction.DefenderID != "player_2" {
		t.Fatalf("interactionState 战斗参与者错误: %+v", interaction)
	}
	if interaction.Attribute != "might" {
		t.Fatalf("interactionState 战斗属性错误: %s", interaction.Attribute)
	}
	if interaction.CombatPhase != "ATTACKING" {
		t.Fatalf("interactionState 战斗阶段错误: %s", interaction.CombatPhase)
	}
}

func TestBuildInteractionState_FromCombatResult(t *testing.T) {
	gm := &GameManager{Rooms: make(map[string]*Room)}
	roomID := createTestRoomForLogic(gm)
	state := gm.Rooms[roomID].GameState.FullState
	state.CombatResult = &CombatResult{
		AttackerID:    "player_1",
		DefenderID:    "player_2",
		AttackerRolls: []int{2, 1, 0},
		AttackerSum:   3,
		DefenderRolls: []int{1, 0, 0},
		DefenderSum:   1,
		Damage:        2,
		Loser:         "player_2",
		Draw:          false,
		Attribute:     "might",
	}

	interaction := state.BuildInteractionState()
	if interaction == nil {
		t.Fatal("CombatResult 存在时应派生 interactionState")
	}
	if interaction.Type != InteractionStateTypeCombat {
		t.Fatalf("interactionState 类型错误: %s", interaction.Type)
	}
	if interaction.CombatPhase != "RESULT" {
		t.Fatalf("interactionState 战斗结果阶段错误: %s", interaction.CombatPhase)
	}
	if interaction.Damage != 2 {
		t.Fatalf("interactionState damage 错误: %d", interaction.Damage)
	}
	if interaction.Loser != "player_2" {
		t.Fatalf("interactionState loser 错误: %s", interaction.Loser)
	}
	if interaction.AttackerSum != 3 || interaction.DefenderSum != 1 {
		t.Fatalf("interactionState 战斗点数错误: %+v", interaction)
	}
}

func TestClearCombatResult_RemovesStoredResult(t *testing.T) {
	gm := &GameManager{Rooms: make(map[string]*Room)}
	roomID := createTestRoomForLogic(gm)
	state := gm.Rooms[roomID].GameState.FullState
	state.ActivePlayerID = "player_1"
	state.CombatResult = &CombatResult{AttackerID: "player_1", DefenderID: "player_2", Attribute: "might"}

	if err := gm.ClearCombatResult(roomID, "player_1"); err != nil {
		t.Fatalf("ClearCombatResult 失败: %v", err)
	}
	if state.CombatResult != nil {
		t.Fatal("ClearCombatResult 后 CombatResult 应被清除")
	}
}

func TestBuildInteractionState_FromHauntRollPhase(t *testing.T) {
	gm := &GameManager{Rooms: make(map[string]*Room)}
	roomID := createTestRoomForLogic(gm)
	state := gm.Rooms[roomID].GameState.FullState
	state.Phase = GamePhaseHauntRoll
	state.ActivePlayerID = "player_2"
	state.OmenCount = 6

	interaction := state.BuildInteractionState()
	if interaction == nil {
		t.Fatal("HAUNT_ROLL 阶段应派生 interactionState")
	}
	if interaction.Type != InteractionStateTypeHauntRoll {
		t.Fatalf("interactionState 类型错误: %s", interaction.Type)
	}
	if interaction.PlayerID != "player_2" {
		t.Fatalf("interactionState playerId 错误: %s", interaction.PlayerID)
	}
	if interaction.OmenCount != 6 {
		t.Fatalf("interactionState omenCount 错误: %d", interaction.OmenCount)
	}
}

func TestBuildInteractionState_FromPendingTilePlacement(t *testing.T) {
	gm := &GameManager{Rooms: make(map[string]*Room)}
	roomID := createTestRoomForLogic(gm)
	state := gm.Rooms[roomID].GameState.FullState
	state.ActivePlayerID = "player_1"
	state.PendingTile = &TileDef{ID: "tile_library", Name: "图书馆"}
	state.PendingMoveDirection = "E"
	state.PendingTileRotation = 90
	state.PendingTargetPos = &Pos{X: 1, Y: 0}

	interaction := state.BuildInteractionState()
	if interaction == nil {
		t.Fatal("PendingTile 存在时应派生 interactionState")
	}
	if interaction.Type != InteractionStateTypeTilePlacement {
		t.Fatalf("interactionState 类型错误: %s", interaction.Type)
	}
	if interaction.PlayerID != "player_1" {
		t.Fatalf("interactionState playerId 错误: %s", interaction.PlayerID)
	}
	if interaction.TileID != "tile_library" {
		t.Fatalf("interactionState tileId 错误: %s", interaction.TileID)
	}
	if interaction.Direction != "E" {
		t.Fatalf("interactionState direction 错误: %s", interaction.Direction)
	}
	if interaction.Rotation != 90 {
		t.Fatalf("interactionState rotation 错误: %d", interaction.Rotation)
	}
	if interaction.TargetPos == nil || interaction.TargetPos.X != 1 || interaction.TargetPos.Y != 0 {
		t.Fatalf("interactionState targetPos 错误: %+v", interaction.TargetPos)
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
		Type:   PendingActionTypeAttributeCheck,
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
	if room.GameState.FullState.PendingAction.Type != PendingActionTypeAttributeCheck {
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
		Type:   PendingActionTypeAttributeCheck,
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

	err := gm.SetPendingAction("nonexistent_room", &PendingAction{Type: PendingActionType("TEST")})
	if err == nil {
		t.Error("应该返回错误当房间不存在")
	}
}

func TestClearPendingAction_Success(t *testing.T) {
	gm := &GameManager{Rooms: make(map[string]*Room)}
	roomID := createTestRoomForLogic(gm)

	gm.Rooms[roomID].GameState.FullState.PendingAction = &PendingAction{Type: PendingActionTypeAttributeCheck}

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
		Type:   PendingActionTypeChoice,
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
	if action.Type != PendingActionTypeChoice {
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
