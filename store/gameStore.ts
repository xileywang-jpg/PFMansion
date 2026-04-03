
import { create } from 'zustand';
import { 
  Player, TileInstance, TileDef, GamePhase, Direction, 
  CardDef, CardSymbol, LogEntry, AttributeName, TurnPhase, ScriptAction, Item, ActiveRoll, DirectionalEdges, EventCard,
  CombatState, CombatResult,
  Scenario, GameNPC, PendingAction, GameUiState, FeedbackType, CardRevealState, InteractionState,
  RoomInteractionDialogState, TileInteraction
} from '../types';
import { ActionDefinition } from '../types/Logic';
import { GameDataBundle } from '../src/services/gameData';
import { addStatusEffect, decrementStatusEffects, applyStatusEffectOnTurnStart } from '../utils/statusEffects';
import { generateId } from '../utils/idGenerator';
import * as network from '../ws/network';
import {
  getAllEvents as readAllEvents,
  getAllItems as readAllItems,
  getAllOmens as readAllOmens,
  getAllSkills as readAllSkills,
  getCharacterById as readCharacterById,
  getCharactersByTheme as readCharactersByTheme,
  getEventById as readEventById,
  getItemById as readItemById,
  getOmenById as readOmenById,
  getScenarioById as readScenarioById,
  getScenarios as readScenarios,
  getSkillTrees as readSkillTrees,
  getSkillNodeById as readSkillNodeById,
  getSkillById as readSkillById,
  getTileById as readTileById,
  getTilesByTheme as readTilesByTheme,
} from './gameDataCatalog';

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
  
  activeCard: EventCard | null;
  decks: {
    EVENT: CardDef[];
    ITEM: Item[];
    OMEN: Item[];
  };
  lastRollResult: number | null;
  lastCheckSuccess: boolean | null; // 后端返回的检定成功/失败判定

  activeRoll: ActiveRoll | null;
  activeCombat: CombatState | null;
  combatResult: CombatResult | null;
  
  // Phase X: NPC 系统
  npcs: Record<string, GameNPC>;

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
  pendingAction: PendingAction | null;
  interactionState: InteractionState | null;

  pendingTile: TileDef | null;
  pendingTileRotation: number;
  pendingTargetPosition: { x: number, y: number } | null;
  pendingMoveDirection: Direction | null;

  ui: GameUiState;

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
  getSkillTrees: () => any[];
  getSkillNodeById: (id: string) => any | undefined;
  getScenarios: () => Record<string, any>;
  getScenarioById: (id: string) => any | undefined;
  getTilesByTheme: (theme?: string) => any[];
  getTileById: (id: string, theme?: string) => any | undefined;
  getCharactersByTheme: (theme?: string) => any[];
  getCharacterById: (id: string, theme?: string) => any | undefined;

  nextTurn: () => void;
  movePlayer: (direction: Direction) => void;
  rotatePendingTile: () => void;
  confirmTilePlacement: () => void;
  cancelTilePlacement: () => void;
  drawCard: (type: CardSymbol) => void;
  resolveEventChoice: (actions: ScriptAction[], choiceIndex?: number) => void;
  incrementOmenCount: () => void;
  performHauntRoll: () => void; 
  startHaunt: () => void;
  addLog: (text: string, type?: LogEntry['type']) => void;
  // NEW: Personal Log
  addPersonalLog: (playerId: string, text: string, type?: LogEntry['type']) => void;

  setHoveredTileId: (id: string | null) => void;
  
  showFeedback: (message: string, type?: 'error' | 'info' | 'warning' | 'turn' | 'death' | 'alert' | 'success') => void;
  pickupItemFromTile: (itemId: string) => void;
  giveItem: (fromId: string, toId: string, itemId: string) => void;

  startCombat: (attackerId: string, defenderId: string, attribute: AttributeName) => void;

  debugForceHaunt: () => void;

  executeLogicAction: (action: ActionDefinition, selectedPartnerId?: string) => void;
  unlockSkillNode: (nodeId: string) => void; 

  setState: (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void;
  patchUi: (partial: Partial<GameUiState> | ((ui: GameUiState) => Partial<GameUiState>)) => void;

  inventoryOpen: () => void; 
  toggleInventory: () => void;
  openTradeInteraction: () => void;
  openTileInteraction: (interaction: TileInteraction, tileId?: string | null) => void;
  setRoomInteractionDialog: (dialog: RoomInteractionDialogState) => void;
  closeRoomInteraction: () => void;
  toggleSkillTree: () => void; 
  
  openInspection: (playerId: string) => void;
  closeInspection: () => void;

  useItem: (itemId: string, targetId?: string) => void;
  dropItem: (itemId: string) => void;
  
  interactWithWall: (direction: Direction) => void;
  cancelActiveRoll: () => void;
  dismissCombatResult: () => void;
  showCardReveal: (card: CardRevealState['card'], deck: CardRevealState['deck'], onConfirmAction?: () => void) => void;
  closeCardReveal: () => void;

  isPlacementValid: () => boolean;
  // 兼容展示层调用，当前直接返回后端同步后的权威属性值。
  getEffectiveAttributeValue: (playerId: string, attribute: AttributeName) => number;
}

const initialUiState: GameUiState = {
  hoveredTileId: null,
  isInventoryOpen: false,
  roomInteractionDialog: { kind: 'CLOSED' },
  isSkillTreeOpen: false,
  inspectPlayerId: null,
  pendingInteractionEffects: null,
  cardRevealModal: null,
  activeFeedback: null,
};

const getOpposite = (dir: Direction): Direction => {
  switch (dir) {
    case Direction.North: return Direction.South;
    case Direction.South: return Direction.North;
    case Direction.East: return Direction.West;
    case Direction.West: return Direction.East;
  }
};

const CONNECTABLE_EDGES = new Set(['OPEN', 'RUBBLE', 'SECRET_DOOR']);

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
  combatResult: null,
  activeCombat: null,
  npcs: {},
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
  interactionState: null,
  pendingTile: null,
  pendingTileRotation: 0,
  pendingTargetPosition: null,
  pendingMoveDirection: null,
  ui: initialUiState,

  // 游戏静态数据
  gameData: null,
  dataLoaded: false,
  setGameData: (data: GameDataBundle) => set({ gameData: data, dataLoaded: true }),

  showFeedback: (message: string, type: FeedbackType = 'error') => {
    set(s => ({ ui: { ...s.ui, activeFeedback: { message, type } } }));
    const duration = (type === 'turn' || type === 'death') ? 2500 : 2000;
    setTimeout(() => {
      if (get().ui.activeFeedback?.message === message) {
        set(s => ({ ui: { ...s.ui, activeFeedback: null } }));
      }
    }, duration);
  },

  getEffectiveAttributeValue: (playerId: string, attribute: AttributeName): number => {
      return get().players[playerId]?.character.attributes[attribute].current ?? 0;
  },

  // ==================== 数据访问辅助函数 ====================
  // 注意: 静态数据必须来自后端 API /api/game/data

  // 获取所有物品
  getAllItems: (): any[] => {
    return readAllItems(get().gameData);
  },

  // 根据ID获取物品
  getItemById: (id: string): any | undefined => {
    return readItemById(get().gameData, id);
  },

  // 获取所有厄运
  getAllOmens: (): any[] => {
    return readAllOmens(get().gameData);
  },

  // 根据ID获取厄运
  getOmenById: (id: string): any | undefined => {
    return readOmenById(get().gameData, id);
  },

  // 获取所有事件
  getAllEvents: (): any[] => {
    return readAllEvents(get().gameData);
  },

  // 根据ID获取事件
  getEventById: (id: string): any | undefined => {
    return readEventById(get().gameData, id);
  },

  // 获取所有技能
  getAllSkills: (): any[] => {
    return readAllSkills(get().gameData);
  },

  // 根据ID获取技能
  getSkillById: (id: string): any | undefined => {
    return readSkillById(get().gameData, id);
  },

  // 获取技能树
  getSkillTrees: (): any[] => {
    return readSkillTrees(get().gameData);
  },

  // 根据ID获取技能节点
  getSkillNodeById: (id: string): any | undefined => {
    return readSkillNodeById(get().gameData, id);
  },

  // 获取剧本
  getScenarios: (): Record<string, any> => {
    return readScenarios(get().gameData);
  },

  // 根据ID获取剧本
  getScenarioById: (id: string): any | undefined => {
    return readScenarioById(get().gameData, id);
  },

  // 获取地图（根据主题）
  getTilesByTheme: (theme: string = 'original'): any[] => {
    return readTilesByTheme(get().gameData, theme);
  },

  // 根据ID获取地图 (自动识别主题)
  getTileById: (id: string, theme?: string): any | undefined => {
    return readTileById(get().gameData, id, theme);
  },

  // 获取角色（根据主题）
  getCharactersByTheme: (theme: string = 'original'): any[] => {
    return readCharactersByTheme(get().gameData, theme);
  },

  // 根据ID获取角色
  getCharacterById: (id: string, theme: string = 'original'): any | undefined => {
    return readCharacterById(get().gameData, id, theme);
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
    if (state.activeCard || state.interactionState) {
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
    
    if (currentEdge === 'WALL') {
      state.showFeedback("该方向没有门", "error");
      return;
    }
    
    // 发送移动请求到后端
    network.sendMove(direction);
    state.showFeedback("正在移动...", "info");
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
      
        const nodeToUnlock = state.getSkillNodeById(nodeId);
      
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
    
    if (state.interactionState?.type !== 'TILE_PLACEMENT') {
      state.showFeedback("当前没有可放置的房间", "warning");
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
    return CONNECTABLE_EDGES.has(rotatedEdges[getOpposite(pendingMoveDirection)]);
  },

  cancelTilePlacement: () => {
    const state = get();
    if (state.interactionState?.type !== 'TILE_PLACEMENT' || !state.pendingTile) return;

    if (network.isInNetworkMode()) {
      state.showFeedback("正在取消放置...", "info");
      network.sendCancelTilePlacement();
      return;
    }

    state.showFeedback("网络未连接，无法取消放置，请等待重连或重新进入房间", "error");
  },

  drawCard: (type: CardSymbol) => {
      if (!network.isInNetworkMode()) {
          get().showFeedback("网络未连接，无法抽卡", "error");
          return;
      }
      network.sendDrawCard(type);
  },
  incrementOmenCount: () => set(s => ({ omenCount: s.omenCount + 1 })),

  performHauntRoll: () => {
      const state = get();

      if (!network.isInNetworkMode()) {
        state.showFeedback("网络未连接，无法执行作祟检定", "error");
        return;
      }

      if (state.interactionState?.type !== 'HAUNT_ROLL' && state.phase !== GamePhase.HauntRoll) {
        state.showFeedback("当前不在作祟检定阶段", "warning");
        return;
      }

      if (state.activeRoll) {
        return;
      }

      set({
        activeRoll: {
          id: `haunt:${state.activePlayerId}:${state.omenCount}`,
          rollType: 'HAUNT',
          attributeName: '作祟',
          numberOfDice: 6,
          targetValue: state.omenCount,
          title: '作祟检定',
          description: `投掷 6 枚骰子，若结果小于当前预兆数 ${state.omenCount} 则作祟爆发。`,
          actionLabel: '掷出命运骰子',
          confirmLabel: '确认结果',
          onComplete: () => {},
        },
        lastRollResult: null,
        lastCheckSuccess: null,
      });
      state.showFeedback("作祟检定开始，掷出六枚命运骰子。", "alert");
  },

  startHaunt: () => {
    get().performHauntRoll();
  },

  setState: (fn) => set(fn),
  patchUi: (partial) => set(s => ({
    ui: {
      ...s.ui,
      ...(typeof partial === 'function' ? partial(s.ui) : partial),
    },
  })),
  setHoveredTileId: (id) => set(s => ({ ui: { ...s.ui, hoveredTileId: id } })),
  inventoryOpen: () => set(s => ({ ui: { ...s.ui, isInventoryOpen: true } })),
  toggleInventory: () => set(s => ({ ui: { ...s.ui, isInventoryOpen: !s.ui.isInventoryOpen } })),
  openTradeInteraction: () => set(s => ({
    ui: {
      ...s.ui,
      roomInteractionDialog: { kind: 'TRADE' },
    },
  })),
  openTileInteraction: (interaction, tileId) => set(s => ({
    ui: {
      ...s.ui,
      roomInteractionDialog: {
        kind: 'PROMPT',
        interaction,
        tileId: tileId ?? null,
      },
    },
  })),
  setRoomInteractionDialog: (dialog) => set(s => ({
    ui: {
      ...s.ui,
      roomInteractionDialog: dialog,
    },
  })),
  closeRoomInteraction: () => set(s => ({
    ui: {
      ...s.ui,
      roomInteractionDialog: { kind: 'CLOSED' },
      pendingInteractionEffects: null,
    },
  })),
  toggleSkillTree: () => set(s => ({ ui: { ...s.ui, isSkillTreeOpen: !s.ui.isSkillTreeOpen } })),
  
  openInspection: (playerId) => set(s => ({ ui: { ...s.ui, inspectPlayerId: playerId } })),
  closeInspection: () => set(s => ({ ui: { ...s.ui, inspectPlayerId: null } })),

  // 卡牌揭示弹窗
  showCardReveal: (card, deck, onConfirmAction) => {
    set(s => ({ 
      ui: {
        ...s.ui,
        cardRevealModal: { card, deck, onConfirmAction },
        activeFeedback: null,
      },
    }));
  },
  closeCardReveal: () => {
    const state = get();
    // 如果有确认动作，先执行它
    if (state.ui.cardRevealModal?.onConfirmAction) {
      // onConfirmAction 会在组件中被调用
    }
    set(s => ({ ui: { ...s.ui, cardRevealModal: null } }));
  },

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

  dismissCombatResult: () => {
    const state = get();

    if (network.isInNetworkMode()) {
      network.sendDismissCombatResult();
      return;
    }

    set({ combatResult: null });
  },
  
  cancelActiveRoll: () => {
    const state = get();

    set({ activeRoll: null });

    if (state.interactionState?.type === 'COMBAT') {
      state.addLog("已关闭本地投掷界面，等待服务器继续同步战斗状态。", "info");
    }
  }
}));
