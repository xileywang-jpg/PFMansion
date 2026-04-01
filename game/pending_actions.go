package game

func clonePendingActionData(data map[string]interface{}) map[string]interface{} {
	if data == nil {
		return nil
	}
	clonedData := map[string]interface{}{}
	for key, value := range data {
		clonedData[key] = value
	}
	return clonedData
}

func extractPendingActionString(data map[string]interface{}, keys ...string) string {
	for _, key := range keys {
		if value, ok := data[key].(string); ok && value != "" {
			return value
		}
	}
	return ""
}

func extractPendingActionInt(data map[string]interface{}, keys ...string) int {
	for _, key := range keys {
		if value, ok := intValueFromPendingData(data[key]); ok {
			return value
		}
	}
	return 0
}

func extractPendingActionEffects(data map[string]interface{}, key string) []Effect {
	if effects, ok := data[key].([]Effect); ok {
		return effects
	}
	return nil
}

func NewPendingAction(actionType PendingActionType, target, message string, data map[string]interface{}) *PendingAction {
	clonedData := clonePendingActionData(data)
	return &PendingAction{
		Type:           actionType,
		Target:         target,
		Message:        message,
		Data:           clonedData,
		Attribute:      extractPendingActionString(clonedData, "attribute"),
		Difficulty:     extractPendingActionInt(clonedData, "difficulty"),
		EventID:        extractPendingActionString(clonedData, "eventId", "eventID"),
		Continuation:   clonePendingActionData(mapValueAsMap(clonedData, "continuation")),
		SuccessEffects: extractPendingActionEffects(clonedData, "successEffects"),
		FailureEffects: extractPendingActionEffects(clonedData, "failureEffects"),
	}
}

func NewPendingAttributeCheck(target, attribute string, difficulty int, extraData map[string]interface{}) *PendingAction {
	data := map[string]interface{}{
		"attribute":  attribute,
		"difficulty": difficulty,
	}
	for key, value := range extraData {
		data[key] = value
	}
	return NewPendingAction(PendingActionTypeAttributeCheck, target, "", data)
}

func NewPendingTileAttributeCheck(target, attribute string, difficulty int, successEffects, failureEffects []Effect, message string) *PendingAction {
	return NewPendingAction(PendingActionTypeTileAttributeCheck, target, message, map[string]interface{}{
		"attribute":      attribute,
		"difficulty":     difficulty,
		"successEffects": successEffects,
		"failureEffects": failureEffects,
	})
}

func NewPendingChoice(target string, extraData map[string]interface{}) *PendingAction {
	data := map[string]interface{}{}
	for key, value := range extraData {
		data[key] = value
	}
	return NewPendingAction(PendingActionTypeChoice, target, "", data)
}

func mapValueAsMap(data map[string]interface{}, key string) map[string]interface{} {
	if value, ok := data[key].(map[string]interface{}); ok {
		return value
	}
	return nil
}

func (p *PendingAction) ensureData() map[string]interface{} {
	if p.Data == nil {
		p.Data = map[string]interface{}{}
	}
	return p.Data
}

func (p *PendingAction) AttributeName() string {
	if p == nil {
		return ""
	}
	if p.Attribute != "" {
		return p.Attribute
	}
	return extractPendingActionString(p.Data, "attribute")
}

func (p *PendingAction) DifficultyValue(defaultValue int) int {
	if p == nil {
		return defaultValue
	}
	if p.Difficulty != 0 {
		return p.Difficulty
	}
	if value := extractPendingActionInt(p.Data, "difficulty"); value != 0 {
		return value
	}
	return defaultValue
}

func (p *PendingAction) EventIDValue() string {
	if p == nil {
		return ""
	}
	if p.EventID != "" {
		return p.EventID
	}
	return extractPendingActionString(p.Data, "eventId", "eventID")
}

func (p *PendingAction) ContinuationData() map[string]interface{} {
	if p == nil {
		return nil
	}
	if p.Continuation != nil {
		return p.Continuation
	}
	return mapValueAsMap(p.Data, "continuation")
}

func (p *PendingAction) SetContinuation(continuation map[string]interface{}) {
	if p == nil || continuation == nil {
		return
	}
	p.Continuation = clonePendingActionData(continuation)
	p.ensureData()["continuation"] = clonePendingActionData(continuation)
}

func (p *PendingAction) SuccessEffectList() []Effect {
	if p == nil {
		return nil
	}
	if len(p.SuccessEffects) > 0 {
		return p.SuccessEffects
	}
	return extractPendingActionEffects(p.Data, "successEffects")
}

func (p *PendingAction) FailureEffectList() []Effect {
	if p == nil {
		return nil
	}
	if len(p.FailureEffects) > 0 {
		return p.FailureEffects
	}
	return extractPendingActionEffects(p.Data, "failureEffects")
}
