package game

import "testing"

func TestGetSkillNodeGrant_ReturnsStructuredEffects(t *testing.T) {
	grant := GetSkillNodeGrant("node_runner")
	if grant == nil {
		t.Fatal("node_runner 的技能节点增益不应为空")
	}
	if len(grant.GrantsEffects) != 1 {
		t.Fatalf("node_runner 应包含 1 条结构化增益, 实际为 %d", len(grant.GrantsEffects))
	}
	effect := grant.GrantsEffects[0]
	if effect.Type != "MODIFY_ATTRIBUTE" || effect.Stat != "speed" || effect.Amount != 1 {
		t.Fatalf("node_runner 结构化增益错误: %#v", effect)
	}
}

func TestUnlockSkillNode_AppliesStructuredAttributeGrant(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)
	player := gm.Rooms[roomID].GameState.FullState.Players["player_1"]
	before := player.Character.Attributes["speed"]

	if err := gm.UnlockSkillNode(roomID, "player_1", "node_runner"); err != nil {
		t.Fatalf("UnlockSkillNode(node_runner) 失败: %v", err)
	}

	after := player.Character.Attributes["speed"]
	if after.Current != before.Current+1 || after.Max != before.Max+1 {
		t.Fatalf("node_runner 应提升 speed current/max 各 1, before=%+v after=%+v", before, after)
	}
}

func TestUnlockSkillNode_AppliesStructuredBuffGrant(t *testing.T) {
	gm := setupTestGameManager()
	roomID := createTestRoom(gm)
	player := gm.Rooms[roomID].GameState.FullState.Players["player_1"]

	if err := gm.UnlockSkillNode(roomID, "player_1", "node_exorcist"); err != nil {
		t.Fatalf("UnlockSkillNode(node_exorcist) 失败: %v", err)
	}

	found := false
	for _, buff := range player.Buffs {
		if buff == "灵体伤害 x2" {
			found = true
			break
		}
	}
	if !found {
		t.Fatal("node_exorcist 应通过结构化增益添加 buff: 灵体伤害 x2")
	}
}
