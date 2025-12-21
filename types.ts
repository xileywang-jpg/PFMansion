
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

// --- Scenario System ---

export type TraitorRule = 'TRIGGER_PLAYER' | 'HIGHEST_MIGHT' | 'LOWEST_SANITY' | 'SPECIFIC_CHAR_ID';

export interface ScenarioSecrets {
  objective: string;
  setupText: string;
  abilities?: string[];
}

export interface Scenario {
  id: string;
  name: string;
  introText: string;
  traitorRule: TraitorRule;
  traitorRuleValue?: string; // For SPECIFIC_CHAR_ID
  traitorInfo: ScenarioSecrets;
  heroInfo: ScenarioSecrets;
}

// --- Character System ---

export interface Attribute {
  current: number;
  base: number; 
  floor: number; 
  max: number; 
  values: number[]; 
  index: number; 
}

export interface CharacterDef {
  id: string;
  name: string;
  description: string;
  portraitUrl?: string;
  attributes: Record<AttributeName, Attribute>;
  traits: string[]; 
}

export type PlayerTeam = 'HERO' | 'TRAITOR' | 'UNASSIGNED';

export interface Player {
  id: string;
  character: CharacterDef;
  position: { x: number; y: number };
  items: Item[]; 
  isDead: boolean;
  team: PlayerTeam;
  
  buffs: string[]; 
  skills: string[]; 
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
  icon?: string; 
}

export type EdgeType = 
  | 'OPEN'          
  | 'WALL'          
  | 'RUBBLE'        
  | 'SECRET_DOOR';  

export interface DirectionalEdges {
  [Direction.North]: EdgeType;
  [Direction.East]: EdgeType;
  [Direction.South]: EdgeType;
  [Direction.West]: EdgeType;
}

export interface TileDef {
  id: string;
  name: string;
  description: string;
  floors: FloorLevel[]; 
  edges: DirectionalEdges; 
  type: 'room' | 'corridor' | 'special';
  cardSymbol?: CardSymbol; 
  eventTrigger?: string; 
  icon?: string; 
  effects?: TileEffect[]; 
}

export interface TileInstance {
  instanceId: string;
  defId: string;
  x: number;
  y: number;
  rotation: number; 
  edges: DirectionalEdges; 
  hasEventTriggered: boolean;
  visibility: 'HIDDEN' | 'FOG' | 'VISIBLE';
  droppedItems: Item[]; 
}

// --- Card & Item System ---

export type CardSymbol = 'EVENT' | 'ITEM' | 'OMEN';

export type InteractionType = 'ATTRIBUTE_CHECK' | 'CHOICE';

export interface EventInteractionDef {
  type: 'ATTRIBUTE_CHECK';
  attribute: AttributeName;
  difficulty: number; 
  success: ScriptAction[]; 
  failure: ScriptAction[]; 
}

export type EventInteraction = 
  | EventInteractionDef
  | {
      type: 'CHOICE';
      options: { label: string; effects: ScriptAction[] }[];
    };

export interface EventCard {
  id: string;
  type: 'EVENT';
  title: string;
  description: string; 
  flavorText?: string;
  icon?: string;
  triggerType?: 'ON_ENTER'; 
  interaction: EventInteraction;
}

export type CardDef = EventCard;

export type ItemType = 'WEAPON' | 'CONSUMABLE' | 'PASSIVE' | 'OMEN';

export interface ItemUsage {
  actionLabel: string; 
  isConsumable: boolean; 
  effects: ScriptAction[]; 
  target?: 'SELF' | 'OPPONENT' | 'TILE';
}

export interface Item {
  id: string;
  name: string;
  description: string;
  icon: string; 
  type: ItemType;
  usage?: ItemUsage;
  passiveEffects?: TileEffect[]; 
}

// --- Scripting & Event Engine ---

export type ConditionType = 'stat_check' | 'has_item' | 'tile_check' | 'dice_roll';
export type ActionType = 'modify_stat' | 'move_player' | 'add_item' | 'trigger_haunt' | 'narrative_log' | 'heal';

export interface ScriptCondition {
  type: ConditionType;
  target?: string; 
  attribute?: AttributeName;
  value?: number;
  operator?: '>' | '<' | '==' | '>=' | '<=';
  itemId?: string;
}

export interface ScriptAction {
  type: ActionType;
  target?: string; 
  attribute?: AttributeName;
  amount?: number;
  itemId?: string;
  message?: string;
  hauntId?: string;
  location?: 'basement' | 'ground' | 'upper'; 
}

export interface LogEntry {
  id: string;
  timestamp: number;
  text: string;
  type: 'info' | 'alert' | 'narrative' | 'success' | 'failure';
}

export interface ActiveRoll {
  id: string;
  attributeName: string; 
  numberOfDice: number;
  targetValue?: number; 
  isCancellable?: boolean; 
  onComplete: (total: number) => void;
}
