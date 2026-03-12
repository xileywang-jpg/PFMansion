/**
 * 统一数据聚合入口
 * 
 * 自动聚合所有主题的数据
 */

import { CHARACTERS_DATA as original_characters } from './original/characters/original';
import { TILES_DATA as original_tiles } from './original/tiles/original';
import { ITEMS_DATA as original_items } from './original/items/original';
import { EVENTS_DATA as original_events } from './original/events/original';
import { OMENS_DATA as original_omens } from './original/omens/original';
import { SCENARIOS_DATA as original_scenarios } from './original/scenarios/original';
import { SKILL_TREES as original_skillTrees } from './original/skillTrees/original';
import { SKILLS_DATA as original_skills } from './original/skills/original';

import { CHARACTERS_DATA as volantis_characters } from './volantis/characters/original';
import { TILES_DATA as volantis_tiles } from './volantis/tiles/original';
import { ITEMS_DATA as volantis_items } from './volantis/items/original';
import { EVENTS_DATA as volantis_events } from './volantis/events/original';
import { OMENS_DATA as volantis_omens } from './volantis/omens/original';
import { SCENARIOS_DATA as volantis_scenarios } from './volantis/scenarios/original';

// === 按主题聚合 ===

// 原始主题
export const ORIGINAL_DATA = {
  characters: original_characters,
  tiles: original_tiles,
  items: original_items,
  events: original_events,
  omens: original_omens,
  scenarios: original_scenarios,
  skillTrees: original_skillTrees,
  skills: original_skills
};

// 翁法罗斯主题
export const VOLANTIS_DATA = {
  characters: volantis_characters,
  tiles: volantis_tiles,
  items: volantis_items,
  events: volantis_events,
  omens: volantis_omens,
  scenarios: volantis_scenarios
};

// === 获取指定主题的数据 ===

export function getThemeData(themeId: string) {
  switch (themeId) {
    case 'volantis':
      return VOLANTIS_DATA;
    case 'original':
    default:
      return ORIGINAL_DATA;
  }
}

// === 聚合所有主题（默认全部加载）===

export const CHARACTERS_DATA = [
  ...original_characters,
  ...volantis_characters
];

export const TILES_DATA = [
  ...original_tiles,
  ...volantis_tiles
];

export const ITEMS_DATA = {
  ...original_items,
  ...volantis_items
};

export const EVENTS_DATA = {
  ...original_events,
  ...volantis_events
};

export const OMENS_DATA = {
  ...original_omens,
  ...volantis_omens
};

export const SCENARIOS_DATA = {
  ...original_scenarios,
  ...volantis_scenarios
};

export const SKILL_TREES = [
  ...original_skillTrees
];

export const SKILLS_DATA = {
  ...original_skills
};

// === 主题配置 ===

export const THEMES = [
  { id: 'original', name: '原版', description: '经典山屋惊魂', primaryColor: '#8B4513' },
  { id: 'volantis', name: '翁法罗斯', description: '崩坏星穹铁道 - 永恒之地', primaryColor: '#FFD700' }
];

export function getThemeIds(): string[] {
  return THEMES.map(t => t.id);
}

export function getThemeById(id: string) {
  return THEMES.find(t => t.id === id);
}

export function isThemeEnabled(id: string): boolean {
  return THEMES.some(t => t.id === id);
}
