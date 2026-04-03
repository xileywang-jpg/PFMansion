import { GameDataBundle } from '../src/services/gameData';

export function getAllItems(data: GameDataBundle | null) {
  return data?.items ?? [];
}

export function getItemById(data: GameDataBundle | null, id: string) {
  return data?.items?.find(item => item.id === id);
}

export function getAllOmens(data: GameDataBundle | null) {
  return data?.omens ?? [];
}

export function getOmenById(data: GameDataBundle | null, id: string) {
  return data?.omens?.find(omen => omen.id === id);
}

export function getAllEvents(data: GameDataBundle | null) {
  return data?.events ?? [];
}

export function getEventById(data: GameDataBundle | null, id: string) {
  return data?.events?.find(event => event.id === id);
}

export function getAllSkills(data: GameDataBundle | null) {
  return data?.skills ?? [];
}

export function getSkillById(data: GameDataBundle | null, id: string) {
  return data?.skills?.find(skill => skill.id === id);
}

export function getSkillTrees(data: GameDataBundle | null) {
  return data?.skillTrees ?? [];
}

export function getSkillNodeById(data: GameDataBundle | null, nodeId: string) {
  for (const tree of getSkillTrees(data)) {
    const found = tree?.nodes?.find((node: any) => node.id === nodeId);
    if (found) {
      return found;
    }
  }
  return undefined;
}

export function getScenarios(data: GameDataBundle | null) {
  return data?.scenarios ?? {};
}

export function getScenarioById(data: GameDataBundle | null, id: string) {
  return getScenarios(data)[id];
}

export function getTilesByTheme(data: GameDataBundle | null, theme: string = 'original') {
  const themeKey = theme === 'volantis' ? 'volantis' : 'original';
  return data?.tiles?.[themeKey] ?? [];
}

export function getTileById(data: GameDataBundle | null, id: string, theme?: string) {
  const autoTheme = theme || (id.startsWith('vol_') ? 'volantis' : 'original');
  const tiles = getTilesByTheme(data, autoTheme);
  const tile = tiles.find(entry => entry.id === id);
  if (tile) {
    return tile;
  }

  const fallbackTheme = autoTheme === 'volantis' ? 'original' : 'volantis';
  return getTilesByTheme(data, fallbackTheme).find(entry => entry.id === id);
}

export function getCharactersByTheme(data: GameDataBundle | null, theme: string = 'original') {
  const themeKey = theme === 'volantis' ? 'volantis' : 'original';
  return data?.characters?.[themeKey] ?? [];
}

export function getCharacterById(data: GameDataBundle | null, id: string, theme: string = 'original') {
  return getCharactersByTheme(data, theme).find(character => character.id === id);
}