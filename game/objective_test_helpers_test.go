package game

func buildTestObjective(name, description, objectiveType string, turns int, params map[string]interface{}) *Objective {
	objectiveParams := map[string]interface{}{}
	if turns > 0 {
		objectiveParams["turns"] = turns
	}
	for key, value := range params {
		objectiveParams[key] = value
	}
	if _, ok := objectiveParams["eventType"]; !ok {
		if eventType := defaultObjectiveEventTypeForType(objectiveType); eventType != "" {
			objectiveParams["eventType"] = eventType
		}
	}
	if _, ok := objectiveParams["required"]; !ok {
		eventType, _ := objectiveParams["eventType"].(string)
		target, _ := objectiveParams["target"].(string)
		switch {
		case eventType == "TURNS_SURVIVED" && turns > 0:
			objectiveParams["required"] = turns
		case eventType == "PLAYER_DEATH" && (target == "ALL_HEROES" || target == "ALL_ENEMIES"):
			// 动态人数 required 由运行时推导。
		default:
			objectiveParams["required"] = 1
		}
	}
	return &Objective{
		Name:        name,
		Description: description,
		Type:        objectiveType,
		Params:      objectiveParams,
	}
}
