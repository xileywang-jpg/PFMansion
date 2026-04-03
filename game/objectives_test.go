package game

import (
	"testing"
)

// ==================== InitializeObjectives 测试 ====================

func TestInitializeObjectives_SetsUpObjectives(t *testing.T) {
	gm := &GameManager{Rooms: make(map[string]*Room)}
	roomID := createTestRoomForLogic(gm)
	room := gm.Rooms[roomID]

	// 设置剧本
	room.GameState.FullState.CurrentScenario = &Scenario{
		Name:             "Test Haunt",
		HeroObjective:    buildTestObjective("Survive", "生存 10 回合", "SURVIVE", 10, nil),
		TraitorObjective: buildTestObjective("Eliminate", "消灭所有英雄", "ELIMINATE", 10, nil),
	}

	gm.InitializeObjectives(roomID)

	if room.GameState.FullState.TurnsSinceHaunt != 0 {
		t.Errorf("TurnsSinceHaunt 应该为 0, 实际是 %d", room.GameState.FullState.TurnsSinceHaunt)
	}

	if room.GameState.FullState.HeroObjectives == nil {
		t.Error("HeroObjectives 应该被初始化")
	}

	if room.GameState.FullState.TraitorObjectives == nil {
		t.Error("TraitorObjectives 应该被初始化")
	}

	// 验证日志中包含目标信息
	foundHeroLog := false
	foundTraitorLog := false
	for _, log := range room.GameState.FullState.Logs {
		if log.Type == "info" && containsString(log.Text, "英雄目标") {
			foundHeroLog = true
		}
		if log.Type == "alert" && containsString(log.Text, "叛徒目标") {
			foundTraitorLog = true
		}
	}
	if !foundHeroLog {
		t.Error("日志中应该包含英雄目标信息")
	}
	if !foundTraitorLog {
		t.Error("日志中应该包含叛徒目标信息")
	}
}

func TestInitializeObjectives_RoomNotFound(t *testing.T) {
	gm := &GameManager{Rooms: make(map[string]*Room)}

	// 不应该 panic
	gm.InitializeObjectives("nonexistent_room")
}

// ==================== IncrementHauntTurns 测试 ====================

func TestIncrementHauntTurns_IncrementsCounter(t *testing.T) {
	gm := &GameManager{Rooms: make(map[string]*Room)}
	roomID := createTestRoomForLogic(gm)
	room := gm.Rooms[roomID]

	room.GameState.FullState.IsHauntActive = true
	room.GameState.FullState.TurnsSinceHaunt = 0

	gm.IncrementHauntTurns(roomID)

	if room.GameState.FullState.TurnsSinceHaunt != 1 {
		t.Errorf("TurnsSinceHaunt 应该为 1, 实际是 %d", room.GameState.FullState.TurnsSinceHaunt)
	}
}

func TestIncrementHauntTurns_NotActive(t *testing.T) {
	gm := &GameManager{Rooms: make(map[string]*Room)}
	roomID := createTestRoomForLogic(gm)
	room := gm.Rooms[roomID]

	room.GameState.FullState.IsHauntActive = false
	room.GameState.FullState.TurnsSinceHaunt = 0

	gm.IncrementHauntTurns(roomID)

	if room.GameState.FullState.TurnsSinceHaunt != 0 {
		t.Errorf("作祟未激活时 TurnsSinceHaunt 不应该增加")
	}
}

// ==================== UpdateObjectives 测试 ====================

func TestUpdateObjectives_TileReached_Traitor(t *testing.T) {
	gm := &GameManager{Rooms: make(map[string]*Room)}
	roomID := createTestRoomForLogic(gm)
	room := gm.Rooms[roomID]

	// 设置剧本
	room.GameState.FullState.CurrentScenario = &Scenario{
		Name:             "Reach the Exit",
		TraitorObjective: buildTestObjective("Reach Exit", "到达出口", "REACH", 8, map[string]interface{}{"target": "tile_exit"}),
	}

	room.GameState.FullState.TraitorID = "player_1"

	gm.UpdateObjectives(roomID, "TILE_REACHED", map[string]interface{}{
		"playerId": "player_1",
		"tileId":   "tile_exit",
	})

	if room.GameState.FullState.TraitorObjectives == nil {
		t.Fatal("TraitorObjectives 应该被创建")
	}

	obj := room.GameState.FullState.TraitorObjectives["player_1"]
	if obj == nil {
		t.Fatal("TraitorObjectives[player_1] 不应该为 nil")
	}

	if obj.Progress != 1 {
		t.Errorf("进度应该是 1, 实际是 %d", obj.Progress)
	}
}

func TestUpdateObjectives_TileReached_Hero(t *testing.T) {
	gm := &GameManager{Rooms: make(map[string]*Room)}
	roomID := createTestRoomForLogic(gm)
	room := gm.Rooms[roomID]

	// 设置剧本
	room.GameState.FullState.CurrentScenario = &Scenario{
		Name:          "Block the Exit",
		HeroObjective: buildTestObjective("Block Exit", "阻止叛徒到达出口", "REACH", 8, map[string]interface{}{"target": "tile_exit"}),
	}

	gm.UpdateObjectives(roomID, "TILE_REACHED", map[string]interface{}{
		"playerId": "player_2",
		"tileId":   "tile_exit",
	})

	if room.GameState.FullState.HeroObjectives == nil {
		t.Fatal("HeroObjectives 应该被创建")
	}

	obj := room.GameState.FullState.HeroObjectives["player_2"]
	if obj == nil {
		t.Fatal("HeroObjectives[player_2] 不应该为 nil")
	}

	if obj.Progress != 1 {
		t.Errorf("进度应该是 1, 实际是 %d", obj.Progress)
	}
}

func TestUpdateObjectives_ItemCollected(t *testing.T) {
	gm := &GameManager{Rooms: make(map[string]*Room)}
	roomID := createTestRoomForLogic(gm)
	room := gm.Rooms[roomID]

	room.GameState.FullState.CurrentScenario = &Scenario{
		Name:             "Collect the Key",
		TraitorObjective: buildTestObjective("Collect Key", "收集钥匙", "COLLECT", 8, map[string]interface{}{"target": "item_key"}),
	}

	room.GameState.FullState.TraitorID = "player_1"

	gm.UpdateObjectives(roomID, "ITEM_COLLECTED", map[string]interface{}{
		"playerId": "player_1",
		"itemId":   "item_key",
	})

	if room.GameState.FullState.TraitorObjectives["player_1"] == nil {
		t.Fatal("TraitorObjectives[player_1] 不应该为 nil")
	}

	if room.GameState.FullState.TraitorObjectives["player_1"].Progress != 1 {
		t.Errorf("进度应该是 1, 实际是 %d", room.GameState.FullState.TraitorObjectives["player_1"].Progress)
	}
}

func TestUpdateObjectives_TileReached_UsesParamsTargetAndRequired(t *testing.T) {
	gm := &GameManager{Rooms: make(map[string]*Room)}
	roomID := createTestRoomForLogic(gm)
	room := gm.Rooms[roomID]

	room.GameState.FullState.CurrentScenario = &Scenario{
		Name:             "Reach by Params",
		TraitorObjective: buildTestObjective("Reach Exit", "到达出口", "REACH", 8, map[string]interface{}{"target": "tile_exit", "required": 2}),
	}
	room.GameState.FullState.TraitorID = "player_1"

	gm.UpdateObjectives(roomID, "TILE_REACHED", map[string]interface{}{"playerId": "player_1", "tileId": "tile_exit"})
	gm.UpdateObjectives(roomID, "TILE_REACHED", map[string]interface{}{"playerId": "player_1", "tileId": "tile_exit"})

	obj := room.GameState.FullState.TraitorObjectives["player_1"]
	if obj == nil {
		t.Fatal("TraitorObjectives[player_1] 不应该为 nil")
	}
	if obj.Required != 2 {
		t.Fatalf("required 应该取 params.required=2, 实际是 %d", obj.Required)
	}
	if obj.Progress != 2 {
		t.Fatalf("progress 应该是 2, 实际是 %d", obj.Progress)
	}
	if !obj.Completed {
		t.Fatal("达到 required 后应标记 completed")
	}
}

func TestUpdateObjectives_TurnsSurvived(t *testing.T) {
	gm := &GameManager{Rooms: make(map[string]*Room)}
	roomID := createTestRoomForLogic(gm)
	room := gm.Rooms[roomID]

	room.GameState.FullState.CurrentScenario = &Scenario{
		Name:          "Survive",
		HeroObjective: buildTestObjective("Survive", "生存 10 回合", "SURVIVE", 10, nil),
	}

	gm.UpdateObjectives(roomID, "TURNS_SURVIVED", map[string]interface{}{
		"turns": 5,
	})

	if room.GameState.FullState.HeroObjectives == nil {
		t.Fatal("HeroObjectives 不应该为 nil")
	}

	obj := room.GameState.FullState.HeroObjectives["survived"]
	if obj == nil {
		t.Fatal("HeroObjectives[survived] 不应该为 nil")
	}

	if obj.Progress != 5 {
		t.Errorf("进度应该是 5, 实际是 %d", obj.Progress)
	}
}

func TestUpdateObjectives_OpenGate_UsesTileReachedPath(t *testing.T) {
	gm := &GameManager{Rooms: make(map[string]*Room)}
	roomID := createTestRoomForLogic(gm)
	room := gm.Rooms[roomID]

	room.GameState.FullState.CurrentScenario = &Scenario{
		Name:             "Open Gate",
		TraitorObjective: buildTestObjective("Open Gate", "打开大门", "OPEN_GATE", 8, map[string]interface{}{"target": "tile_gate"}),
	}
	room.GameState.FullState.TraitorID = "player_1"

	gm.UpdateObjectives(roomID, "TILE_REACHED", map[string]interface{}{
		"playerId": "player_1",
		"tileId":   "tile_gate",
	})

	obj := room.GameState.FullState.TraitorObjectives["player_1"]
	if obj == nil {
		t.Fatal("OPEN_GATE 目标应创建叛徒进度")
	}
	if obj.Progress != 1 {
		t.Fatalf("OPEN_GATE 目标进度应为 1, 实际是 %d", obj.Progress)
	}
	if !obj.Completed {
		t.Fatal("OPEN_GATE 达成后应标记完成")
	}
	if room.GameState.FullState.GameWinner != "TRAITOR" {
		t.Fatalf("OPEN_GATE 达成后应叛徒胜利, 实际是 %s", room.GameState.FullState.GameWinner)
	}
}

func TestUpdateObjectives_EventTypeOverride_ItemCollectedForReach(t *testing.T) {
	gm := &GameManager{Rooms: make(map[string]*Room)}
	roomID := createTestRoomForLogic(gm)
	room := gm.Rooms[roomID]

	room.GameState.FullState.CurrentScenario = &Scenario{
		Name:             "Reach by Item Event",
		TraitorObjective: buildTestObjective("Special Reach", "通过收集触发", "REACH", 8, map[string]interface{}{"eventType": "ITEM_COLLECTED", "target": "item_gate_key"}),
	}
	room.GameState.FullState.TraitorID = "player_1"

	gm.UpdateObjectives(roomID, "ITEM_COLLECTED", map[string]interface{}{
		"playerId": "player_1",
		"itemId":   "item_gate_key",
	})

	obj := room.GameState.FullState.TraitorObjectives["player_1"]
	if obj == nil || obj.Progress != 1 {
		t.Fatal("params.eventType=ITEM_COLLECTED 的 REACH 目标应在收集后推进")
	}
}

func TestObjectiveRuntimeRequiredProgress_ConvertAllHeroes(t *testing.T) {
	state := &GameStateFull{
		Players: map[string]*GamePlayer{
			"traitor": {Team: "TRAITOR"},
			"hero_1":  {Team: "HERO"},
			"hero_2":  {Team: "HERO"},
			"hero_3":  {Team: "HERO"},
		},
	}
	obj := &Objective{
		Name:   "Convert",
		Type:   "CONVERT",
		Params: map[string]interface{}{"target": "ALL_HEROES", "turns": 6, "eventType": "PLAYER_DEATH"},
	}

	if required := objectiveRuntimeRequiredProgress(state, obj); required != 3 {
		t.Fatalf("CONVERT ALL_HEROES 的 required 应按英雄数量推导为 3, 实际是 %d", required)
	}
}

func TestUpdateObjectives_PlayerDeath_ConvertTracksAllHeroes(t *testing.T) {
	gm := &GameManager{Rooms: make(map[string]*Room)}
	roomID := createTestRoomForLogic(gm)
	room := gm.Rooms[roomID]

	room.GameState.FullState.Phase = GamePhaseHaunt
	room.GameState.FullState.TraitorID = "player_1"
	room.GameState.FullState.Players["player_1"].Team = "TRAITOR"
	room.GameState.FullState.Players["player_2"].Team = "HERO"
	room.GameState.FullState.Players["player_3"] = &GamePlayer{
		ID:   "player_3",
		Team: "HERO",
		Character: CharacterDef{Name: "Hero 3", Attributes: map[string]Attribute{
			"might":     {Current: 4, Max: 10, Floor: 0, Values: []int{0, 1, 2, 3, 4}},
			"speed":     {Current: 4, Max: 10, Floor: 0, Values: []int{0, 1, 2, 3, 4}},
			"sanity":    {Current: 4, Max: 10, Floor: 0, Values: []int{0, 1, 2, 3, 4}},
			"knowledge": {Current: 4, Max: 10, Floor: 0, Values: []int{0, 1, 2, 3, 4}},
		}},
	}
	room.GameState.FullState.CurrentScenario = &Scenario{
		Name:             "Convert Test",
		TraitorObjective: buildTestObjective("Convert All", "转化全部英雄", "CONVERT", 6, map[string]interface{}{"target": "ALL_HEROES"}),
	}

	room.GameState.FullState.Players["player_2"].IsDead = true
	gm.UpdateObjectives(roomID, "PLAYER_DEATH", map[string]interface{}{"playerId": "player_2"})

	obj := room.GameState.FullState.TraitorObjectives["player_1"]
	if obj == nil {
		t.Fatal("CONVERT 目标应在首个英雄死亡后创建进度")
	}
	if obj.Required != 2 {
		t.Fatalf("required 应按英雄总数推导为 2, 实际是 %d", obj.Required)
	}
	if obj.Progress != 1 {
		t.Fatalf("首个英雄死亡后 progress 应为 1, 实际是 %d", obj.Progress)
	}
	if room.GameState.FullState.GameWinner != "" {
		t.Fatalf("仅 1 名英雄死亡时不应提前胜利, 实际是 %s", room.GameState.FullState.GameWinner)
	}

	room.GameState.FullState.Players["player_3"].IsDead = true
	gm.UpdateObjectives(roomID, "PLAYER_DEATH", map[string]interface{}{"playerId": "player_3"})

	if obj.Progress != 2 {
		t.Fatalf("第二个英雄死亡后 progress 应为 2, 实际是 %d", obj.Progress)
	}
	if room.GameState.FullState.GameWinner != "TRAITOR" {
		t.Fatalf("所有英雄都死亡后应判定叛徒胜利, 实际是 %s", room.GameState.FullState.GameWinner)
	}
}

func TestModifyStat_PlayerDeathUpdatesConvertObjective(t *testing.T) {
	gm := &GameManager{Rooms: make(map[string]*Room)}
	roomID := createTestRoomForLogic(gm)
	room := gm.Rooms[roomID]

	room.GameState.FullState.Phase = GamePhaseHaunt
	room.GameState.FullState.TraitorID = "player_1"
	room.GameState.FullState.Players["player_1"].Team = "TRAITOR"
	room.GameState.FullState.Players["player_2"].Team = "HERO"
	room.GameState.FullState.CurrentScenario = &Scenario{
		Name:             "Convert Test",
		TraitorObjective: buildTestObjective("Convert All", "转化全部英雄", "CONVERT", 6, map[string]interface{}{"target": "ALL_HEROES"}),
	}

	room.GameState.FullState.Players["player_2"].Character.Attributes["might"] = Attribute{
		Current: 1,
		Max:     10,
		Floor:   0,
		Values:  []int{0, 1, 2, 3, 4},
	}

	if err := gm.ModifyStat(roomID, "player_2", "might", -1); err != nil {
		t.Fatalf("ModifyStat 不应失败: %v", err)
	}

	obj := room.GameState.FullState.TraitorObjectives["player_1"]
	if obj == nil || obj.Progress != 1 {
		t.Fatal("ModifyStat 导致死亡后应推进 CONVERT 目标")
	}
	if room.GameState.FullState.Players["player_2"].IsDead != true {
		t.Fatal("ModifyStat 导致 might 归零后应标记玩家死亡")
	}
}

// ==================== CheckVictory 测试 ====================

func TestCheckVictory_TraitorWins_AllHeroesDead(t *testing.T) {
	gm := &GameManager{Rooms: make(map[string]*Room)}
	roomID := createTestRoomForLogic(gm)
	room := gm.Rooms[roomID]

	room.GameState.FullState.Phase = GamePhaseHaunt
	room.GameState.FullState.Players["player_1"].IsDead = false
	room.GameState.FullState.Players["player_1"].Team = "TRAITOR"
	room.GameState.FullState.Players["player_2"].IsDead = true // 英雄死亡
	room.GameState.FullState.Players["player_2"].Team = "HERO"
	room.GameState.FullState.CurrentScenario = &Scenario{
		Name:             "Test",
		TraitorObjective: buildTestObjective("T", "", "ELIMINATE", 10, nil),
		HeroObjective:    buildTestObjective("H", "", "SURVIVE", 10, nil),
	}

	winner := gm.CheckVictory(roomID)

	if winner != "TRAITOR" {
		t.Errorf("应该返回 TRAITOR, 实际是 %s", winner)
	}

	if room.GameState.FullState.GameWinner != "TRAITOR" {
		t.Errorf("GameWinner 应该是 TRAITOR, 实际是 %s", room.GameState.FullState.GameWinner)
	}

	if room.GameState.FullState.Phase != GamePhaseGameOver {
		t.Errorf("Phase 应该是 GAME_OVER, 实际是 %s", room.GameState.FullState.Phase)
	}
}

func TestCheckVictory_HeroWins_TraitorDead(t *testing.T) {
	gm := &GameManager{Rooms: make(map[string]*Room)}
	roomID := createTestRoomForLogic(gm)
	room := gm.Rooms[roomID]

	room.GameState.FullState.Phase = GamePhaseHaunt
	room.GameState.FullState.Players["player_1"].IsDead = true // 叛徒死亡
	room.GameState.FullState.Players["player_1"].Team = "TRAITOR"
	room.GameState.FullState.Players["player_2"].IsDead = false
	room.GameState.FullState.Players["player_2"].Team = "HERO"
	room.GameState.FullState.CurrentScenario = &Scenario{
		Name:             "Test",
		TraitorObjective: buildTestObjective("T", "", "ELIMINATE", 10, nil),
		HeroObjective:    buildTestObjective("H", "", "SURVIVE", 10, nil),
	}

	winner := gm.CheckVictory(roomID)

	if winner != "HERO" {
		t.Errorf("应该返回 HERO, 实际是 %s", winner)
	}
}

func TestCheckVictory_NotHauntPhase(t *testing.T) {
	gm := &GameManager{Rooms: make(map[string]*Room)}
	roomID := createTestRoomForLogic(gm)
	room := gm.Rooms[roomID]

	room.GameState.FullState.Phase = GamePhaseExploration // 不是作祟阶段

	winner := gm.CheckVictory(roomID)

	if winner != "" {
		t.Errorf("非作祟阶段应该返回空字符串, 实际是 %s", winner)
	}
}

func TestCheckVictory_TurnLimit_TraitorWins(t *testing.T) {
	gm := &GameManager{Rooms: make(map[string]*Room)}
	roomID := createTestRoomForLogic(gm)
	room := gm.Rooms[roomID]

	room.GameState.FullState.Phase = GamePhaseHaunt
	room.GameState.FullState.TurnsSinceHaunt = 10
	room.GameState.FullState.Players["player_1"].IsDead = false
	room.GameState.FullState.Players["player_1"].Team = "TRAITOR"
	room.GameState.FullState.Players["player_2"].IsDead = false
	room.GameState.FullState.Players["player_2"].Team = "HERO"

	room.GameState.FullState.CurrentScenario = &Scenario{
		Name:             "Test Haunt",
		TraitorObjective: buildTestObjective("Default", "默认目标", "DEFAULT", 10, nil),
		HeroObjective:    buildTestObjective("Default", "默认目标", "SURVIVE", 10, nil),
	}

	winner := gm.CheckVictory(roomID)

	if winner != "TRAITOR" {
		t.Errorf("应该返回 TRAITOR (回合限制), 实际是 %s", winner)
	}
}

func TestCheckVictory_TurnLimit_HeroWins(t *testing.T) {
	gm := &GameManager{Rooms: make(map[string]*Room)}
	roomID := createTestRoomForLogic(gm)
	room := gm.Rooms[roomID]

	room.GameState.FullState.Phase = GamePhaseHaunt
	room.GameState.FullState.TurnsSinceHaunt = 10
	room.GameState.FullState.Players["player_1"].IsDead = true
	room.GameState.FullState.Players["player_1"].Team = "TRAITOR"
	room.GameState.FullState.Players["player_2"].IsDead = false
	room.GameState.FullState.Players["player_2"].Team = "HERO"

	room.GameState.FullState.CurrentScenario = &Scenario{
		Name:             "Test Haunt",
		TraitorObjective: buildTestObjective("Default", "默认目标", "ELIMINATE", 8, nil),
		HeroObjective:    buildTestObjective("Survive", "生存", "SURVIVE", 10, nil),
	}

	winner := gm.CheckVictory(roomID)

	if winner != "HERO" {
		t.Errorf("应该返回 HERO (叛徒未达成目标), 实际是 %s", winner)
	}
}

func TestCheckObjectiveVictory_CollectRespectsParamsRequired(t *testing.T) {
	gm := &GameManager{}
	state := &GameStateFull{
		Phase:     GamePhaseHaunt,
		TraitorID: "traitor",
		Players: map[string]*GamePlayer{
			"traitor": {Team: "TRAITOR"},
			"hero":    {Team: "HERO"},
		},
		CurrentScenario: &Scenario{
			Name:             "Collect Test",
			TraitorObjective: buildTestObjective("Collect", "收集关键物品", "COLLECT", 10, map[string]interface{}{"target": "item_key", "required": 2}),
		},
		TraitorObjectives: map[string]*PlayerObjective{
			"traitor": {Progress: 1, Required: 2},
		},
	}

	if winner := gm.checkObjectiveVictory(state); winner != "" {
		t.Fatalf("进度未达到 required 时不应胜利, 实际是 %s", winner)
	}

	state.TraitorObjectives["traitor"].Progress = 2
	if winner := gm.checkObjectiveVictory(state); winner != "TRAITOR" {
		t.Fatalf("进度达到 required 后应叛徒胜利, 实际是 %s", winner)
	}
}

func TestCheckVictory_TurnLimit_ConvertDoesNotAutoWinWithoutProgress(t *testing.T) {
	gm := &GameManager{Rooms: make(map[string]*Room)}
	roomID := createTestRoomForLogic(gm)
	room := gm.Rooms[roomID]

	room.GameState.FullState.Phase = GamePhaseHaunt
	room.GameState.FullState.TurnsSinceHaunt = 6
	room.GameState.FullState.TraitorID = "player_1"
	room.GameState.FullState.Players["player_1"].Team = "TRAITOR"
	room.GameState.FullState.Players["player_2"].Team = "HERO"
	room.GameState.FullState.CurrentScenario = &Scenario{
		Name:             "Convert Test",
		TraitorObjective: buildTestObjective("Convert All", "转化全部英雄", "CONVERT", 6, map[string]interface{}{"target": "ALL_HEROES"}),
	}

	if winner := gm.CheckVictory(roomID); winner != "" {
		t.Fatalf("CONVERT 在未完成进度时达到回合限制不应自动胜利, 实际是 %s", winner)
	}
	if room.GameState.FullState.GameWinner != "" {
		t.Fatalf("GameWinner 不应被设置, 实际是 %s", room.GameState.FullState.GameWinner)
	}
}

// ==================== checkVictoryInternal 测试 ====================

func TestCheckVictoryInternal_BothAlive(t *testing.T) {
	gm := &GameManager{}
	state := &GameStateFull{
		Phase: GamePhaseHaunt,
		Players: map[string]*GamePlayer{
			"player_1": {IsDead: false, Team: "TRAITOR"},
			"player_2": {IsDead: false, Team: "HERO"},
		},
		CurrentScenario: &Scenario{
			Name:             "Test",
			TraitorObjective: buildTestObjective("T", "", "ELIMINATE", 10, nil),
			HeroObjective:    buildTestObjective("H", "", "SURVIVE", 10, nil),
		},
	}

	winner := gm.checkVictoryInternal(state)

	if winner != "" {
		t.Errorf("双方都存活时应该返回空字符串, 实际是 %s", winner)
	}
}

func TestCheckVictoryInternal_AllTraitorsDead(t *testing.T) {
	gm := &GameManager{}
	state := &GameStateFull{
		Phase: GamePhaseHaunt,
		Players: map[string]*GamePlayer{
			"player_1": {IsDead: true, Team: "TRAITOR"}, // 叛徒死亡
			"player_2": {IsDead: false, Team: "HERO"},
		},
		CurrentScenario: &Scenario{
			Name:             "Test",
			TraitorObjective: buildTestObjective("T", "", "ELIMINATE", 10, nil),
			HeroObjective:    buildTestObjective("H", "", "SURVIVE", 10, nil),
		},
	}

	winner := gm.checkVictoryInternal(state)

	if winner != "HERO" {
		t.Errorf("应该返回 HERO, 实际是 %s", winner)
	}
}

func TestCheckVictoryInternal_NoScenario(t *testing.T) {
	gm := &GameManager{}
	state := &GameStateFull{
		Phase:           GamePhaseHaunt,
		Players:         map[string]*GamePlayer{},
		CurrentScenario: nil,
	}

	winner := gm.checkVictoryInternal(state)

	if winner != "" {
		t.Errorf("没有剧本时应该返回空字符串, 实际是 %s", winner)
	}
}

// ==================== 辅助函数 ====================

func containsString(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
