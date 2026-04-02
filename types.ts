
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

export type TurnPhase = 'MOVING' | 'EVENT_RESOLVING' | 'ATTRIBUTE_CHECK' | 'CHOICE' | 'COMBAT_ATTACK' | 'COMBAT_DEFENSE' | 'DONE';

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
  grantsEffects?: SkillNodeGrantEffect[];
  grantsBuff?: string; // Passive effect text
  position: { row: number; col: number }; // For visual layout
}

export interface SkillNodeGrantEffect {
  type: 'MODIFY_ATTRIBUTE' | 'ADD_BUFF';
  stat?: string;
  amount?: number;
  buff?: string;
  description?: string;
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
  
  // 轨迹显示
  showTrail: boolean;
  
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
  | 'CURSED'
  | 'MIRROR_REFLECT';

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

// PassiveEffect 被动效果（与后端 PassiveEffect 对齐）
export type PassiveEffectType = 'buff' | 'debuff' | 'special' | 'skill';

export interface PassiveEffect {
  type: PassiveEffectType;
  text: string;
}

// 兼容别名
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
  poolId?: string;
  difficulty?: number;
  attribute?: AttributeName;
  successMessage?: string;
  failureMessage?: string;
  destination?: string;
  // DIVINATION 专用：预知事件后放牌位置
  divinationPosition?: 'top' | 'bottom';
  // MIRROR 专用：持续回合数
  mirrorDuration?: number;
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
  onEnter?: TileTrigger;          // 新版进入触发器（带检定）
  onEnterEffects?: Effect[];      // 旧版进入效果（直接生效）
  onLeave?: TileTrigger;          // 离开触发器
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

export type CardSymbol = 'EVENT' | 'ITEM' | 'OMEN' | 'NONE';

// P0-2 修复：对齐后端完整的 Card 结构
// Interaction 交互类型
export interface Interaction {
  type: 'ATTRIBUTE_CHECK' | 'CHOICE' | 'NONE';
  attribute?: AttributeName;
  difficulty?: number;
  success?: ScriptAction[];
  failure?: ScriptAction[];
  options?: Choice[];
}

// Choice 选择选项
export interface Choice {
  label: string;
  effects: ScriptAction[];
}

// Effect 效果定义（完整版）
export interface Effect {
  type: 'MODIFY_STAT' | 'DAMAGE' | 'HEAL' | 'DRAW_CARD' | 'MOVE_PLAYER' | 'LOG' | 'IF' | 'GIVE_ITEM' | 'GIVE_SKILL' | 'ROLL';
  stat?: string;
  amount?: number;
  target?: string;
  deck?: CardSymbol;
  itemId?: string;
  skillId?: string;
  message?: string;
  style?: 'info' | 'alert' | 'success' | 'narrative';
  location?: string;
  x?: number;
  y?: number;
  condition?: Condition;
  then?: Effect[];
  else?: Effect[];
  attribute?: string;
  difficulty?: number;
}

// Condition 条件
export interface Condition {
  op: 'HAS_ITEM' | 'HAS_SKILL';
  itemId?: string;
  skillId?: string;
}

// ItemUsage 物品使用
export interface ItemUsage {
  actionLabel?: string;
  isConsumable: boolean;
  target?: 'SELF' | 'OPPONENT' | 'TILE';
  effects: ScriptAction[];
}

// P0-2 修复：完整的 Card 类型，对齐后端 data.go 中的 Card 结构
export interface Card {
  id: string;
  type: 'EVENT' | 'ITEM' | 'OMEN';
  title: string;
  description: string;
  flavorText?: string;
  icon?: string;
  triggerType?: 'ON_ENTER' | 'ON_EXIT' | 'MANUAL';
  interaction?: Interaction;
  usage?: ItemUsage;
  passiveEffects?: string[];
  // 用于物品/厄运的额外字段
  cardSymbol?: CardSymbol;
}

// 保留 EventCard 作为别名（用于向后兼容）
export interface EventCard extends Card {
  type: 'EVENT';
  interaction: Interaction;
}

// CardDef 指向完整的 Card 结构
export type CardDef = Card;

export type ItemType = 'WEAPON' | 'CONSUMABLE' | 'PASSIVE' | 'OMEN';

export interface Item {
  id: string;
  name: string;
  description: string;
  icon: string; 
  type: ItemType;
  usage?: ItemUsage;
  passiveEffects?: PassiveEffect[]; 
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
export type ActionType = 'modify_stat' | 'move_player' | 'add_item' | 'remove_item' | 'draw_card' | 'trigger_haunt' | 'narrative_log' | 'heal' 
  | 'trade_items' | 'teleport_to_revealed' | 'reveal_all_tiles' | 'reveal_next_event' | 'reveal_trail' 
  | 'reroll_dice' | 'add_status_effect' | 'divination'
  // 历史数据里仍可能出现的扩展动作类型
  | 'damage' | 'teleport' | 'gain_item' | 'reveal_map';

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
  // 新增字段
  locationId?: string; // TELEPORT_TO_REVEALED
  playerId1?: string; // TRADE_ITEMS
  playerId2?: string;
  itemId1?: string;
  itemId2?: string;
  toTop?: boolean; // REVEAL_NEXT_EVENT
  contextId?: string; // REROLL_DICE
  effect?: string; // add_status_effect
  duration?: number;
  action?: 'peek' | 'toTop' | 'toBottom'; // DIVINATION
  // 额外字段（用于前端执行脚本）
  destination?: string; // TELEPORT
}

// ==================== NPC 系统 ====================

export type Position = { x: number; y: number };

export interface GameNPC {
  instanceId: string;
  defId: string;
  name: string;
  type: 'GHOST' | 'BEAST' | 'SPIRIT' | 'ZOMBIE';
  position: Position;
  health: number;
  maxHealth: number;
  isDead: boolean;
  statusEffects?: StatusEffect[];
}

export interface NPCAttackResult {
  npcInstanceId: string;
  attackRoll: number;
  defense: number;
  damage: number;
  npcHealth: number;
  npcMaxHealth: number;
  defeated?: boolean;
}

export interface NPCAttackPlayerResult {
  npcInstanceId: string;
  npcName: string;
  attackRoll: number;
  playerDefense: number;
  damage: number;
  attribute: string;
  playerDied?: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  text: string;
  type: 'info' | 'alert' | 'narrative' | 'success' | 'failure' | 'warning';
}

export type FeedbackType = 'error' | 'info' | 'warning' | 'turn' | 'death' | 'alert' | 'success';

export interface FeedbackState {
  message: string;
  type: FeedbackType;
}

export interface CardRevealState {
  card: CardDef | Item | EventCard;
  deck: 'OMEN' | 'ITEM' | 'EVENT';
  onConfirmAction?: () => void;
}

export interface AttributeCheckPendingActionData {
  attribute?: string;
  difficulty?: number;
  continuation?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ChoicePendingActionData {
  options?: Choice[];
  [key: string]: unknown;
}

export interface CombatPendingActionData {
  attribute?: string;
  defenderId?: string;
  [key: string]: unknown;
}

export interface HauntRollPendingActionData {
  omenCount?: number;
  [key: string]: unknown;
}

export interface PendingActionBase<TType extends string = string, TData extends Record<string, unknown> = Record<string, unknown>> {
  type: TType;
  target: string;
  data?: TData;
  cardId?: string;
  message?: string;
  attribute?: string;
  difficulty?: number;
  eventId?: string;
  continuation?: Record<string, unknown>;
  successEffects?: unknown[];
  failureEffects?: unknown[];
}

export type InteractionStateType = 'ATTRIBUTE_CHECK' | 'TILE_ATTRIBUTE_CHECK' | 'CHOICE' | 'COMBAT' | 'HAUNT_ROLL' | 'TILE_PLACEMENT';

export type CombatInteractionPhase = 'ATTACKING' | 'RESULT';

export interface InteractionState {
  type: InteractionStateType;
  playerId: string;
  message?: string;
  attribute?: string;
  difficulty?: number;
  eventId?: string;
  cardId?: string;
  omenCount?: number;
  attackerId?: string;
  defenderId?: string;
  combatPhase?: CombatInteractionPhase;
  attackerRolls?: number[];
  defenderRolls?: number[];
  attackerSum?: number;
  defenderSum?: number;
  damage?: number;
  loser?: string;
  draw?: boolean;
  attackerDied?: boolean;
  defenderDied?: boolean;
  tileId?: string;
  direction?: string;
  rotation?: number;
  targetPos?: { x: number; y: number } | null;
}

export type RoomInteractionDialogState =
  | { kind: 'CLOSED' }
  | { kind: 'TRADE' }
  | { kind: 'PROMPT'; interaction: TileInteraction; tileId?: string | null }
  | { kind: 'TELEPORT'; interaction: TileInteraction; tileId?: string | null }
  | { kind: 'DIVINATION'; interaction: TileInteraction; tileId?: string | null };

export type PendingAction =
  | PendingActionBase<'ATTRIBUTE_CHECK', AttributeCheckPendingActionData>
  | PendingActionBase<'TILE_ATTRIBUTE_CHECK', AttributeCheckPendingActionData>
  | PendingActionBase<'CHOICE', ChoicePendingActionData>
  | PendingActionBase<'COMBAT', CombatPendingActionData>
  | PendingActionBase<'HAUNT_ROLL', HauntRollPendingActionData>
  | PendingActionBase<string, Record<string, unknown>>;

export interface GameUiState {
  hoveredTileId: string | null;
  isInventoryOpen: boolean;
  roomInteractionDialog: RoomInteractionDialogState;
  isSkillTreeOpen: boolean;
  inspectPlayerId: string | null;
  cardRevealModal: CardRevealState | null;
  pendingInteractionEffects: ScriptAction[] | null;
  activeFeedback: FeedbackState | null;
}

export interface ActiveRoll {
  id: string;
  rollType?: 'STANDARD' | 'HAUNT';
  attributeName: string; 
  numberOfDice: number;
  title?: string;
  description?: string;
  targetValue?: number; 
  actionLabel?: string;
  confirmLabel?: string;
  isCancellable?: boolean; 
  onComplete: (total: number) => void;
}

export interface CombatState {
  attackerId: string;
  defenderId: string;
  attribute: AttributeName;
  phase: 'ATTACKING' | 'RESOLUTION';
  attackerRolls?: number[];
  defenderRolls?: number[];
}

export interface CombatResult {
  attackerId: string;
  defenderId: string;
  attackerRolls: number[];
  attackerSum: number;
  defenderRolls: number[];
  defenderSum: number;
  damage: number;
  loser: string;
  draw: boolean;
  attribute: string;
  attackerDied?: boolean;
  defenderDied?: boolean;
}

