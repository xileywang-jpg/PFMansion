import { HAUNT_MATRIX_DATA } from './generated/runtimeScenarios';

/**
 * Haunt Matrix: Omen Card + Room Tile = Scenario
 * 
 * This matrix maps the combination of a specific Omen card and the Room where it was found
 * to a specific Haunt Scenario ID.
 */

type ThemeId = keyof typeof HAUNT_MATRIX_DATA;

const DEFAULT_THEME: ThemeId = 'original';

const resolveTheme = (tileDefId: string): ThemeId => {
  return tileDefId.startsWith('vol_') ? 'volantis' : 'original';
};

export const getScenarioId = (omenId: string, tileDefId: string): string => {
  const theme = resolveTheme(tileDefId);
  const themeMatrix = HAUNT_MATRIX_DATA[theme] ?? HAUNT_MATRIX_DATA[DEFAULT_THEME];
  return themeMatrix[omenId] || themeMatrix[tileDefId] || themeMatrix.default || HAUNT_MATRIX_DATA[DEFAULT_THEME].default;
};
