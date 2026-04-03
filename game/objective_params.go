package game

import (
	"strconv"
	"strings"
)

var objectiveEventTypeFallback = map[string]string{
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

	switch obj.Type {
	case "SURVIVE":
		if turns := objectiveTurnLimit(obj); turns > 0 {
			return turns
		}
		return 1
	case "CUSTOM", "USE_OMEN", "EXPLORE":
		if turns := objectiveTurnLimit(obj); turns > 0 {
			return turns
		}
		return 1
	default:
		return 1
	}
}

func objectiveRuntimeRequiredProgress(state *GameStateFull, obj *Objective) int {
	required := objectiveRequiredProgress(obj)
	if obj == nil || state == nil || required > 1 {
		return required
	}

	switch obj.Type {
	case "ELIMINATE", "CONVERT":
		target := objectiveTarget(obj)
		if target != "ALL_HEROES" && target != "ALL_ENEMIES" {
			return required
		}

		heroCount := 0
		for _, player := range state.Players {
			if player.Team == "HERO" {
				heroCount++
			}
		}
		if heroCount > 0 {
			return heroCount
		}
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

	if fallback, ok := objectiveEventTypeFallback[obj.Type]; ok {
		return fallback
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
