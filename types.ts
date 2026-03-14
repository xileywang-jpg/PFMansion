
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

export type TraitorRule = 'TRIGGER_PLAYER' | 'HIGHEST_MIGHT' | 'LOWEST_SANITY' | 'LOWEST_KNOWLEDGE' | 'HIGHEST_SPEED' | 'SPECIFIC_CHAR_ID';

// === 剧本目标系统 ===

export interface ScenarioObjective {
  id: string;
  name: string;
  description: string;
  completed: boolean;
  progress: number;
  required: number;
  hidden?: boolean;  // 是否隐藏（叛徒专用目标）
}

export interface ScenarioVictoryCondition {
  type: 'ELIMINATE' | 'SURVIVE' | 'COLLECT' | 'REACH' | 'CUSTOM';
  target?: string;
  turns?: number;
  description: string;
}

export interface ScenarioSecrets {
  objective: string;
  setupText: string;
  abilities?: string[];
  objectives?: ScenarioObjective[];
  victoryCondition?: ScenarioVictoryCondition;
}

export interface Scenario {
  id: string;
  name: string;
  introText: string;
  traitorRule: TraitorRule;
  traitorRuleValue?: string; // For SPECIFIC_CHAR_ID
  traitorInfo: ScenarioSecrets;
  heroInfo: ScenarioSecrets;
  // Phase 5 扩展
  isMultiPhase?: boolean;
  phases?: ScenarioPhase[];
}

export interface ScenarioPhase {
  id: string;
  name: string;
  description: string;
  objectives: ScenarioObjective[];
  triggerCondition?: string;  // 触发下一阶段的条件
}

// --- Skill Tree System ---

export interface SkillNode {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon: string;
  prerequisites?: string[]; // IDs of parent nodes that must be unlocked first
  requiredTrait?: string; // Specific character trait required (e.g., "Strong")
  grantsSkillId?: string; // Active skill ID from SKILLS_DB
  grantsBuff?: string; // Passive effect text
  position: { row: number; col: number }; // For visual layout
}

export interface SkillTreeCategory {
  id: string;
  name: string;
  description: string;
  nodes: SkillNode[];
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
  initialSkills?: string[]; // Skills the character starts with (IDs from SKILLS_DB)
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
  skills: string[]; // Acquired skill IDs (not including item skills)
  
  // 状态效果 (Phase 3)
  statusEffects: StatusEffect[];
  
  // Progression
  skillPoints: number;
  unlockedSkillNodes: string[]; // IDs of unlocked nodes from SkillTree
  
  // History
  personalLogs: LogEntry[];
}

// === 状态效果系统 ===

export type StatusEffectType = 
  | 'INVISIBLE' 
  | 'DISGUISED' 
  | 'PETRIFIED' 
  | 'BURNING' 
  | 'CONFUSED' 
  | 'STEALTH'
  | 'PHASING'
  | 'BLESSED'
  | 'CURSED';

export interface StatusEffect {
  type: StatusEffectType;
  duration: number;  // 剩余回合数，-1表示永久
  source?: string;    // 来源（如物品ID）
  // 效果特定属性
  damage?: number;    // 燃烧伤害
  faction?: string;   // 伪装阵营
  amount?: number;   // 数值
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

// === 地图卡触发器系统 ===

export type TriggerType = 'ATTRIBUTE_CHECK' | 'DRAW_CARD' | 'RANDOM_EVENT';

export interface TileTrigger {
  type: TriggerType;
  attribute?: AttributeName;
  difficulty?: number;
  success?: any[];
  failure?: any[];
  message?: string;
  deck?: string;
  count?: number;
  possibilities?: { type: string; weight: number; }[];
}

// === 地图卡互动系统 ===

export type InteractionType = 
  | 'TRADE' 
  | 'FORGE' 
  | 'DIVINATION' 
  | 'HEAL' 
  | 'TELEPORT' 
  | 'MIRROR' 
  | 'REVEAL_MAP' 
  | 'TIME_REWIND' 
  | 'CROSS';

export interface TileInteraction {
  type: InteractionType;
  description: string;
  condition?: any;
  effects?: any[];
  cost?: { type: string; amount: number };
  difficulty?: number;
  attribute?: AttributeName;
  successMessage?: string;
  failureMessage?: string;
  destination?: string;
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
  // 扩展字段
  onEnter?: TileTrigger;
  onLeave?: TileTrigger;
  interact?: TileInteraction;
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

export type EventInteractionType = 'ATTRIBUTE_CHECK' | 'CHOICE';

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
  grantedSkills?: string[];
  // 扩展字段
  grantedActions?: ItemGrantedAction[];
}

export interface ItemGrantedAction {
  id: string;
  name: string;
  description: string;
  cost?: { type: string; amount: number };
  condition?: any;
  cooldown?: number;
  effects?: any[];
}

// --- Scripting & Event Engine ---

export type ConditionType = 'stat_check' | 'has_item' | 'tile_check' | 'dice_roll';
export type ActionType = 'modify_stat' | 'move_player' | 'add_item' | 'draw_card' | 'trigger_haunt' | 'narrative_log' | 'heal';

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
  deck?: CardSymbol;
  message?: string;
  hauntId?: string;
  location?: 'basement' | 'ground' | 'upper' | 'entry' | 'start' | 'random'; 
  x?: number; // 移动到指定 X 坐标
  y?: number; // 移动到指定 Y 坐标
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

export interface EventOutcome {
  title: string;
  description: string;
  type: 'success' | 'failure';
  roll: number;
  target: number;
}
