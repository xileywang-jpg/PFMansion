package game

import "encoding/json"

type objectiveJSON struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Type        string                 `json:"type"`
	Params      map[string]interface{} `json:"params,omitempty"`
	Target      *json.RawMessage       `json:"target,omitempty"`
	Turns       *json.RawMessage       `json:"turns,omitempty"`
	CustomID    *json.RawMessage       `json:"customId,omitempty"`
}

func (obj *Objective) UnmarshalJSON(data []byte) error {
	var raw objectiveJSON
	if err := json.Unmarshal(data, &raw); err != nil {
		return err
	}

	obj.Name = raw.Name
	obj.Description = raw.Description
	obj.Type = raw.Type
	obj.Params = raw.Params
	obj.hasLegacyTarget = raw.Target != nil
	obj.hasLegacyTurns = raw.Turns != nil
	obj.hasLegacyCustomID = raw.CustomID != nil

	return nil
}

func objectiveUsesLegacyScenarioFields(obj *Objective) bool {
	if obj == nil {
		return false
	}
	return obj.hasLegacyTarget || obj.hasLegacyTurns || obj.hasLegacyCustomID
}
