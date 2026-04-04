package game

import (
	"strconv"
	"strings"
)

var objectiveDefaultEventTypeByType = map[string]string{
	"REACH":     "TILE_REACHED",
	"OPEN_GATE": "TILE_REACHED",
	"COLLECT":   "ITEM_COLLECTED",
	"SURVIVE":   "TURNS_SURVIVED",
	"CUSTOM":    "RITUAL_COMPLETED",
	"USE_OMEN":  "OMEN_USED",
	"EXPLORE":   "ROOM_EXPLORED",
	"ELIMINATE": "PLAYER_DEATH",
	"CONVERT":   "PLAYER_DEATH",
	"DEFAULT":   "",
}

type ObjectiveEvent struct {
	Type      string
	PlayerID  string
	TileID    string
	ItemID    string
	CustomID  string
	Turns     int
	OmenCount int
	Count     int
}

func defaultObjectiveEventTypeForType(objectiveType string) string {
	normalized := strings.ToUpper(strings.TrimSpace(objectiveType))
	if fallback, ok := objectiveDefaultEventTypeByType[normalized]; ok {
		return fallback
	}
	return ""
}

func NewObjectivePlayerDeathEvent(playerID string) ObjectiveEvent {
	return ObjectiveEvent{Type: "PLAYER_DEATH", PlayerID: strings.TrimSpace(playerID)}
}

func NewObjectiveTileReachedEvent(playerID, tileID string) ObjectiveEvent {
	return ObjectiveEvent{Type: "TILE_REACHED", PlayerID: strings.TrimSpace(playerID), TileID: strings.TrimSpace(tileID)}
}

func NewObjectiveItemCollectedEvent(playerID, itemID string) ObjectiveEvent {
	return ObjectiveEvent{Type: "ITEM_COLLECTED", PlayerID: strings.TrimSpace(playerID), ItemID: strings.TrimSpace(itemID)}
}

func NewObjectiveRitualCompletedEvent(customID string) ObjectiveEvent {
	return ObjectiveEvent{Type: "RITUAL_COMPLETED", CustomID: strings.TrimSpace(customID)}
}

func NewObjectiveTurnsSurvivedEvent(turns int) ObjectiveEvent {
	return ObjectiveEvent{Type: "TURNS_SURVIVED", Turns: turns}
}

func NewObjectiveOmenUsedEvent(omenCount int) ObjectiveEvent {
	return ObjectiveEvent{Type: "OMEN_USED", OmenCount: omenCount}
}

func NewObjectiveRoomExploredEvent(playerID string, count int) ObjectiveEvent {
	return ObjectiveEvent{Type: "ROOM_EXPLORED", PlayerID: strings.TrimSpace(playerID), Count: count}
}

func objectiveEventFromLegacy(eventType string, data map[string]interface{}) ObjectiveEvent {
	event := ObjectiveEvent{
		Type:     strings.ToUpper(strings.TrimSpace(eventType)),
		PlayerID: objectiveEventString(data, "playerId"),
		CustomID: objectiveEventString(data, "customId"),
	}

	switch event.Type {
	case "TILE_REACHED":
		event.TileID = objectiveEventString(data, "tileId")
	case "ITEM_COLLECTED":
		event.ItemID = objectiveEventString(data, "itemId")
	case "TURNS_SURVIVED":
		if turns, ok := objectiveEventInt(data, "turns"); ok {
			event.Turns = turns
		}
	case "OMEN_USED":
		if omenCount, ok := objectiveEventInt(data, "omenCount"); ok {
			event.OmenCount = omenCount
		}
	case "ROOM_EXPLORED":
		if count, ok := objectiveEventInt(data, "count"); ok {
			event.Count = count
		}
	}

	return event
}

func objectiveParamString(obj *Objective, key string) string {
	if obj == nil || obj.Params == nil {
		return ""
	}
	raw, ok := obj.Params[key]
	if !ok {
		return ""
	}
	if v, ok := raw.(string); ok && v != "" {
		return v
	}
	return ""
}

func objectiveParamInt(obj *Objective, key string) int {
	if obj == nil || obj.Params == nil {
		return 0
	}
	raw, ok := obj.Params[key]
	if !ok {
		return 0
	}

	switch v := raw.(type) {
	case int:
		return v
	case int32:
		return int(v)
	case int64:
		return int(v)
	case float64:
		return int(v)
	case float32:
		return int(v)
	case string:
		parsed, err := strconv.Atoi(v)
		if err == nil {
			return parsed
		}
	}

	return 0
}

func objectiveTarget(obj *Objective) string {
	if obj == nil {
		return ""
	}
	return objectiveParamString(obj, "target")
}

func objectiveCustomID(obj *Objective) string {
	if obj == nil {
		return ""
	}
	return objectiveParamString(obj, "customId")
}

func objectiveTurnLimit(obj *Objective) int {
	if obj == nil {
		return 0
	}
	turns := objectiveParamInt(obj, "turns")
	if turns > 0 {
		return turns
	}
	return 0
}

func objectiveRequiredProgress(obj *Objective) int {
	if obj == nil {
		return 1
	}

	if required := objectiveParamInt(obj, "required"); required > 0 {
		return required
	}

	return 1
}

func objectivePlayerDeathTargetTeam(isHero bool, target string) string {
	switch strings.ToUpper(strings.TrimSpace(target)) {
	case "ALL_HEROES":
		return "HERO"
	case "ALL_ENEMIES":
		if isHero {
			return "TRAITOR"
		}
		return "HERO"
	default:
		return ""
	}
}

func objectiveAllowsDynamicRequired(obj *Objective) bool {
	if obj == nil || objectiveEventType(obj) != "PLAYER_DEATH" {
		return false
	}

	target := objectiveTarget(obj)
	return target == "ALL_HEROES" || target == "ALL_ENEMIES"
}

func objectiveCountPlayersByTeam(state *GameStateFull, team string) int {
	if state == nil || strings.TrimSpace(team) == "" {
		return 0
	}

	count := 0
	for _, player := range state.Players {
		if player.Team == team {
			count++
		}
	}
	return count
}

func objectiveRuntimeRequiredProgress(state *GameStateFull, obj *Objective, isHero bool) int {
	required := objectiveRequiredProgress(obj)
	if obj == nil || state == nil || required > 1 {
		return required
	}

	if objectiveEventType(obj) != "PLAYER_DEATH" {
		return required
	}

	targetTeam := objectivePlayerDeathTargetTeam(isHero, objectiveTarget(obj))
	if targetTeam == "" {
		return required
	}

	if playerCount := objectiveCountPlayersByTeam(state, targetTeam); playerCount > 0 {
		return playerCount
	}

	return required
}

func objectiveEventType(obj *Objective) string {
	if obj == nil {
		return ""
	}

	if eventType := objectiveParamString(obj, "eventType"); eventType != "" {
		return strings.ToUpper(strings.TrimSpace(eventType))
	}

	return ""
}

func isSupportedObjectiveEventType(eventType string) bool {
	normalized := strings.ToUpper(strings.TrimSpace(eventType))
	if normalized == "" {
		return false
	}

	switch normalized {
	case "PLAYER_DEATH", "TILE_REACHED", "ITEM_COLLECTED", "RITUAL_COMPLETED", "TURNS_SURVIVED", "OMEN_USED", "ROOM_EXPLORED":
		return true
	default:
		return false
	}
}

func objectiveEventString(data map[string]interface{}, key string) string {
	if data == nil {
		return ""
	}
	raw, ok := data[key]
	if !ok {
		return ""
	}
	v, ok := raw.(string)
	if !ok {
		return ""
	}
	return strings.TrimSpace(v)
}

func objectiveEventInt(data map[string]interface{}, key string) (int, bool) {
	if data == nil {
		return 0, false
	}
	return intValueFromPendingData(data[key])
}

func objectiveEventPlayerID(data map[string]interface{}) string {
	return objectiveEventString(data, "playerId")
}

func objectiveEventTargetID(obj *Objective, event ObjectiveEvent) string {
	switch objectiveEventType(obj) {
	case "TILE_REACHED":
		return strings.TrimSpace(event.TileID)
	case "ITEM_COLLECTED":
		return strings.TrimSpace(event.ItemID)
	default:
		return ""
	}
}

func objectiveEventProgressValue(obj *Objective, event ObjectiveEvent) (int, bool) {
	switch objectiveEventType(obj) {
	case "TURNS_SURVIVED":
		return event.Turns, event.Turns > 0
	case "OMEN_USED":
		return event.OmenCount, event.OmenCount > 0
	case "ROOM_EXPLORED":
		return event.Count, event.Count > 0
	default:
		return 0, false
	}
}
