
import { CharacterDef, TileDef, CardDef, AttributeName, FloorLevel, Direction, Item, DirectionalEdges } from './types';
import { ITEMS_DB } from './data/items';
import { EVENTS_DB } from './data/events';

const createStat = (values: number[], startIndex: number) => ({
  values,
  index: startIndex,
  current: values[startIndex],
  base: values[startIndex],
  max: values[values.length - 1],
  floor: 0,
});

const createEdges = (openDirs: Direction[]): DirectionalEdges => {
  return {
    [Direction.North]: openDirs.includes(Direction.North) ? 'OPEN' : 'WALL',
    [Direction.East]: openDirs.includes(Direction.East) ? 'OPEN' : 'WALL',
    [Direction.South]: openDirs.includes(Direction.South) ? 'OPEN' : 'WALL',
    [Direction.West]: openDirs.includes(Direction.West) ? 'OPEN' : 'WALL',
  };
};

export const MOCK_CHARACTERS: CharacterDef[] = [
  {
    id: 'char_1',
    name: '莱因哈特神父',
    description: '一位有着黑暗过去、对神秘学极有研究的神职人员。',
    traits: ['受祝福'],
    attributes: {
      [AttributeName.Might]: createStat([1, 2, 2, 4, 4, 5, 5, 7], 2),
      [AttributeName.Speed]: createStat([2, 3, 3, 4, 5, 6, 7, 7], 2),
      [AttributeName.Sanity]: createStat([3, 4, 5, 5, 6, 7, 7, 8], 4),
      [AttributeName.Knowledge]: createStat([1, 3, 3, 4, 5, 6, 6, 8], 3),
    },
  },
  {
    id: 'char_2',
    name: '牛头奥克斯',
    description: '一位体型巨大的明星运动员，他几乎不惧怕任何东西。',
    traits: ['强壮'],
    attributes: {
      [AttributeName.Might]: createStat([4, 5, 5, 6, 6, 7, 8, 8], 4),
      [AttributeName.Speed]: createStat([2, 2, 2, 3, 4, 5, 5, 6], 3),
      [AttributeName.Sanity]: createStat([2, 2, 3, 4, 5, 5, 6, 7], 2),
      [AttributeName.Knowledge]: createStat([2, 2, 3, 3, 4, 5, 5, 6], 2),
    },
  },
  {
    id: 'char_3',
    name: '闪电侠杰基',
    description: '前任信使，即使在最危险的地形也能如履平地。',
    traits: ['敏捷'],
    attributes: {
      [AttributeName.Might]: createStat([2, 3, 3, 4, 4, 5, 5, 6], 2),
      [AttributeName.Speed]: createStat([4, 4, 5, 6, 7, 7, 8, 8], 4),
      [AttributeName.Sanity]: createStat([2, 3, 3, 4, 4, 5, 6, 7], 3),
      [AttributeName.Knowledge]: createStat([2, 3, 3, 3, 4, 4, 5, 6], 2),
    },
  },
  {
    id: 'char_4',
    name: '布莱恩教授',
    description: '大名鼎鼎的考古学家，总能在细节中发现真相。',
    traits: ['睿智'],
    attributes: {
      [AttributeName.Might]: createStat([2, 2, 3, 3, 4, 4, 5, 5], 2),
      [AttributeName.Speed]: createStat([2, 3, 3, 4, 4, 5, 5, 6], 2),
      [AttributeName.Sanity]: createStat([3, 4, 4, 5, 6, 7, 7, 8], 3),
      [AttributeName.Knowledge]: createStat([4, 5, 6, 7, 7, 8, 8, 8], 4),
    },
  },
];

export const PLAYER_COLORS = [
  '#6366f1', // Indigo
  '#ef4444', // Red
  '#10b981', // Emerald
  '#f59e0b', // Amber
];

export const STARTING_TILE: TileDef = {
  id: 'tile_entry_hall',
  name: '中央大厅',
  description: '大厦的主入口。沉重的大门在你身后锁上了。',
  type: 'room',
  floors: [FloorLevel.Ground],
  edges: createEdges([Direction.North, Direction.East, Direction.West]),
  icon: 'DoorOpen',
  effects: [
    { type: 'buff', text: '避风港：在这里进行理智检定时 +1。' }
  ]
};

export const TILE_DECK: TileDef[] = [
  {
    id: 'tile_hallway',
    name: '嘎吱作响的走廊',
    description: '地板在你脚下发出阵阵呻吟。',
    type: 'corridor',
    floors: [FloorLevel.Ground, FloorLevel.Upper],
    edges: createEdges([Direction.North, Direction.South]),
    icon: 'Footprints',
    cardSymbol: 'EVENT'
  },
  {
    id: 'tile_library',
    name: '布满灰尘的图书馆',
    description: '这里的书架上摆满了禁忌的知识。',
    type: 'room',
    floors: [FloorLevel.Ground, FloorLevel.Upper],
    edges: createEdges([Direction.South, Direction.East]),
    icon: 'Book',
    cardSymbol: 'EVENT',
    effects: [
      { type: 'buff', text: '如果你在这里结束回合，获得 1 点知识。' }
    ]
  },
  {
    id: 'tile_conservatory',
    name: '温室',
    description: '枯死的植物像抓取的手指一样从天花板垂下。',
    type: 'room',
    floors: [FloorLevel.Ground],
    edges: createEdges([Direction.North]),
    icon: 'Trees',
    cardSymbol: 'EVENT'
  },
  {
    id: 'tile_kitchen',
    name: '厨房',
    description: '腐烂的气味扑面而来。',
    type: 'room',
    floors: [FloorLevel.Ground, FloorLevel.Basement],
    edges: createEdges([Direction.West, Direction.North]),
    icon: 'Utensils',
    cardSymbol: 'OMEN',
    effects: [
      { type: 'debuff', text: '进入时理智 -1。' }
    ]
  },
  {
    id: 'tile_gymnasium',
    name: '体育馆',
    description: '到处散落着陈旧的运动器材。',
    type: 'room',
    floors: [FloorLevel.Ground, FloorLevel.Basement],
    edges: createEdges([Direction.East, Direction.West]),
    icon: 'Dumbbell',
    cardSymbol: 'ITEM',
    effects: [
      { type: 'buff', text: '每局游戏限一次，获得 1 点速度。' }
    ]
  },
  {
    id: 'tile_vault',
    name: '金库',
    description: '一道沉重的钢门虚掩着。',
    type: 'room',
    floors: [FloorLevel.Basement],
    edges: createEdges([Direction.North]),
    icon: 'Lock',
    cardSymbol: 'ITEM',
    effects: [
      { type: 'trigger', text: '必须通过 力量 3+ 检定才能打开宝箱。' }
    ]
  },
  {
    id: 'tile_basement_landing',
    name: '地下室平台',
    description: '这里又冷又湿。',
    type: 'special',
    floors: [FloorLevel.Basement],
    edges: createEdges([Direction.North, Direction.South, Direction.East, Direction.West]),
    icon: 'ArrowDown',
  }
];

export const MOCK_EVENTS_DECK: CardDef[] = Object.values(EVENTS_DB);
export const MOCK_ITEMS_DECK: Item[] = Object.values(ITEMS_DB).filter(i => i.type !== 'OMEN');
export const MOCK_OMENS_DECK: Item[] = Object.values(ITEMS_DB).filter(i => i.type === 'OMEN');
