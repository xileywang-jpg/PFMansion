
// --- Core Enums ---

export enum Direction {
  North = 'N',
  East = 'E',
  South = 'S',
  West = 'W',
}

export enum GamePhase {
  Exploration = 'EXPLORATION',
  HauntRoll = 'HAUNT_ROLL',
  HauntReveal = 'HAUNT_REVEAL',
  Haunt = 'HAUNT',
  GameOver = 'GAME_OVER',
}

export type TurnPhase = 'MOVING' | 'EVENT_RESOLVING' | 'DONE';

export enum AttributeName {
  Might = 'might',
  Speed = 'speed',
  Sanity = 'sanity',
  Knowledge = 'knowledge',
}

// --- Character System ---

export interface Attribute {
  current: number;
  base: number; // Starting value
  floor: number; // Value at which character dies or is stunned
  max: number; // Maximum possible value
  values: number[]; // Array of possible values for this stat (like the physical board game tracks)
  index: number; // Current index in the values array
}

export interface CharacterDef {
  id: string;
  name: string;
  description: string;
  portraitUrl?: string;
  attributes: Record<AttributeName, Attribute>;
  traits: string[]; // e.g., "Lucky", "Brute"
}

export interface Player {
  id: string;
  character: CharacterDef;
  position: { x: number; y: number };
  items: Item[]; // Inventory holds Items
}

// --- Map & Tile System ---

export enum FloorLevel {
  Basement = 'BASEMENT',
  Ground = 'GROUND',
  Upper = 'UPPER',
}

export type TileEffectType = 'buff' | 'debuff' | 'trigger' | 'item';

export interface TileEffect {
  type: TileEffectType;
  text: string;
  icon?: string; // Icon name for UI
}

export interface TileDef {
  id: string;
  name: string;
  description: string;
  floors: FloorLevel[]; // Which floors this tile can be placed on
  openings: Direction[]; // Static definitions of where doors are
  type: 'room' | 'corridor' | 'special';
  cardSymbol?: CardSymbol; // The symbol on the floor (Event, Item, Omen)
  eventTrigger?: string; // Legacy: ID of a specific event
  icon?: string; // Icon name for UI
  effects?: TileEffect[]; // Passive effects or rules for this room
}

export interface TileInstance {
  instanceId: string;
  defId: string;
  x: number;
  y: number;
  rotation: number; // 0, 90, 180, 270
  openings: Direction[]; // Calculated based on rotation
  hasEventTriggered: boolean;
}

// --- Card & Item System ---

export type CardSymbol = 'EVENT' | 'ITEM' | 'OMEN';

// Interaction Types
export type InteractionType = 'ATTRIBUTE_CHECK' | 'CHOICE';

export type EventInteraction = 
  | {
      type: 'ATTRIBUTE_CHECK';
      attribute: AttributeName;
      difficulty: number; // e.g., Roll 4+
      success: ScriptAction[]; 
      failure: ScriptAction[]; 
    }
  | {
      type: 'CHOICE';
      options: { label: string; effects: ScriptAction[] }[];
    };

// Events are one-time scripts
export interface EventCard {
  id: string;
  type: 'EVENT';
  title: string;
  description: string; // Flavor text
  flavorText?: string;
  icon?: string;
  triggerType?: 'ON_ENTER'; 
  
  // New Complex Logic
  interaction: EventInteraction;
}

// Alias for backwards compatibility or generic usage
export type CardDef = EventCard;

// Items are persistent objects
export type ItemType = 'WEAPON' | 'CONSUMABLE' | 'PASSIVE' | 'OMEN';

export interface ItemUsage {
  actionLabel: string; // e.g., "Drink", "Shoot", "Bandage"
  isConsumable: boolean; // True = Destroy after use
  effects: ScriptAction[]; // Effects when used
  target?: 'SELF' | 'OPPONENT' | 'TILE';
}

export interface Item {
  id: string;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  type: ItemType;
  usage?: ItemUsage;
  passiveEffects?: TileEffect[]; // Effects just by holding it
}

// --- Scripting & Event Engine (JSON Serializable) ---

export type ConditionType = 'stat_check' | 'has_item' | 'tile_check' | 'dice_roll';
export type ActionType = 'modify_stat' | 'move_player' | 'add_item' | 'trigger_haunt' | 'narrative_log' | 'heal';

export interface ScriptCondition {
  type: ConditionType;
  target?: string; // 'self' or specific player ID
  attribute?: AttributeName;
  value?: number;
  operator?: '>' | '<' | '==' | '>=' | '<=';
  itemId?: string;
}

export interface ScriptAction {
  type: ActionType;
  target?: string; // 'self', 'all', or specific player ID
  attribute?: AttributeName;
  amount?: number;
  itemId?: string;
  message?: string;
  hauntId?: string;
  // For move_player
  location?: 'basement' | 'ground' | 'upper'; // simple placeholder logic
}

export interface LogEntry {
  id: string;
  timestamp: number;
  text: string;
  type: 'info' | 'alert' | 'narrative' | 'success' | 'failure';
}

export interface ActiveRoll {
  id: string;
  attributeName: string; // 'Might' or 'Haunt Roll'
  numberOfDice: number;
  targetValue?: number; // Optional success threshold
  onComplete: (total: number) => void;
}
