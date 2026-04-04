import { GameDataBundle } from '../src/services/gameData';

type ThemeKey = 'original' | 'volantis';
type ThemedCollectionKey = 'items' | 'rewardItems' | 'omens' | 'skills' | 'events' | 'skillTrees';

const getThemeKey = (theme?: string): ThemeKey => theme === 'volantis' ? 'volantis' : 'original';

const inferEntryTheme = (entry: any): ThemeKey => {
  if (entry?.theme === 'volantis') {
    return 'volantis';
  }
  return String(entry?.id || '').startsWith('vol_') ? 'volantis' : 'original';
};

function getThemedCollection(data: GameDataBundle | null, key: ThemedCollectionKey, theme?: string) {
  const themeKey = getThemeKey(theme);
  const themedBuckets = data?.themed?.[key];
  if (themedBuckets) {
    if (theme) {
      return themedBuckets[themeKey] ?? [];
    }
    return [...(themedBuckets.original ?? []), ...(themedBuckets.volantis ?? [])];
  }

  const flatCollection = data?.[key];
  if (!Array.isArray(flatCollection)) {
    return [];
  }
  if (!theme) {
    return flatCollection;
  }
  return flatCollection.filter(entry => inferEntryTheme(entry) === themeKey);
}

function findInCollection(data: GameDataBundle | null, key: ThemedCollectionKey, id: string, theme?: string) {
  const currentThemeCollection = getThemedCollection(data, key, theme);
  const found = currentThemeCollection.find(entry => entry.id === id);
  if (found) {
    return found;
  }

  if (theme) {
    return getThemedCollection(data, key).find(entry => entry.id === id);
  }

  return undefined;
}

export function getAllItems(data: GameDataBundle | null, theme?: string) {
  return getThemedCollection(data, 'items', theme);
}

export function getItemById(data: GameDataBundle | null, id: string, theme?: string) {
  return findInCollection(data, 'items', id, theme);
}

export function getAllOmens(data: GameDataBundle | null, theme?: string) {
  return getThemedCollection(data, 'omens', theme);
}

export function getOmenById(data: GameDataBundle | null, id: string, theme?: string) {
  return findInCollection(data, 'omens', id, theme);
}

export function getAllEvents(data: GameDataBundle | null, theme?: string) {
  return getThemedCollection(data, 'events', theme);
}

export function getEventById(data: GameDataBundle | null, id: string, theme?: string) {
  return findInCollection(data, 'events', id, theme);
}

export function getAllSkills(data: GameDataBundle | null, theme?: string) {
  return getThemedCollection(data, 'skills', theme);
}

export function getSkillById(data: GameDataBundle | null, id: string, theme?: string) {
  return findInCollection(data, 'skills', id, theme);
}

export function getSkillTrees(data: GameDataBundle | null, theme?: string) {
  return getThemedCollection(data, 'skillTrees', theme);
}

export function getSkillNodeById(data: GameDataBundle | null, nodeId: string, theme?: string) {
  for (const tree of getSkillTrees(data, theme)) {
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