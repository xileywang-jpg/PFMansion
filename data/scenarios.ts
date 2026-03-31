import { Scenario } from '../types';
import { SCENARIOS_DATA } from './generated/runtimeScenarios';

export const SCENARIOS_DB: Record<string, Scenario> = SCENARIOS_DATA as unknown as Record<string, Scenario>;
