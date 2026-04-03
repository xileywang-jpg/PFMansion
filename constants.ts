
import { TileDef, FloorLevel, Direction } from './types';

// --- Exported Constants ---

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
