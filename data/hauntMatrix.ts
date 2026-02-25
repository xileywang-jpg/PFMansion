
import { SCENARIOS_DB } from './scenarios';

/**
 * Haunt Matrix: Omen Card + Room Tile = Scenario
 * 
 * This matrix maps the combination of a specific Omen card and the Room where it was found
 * to a specific Haunt Scenario ID.
 */

interface HauntMatrixEntry {
  omenId: string;
  tileId: string;
  scenarioId: string;
}

// Default fallback scenario if no specific combination is found
const DEFAULT_SCENARIO_ID = 'haunt_00';

// The Matrix Data
const HAUNT_MATRIX: HauntMatrixEntry[] = [
  // Example: Crystal Ball in Library -> Zombie Apocalypse
  { omenId: 'omen_crystal_ball', tileId: 'tile_library', scenarioId: 'haunt_01' },
  
  // Example: Girl in Mirror in Gymnasium -> Reflection Killer (Placeholder)
  { omenId: 'omen_girl', tileId: 'tile_gymnasium', scenarioId: 'haunt_00' },
  
  // Example: Skull in Chapel -> Whispering Walls
  { omenId: 'omen_skull', tileId: 'tile_chapel', scenarioId: 'haunt_02' },
  
  // Example: Dog in Conservatory -> The Beast Within
  { omenId: 'omen_dog', tileId: 'tile_conservatory', scenarioId: 'haunt_03' },
  
  // Add more combinations here...
];

export const getScenarioId = (omenId: string, tileDefId: string): string => {
  // 1. Try to find exact match
  const match = HAUNT_MATRIX.find(
    entry => entry.omenId === omenId && entry.tileId === tileDefId
  );

  if (match) {
    return match.scenarioId;
  }

  // 2. Fallback logic (optional: specific omens always trigger specific haunts regardless of room)
  // if (omenId === 'omen_ring') return 'haunt_02';

  // 3. Default
  return DEFAULT_SCENARIO_ID;
};
