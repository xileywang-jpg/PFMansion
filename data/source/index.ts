/**
 * 统一数据聚合入口
 * 
 * 自动聚合所有主题的数据
 * 由 scripts/generateDataIndex.js 自动生成
 */

import { CHARACTERS_DATA as original_characters } from './characters';
import { TILES_DATA as original_tiles } from './tiles';
import { ITEMS_DATA as original_items } from './items';
import { EVENTS_DATA as original_events } from './events';
import { OMENS_DATA as original_omens } from './omens';
import { SCENARIOS_DATA as original_scenarios } from './scenarios';
import { SKILL_TREES as original_skillTrees } from './skillTrees';
import { SKILLS_DATA as original_skills } from './skills';

// === 聚合所有主题 ===

export const CHARACTERS_DATA = [
  ...original_characters
];

export const TILES_DATA = [
  ...original_tiles
];

export const ITEMS_DATA = {
  ...original_items
};

export const EVENTS_DATA = {
  ...original_events
};

export const OMENS_DATA = {
  ...original_omens
};

export const SCENARIOS_DATA = {
  ...original_scenarios
};

export const SKILL_TREES = [
  ...original_skillTrees
];

export const SKILLS_DATA = {
  ...original_skills
};

// === 主题配置 ===

export const THEMES = [
  { id: 'original', name: 'Original', description: '原版' },
  { id: 'volantis', name: 'Volantis', description: '翁法罗斯' }
];

// === 便捷访问 ===

export function getThemeIds(): string[] {
  return THEMES.map(t => t.id);
}

export function getThemeById(id: string) {
  return THEMES.find(t => t.id === id);
}
