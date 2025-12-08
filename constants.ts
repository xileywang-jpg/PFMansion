
import { CharacterDef, TileDef, CardDef, AttributeName, FloorLevel, Direction, Item } from './types';
import { ITEMS_DB } from './data/items';
import { EVENTS_DB } from './data/events';

// Helper to create a stat track
const createStat = (values: number[], startIndex: number) => ({
  values,
  index: startIndex,
  current: values[startIndex],
  base: values[startIndex],
  max: values[values.length - 1],
  floor: 0,
});

export const MOCK_CHARACTERS: CharacterDef[] = [
  {
    id: 'char_1',
    name: 'Father Rhinehardt',
    description: 'A clergyman with a dark past and extensive knowledge of the occult.',
    traits: ['Blessed'],
    attributes: {
      [AttributeName.Might]: createStat([1, 2, 2, 4, 4, 5, 5, 7], 2),
      [AttributeName.Speed]: createStat([2, 3, 3, 4, 5, 6, 7, 7], 2),
      [AttributeName.Sanity]: createStat([3, 4, 5, 5, 6, 7, 7, 8], 4), // High sanity
      [AttributeName.Knowledge]: createStat([1, 3, 3, 4, 5, 6, 6, 8], 3),
    },
  },
  {
    id: 'char_2',
    name: 'Ox Bellows',
    description: 'A massive star athlete who fears nothing... almost.',
    traits: ['Strong'],
    attributes: {
      [AttributeName.Might]: createStat([4, 5, 5, 6, 6, 7, 8, 8], 4), // High might
      [AttributeName.Speed]: createStat([2, 2, 2, 3, 4, 5, 5, 6], 3),
      [AttributeName.Sanity]: createStat([2, 2, 3, 4, 5, 5, 6, 7], 2),
      [AttributeName.Knowledge]: createStat([2, 2, 3, 3, 4, 5, 5, 6], 2),
    },
  },
];

export const STARTING_TILE: TileDef = {
  id: 'tile_entry_hall',
  name: 'Grand Foyer',
  description: 'The main entrance. The door has locked behind you.',
  type: 'room',
  floors: [FloorLevel.Ground],
  openings: [Direction.North, Direction.East, Direction.West],
  icon: 'DoorOpen',
  effects: [
    { type: 'buff', text: 'Safe Haven: Sanity rolls are +1 here.' }
  ]
};

export const TILE_DECK: TileDef[] = [
  {
    id: 'tile_hallway',
    name: 'Creaky Hallway',
    description: 'The floorboards groan under your weight.',
    type: 'corridor',
    floors: [FloorLevel.Ground, FloorLevel.Upper],
    openings: [Direction.North, Direction.South],
    icon: 'Footprints',
    cardSymbol: 'EVENT'
  },
  {
    id: 'tile_library',
    name: 'Dusty Library',
    description: 'Books filled with forbidden knowledge.',
    type: 'room',
    floors: [FloorLevel.Ground, FloorLevel.Upper],
    openings: [Direction.South, Direction.East],
    icon: 'Book',
    cardSymbol: 'EVENT',
    effects: [
      { type: 'buff', text: 'Gain 1 Knowledge if you end your turn here.' }
    ]
  },
  {
    id: 'tile_conservatory',
    name: 'Conservatory',
    description: 'Dead plants hang from the ceiling like grasping fingers.',
    type: 'room',
    floors: [FloorLevel.Ground],
    openings: [Direction.North],
    icon: 'Trees',
    cardSymbol: 'EVENT'
  },
  {
    id: 'tile_kitchen',
    name: 'Kitchen',
    description: 'The smell of rot is overwhelming.',
    type: 'room',
    floors: [FloorLevel.Ground, FloorLevel.Basement],
    openings: [Direction.West, Direction.North],
    icon: 'Utensils',
    cardSymbol: 'OMEN',
    effects: [
      { type: 'debuff', text: 'Sanity -1 upon entering.' }
    ]
  },
  {
    id: 'tile_gymnasium',
    name: 'Gymnasium',
    description: 'Old sports equipment scattered everywhere.',
    type: 'room',
    floors: [FloorLevel.Ground, FloorLevel.Basement],
    openings: [Direction.East, Direction.West],
    icon: 'Dumbbell',
    cardSymbol: 'ITEM',
    effects: [
      { type: 'buff', text: 'Gain 1 Speed once per game.' }
    ]
  },
  {
    id: 'tile_vault',
    name: 'The Vault',
    description: 'A heavy steel door sits ajar.',
    type: 'room',
    floors: [FloorLevel.Basement],
    openings: [Direction.North],
    icon: 'Lock',
    cardSymbol: 'ITEM',
    effects: [
      { type: 'trigger', text: 'Must roll Might 3+ to open chest.' }
    ]
  },
  {
    id: 'tile_basement_landing',
    name: 'Basement Landing',
    description: 'It is cold and damp here.',
    type: 'special',
    floors: [FloorLevel.Basement],
    openings: [Direction.North, Direction.South, Direction.East, Direction.West],
    icon: 'ArrowDown',
  }
];

// Generate Decks from DB
export const MOCK_EVENTS_DECK: CardDef[] = Object.values(EVENTS_DB);
export const MOCK_ITEMS_DECK: Item[] = Object.values(ITEMS_DB).filter(i => i.type !== 'OMEN');
export const MOCK_OMENS_DECK: Item[] = Object.values(ITEMS_DB).filter(i => i.type === 'OMEN');
