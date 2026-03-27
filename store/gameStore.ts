
import { create } from 'zustand';
import { 
  Player, TileInstance, TileDef, GamePhase, Direction, 
  CardDef, CardSymbol, LogEntry, AttributeName, TurnPhase, ScriptAction, Item, ActiveRoll, DirectionalEdges,
  Scenario, EventOutcome, GameNPC
} from '../types';
import { ActionDefinition } from '../types/Logic';
import { GameDataBundle } from '../src/services/gameData';
import { 
  MOCK_CHARACTERS, STARTING_TILE, TILE_DECK, 
  MOCK_EVENTS_DECK, MOCK_ITEMS_DECK, MOCK_OMENS_DECK,
  getCharactersForGame, getTilesForGame, getItemsForGame, getEventsForGame, getOmensForGame, getStartingTileForGame
} from '../constants';
import { EVENTS_DB } from '../data/events';
import { ITEMS_DB } from '../data/items';
import { ITEMS_DATA } from '../data/source/items';
import { OMENS_DATA } from '../data/source/omens';
import { SKILLS_DATA } from '../data/source/skills';
import { SCENARIOS_DATA } from '../data/source/scenarios';
import { SCENARIOS_DB } from '../data/scenarios';
import { SKILL_TREES } from '../data/source/skillTrees';
import { getScenarioId } from '../data/hauntMatrix';
import { resolveTraitor, healTraitor } from '../utils/scenarioUtils';
import { evaluateCondition, executeEffects, GameContext, resolveTargets, canInteractWithTile } from '../utils/logicEngine';
import { addStatusEffect, decrementStatusEffects, applyStatusEffectOnTurnStart, getStatusEffectModifiers } from '../utils/statusEffects';
import { generateId } from '../utils/idGenerator';
import * as network from '../ws/network';

interface CombatState {
  attackerId: string;
  defenderId: string;
  attribute: AttributeName;
  attackerRoll?: number;
  defenderRoll?: number;
  phase: 'ATTACKING' | 'RESOLUTION';
}

interface GameState {
  phase: GamePhase;
  turnPhase: TurnPhase;
  turnIndex: number;
  
  players: Record<string, Player>;
  playerIds: string[];
  activePlayerId: string;

  map: Record<string, TileInstance>;
  tileDeck: TileDef[];
  logs: LogEntry[];
  movesRemaining: number;
  
  activeCard: CardDef | Item | null;
  decks: {
    EVENT: CardDef[];
    ITEM: Item[];
    OMEN: Item[];
  };
  lastRollResult: number | null;
  lastCheckSuccess: boolean | null; // 后端返回的检定成功/失败判定

  activeRoll: ActiveRoll | null;
  activeCombat: CombatState | null;
  
  // Phase X: NPC 系统
  npcs: Record<string, GameNPC>;

  eventOutcome: EventOutcome | null;

  omenCount: number;
  isHauntActive: boolean;
  currentScenario: Scenario | null;
  traitorId: string | null;
  
  // Haunt Context
  lastTriggeredOmen: string | null;
  lastTriggeredTile: string | null;
  
  // Phase 2: 目标系统
  heroObjectives: Record<string, any>;
  traitorObjectives: Record<string, any>;
  turnsSinceHaunt: number;
  gameWinner: string | null;

  // Phase 1: 待处理动作 (网络同步)
  pendingAction: { type: string; target: string; data?: Record<string, unknown>; cardId?: string; message?: string } | null;

  pendingTile: TileDef | null;
  pendingTileRotation: number;
  pendingTargetPosition: { x: number, y: number } | null;
  pendingMoveDirection: Direction | null;

  hoveredTileId: string | null;
  isInventoryOpen: boolean;
  isInteractionModalOpen: boolean;
  isSkillTreeOpen: boolean; 
  inspectPlayerId: string | null;
  
  // 预知/互动待执行效果
  pendingInteractionEffects: any[] | null;

  activeFeedback: { message: string, type: 'error' | 'info' | 'warning' | 'turn' | 'death' | 'alert' | 'success' } | null;

  // 游戏静态数据（从后端 API 获取）
  gameData: GameDataBundle | null;
  dataLoaded: boolean;
  setGameData: (data: GameDataBundle) => void;
  
  // 数据访问辅助函数
  getAllItems: () => any[];
  getItemById: (id: string) => any | undefined;
  getAllOmens: () => any[];
  getOmenById: (id: string) => any | undefined;
  getAllEvents: () => any[];
  getEventById: (id: string) => any | undefined;
  getAllSkills: () => any[];
  getSkillById: (id: string) => any | undefined;
  getScenarios: () => Record<string, any>;
  getScenarioById: (id: string) => any | undefined;
  getTilesByTheme: (theme?: string) => any[];
  getTileById: (id: string, theme?: string) => any | undefined;
  getCharactersByTheme: (theme?: string) => any[];
  getCharacterById: (id: string, theme?: string) => any | undefined;

  initializeGame: () => void;
  nextTurn: () => void;
  movePlayer: (direction: Direction) => void;
  rotatePendingTile: () => void;
  confirmTilePlacement: () => void;
  cancelTilePlacement: () => void;
  drawCard: (type: CardSymbol) => void;
  triggerSpecificEvent: (eventId: string) => void;
  triggerStatRoll: () => void;
  resolveDiceRoll: (total: number) => void;
  applyCardOutcome: () => void;
  acknowledgeEventOutcome: () => void;
  resolveEventChoice: (actions: ScriptAction[], choiceIndex?: number) => void;
  incrementOmenCount: () => void;
  performHauntRoll: () => void; 
  startHaunt: () => void;
  addLog: (text: string, type?: LogEntry['type']) => void;
  // NEW: Personal Log
  addPersonalLog: (playerId: string, text: string, type?: LogEntry['type']) => void;

  setHoveredTileId: (id: string | null) => void;
  
  showFeedback: (message: string, type?: 'error' | 'info' | 'warning' | 'turn' | 'death' | 'alert' | 'success') => void;

  executeScript: (actions: ScriptAction[]) => void;
  handlePlayerDeath: (playerId: string) => void;
  pickupItemFromTile: (itemId: string) => void;
  giveItem: (fromId: string, toId: string, itemId: string) => void;

  startCombat: (attackerId: string, defenderId: string, attribute: AttributeName) => void;

  debugForceHaunt: () => void;

  executeLogicAction: (action: ActionDefinition, selectedPartnerId?: string) => void;
  unlockSkillNode: (nodeId: string) => void; 

  setState: (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void;

  inventoryOpen: () => void; 
  toggleInventory: () => void;
  toggleInteractionModal: () => void;
  toggleSkillTree: () => void; 
  
  openInspection: (playerId: string) => void;
  closeInspection: () => void;

  useItem: (itemId: string, targetId?: string) => void;
  dropItem: (itemId: string) => void;
  
  interactWithWall: (direction: Direction) => void;
  cancelActiveRoll: () => void;

  isPlacementValid: () => boolean;
  // NEW: Helper to get effective attribute value (Base + Buffs)
  getEffectiveAttributeValue: (playerId: string, attribute: AttributeName) => number;
}

const getOpposite = (dir: Direction): Direction => {
  switch (dir) {
    case Direction.North: return Direction.South;
    case Direction.South: return Direction.North;
    case Direction.East: return Direction.West;
    case Direction.West: return Direction.East;
  }
};

const getRotatedEdges = (edges: DirectionalEdges, rotation: number): DirectionalEdges => {
  const r = ((rotation % 360) + 360) % 360;
  if (r === 0) return edges;
  let newEdges = { ...edges };
  const steps = r / 90;
  for (let i = 0; i < steps; i++) {
    const temp = { ...newEdges };
    newEdges[Direction.East] = temp[Direction.North];
    newEdges[Direction.South] = temp[Direction.East];
    newEdges[Direction.West] = temp[Direction.South];
    newEdges[Direction.North] = temp[Direction.West];
  }
  return newEdges;
};

const areConnected = (fromDir: Direction, toTileEdges: DirectionalEdges): boolean => {
  const incomingDir = getOpposite(fromDir);
  const targetEdge = toTileEdges[incomingDir];
  return targetEdge !== 'WALL';
};

// Simple parser for Chinese attribute text to Enum
const parseAttributeFromText = (text: string): { attr: AttributeName, value: number } | null => {
  let attr: AttributeName | null = null;
  if (text.includes('力量')) attr = AttributeName.Might;
  else if (text.includes('速度') || text.includes('移动')) attr = AttributeName.Speed;
  else if (text.includes('理智')) attr = AttributeName.Sanity;
  else if (text.includes('知识')) attr = AttributeName.Knowledge;

  if (!attr) return null;

  // Extract +/- number
  const match = text.match(/([+-]\d+)/);
  if (match) {
    return { attr, value: parseInt(match[0]) };
  }
  // Handle cases like "移动速度 +1" which might be parsed as "Speed +1" logic
  if (text.includes('+') && !text.includes('-')) {
      const num = text.split('+')[1];
      if (num) return { attr, value: parseInt(num) };
  }
  
  return null;
};

export const useGameStore = create<GameState>((set, get) => ({
  phase: GamePhase.Exploration,
  turnPhase: 'MOVING',
  turnIndex: 1,
  players: {},
  playerIds: [],
  activePlayerId: '',
  map: {},
  tileDeck: [],
  logs: [],
  movesRemaining: 0,
  activeCard: null,
  decks: { EVENT: [], ITEM: [], OMEN: [] },
  lastRollResult: null,
  lastCheckSuccess: null,
  activeRoll: null,

  triggerStatRoll: () => {
    // 占位：属性检定由后端驱动
  },

  resolveDiceRoll: (_total: number) => {
    // 占位：骰子结果由 DiceRoller 处理
  },

  applyCardOutcome: () => {
    // 占位：卡牌结果应用由后端 state_sync 驱动
  },
  activeCombat: null,
  npcs: {},
  eventOutcome: null,
  omenCount: 0,
  isHauntActive: false,
  currentScenario: null,
  traitorId: null,
  lastTriggeredOmen: null,
  lastTriggeredTile: null,
  heroObjectives: {},
  traitorObjectives: {},
  turnsSinceHaunt: 0,
  gameWinner: null,
  // Phase 1: 待处理动作
  pendingAction: null,
  pendingTile: null,
  pendingTileRotation: 0,
  pendingTargetPosition: null,
  pendingMoveDirection: null,
  hoveredTileId: null,
  isInventoryOpen: false,
  isInteractionModalOpen: false,
  isSkillTreeOpen: false,
  inspectPlayerId: null,
  pendingInteractionEffects: null,
  activeFeedback: null,

  // 游戏静态数据
  gameData: null,
  dataLoaded: false,
  setGameData: (data: GameDataBundle) => set({ gameData: data, dataLoaded: true }),

  showFeedback: (message: string, type: 'error' | 'info' | 'warning' | 'turn' | 'death' | 'alert' | 'success' = 'error') => {
    set({ activeFeedback: { message, type } });
    const duration = (type === 'turn' || type === 'death') ? 2500 : 2000;
    setTimeout(() => {
      if (get().activeFeedback?.message === message) {
        set({ activeFeedback: null });
      }
    }, duration);
  },

  getEffectiveAttributeValue: (playerId: string, attribute: AttributeName): number => {
      const state = get();
      const player = state.players[playerId];
      if (!player) return 0;

      // 1. Base value from slider
      let total = player.character.attributes[attribute].current;

      // 2. Passive buffs from Items
      player.items.forEach(item => {
          if (item.passiveEffects) {
              item.passiveEffects.forEach(eff => {
                  if (eff.type === 'buff') {
                      const parsed = parseAttributeFromText(eff.text);
                      if (parsed && parsed.attr === attribute) {
                          total += parsed.value;
                      }
                  }
              });
          }
      });

      // 3. Passive buffs from Skill Tree
      player.buffs.forEach(buffText => {
          const parsed = parseAttributeFromText(buffText);
          if (parsed && parsed.attr === attribute) {
              total += parsed.value;
          }
      });

      // 4. Status Effects modifiers
      if (player.statusEffects) {
        const statusModifiers = getStatusEffectModifiers(player);
        statusModifiers.forEach(mod => {
          if (mod.attribute === attribute) {
            total += mod.amount;
          }
        });
      }

      return Math.max(0, total);
  },

  // ==================== 数据访问辅助函数 ====================
  // 注意: API数据优先，本地数据仅作为降级方案使用

  // 获取所有物品（从API或本地）
  getAllItems: (): any[] => {
    const state = get();
    if (state.gameData?.items?.length) {
      return state.gameData.items;
    }
    // 降级到本地数据
    console.error('[GameData] ❌ 使用降级数据 (Items) - API数据不可用');
    return Object.values(ITEMS_DATA as unknown as Record<string, any>);
  },

  // 根据ID获取物品
  getItemById: (id: string): any | undefined => {
    const state = get();
    if (state.gameData?.items) {
      return state.gameData.items.find(item => item.id === id);
    }
    // 降级到本地数据
    console.error('[GameData] ❌ 使用降级数据 (Item:', id, ') - API数据不可用');
    return (ITEMS_DATA as unknown as Record<string, any>)[id];
  },

  // 获取所有厄运（从API或本地）
  getAllOmens: (): any[] => {
    const state = get();
    if (state.gameData?.omens?.length) {
      return state.gameData.omens;
    }
    // 降级到本地数据
    console.error('[GameData] ❌ 使用降级数据 (Omens) - API数据不可用');
    return Object.values(OMENS_DATA as unknown as Record<string, any>);
  },

  // 根据ID获取厄运
  getOmenById: (id: string): any | undefined => {
    const state = get();
    if (state.gameData?.omens) {
      return state.gameData.omens.find(omen => omen.id === id);
    }
    // 降级到本地数据
    console.error('[GameData] ❌ 使用降级数据 (Omen:', id, ') - API数据不可用');
    return (OMENS_DATA as unknown as Record<string, any>)[id];
  },

  // 获取所有事件（从API或本地）
  getAllEvents: (): any[] => {
    const state = get();
    if (state.gameData?.events?.length) {
      return state.gameData.events;
    }
    // 降级到本地数据
    console.error('[GameData] ❌ 使用降级数据 (Events) - API数据不可用');
    return Object.values(EVENTS_DB);
  },

  // 根据ID获取事件
  getEventById: (id: string): any | undefined => {
    const state = get();
    if (state.gameData?.events) {
      return state.gameData.events.find(event => event.id === id);
    }
    // 降级到本地数据
    console.error('[GameData] ❌ 使用降级数据 (Event:', id, ') - API数据不可用');
    return EVENTS_DB[id];
  },

  // 获取所有技能（从API或本地）
  getAllSkills: (): any[] => {
    const state = get();
    if (state.gameData?.skills?.length) {
      return state.gameData.skills;
    }
    // 降级到本地数据
    console.error('[GameData] ❌ 使用降级数据 (Skills) - API数据不可用');
    return Object.values(SKILLS_DATA as unknown as Record<string, any>);
  },

  // 根据ID获取技能
  getSkillById: (id: string): any | undefined => {
    const state = get();
    if (state.gameData?.skills) {
      return state.gameData.skills.find(skill => skill.id === id);
    }
    // 降级到本地数据
    console.error('[GameData] ❌ 使用降级数据 (Skill:', id, ') - API数据不可用');
    return (SKILLS_DATA as unknown as Record<string, any>)[id];
  },

  // 获取剧本
  getScenarios: (): Record<string, any> => {
    const state = get();
    if (state.gameData?.scenarios && Object.keys(state.gameData.scenarios).length > 0) {
      return state.gameData.scenarios;
    }
    // 降级到本地数据
    console.error('[GameData] ❌ 使用降级数据 (Scenarios) - API数据不可用');
    return SCENARIOS_DATA;
  },

  // 根据ID获取剧本
  getScenarioById: (id: string): any | undefined => {
    const state = get();
    const scenarios = get().getScenarios();
    if (!scenarios[id]) {
      console.error('[GameData] ❌ 使用降级数据 (Scenario:', id, ') - API数据不可用');
    }
    return scenarios[id];
  },

  // 获取地图（根据主题）
  getTilesByTheme: (theme: string = 'original'): any[] => {
    const state = get();
    if (state.gameData?.tiles?.[theme]?.length) {
      return state.gameData.tiles[theme];
    }
    // 降级到本地数据
    console.error('[GameData] ❌ 使用降级数据 (Tiles:', theme, ') - API数据不可用');
    return TILE_DECK;
  },

  // 根据ID获取地图 (自动识别主题)
  getTileById: (id: string, theme?: string): any | undefined => {
    // 根据ID前缀自动判断主题
    const autoTheme = theme || (id.startsWith('vol_') ? 'volantis' : 'original');
    const tiles = get().getTilesByTheme(autoTheme);
    const tile = tiles.find(tile => tile.id === id);
    if (!tile) {
      // 尝试在另一个主题中查找
      const fallbackTheme = autoTheme === 'volantis' ? 'original' : 'volantis';
      const fallbackTiles = get().getTilesByTheme(fallbackTheme);
      const fallbackTile = fallbackTiles.find(t => t.id === id);
      if (fallbackTile) {
        return fallbackTile;
      }
      console.error('[GameData] ❌ 使用降级数据 (Tile:', id, ') - API数据不可用');
    }
    return tile;
  },

  // 获取角色（根据主题）
  getCharactersByTheme: (theme: string = 'original'): any[] => {
    const state = get();
    if (state.gameData?.characters?.[theme]?.length) {
      return state.gameData.characters[theme];
    }
    // 降级到本地数据
    console.error('[GameData] ❌ 使用降级数据 (Characters:', theme, ') - API数据不可用');
    return MOCK_CHARACTERS;
  },

  // 根据ID获取角色
  getCharacterById: (id: string, theme: string = 'original'): any | undefined => {
    const characters = get().getCharactersByTheme(theme);
    const char = characters.find(char => char.id === id);
    if (!char) {
      console.error('[GameData] ❌ 使用降级数据 (Character:', id, ') - API数据不可用');
    }
    return char;
  },

  initializeGame: () => {
    // P0 修复: 网络模式下游戏由后端初始化，前端不应执行本地初始化
    if (network.isInNetworkMode()) {
      console.warn('[initializeGame] 网络模式下游戏由服务器初始化，忽略前端初始化');
      return;
    }

    // 根据主题动态获取起始Tile
    const startingTile = getStartingTileForGame();
    
    const startTile: TileInstance = {
      instanceId: 'start_instance',
      defId: startingTile.id,
      x: 0,
      y: 0,
      rotation: 0,
      edges: startingTile.edges,
      hasEventTriggered: true,
      visibility: 'VISIBLE',
      droppedItems: []
    };

    const playersDict: Record<string, Player> = {};
    const ids: string[] = [];

    // 根据主题动态获取角色数据
    const characters = getCharactersForGame();
    
    characters.forEach((char, index) => {
      const id = `p${index + 1}`;
      ids.push(id);
      
      const initialSkillPoints = char.attributes[AttributeName.Knowledge].current;

      playersDict[id] = {
        id,
        character: char,
        position: { x: 0, y: 0 },
        items: [],
        buffs: [],
        skills: [],
        statusEffects: [],  // Phase 3: 状态效果
        isDead: false,
        team: 'UNASSIGNED',
        skillPoints: initialSkillPoints,
        unlockedSkillNodes: [],
        personalLogs: [{
            id: 'init_log',
            timestamp: Date.now(),
            text: '进入了大厦。',
            type: 'info'
        }],
        showTrail: false,
      };
    });

    // 根据主题动态获取游戏数据
    const themeTiles = getTilesForGame();
    const themeItems = getItemsForGame();
    const themeEvents = getEventsForGame();
    const themeOmens = getOmensForGame();
    
    console.log('[initializeGame] themeTiles:', themeTiles?.length);
    console.log('[initializeGame] themeItems type:', typeof themeItems, Array.isArray(themeItems));
    console.log('[initializeGame] themeEvents type:', typeof themeEvents, Array.isArray(themeEvents));
    console.log('[initializeGame] themeOmens type:', typeof themeOmens, Array.isArray(themeOmens));
    
    // 确保数据是数组
    const tilesArray = Array.isArray(themeTiles) ? themeTiles : [];
    const eventsArray = Array.isArray(themeEvents) ? themeEvents : [];
    const itemsArray = Array.isArray(themeItems) ? themeItems : [];
    const omensArray = Array.isArray(themeOmens) ? themeOmens : [];

    console.log('[initializeGame] Starting set state...');
    
    set({
      players: playersDict,
      playerIds: ids,
      activePlayerId: ids[0] || '',
      map: { "0,0": startTile },
      tileDeck: [...tilesArray].sort(() => Math.random() - 0.5),
      decks: {
        EVENT: [...eventsArray].sort(() => Math.random() - 0.5),
        ITEM: [...itemsArray].sort(() => Math.random() - 0.5),
        OMEN: [...omensArray].sort(() => Math.random() - 0.5),
      },
      logs: [{
        id: 'init_log',
        timestamp: Date.now(),
        text: '大厦沉重的大门在你们身后砰然关上。',
        type: 'narrative'
      }],
      movesRemaining: playersDict[ids[0]]?.character?.attributes[AttributeName.Speed]?.current ?? 0,
      turnIndex: 1,
      turnPhase: 'MOVING',
      phase: GamePhase.Exploration,
      pendingTile: null,
      activeCard: null,
      lastRollResult: null,
      activeRoll: null,
      activeCombat: null,
      eventOutcome: null,
      omenCount: 0,
      isHauntActive: false,
      currentScenario: null,
      traitorId: null,
      lastTriggeredOmen: null,
      lastTriggeredTile: null,
      pendingAction: null,
      isInventoryOpen: false,
      isInteractionModalOpen: false,
      isSkillTreeOpen: false,
      inspectPlayerId: null,
      pendingInteractionEffects: null,
    });
  },

  addLog: (text, type = 'info') => {
      set(s => ({ logs: [{ id: generateId('log'), timestamp: Date.now(), text, type }, ...s.logs] }));
  },

  addPersonalLog: (playerId, text, type = 'info') => {
      set(s => {
          const player = s.players[playerId];
          if (!player) return {};
          // 防御性检查：确保 personalLogs 存在
          const existingLogs = player.personalLogs || [];
          const newLogs = [{ id: generateId('plog'), timestamp: Date.now(), text, type }, ...existingLogs];
          return {
              players: {
                  ...s.players,
                  [playerId]: { ...player, personalLogs: newLogs }
              }
          };
      });
  },

  nextTurn: () => {
    const state = get();
    console.log('[nextTurn] called', {
      turnPhase: state.turnPhase,
      activeCard: !!state.activeCard,
      activeRoll: !!state.activeRoll,
      pendingTile: !!state.pendingTile,
      activeCombat: !!state.activeCombat,
      isNetworkMode: network.isInNetworkMode()
    });
    if (!network.isInNetworkMode()) {
        get().showFeedback("网络未连接，无法结束回合", "error");
        return;
    }
    network.sendEndTurn();
    get().showFeedback("正在结束回合...", "info");
  },

  movePlayer: (direction: Direction) => {
    const state = get();
    
    if (!network.isInNetworkMode()) {
      state.showFeedback("网络未连接，无法移动", "error");
      return;
    }
    
    // 前置检查（与后端一致）
    if (state.activeCard || state.pendingTile || state.activeRoll || state.phase === GamePhase.HauntRoll || state.activeCombat) {
        state.showFeedback("等待当前交互完成", "warning");
        return;
    }
    
    if (state.turnPhase === 'DONE') {
        state.showFeedback("你的回合已结束", "warning");
        return;
    }
    
    if (state.movesRemaining <= 0) {
      state.showFeedback("体力已耗尽", "error");
      return;
    }
    
    const player = state.players[state.activePlayerId];
    if (!player) return;
    
    const currentTile = state.map[`${player.position.x},${player.position.y}`];
    if (!currentTile) return;
    
    const currentEdge = currentTile.edges[direction];
    
    // PHASING buff 可以穿墙
    if (currentEdge === 'WALL' && !player.buffs.includes('PHASING')) {
      state.showFeedback("前方无路", "error");
      return;
    }
    
    // 发送移动请求到后端
    network.sendMove(direction);
    state.showFeedback("正在移动...", "info");
  },

  handlePlayerDeath: (playerId: string) => {
    const state = get();
    const player = state.players[playerId];
    if (!player || player.isDead) return;

    // Bug Fix: 在网络模式下，死亡处理应由后端完成，不应前端直接修改状态
    // 前端只负责显示后端广播的状态变化
    if (network.isInNetworkMode()) {
      console.warn('handlePlayerDeath 在网络模式下被调用，但死亡处理应由后端执行');
      // 不直接修改状态，等待后端 state_sync
      return;
    }

    get().addPersonalLog(playerId, '遭受了致命伤害，不幸阵亡。', 'alert');

    const playerPos = `${player.position.x},${player.position.y}`;
    const tile = state.map[playerPos];

    const updatedTile = {
      ...tile,
      droppedItems: [...tile.droppedItems, ...player.items]
    };

    const newPlayers = { ...state.players };
    newPlayers[playerId] = {
      ...newPlayers[playerId],
      isDead: true,
      items: []
    };

    set({
      players: newPlayers,
      map: { ...state.map, [playerPos]: updatedTile },
      turnPhase: 'DONE',
      activeCard: null,
      activeRoll: null,
      activeCombat: null,
      isInteractionModalOpen: false,
      isSkillTreeOpen: false,
      pendingInteractionEffects: null,
    });

    state.addLog(`${player.character.name} 在大厦中殒落了... 随身物品散落了一地。`, 'alert');
    state.showFeedback(`${player.character.name} 已阵亡`, 'death');
  },

  pickupItemFromTile: (itemId: string) => {
    const state = get();
    
    if (!network.isInNetworkMode()) {
      state.showFeedback("网络未连接，无法拾取物品", "error");
      return;
    }
    
    network.sendPickupItem(itemId);
    state.showFeedback("正在拾取...", "info");
  },

  giveItem: (fromId: string, toId: string, itemId: string) => {
    const state = get();
    
    if (!network.isInNetworkMode()) {
      state.showFeedback("网络未连接，无法交付物品", "error");
      return;
    }
    
    network.sendGiveItem(toId, itemId);
    state.showFeedback("正在交付物品...", "info");
  },

  startCombat: (attackerId: string, defenderId: string, attribute: AttributeName) => {
    if (!network.isInNetworkMode()) {
        get().showFeedback("网络未连接，无法发起战斗", "error");
        return;
    }
    network.sendStartCombat(defenderId, attribute);
  },

  debugForceHaunt: () => {
    const state = get();
    
    // Bug Fix: 发送请求到后端，而不是直接修改状态
    if (!network.isInNetworkMode()) {
      state.showFeedback("网络未连接，无法强制触发作祟", "error");
      return;
    }
    
    network.sendForceHaunt();
    state.showFeedback("正在强制触发作祟...", "warning");
  },

  executeScript: (actions: ScriptAction[]) => {
      const state = get();
      
      // Bug Fix: 在网络模式下，脚本应由后端执行，前端不应直接修改状态
      // 如果是本地模式，才执行脚本
      if (network.isInNetworkMode()) {
        console.warn('executeScript 在网络模式下被调用，脚本应由后端执行，忽略前端执行');
        // 发送日志提示，但不执行脚本
        // 后端会执行效果并通过 state_sync 广播结果
        state.showFeedback('等待服务器处理...', 'info');
        return;
      }
      
      // 深拷贝 players，避免修改原始状态
      const newPlayers = JSON.parse(JSON.stringify(state.players)) as typeof state.players;
      const currentPlayerId = state.activePlayerId;
      
      let deathTriggeredIds: string[] = [];

      actions.forEach(action => {
          // If we are executing conditional logic from CHOICE, action may have logic-style 'IF'
          // We need to support basic logic execution here too, or delegate to logicEngine
          // For now, we support the standard ScriptAction types + simplified logic hooks

          const targetId = action.target === 'self' || !action.target ? currentPlayerId : action.target;
          const player = newPlayers[targetId];
          if (!player && action.target !== 'all') return; // Basic validation

          switch(action.type) {
              case 'draw_card': {
                  if (action.deck && action.deck !== 'NONE') {
                      state.drawCard(action.deck);
                  }
                  break;
              }
              case 'modify_stat': {
                  if (action.attribute && action.amount) {
                      const attr = player.character.attributes[action.attribute];
                      const damageMitigation = player.buffs.includes('伤害减免 +1') && action.amount < 0 ? 1 : 0;
                      const actualAmount = action.amount < 0 ? Math.min(0, action.amount + damageMitigation) : action.amount;

                      const oldVal = attr.current;
                      const newVal = attr.current + actualAmount;
                      
                      if (newVal <= attr.floor) {
                          deathTriggeredIds.push(targetId);
                          attr.current = attr.floor;
                      } else {
                          attr.current = Math.min(attr.max, newVal);
                      }
                      
                      if (actualAmount !== 0) {
                          get().addPersonalLog(targetId, `${action.attribute} ${actualAmount > 0 ? '+' : ''}${actualAmount} (当前: ${attr.current})`, actualAmount > 0 ? 'success' : 'alert');
                      }
                      
                      if (action.message) state.addLog(action.message, actualAmount > 0 ? 'success' : 'alert');
                  }
                  break;
              }
              case 'heal': {
                  if (action.attribute && action.amount) {
                      const attr = player.character.attributes[action.attribute];
                      const oldVal = attr.current;
                      attr.current = Math.min(attr.max, attr.current + action.amount);
                      if (attr.current !== oldVal) {
                           get().addPersonalLog(targetId, `${action.attribute} 恢复了 ${action.amount} 点。`, 'success');
                      }
                  }
                  break;
              }
              case 'add_item': {
                  if (action.itemId) {
                      const item = ITEMS_DB[action.itemId];
                      if (item) {
                          player.items.push(item);
                          state.addLog(`获得了 ${item.name}`, 'success');
                          get().addPersonalLog(targetId, `获得了物品: ${item.name}。`, 'success');
                      }
                  }
                  break;
              }
              case 'remove_item': {
                  if (action.itemId) {
                      const itemIndex = player.items.findIndex(item => item.id === action.itemId);
                      if (itemIndex >= 0) {
                          const removedItem = player.items.splice(itemIndex, 1)[0];
                          state.addLog(`失去了 ${removedItem.name}`, 'alert');
                          get().addPersonalLog(targetId, `失去了物品: ${removedItem.name}。`, 'alert');
                      }
                  }
                  break;
              }
              case 'move_player': {
                  if (action.location === 'basement') state.addLog("你掉到了地下室！", 'alert');
                  break;
              }
              case 'narrative_log': {
                  if (action.message) state.addLog(action.message, 'narrative');
                  break;
              }
              case 'damage': {
                  // 伤害效果 - 等同于 reduce stat
                  if (action.amount) {
                      const attr = player.character.attributes['might'];
                      const damageMitigation = player.buffs.includes('伤害减免 +1') ? 1 : 0;
                      const actualAmount = Math.min(0, -Math.abs(action.amount) + damageMitigation);
                      
                      const oldVal = attr.current;
                      const newVal = attr.current + actualAmount;
                      
                      if (newVal <= attr.floor) {
                          deathTriggeredIds.push(targetId);
                          attr.current = attr.floor;
                      } else {
                          attr.current = Math.min(attr.max, newVal);
                      }
                      
                      if (action.message) state.addLog(action.message, 'alert');
                      get().addPersonalLog(targetId, `受到 ${Math.abs(action.amount)} 点伤害 (实际: ${Math.abs(actualAmount)})`, 'alert');
                  }
                  break;
              }
              case 'teleport': {
                  // 传送效果 - 传送到随机位置或指定位置
                  if (action.destination === 'random' || action.destination === 'any') {
                      // 找到所有可见且空闲的地块
                      const availableTiles = Object.entries(state.map)
                          .filter(([_, tile]) => tile.visibility === 'VISIBLE')
                          .filter(([key, tile]) => {
                              const [x, y] = key.split(',').map(Number);
                              return !Object.values(state.players).some(p => p.position.x === x && p.position.y === y && !p.isDead);
                          });
                      
                      if (availableTiles.length > 0) {
                          const randomTile = availableTiles[Math.floor(Math.random() * availableTiles.length)];
                          const [tx, ty] = randomTile[0].split(',').map(Number);
                          player.position = { x: tx, y: ty };
                          state.addLog(`你被传送到随机位置！`, 'narrative');
                      }
                  } else if (action.destination === 'basement') {
                      state.addLog("你掉到了地下室！", 'alert');
                  }
                  break;
              }
              case 'gain_item': {
                  // gain_item 是 add_item 的别名
                  if (action.itemId) {
                      const item = ITEMS_DB[action.itemId];
                      if (item) {
                          player.items.push(item);
                          state.addLog(`获得了 ${item.name}`, 'success');
                          get().addPersonalLog(targetId, `获得了物品: ${item.name}。`, 'success');
                      }
                  }
                  break;
              }
              case 'reveal_all_tiles': {
                  // 揭示所有地块
                  const newMap = { ...state.map };
                  Object.keys(newMap).forEach(key => {
                      newMap[key] = { ...newMap[key], visibility: 'VISIBLE' };
                  });
                  set({ map: newMap });
                  state.addLog(`地图已完全揭示！`, 'success');
                  break;
              }
              case 'reveal_next_event': {
                  // 揭示下一个事件（暂为提示）
                  state.addLog(`你感觉到前方有重要的事件即将发生...`, 'info');
                  break;
              }
              case 'reveal_trail': {
                  // 显示足迹
                  if (newPlayers[targetId]) {
                      newPlayers[targetId].showTrail = true;
                      state.addLog(`足迹已在地图上标记`, 'info');
                  }
                  break;
              }
              case 'reroll_dice': {
                  // 重掷骰子（需要前端支持）
                  state.addLog(`你可以重新投掷骰子！`, 'info');
                  break;
              }
              case 'reveal_map': {
                  // 揭示地图（等同于揭示所有地块）
                  const revealMap = { ...state.map };
                  Object.keys(revealMap).forEach(key => {
                      revealMap[key] = { ...revealMap[key], visibility: 'VISIBLE' };
                  });
                  set({ map: revealMap });
                  state.addLog(`地图已揭示！`, 'success');
                  break;
              }
              // Basic support for logic embedded in events (like "IF HAS_ITEM")
              // In a real scenario, we'd use logicEngine entirely, but here we bridge.
              // We'll rely on logicEngine for complex skill execution, but event scripts are simple.
              // If an action has a 'condition' (not in standard ScriptAction yet), we skip.
          }
      });

      set({ players: newPlayers });

      deathTriggeredIds.forEach(id => {
          get().handlePlayerDeath(id);
      });
  },

  resolveEventChoice: (actions: ScriptAction[], choiceIndex?: number) => {
      if (!network.isInNetworkMode()) {
          get().showFeedback("网络未连接，无法进行选择", "error");
          return;
      }
      if (choiceIndex === undefined) {
          get().showFeedback("无效的选择", "error");
          return;
      }
      // 发送选择到后端，等待 state_sync 更新状态
      network.sendResolveEvent(choiceIndex);
  },

  executeLogicAction: (action: ActionDefinition, selectedPartnerId?: string) => {
    if (!network.isInNetworkMode()) {
        get().showFeedback("网络未连接，无法执行技能", "error");
        return;
    }
    network.sendExecuteSkill(action.id || action.name, selectedPartnerId);
  },
  
  unlockSkillNode: (nodeId: string) => {
      if (!network.isInNetworkMode()) {
          get().showFeedback("网络未连接，无法解锁技能", "error");
          return;
      }
      
      const state = get();
      const player = state.players[state.activePlayerId];
      
      // Find the node
      let nodeToUnlock = null;
      for (const tree of SKILL_TREES) {
          const found = tree.nodes.find(n => n.id === nodeId);
          if (found) {
              nodeToUnlock = found;
              break;
          }
      }
      
      if (!nodeToUnlock) return;
      
      if (player.skillPoints < nodeToUnlock.cost) {
          get().showFeedback("技能点不足", "error");
          return;
      }
      
      // 立即更新UI（乐观更新技能点）
      const newPlayers = { ...state.players };
      const updatedPlayer = { ...newPlayers[state.activePlayerId] };
      updatedPlayer.skillPoints -= nodeToUnlock.cost;
      newPlayers[state.activePlayerId] = updatedPlayer;
      set({ players: newPlayers });
      
      get().showFeedback(`解锁 ${nodeToUnlock.name}...`, "info");
      
      // 发送解锁请求到后端（后端会处理技能解锁并广播state_sync）
      network.sendUnlockSkillNode(nodeId);
  },

  rotatePendingTile: () => set(s => ({ pendingTileRotation: (s.pendingTileRotation + 90) % 360 })),

  confirmTilePlacement: () => {
    const state = get();
    
    if (!network.isInNetworkMode()) {
      state.showFeedback("网络未连接，无法放置房间", "error");
      return;
    }
    
    if (!state.isPlacementValid()) {
        state.showFeedback("门必须相连", "error");
        return;
    }
    const { pendingMoveDirection } = state;
    if (!pendingMoveDirection) {
        state.showFeedback("没有待放置的房间", "error");
        return;
    }
    
    network.sendPlaceTile(pendingMoveDirection);
    state.showFeedback("正在放置房间...", "info");
  },

  isPlacementValid: () => {
    const { pendingTile, pendingTileRotation, pendingTargetPosition, pendingMoveDirection, map } = get();
    if (!pendingTile || !pendingTargetPosition || !pendingMoveDirection) return false;
    if (map[`${pendingTargetPosition.x},${pendingTargetPosition.y}`]) return false;
    const rotatedEdges = getRotatedEdges(pendingTile.edges, pendingTileRotation);
    // 必须精确匹配 'OPEN'，与后端保持一致
    return rotatedEdges[getOpposite(pendingMoveDirection)] === 'OPEN';
  },

  cancelTilePlacement: () => {
    const state = get();
    if (!state.pendingTile) return;

    if (network.isInNetworkMode()) {
      // 乐观更新：立即清除放置状态避免 UI 残留，后端 state_sync 会确认
      set({
        pendingTile: null,
        pendingTargetPosition: null,
        pendingMoveDirection: null,
        pendingTileRotation: 0,
      });
      network.sendCancelTilePlacement();
      return;
    }

    // 本地模式降级：归还牌和步数
    set({
      tileDeck: [state.pendingTile, ...state.tileDeck],
      pendingTile: null,
      pendingTargetPosition: null,
      pendingMoveDirection: null,
      pendingTileRotation: 0,
      movesRemaining: state.movesRemaining + 1,
    });
  },

  drawCard: (type: CardSymbol) => {
      if (!network.isInNetworkMode()) {
          get().showFeedback("网络未连接，无法抽卡", "error");
          return;
      }
      network.sendDrawCard(type);
  },

  triggerSpecificEvent: (eventId: string) => {
      const event = get().getEventById(eventId);
      if (event) set({ activeCard: event });
  },

    acknowledgeEventOutcome: () => {
     set({
        activeCard: null,
        activeRoll: null,
        lastRollResult: null,
        lastCheckSuccess: null,
        eventOutcome: null
        // Bug Fix: 移除 turnPhase: 'DONE'，网络模式下应由后端 state_sync 控制
     });
  },
  incrementOmenCount: () => set(s => ({ omenCount: s.omenCount + 1 })),

  performHauntRoll: () => {
      const state = get();
      set({
        activeRoll: {
          id: 'haunt_roll',
          attributeName: '作祟检定',
          numberOfDice: 6,
          targetValue: state.omenCount,
          onComplete: (total) => {
              // Bug Fix: 使用 get() 获取最新的 omenCount，而不是闭包中捕获的旧 state
              const currentOmenCount = get().omenCount;
              if (total < currentOmenCount) {
                  set({
                    isHauntActive: true,
                    phase: GamePhase.HauntReveal,
                    activeRoll: null,
                    lastRollResult: total
                  });
              } else {
                  set({
                    phase: GamePhase.Exploration,
                    activeRoll: null,
                    lastRollResult: total,
                    turnPhase: 'DONE'
                  });
              }
          }
        }
      });
  },

  startHaunt: () => {
    const state = get();
    
    // Bug Fix: 发送请求到后端，而不是直接修改状态
    // 后端 processHauntRoll 会计算骰子并触发作祟
    if (!network.isInNetworkMode()) {
      state.showFeedback("网络未连接，无法执行作祟检定", "error");
      return;
    }
    
    // 发送 perform_haunt_roll 请求
    network.sendPerformHauntRoll();
    
    state.showFeedback("正在执行作祟检定...", "info");
  },

  setHoveredTileId: (id) => set({ hoveredTileId: id }),

  setState: (fn) => set(fn),
  inventoryOpen: () => set({ isInventoryOpen: true }),
  toggleInventory: () => set(s => ({ isInventoryOpen: !s.isInventoryOpen })),
  toggleInteractionModal: () => set(s => ({ isInteractionModalOpen: !s.isInteractionModalOpen })),
  toggleSkillTree: () => set(s => ({ isSkillTreeOpen: !s.isSkillTreeOpen })),
  
  openInspection: (playerId) => set({ inspectPlayerId: playerId }),
  closeInspection: () => set({ inspectPlayerId: null }),

  useItem: (itemId: string, targetId?: string) => {
      if (!network.isInNetworkMode()) {
          get().showFeedback("网络未连接，无法使用物品", "error");
          return;
      }
      network.sendUseItem(itemId, targetId);
  },

  dropItem: (itemId) => {
      const state = get();
      
      if (!network.isInNetworkMode()) {
        state.showFeedback("网络未连接，无法丢弃物品", "error");
        return;
      }
      
      network.sendDropItem(itemId);
      state.showFeedback("正在丢弃...", "info");
  },

  interactWithWall: (direction) => {
      const state = get();
      
      if (!network.isInNetworkMode()) {
        state.showFeedback("网络未连接，无法破坏墙壁", "error");
        return;
      }
      
      network.sendInteractWithWall(direction);
      state.showFeedback("正在破坏墙壁...", "info");
  },
  
  cancelActiveRoll: () => {
    const state = get();
    // If we are in active combat and cancel the roll, we should likely cancel the combat state too
    if (state.activeCombat) {
        set({ activeRoll: null, activeCombat: null });
        state.addLog("已取消战斗行动。", "info");
    } else {
        set({ activeRoll: null });
    }
  }
}));
