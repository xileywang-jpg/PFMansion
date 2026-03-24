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
		Name: "Test Haunt",
		HeroObjective: &Objective{
			Name:        "Survive",
			Description: "生存 10 回合",
			Type:        "SURVIVE",
			Turns:       10,
		},
		TraitorObjective: &Objective{
			Name:        "Eliminate",
			Description: "消灭所有英雄",
			Type:        "ELIMINATE",
			Turns:       10,
		},
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
		Name: "Reach the Exit",
		TraitorObjective: &Objective{
			Name:        "Reach Exit",
			Description: "到达出口",
			Type:        "REACH",
			Turns:       8,
			Target:      "tile_exit",
		},
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
		Name: "Block the Exit",
		HeroObjective: &Objective{
			Name:        "Block Exit",
			Description: "阻止叛徒到达出口",
			Type:        "REACH",
			Turns:       8,
			Target:      "tile_exit",
		},
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
		Name: "Collect the Key",
		TraitorObjective: &Objective{
			Name:        "Collect Key",
			Description: "收集钥匙",
			Type:        "COLLECT",
			Turns:       8,
			Target:      "item_key",
		},
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

func TestUpdateObjectives_TurnsSurvived(t *testing.T) {
	gm := &GameManager{Rooms: make(map[string]*Room)}
	roomID := createTestRoomForLogic(gm)
	room := gm.Rooms[roomID]

	room.GameState.FullState.CurrentScenario = &Scenario{
		Name: "Survive",
		HeroObjective: &Objective{
			Name:        "Survive",
			Description: "生存 10 回合",
			Type:        "SURVIVE",
			Turns:       10,
		},
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

// ==================== CheckVictory 测试 ====================

func TestCheckVictory_TraitorWins_AllHeroesDead(t *testing.T) {
	gm := &GameManager{Rooms: make(map[string]*Room)}
	roomID := createTestRoomForLogic(gm)
	room := gm.Rooms[roomID]

	room.GameState.FullState.Phase = GamePhaseHaunt
	room.GameState.FullState.Players["player_1"].IsDead = false
	room.GameState.FullState.Players["player_1"].Team = "TRAITOR"
	room.GameState.FullState.Players["player_2"].IsDead = true  // 英雄死亡
	room.GameState.FullState.Players["player_2"].Team = "HERO"
	room.GameState.FullState.CurrentScenario = &Scenario{
		Name: "Test",
		TraitorObjective: &Objective{Name: "T", Type: "ELIMINATE", Turns: 10},
		HeroObjective: &Objective{Name: "H", Type: "SURVIVE", Turns: 10},
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
	room.GameState.FullState.Players["player_1"].IsDead = true   // 叛徒死亡
	room.GameState.FullState.Players["player_1"].Team = "TRAITOR"
	room.GameState.FullState.Players["player_2"].IsDead = false
	room.GameState.FullState.Players["player_2"].Team = "HERO"
	room.GameState.FullState.CurrentScenario = &Scenario{
		Name: "Test",
		TraitorObjective: &Objective{Name: "T", Type: "ELIMINATE", Turns: 10},
		HeroObjective: &Objective{Name: "H", Type: "SURVIVE", Turns: 10},
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

	room.GameState.FullState.Phase = GamePhaseExploration  // 不是作祟阶段

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
		Name: "Test Haunt",
		TraitorObjective: &Objective{
			Name:        "Default",
			Description: "默认目标",
			Type:        "DEFAULT",
			Turns:       10,  // 10 回合限制
		},
		HeroObjective: &Objective{
			Name:        "Default",
			Description: "默认目标",
			Type:        "SURVIVE",
			Turns:       10,
		},
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
		Name: "Test Haunt",
		TraitorObjective: &Objective{
			Name:        "Default",
			Description: "默认目标",
			Type:        "ELIMINATE",  // 需要击杀英雄
			Turns:       8,  // 8 回合
		},
		HeroObjective: &Objective{
			Name:        "Survive",
			Description: "生存",
			Type:        "SURVIVE",
			Turns:       10,  // 10 回合
		},
	}

	winner := gm.CheckVictory(roomID)

	if winner != "HERO" {
		t.Errorf("应该返回 HERO (叛徒未达成目标), 实际是 %s", winner)
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
			Name: "Test",
			TraitorObjective: &Objective{Name: "T", Type: "ELIMINATE", Turns: 10},
			HeroObjective: &Objective{Name: "H", Type: "SURVIVE", Turns: 10},
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
			"player_1": {IsDead: true, Team: "TRAITOR"},  // 叛徒死亡
			"player_2": {IsDead: false, Team: "HERO"},
		},
		CurrentScenario: &Scenario{
			Name: "Test",
			TraitorObjective: &Objective{Name: "T", Type: "ELIMINATE", Turns: 10},
			HeroObjective: &Objective{Name: "H", Type: "SURVIVE", Turns: 10},
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
		Phase:          GamePhaseHaunt,
		Players:        map[string]*GamePlayer{},
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
