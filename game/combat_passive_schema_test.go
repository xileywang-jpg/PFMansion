package game

import "testing"

func TestApplySelfCombatModifiers_RespectsStatAndRole(t *testing.T) {
	gm := setupTestGameManager()
	player := &GamePlayer{
		Items: []Card{{
			ID:   "item_combat_focus",
			Type: "ITEM",
			PassiveEffects: []PassiveEffect{{
				Type:     "combat_buff",
				Modifier: 1,
				Stat:     "might",
				Trigger:  "ATTACK",
			}},
		}},
	}

	base := []int{1, 1}
	attackMight := gm.applySelfCombatModifiers(player, base, "might", "ATTACK")
	if attackMight[0] != 2 || attackMight[1] != 2 {
		t.Fatalf("ATTACK + might 条件应生效: %#v", attackMight)
	}

	defenseMight := gm.applySelfCombatModifiers(player, base, "might", "DEFENSE")
	if defenseMight[0] != 1 || defenseMight[1] != 1 {
		t.Fatalf("DEFENSE 角色不应触发 ATTACK 被动: %#v", defenseMight)
	}

	attackSpeed := gm.applySelfCombatModifiers(player, base, "speed", "ATTACK")
	if attackSpeed[0] != 1 || attackSpeed[1] != 1 {
		t.Fatalf("非匹配属性不应触发 combat_buff: %#v", attackSpeed)
	}
}

func TestApplyCombatModifiersToRolls_RespectsRoleForOpponentDebuff(t *testing.T) {
	gm := setupTestGameManager()
	player := &GamePlayer{
		Items: []Card{{
			ID:   "item_combat_debuff",
			Type: "ITEM",
			PassiveEffects: []PassiveEffect{{
				Type:     "combat_modifier",
				Modifier: -1,
				Trigger:  "DEFENSE",
			}},
		}},
	}

	base := []int{2, 2}
	asAttackerRole := gm.applyCombatModifiersToRolls(player, base, "might", "defender")
	if asAttackerRole[0] != 2 || asAttackerRole[1] != 2 {
		t.Fatalf("ATTACK 角色不应触发 DEFENSE combat_modifier: %#v", asAttackerRole)
	}

	asDefenderRole := gm.applyCombatModifiersToRolls(player, base, "might", "attacker")
	if asDefenderRole[0] != 1 || asDefenderRole[1] != 1 {
		t.Fatalf("DEFENSE 角色应触发 combat_modifier: %#v", asDefenderRole)
	}
}

func TestCalculatePassiveDamageBonus_RespectsRoleAndNPCTypes(t *testing.T) {
	gm := setupTestGameManager()
	player := &GamePlayer{
		Items: []Card{{
			ID:   "item_spear_of_light",
			Type: "WEAPON",
			PassiveEffects: []PassiveEffect{
				{Type: "combat_damage_bonus", Amount: 1, Trigger: "ATTACK"},
				{Type: "combat_damage_bonus", Amount: 2, Trigger: "ATTACK", NPCTypes: []string{"GHOST", "SPIRIT"}},
			},
		}},
	}

	if bonus := gm.calculatePassiveDamageBonus(player, "might", "ATTACK", &GameNPC{Type: NPCType_Ghost}); bonus != 3 {
		t.Fatalf("对幽灵攻击时应获得 3 点额外伤害, 实际是 %d", bonus)
	}
	if bonus := gm.calculatePassiveDamageBonus(player, "might", "ATTACK", &GameNPC{Type: NPCType_Zombie}); bonus != 1 {
		t.Fatalf("对非暗影生物攻击时应只获得 1 点通用额外伤害, 实际是 %d", bonus)
	}
	if bonus := gm.calculatePassiveDamageBonus(player, "might", "DEFENSE", &GameNPC{Type: NPCType_Ghost}); bonus != 0 {
		t.Fatalf("ATTACK 触发的额外伤害不应在 DEFENSE 角色生效, 实际是 %d", bonus)
	}
	if bonus := gm.calculatePassiveDamageBonus(player, "might", "ATTACK", nil); bonus != 1 {
		t.Fatalf("面向玩家的战斗中不应触发 npcTypes 过滤项, 实际是 %d", bonus)
	}
}
