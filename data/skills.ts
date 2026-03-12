import { ActionDefinition } from '../types/Logic';
import { SKILLS_DATA } from './source/skills';

export const SKILLS_DB: Record<string, ActionDefinition> = SKILLS_DATA as unknown as Record<string, ActionDefinition>;
