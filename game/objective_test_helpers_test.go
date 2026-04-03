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
		if eventType := objectiveEventType(&Objective{Type: objectiveType}); eventType != "" {
			objectiveParams["eventType"] = eventType
		}
	}
	return &Objective{
		Name:        name,
		Description: description,
		Type:        objectiveType,
		Params:      objectiveParams,
	}
}
