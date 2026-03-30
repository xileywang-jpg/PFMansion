
import { CharacterDef, TileDef, AttributeName, FloorLevel, Direction, DirectionalEdges } from './types';
import { CHARACTERS_DATA, TILES_DATA } from './data/source';

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
