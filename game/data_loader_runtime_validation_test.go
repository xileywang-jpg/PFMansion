package game

import "testing"

func TestRuntimeDataAuthoringValidation(t *testing.T) {
	if err := LoadData(); err != nil {
		t.Fatalf("runtime data authoring validation failed: %v", err)
	}
}
