
import { CharacterDef, TileDef, CardDef, AttributeName, FloorLevel, Direction, Item, DirectionalEdges } from './types';
import { EVENTS_DB } from './data/events';
import { CHARACTERS_DATA, TILES_DATA, ITEMS_DATA, OMENS_DATA, SKILL_TREES, SCENARIOS_DATA, getAllThemeData } from './data/source';

// --- 运行时获取主题数据 ---
// 在浏览器环境中，从 localStorage 读取主题设置
let cachedThemeData: ReturnType<typeof getAllThemeData> | null = null;

function getRuntimeThemeData() {
  // 服务端渲染或 Node 环境
  if (typeof window === 'undefined') {
    return null;
  }
  
  // 每次调用时都读取最新的 localStorage，确保获取最新设置
  const themeId = localStorage.getItem('gameTheme') || 'original';
  cachedThemeData = getAllThemeData(themeId);
  return cachedThemeData;
}

// 获取当前主题的 Characters
export function getCharactersForGame(): CharacterDef[] {
  try {
    const themeData = getRuntimeThemeData();
    console.log('[getCharactersForGame] themeData:', themeData);
    console.log('[getCharactersForGame] themeData.characters:', themeData?.characters);
    if (themeData && themeData.characters && Array.isArray(themeData.characters)) {
      console.log('[getCharactersForGame] Loading characters for theme:', localStorage.getItem('gameTheme'));
      const result = hydrateCharacters(themeData.characters);
      console.log('[getCharactersForGame] hydrated characters count:', result.length);
      return result;
    }
  } catch (e) {
    console.error('[getCharactersForGame] error:', e);
  }
  // 后备：使用默认数据
  console.log('[getCharactersForGame] Using fallback characters (original)');
  return MOCK_CHARACTERS;
}

// 获取当前主题的 Tiles
export function getTilesForGame(): TileDef[] {
  try {
    const themeData = getRuntimeThemeData();
    if (themeData && themeData.tiles) {
      return hydrateTiles(themeData.tiles);
    }
  } catch (e) {
    console.error('getTilesForGame error:', e);
  }
  // 后备：使用默认数据
  return TILE_DECK;
}

// 获取当前主题的 Items
export function getItemsForGame(): any {
  try {
    const themeData = getRuntimeThemeData();
    if (themeData && themeData.items) {
      return themeData.items;
    }
  } catch (e) {
    console.error('getItemsForGame error:', e);
  }
  // 后备：使用默认数据
  return MOCK_ITEMS_DECK;
}

// 获取当前主题的 Events
export function getEventsForGame(): any {
  try {
    const themeData = getRuntimeThemeData();
    if (themeData && themeData.events) {
      return themeData.events;
    }
  } catch (e) {
    console.error('getEventsForGame error:', e);
  }
  // 后备：使用默认数据
  return MOCK_EVENTS_DECK;
}

// 获取当前主题的 Omens
export function getOmensForGame(): any {
  try {
    const themeData = getRuntimeThemeData();
    if (themeData && themeData.omens) {
      return themeData.omens;
    }
  } catch (e) {
    console.error('getOmensForGame error:', e);
  }
  // 后备：使用默认数据
  return MOCK_OMENS_DECK;
}

// 获取起始 Tile（目前使用默认）
export function getStartingTileForGame(): TileDef {
  return STARTING_TILE;
}

// --- Data Hydration Helpers ---

const createStat = (values: number[], startIndex: number) => ({
  values,
  index: startIndex,
  current: values[startIndex],
  base: values[startIndex],
  max: values[values.length - 1],
  floor: 0,
});

const hydrateCharacters = (json: any[]): CharacterDef[] => {
  return json.map(c => ({
    ...c,
    attributes: {
      [AttributeName.Might]: createStat(c.attributes.might.values, c.attributes.might.startIndex),
      [AttributeName.Speed]: createStat(c.attributes.speed.values, c.attributes.speed.startIndex),
      [AttributeName.Sanity]: createStat(c.attributes.sanity.values, c.attributes.sanity.startIndex),
      [AttributeName.Knowledge]: createStat(c.attributes.knowledge.values, c.attributes.knowledge.startIndex),
    }
  }));
};

const hydrateTiles = (json: any[]): TileDef[] => {
  return json.map(t => {
    // Map JSON edge strings to Types
    const edges: DirectionalEdges = {
        [Direction.North]: t.edges.N,
        [Direction.East]: t.edges.E,
        [Direction.South]: t.edges.S,
        [Direction.West]: t.edges.W
    };
    
    // Map floor strings to Enums
    const floors = t.floors.map((f: string) => {
        if(f === 'GROUND') return FloorLevel.Ground;
        if(f === 'BASEMENT') return FloorLevel.Basement;
        if(f === 'UPPER') return FloorLevel.Upper;
        return FloorLevel.Ground;
    });

    return {
        ...t,
        edges,
        floors
    };
  });
};

// --- Exported Constants ---

export const MOCK_CHARACTERS: CharacterDef[] = hydrateCharacters(CHARACTERS_DATA);

export const PLAYER_COLORS = [
  '#6366f1', // Indigo
  '#ef4444', // Red
  '#10b981', // Emerald
  '#f59e0b', // Amber
];

// Special starter tile needs to be extracted or defined.
export const STARTING_TILE: TileDef = {
  id: 'tile_entry_hall',
  name: '中央大厅',
  description: '大厦的主入口。沉重的大门在你身后锁上了。',
  type: 'room',
  floors: [FloorLevel.Ground],
  edges: {
      [Direction.North]: 'OPEN',
      [Direction.East]: 'OPEN',
      [Direction.West]: 'OPEN',
      [Direction.South]: 'WALL'
  },
  icon: 'DoorOpen',
  effects: [
    { type: 'buff', text: '避风港：在这里进行理智检定时 +1。' }
  ]
};

export const TILE_DECK: TileDef[] = hydrateTiles(TILES_DATA);

export const MOCK_EVENTS_DECK: CardDef[] = Object.values(EVENTS_DB);
export const MOCK_ITEMS_DECK: Item[] = Object.values(ITEMS_DATA) as unknown as Item[];
export const MOCK_OMENS_DECK: Item[] = Object.values(OMENS_DATA) as unknown as Item[];
