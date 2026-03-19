
import { create } from 'zustand';
import { 
  Player, TileInstance, TileDef, GamePhase, Direction, 
  CardDef, CardSymbol, LogEntry, AttributeName, TurnPhase, ScriptAction, Item, ActiveRoll, DirectionalEdges,
  Scenario, EventOutcome
} from '../types';
import { ActionDefinition } from '../types/Logic';
import { 
  MOCK_CHARACTERS, STARTING_TILE, TILE_DECK, 
  MOCK_EVENTS_DECK, MOCK_ITEMS_DECK, MOCK_OMENS_DECK,
  getCharactersForGame, getTilesForGame, getItemsForGame, getEventsForGame, getOmensForGame, getStartingTileForGame
} from '../constants';
import { EVENTS_DB } from '../data/events';
import { ITEMS_DB } from '../data/items';
import { SCENARIOS_DB } from '../data/scenarios';
import { SKILL_TREES } from '../data/source/skillTrees';
import { getScenarioId } from '../data/hauntMatrix';
import { resolveTraitor, healTraitor } from '../utils/scenarioUtils';
import { evaluateCondition, executeEffects, GameContext, resolveTargets, handleTileTrigger, canInteractWithTile } from '../utils/logicEngine';
import { addStatusEffect, decrementStatusEffects, applyStatusEffectOnTurnStart, getStatusEffectModifiers } from '../utils/statusEffects';
import { generateId } from '../utils/idGenerator';
import * as network from '../ws/network';

interface CombatState {
  attackerId: string;
  defenderId: string;
  attribute: AttributeName;
  attackerRoll?: number;
  defenderRoll?: number;
  phase: 'ATTACKING' | 'DEFENDING' | 'RESOLUTION';
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

  activeRoll: ActiveRoll | null;
  activeCombat: CombatState | null;

  eventOutcome: EventOutcome | null;

  omenCount: number;
  isHauntActive: boolean;
  currentScenario: Scenario | null;
  traitorId: string | null;
  
  // Haunt Context
  lastTriggeredOmen: string | null;
  lastTriggeredTile: string | null;

  // Phase 1: 待处理动作 (网络同步)
  pendingAction: { type: string; target: string; data?: Record<string, unknown> } | null;

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

  activeFeedback: { message: string, type: 'error' | 'info' | 'warning' | 'turn' | 'death' } | null;

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
  resolveEventChoice: (actions: ScriptAction[]) => void;
  incrementOmenCount: () => void;
  performHauntRoll: () => void; 
  startHaunt: () => void;
  addLog: (text: string, type?: LogEntry['type']) => void;
  // NEW: Personal Log
  addPersonalLog: (playerId: string, text: string, type?: LogEntry['type']) => void;

  setHoveredTileId: (id: string | null) => void;
  
  showFeedback: (message: string, type?: 'error' | 'info' | 'warning' | 'turn' | 'death') => void;

  executeScript: (actions: ScriptAction[]) => void;
  handlePlayerDeath: (playerId: string) => void;
  pickupItemFromTile: (itemId: string) => void;
  giveItem: (fromId: string, toId: string, itemId: string) => void;

  startCombat: (attackerId: string, defenderId: string, attribute: AttributeName) => void;
  resolveCombatDamage: () => void;
  resolveCombatSteal: (itemId: string) => void;
  cancelCombat: () => void;

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
  activeRoll: null,
  activeCombat: null,
  eventOutcome: null,
  omenCount: 0,
  isHauntActive: false,
  currentScenario: null,
  traitorId: null,
  lastTriggeredOmenId: null,
  lastTriggeredTileId: null,
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

  showFeedback: (message: string, type = 'error') => {
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

  initializeGame: () => {
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
        }]
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
    const currentIndex = state.playerIds.indexOf(state.activePlayerId);
    
    let nextIndex = (currentIndex + 1) % state.playerIds.length;
    let nextId = state.playerIds[nextIndex];
    let attempts = 0;
    
    while (state.players[nextId].isDead && attempts < state.playerIds.length) {
      nextIndex = (nextIndex + 1) % state.playerIds.length;
      nextId = state.playerIds[nextIndex];
      attempts++;
    }

    if (attempts === state.playerIds.length) {
      set({ phase: GamePhase.GameOver });
      state.addLog("大厦赢了。所有人都在黑暗中陨落了...", 'alert');
      state.showFeedback("游戏结束：全员阵亡", "death");
      return;
    }

    // === 回合结束处理 ===
    // 处理当前玩家回合结束时的状态效果
    const currentPlayer = state.players[state.activePlayerId];
    if (currentPlayer.statusEffects && currentPlayer.statusEffects.length > 0) {
      const removedEffects = decrementStatusEffects(currentPlayer);
      if (removedEffects.length > 0) {
        state.addLog(`${currentPlayer.character.name} 的状态效果结束: ${removedEffects.join(', ')}`, 'info');
      }
    }

    const nextPlayer = state.players[nextId];
    const shouldGainSkillPoint = (state.turnIndex + 1) % 3 === 0;
    if (shouldGainSkillPoint) {
        state.addLog(`${nextPlayer.character.name} 在探索中获得了新的领悟 (+1 技能点)`, 'success');
        get().addPersonalLog(nextId, '随着探索深入，获得了 1 点技能点 (SP)。', 'success');
        const newPlayers = { ...state.players };
        newPlayers[nextId].skillPoints += 1;
        set({ players: newPlayers });
    }

    // 处理回合开始时的状态效果
    const nextPlayerBefore = state.players[nextId];
    if (nextPlayerBefore.statusEffects && nextPlayerBefore.statusEffects.length > 0) {
      const effectLogs = applyStatusEffectOnTurnStart(nextPlayerBefore);
      effectLogs.forEach(log => {
        state.addLog(`[${nextPlayerBefore.character.name}] ${log}`, 'info');
      });
      
      // 检查石化状态 - 无法行动
      if (nextPlayerBefore.statusEffects.some(e => e.type === 'PETRIFIED')) {
        state.addLog(`${nextPlayerBefore.character.name} 处于石化状态，无法行动！`, 'alert');
      }
    }

    // Use calculated speed (包含状态效果修正)
    const effectiveSpeed = get().getEffectiveAttributeValue(nextId, AttributeName.Speed);

    set({
      activePlayerId: nextId,
      movesRemaining: effectiveSpeed,
      turnPhase: 'MOVING',
      turnIndex: state.turnIndex + 1,
      activeCard: null,
      lastRollResult: null,
      pendingTile: null,
      activeRoll: null,
      activeCombat: null,
      eventOutcome: null,
      phase: state.phase === GamePhase.GameOver ? GamePhase.GameOver : (state.isHauntActive ? GamePhase.Haunt : GamePhase.Exploration),
      isInventoryOpen: false,
      isInteractionModalOpen: false,
      isSkillTreeOpen: false,
      inspectPlayerId: null,
      pendingInteractionEffects: null,
    });

    state.showFeedback(`${nextPlayer.character.name} 的回合`, 'turn');
    state.addLog(`第 ${state.turnIndex + 1} 回合：${nextPlayer.character.name} 开始行动。`, 'info');
  },

  movePlayer: (direction: Direction) => {
    const state = get();
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
    const currentTile = state.map[`${player.position.x},${player.position.y}`];
    const currentEdge = currentTile.edges[direction];
    
    if (currentEdge === 'WALL' && !player.buffs.includes('PHASING')) {
      state.showFeedback("前方无路", "error");
      return;
    }

    let newX = player.position.x;
    let newY = player.position.y;
    if (direction === Direction.North) newY--;
    else if (direction === Direction.South) newY++;
    else if (direction === Direction.East) newX++;
    else if (direction === Direction.West) newX--;

    const targetKey = `${newX},${newY}`;
    const existingTile = state.map[targetKey];

    if (existingTile) {
      if (!areConnected(direction, existingTile.edges) && !player.buffs.includes('PHASING')) {
        state.showFeedback("这扇门无法开启", "error");
        return;
      }
      
      const newPlayers = { ...state.players };
      newPlayers[state.activePlayerId] = {
          ...newPlayers[state.activePlayerId],
          position: { x: newX, y: newY }
      };

      // 获取当前位置的地块定义（用于离开触发）
      const currentTileDef = TILE_DECK.find(t => t.id === currentTile.defId) || STARTING_TILE;
      
      // 处理地块离开触发器
      if (currentTileDef.onLeave) {
        const leaveContext: GameContext = {
          state: get(),
          activePlayerId: state.activePlayerId
        };
        const leaveResult = handleTileTrigger(currentTileDef.onLeave, leaveContext);
        
        if (leaveResult.results.length > 0) {
          leaveResult.results.forEach(result => {
            if (result.type === 'modify_stat' || result.type === 'damage' || result.type === 'heal') {
              executeEffects([{
                type: result.type === 'damage' ? 'DAMAGE' : result.type === 'heal' ? 'HEAL' : 'MODIFY_STAT',
                target: { type: 'SELF' },
                stat: result.attribute,
                amount: result.amount
              }], leaveContext);
            }
            if (result.message) {
              state.addLog(result.message, leaveResult.success ? 'success' : 'alert');
            }
          });
        }
      }
      
      const newMoves = state.movesRemaining - 1;
      let nextPhase: TurnPhase = 'MOVING';
      const def = TILE_DECK.find(t => t.id === existingTile.defId) || STARTING_TILE;
      
      // 处理地块进入触发器
      if (def.onEnter) {
        const context: GameContext = {
          state: get(),
          activePlayerId: state.activePlayerId
        };
        const triggerResult = handleTileTrigger(def.onEnter, context);
        
        // 执行触发效果
        if (triggerResult.results.length > 0) {
          triggerResult.results.forEach(result => {
            if (result.type === 'modify_stat' || result.type === 'damage' || result.type === 'heal') {
              executeEffects([{
                type: result.type === 'damage' ? 'DAMAGE' : result.type === 'heal' ? 'HEAL' : 'MODIFY_STAT',
                target: { type: 'SELF' },
                stat: result.attribute,
                amount: result.amount
              }], context);
            }
            if (result.message) {
              state.addLog(result.message, triggerResult.success ? 'success' : 'alert');
            }
          });
        }
      }

      // 处理地块被动效果 (buffs/debuffs)
      if (def.effects && def.effects.length > 0) {
        const playerId = state.activePlayerId;
        const currentBuffs = newPlayers[playerId].buffs || [];
        const newBuffs = [...currentBuffs];
        
        def.effects.forEach(effect => {
          // 简单效果：buff/debuff 类型
          if (effect.type === 'buff' || effect.type === 'debuff') {
            if (!newBuffs.includes(effect.text)) {
              newBuffs.push(effect.text);
              state.addLog(`[${effect.type === 'buff' ? '增益' : '减益'}] ${effect.text}`, effect.type === 'buff' ? 'success' : 'warning');
            }
          }
          // 复杂效果：MODIFY_STAT 等
          else if (effect.type === 'MODIFY_STAT' || effect.type === 'modify_stat') {
            const attr = effect.stat || effect.attribute;
            const amount = effect.amount;
            if (attr && amount !== undefined) {
              const player = newPlayers[playerId];
              const targetAttr = player.character.attributes[attr];
              if (targetAttr) {
                const oldVal = targetAttr.current;
                const newVal = Math.min(targetAttr.max, Math.max(targetAttr.floor, targetAttr.current + amount));
                targetAttr.current = newVal;
                state.addLog(`[属性变化] ${attr} ${amount > 0 ? '+' : ''}${amount} (${oldVal} → ${newVal})`, amount > 0 ? 'success' : 'warning');
              }
            }
          }
          // 其他特殊效果
          else if (effect.type === 'MIRROR_REFLECT') {
            // 镜像反射效果 - 下一次攻击反射
            if (!newBuffs.includes('镜像反射')) {
              newBuffs.push('镜像反射');
              state.addLog(`[特殊增益] 镜像反射 (下次攻击反射)`, 'success');
            }
          }
        });
        
        newPlayers[playerId].buffs = newBuffs;
      }
      
      if (!existingTile.hasEventTriggered && (def.cardSymbol || def.eventTrigger)) {
          set({ movesRemaining: 0 }); 
          nextPhase = 'EVENT_RESOLVING';
          if (def.eventTrigger) get().triggerSpecificEvent(def.eventTrigger);
          else if (def.cardSymbol && def.cardSymbol !== 'NONE') get().drawCard(def.cardSymbol);
      }
      
      set({ players: newPlayers, movesRemaining: newMoves, turnPhase: (newMoves === 0 && nextPhase !== 'EVENT_RESOLVING') ? 'DONE' : nextPhase });
      state.addLog(`${player.character.name} 进入了 ${def.name}。`, 'info');
    } else {
      if (state.tileDeck.length === 0) {
        state.showFeedback("大厦已无处探索", "error");
        return;
      }
      const nextTileDef = state.tileDeck[0];
      set({
        movesRemaining: state.movesRemaining - 1,
        tileDeck: state.tileDeck.slice(1),
        pendingTile: nextTileDef,
        pendingTileRotation: 0,
        pendingTargetPosition: { x: newX, y: newY },
        pendingMoveDirection: direction
      });
    }
  },

  handlePlayerDeath: (playerId: string) => {
    const state = get();
    const player = state.players[playerId];
    if (!player || player.isDead) return;

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
    const player = state.players[state.activePlayerId];
    const playerPos = `${player.position.x},${player.position.y}`;
    const tile = state.map[playerPos];
    
    const itemIndex = tile.droppedItems.findIndex(i => i.id === itemId);
    if (itemIndex === -1) return;

    const item = tile.droppedItems[itemIndex];
    const newDroppedItems = tile.droppedItems.filter((_, i) => i !== itemIndex);
    
    const newPlayers = { ...state.players };
    newPlayers[state.activePlayerId] = {
      ...newPlayers[state.activePlayerId],
      items: [...newPlayers[state.activePlayerId].items, item]
    };

    set({
      players: newPlayers,
      map: { ...state.map, [playerPos]: { ...tile, droppedItems: newDroppedItems } }
    });
    state.addLog(`捡起了掉落在地上的 ${item.name}。`, 'success');
    get().addPersonalLog(state.activePlayerId, `拾取了 ${item.name}。`, 'success');
  },

  giveItem: (fromId: string, toId: string, itemId: string) => {
    const state = get();
    const fromPlayer = state.players[fromId];
    const toPlayer = state.players[toId];
    if (!fromPlayer || !toPlayer) return;

    const itemIndex = fromPlayer.items.findIndex(i => i.id === itemId);
    if (itemIndex === -1) return;

    const item = fromPlayer.items[itemIndex];
    const newFromItems = fromPlayer.items.filter((_, i) => i !== itemIndex);
    const newToItems = [...toPlayer.items, item];

    const newPlayers = { ...state.players };
    newPlayers[fromId] = { ...fromPlayer, items: newFromItems };
    newPlayers[toId] = { ...toPlayer, items: newToItems };

    set({ players: newPlayers, isInteractionModalOpen: false });
    state.addLog(`${fromPlayer.character.name} 将 ${item.name} 交给了 ${toPlayer.character.name}。`, 'info');
    get().addPersonalLog(fromId, `将 ${item.name} 交给了 ${toPlayer.character.name}。`, 'info');
    get().addPersonalLog(toId, `收到了 ${fromPlayer.character.name} 给予的 ${item.name}。`, 'success');
  },

  startCombat: (attackerId, defenderId, attribute) => {
    // 检查是否在网络模式
    if (network.isInNetworkMode()) {
        // 网络模式：发送战斗开始请求
        network.sendStartCombat(defenderId, attribute);
        return;
    }
    
    // 本地模式：直接处理
    const state = get();
    const attacker = state.players[attackerId];
    const defender = state.players[defenderId];

    if (!defender || defender.isDead) {
        state.showFeedback("无法攻击已阵亡的目标", "error");
        return;
    }

    // Use effective value for combat roll
    let attackerDice = get().getEffectiveAttributeValue(attackerId, attribute);
    
    // Check combat-specific buffs from items (hardcoded check for demo purposes as parser is simple)
    // Example: Revolver adds to Might only during attack
    if (attribute === AttributeName.Might) {
        const hasRevolver = attacker.items.some(i => i.id === 'item_revolver');
        if (hasRevolver) attackerDice += 2;
    }

    set({
      isInteractionModalOpen: false,
      activeCombat: { attackerId, defenderId, attribute, phase: 'ATTACKING' },
      activeRoll: {
        id: 'combat_attack',
        attributeName: `${attacker.character.name} 的进攻 (${attribute})`,
        numberOfDice: attackerDice,
        isCancellable: true,
        onComplete: (total) => {
          const s = get();
          const defender = s.players[defenderId];
          // Use effective value for defense
          const defenderDice = s.getEffectiveAttributeValue(defenderId, attribute);
          
          set({
            activeCombat: { ...s.activeCombat!, attackerRoll: total, phase: 'DEFENDING' },
            activeRoll: {
              id: 'combat_defense',
              attributeName: `${defender.character.name} 的防御 (${attribute})`,
              numberOfDice: defenderDice,
              onComplete: (defTotal) => {
                set(prev => ({
                  activeCombat: { ...prev.activeCombat!, defenderRoll: defTotal, phase: 'RESOLUTION' },
                  activeRoll: null
                }));
              }
            }
          });
        }
      }
    });
  },

  resolveCombatDamage: () => {
    const state = get();
    const combat = state.activeCombat;
    if (!combat || combat.attackerRoll === undefined || combat.defenderRoll === undefined) return;

    const damage = Math.max(0, combat.attackerRoll - combat.defenderRoll);
    if (damage > 0) {
      get().executeScript([{
        type: 'modify_stat',
        target: combat.defenderId,
        attribute: AttributeName.Might,
        amount: -damage,
        message: `战斗中受到了 ${damage} 点伤害！`
      }]);
      
      const attackerName = state.players[combat.attackerId].character.name;
      get().addPersonalLog(combat.defenderId, `被 ${attackerName} 攻击，受到了 ${damage} 点物理伤害。`, 'alert');
      get().addPersonalLog(combat.attackerId, `成功攻击了 ${state.players[combat.defenderId].character.name}，造成 ${damage} 点伤害。`, 'success');
      
    } else {
      state.addLog("进攻被化解了，未造成伤害。", 'info');
      get().addPersonalLog(combat.attackerId, `对 ${state.players[combat.defenderId].character.name} 的攻击失败。`, 'info');
    }

    set({ activeCombat: null, turnPhase: 'DONE' });
  },

  resolveCombatSteal: (itemId) => {
    const state = get();
    const combat = state.activeCombat;
    if (!combat) return;

    const attacker = state.players[combat.attackerId];
    const defender = state.players[combat.defenderId];
    const itemIndex = defender.items.findIndex(i => i.id === itemId);
    if (itemIndex === -1) return;

    const item = defender.items[itemIndex];
    const newDefenderItems = defender.items.filter((_, i) => i !== itemIndex);
    const newAttackerItems = [...attacker.items, item];

    const newPlayers = { ...state.players };
    newPlayers[combat.defenderId] = { ...defender, items: newDefenderItems };
    newPlayers[combat.attackerId] = { ...attacker, items: newAttackerItems };

    set({ players: newPlayers, activeCombat: null, turnPhase: 'DONE' });
    state.addLog(`${attacker.character.name} 趁乱偷走了 ${defender.character.name} 的 ${item.name}！`, 'success');
    get().addPersonalLog(combat.attackerId, `从 ${defender.character.name} 身上偷走了 ${item.name}。`, 'success');
    get().addPersonalLog(combat.defenderId, `${item.name} 被 ${attacker.character.name} 偷走了！`, 'alert');
  },

  cancelCombat: () => set({ activeCombat: null, activeRoll: null }),

  debugForceHaunt: () => {
    const state = get();
    set({
      isHauntActive: true,
      phase: GamePhase.HauntReveal,
      omenCount: Math.max(state.omenCount, 6),
      activeCard: null,
      activeRoll: null,
      activeCombat: null,
      pendingTile: null,
      isInteractionModalOpen: false,
    });
    state.addLog("系统协议强制覆盖：作祟序列启动。", "alert");
    state.showFeedback("强制开启作祟模式", "warning");
  },

  executeScript: (actions: ScriptAction[]) => {
      const state = get();
      const newPlayers = { ...state.players };
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
              case 'move_player': {
                  if (action.location === 'basement') state.addLog("你掉到了地下室！", 'alert');
                  // Todo: actual implementation of teleport to basement tile
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
                          newPlayers[targetId] = {
                              ...newPlayers[targetId],
                              position: { x: tx, y: ty }
                          };
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
      // 检查是否在网络模式
      if (network.isInNetworkMode() && choiceIndex !== undefined) {
          // 网络模式：发送事件选择请求
          network.sendResolveEvent(choiceIndex);
          // 关闭模态框
          set({
              eventOutcome: null,
              activeCard: null,
              turnPhase: 'DONE'
          });
          return;
      }
      
      // 本地模式：直接处理
      const state = get();
      
      const context: GameContext = {
          state: state,
          activePlayerId: state.activePlayerId
      };
      
      const effects = actions as any[]; 
      executeEffects(effects, context);

      set({
          eventOutcome: null,
          activeCard: null,
          turnPhase: 'DONE'
      });
  },

  executeLogicAction: (action: ActionDefinition, selectedPartnerId?: string) => {
    // 检查是否在网络模式
    if (network.isInNetworkMode()) {
        // 网络模式：发送技能执行请求
        network.sendExecuteSkill(action.id || action.name, selectedPartnerId);
        return;
    }
    
    // 本地模式：直接处理
    const state = get();
    const context: GameContext = {
      state: state,
      activePlayerId: state.activePlayerId,
      selectedPartnerId: selectedPartnerId
    };

    if (action.condition && !evaluateCondition(action.condition, context)) {
      state.showFeedback(`无法执行: ${action.name} (条件未满足)`, 'warning');
      return;
    }

    state.addLog(`执行技能: ${action.name}`, 'info');
    get().addPersonalLog(state.activePlayerId, `使用了技能: ${action.name}。`, 'info');
    executeEffects(action.effects, context);
  },
  
  unlockSkillNode: (nodeId: string) => {
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
          state.showFeedback("技能点不足", "error");
          return;
      }
      
      const newPlayers = { ...state.players };
      const updatedPlayer = newPlayers[state.activePlayerId];
      
      updatedPlayer.skillPoints -= nodeToUnlock.cost;
      updatedPlayer.unlockedSkillNodes.push(nodeId);
      
      if (nodeToUnlock.grantsBuff) {
          updatedPlayer.buffs.push(nodeToUnlock.grantsBuff);
      }
      
      if (nodeToUnlock.grantsSkillId) {
          updatedPlayer.skills.push(nodeToUnlock.grantsSkillId);
      }
      
      set({ players: newPlayers });
      state.addLog(`${updatedPlayer.character.name} 习得了 ${nodeToUnlock.name}。`, 'success');
      get().addPersonalLog(state.activePlayerId, `解锁了技能: ${nodeToUnlock.name}。`, 'success');
  },

  rotatePendingTile: () => set(s => ({ pendingTileRotation: (s.pendingTileRotation + 90) % 360 })),

  confirmTilePlacement: () => {
    const state = get();
    if (!state.isPlacementValid()) {
        state.showFeedback("门必须相连", "error");
        return;
    }
    const { pendingTile, pendingTileRotation, pendingTargetPosition } = state;
    if (!pendingTile || !pendingTargetPosition) return;

    const newTileInstance: TileInstance = {
        instanceId: generateId('tile'),
        defId: pendingTile.id,
        x: pendingTargetPosition.x,
        y: pendingTargetPosition.y,
        rotation: pendingTileRotation,
        edges: getRotatedEdges(pendingTile.edges, pendingTileRotation),
        hasEventTriggered: false,
        visibility: 'VISIBLE',
        droppedItems: []
    };

    const newPlayers = { ...state.players };
    newPlayers[state.activePlayerId] = {
        ...newPlayers[state.activePlayerId],
        position: { x: newTileInstance.x, y: newTileInstance.y }
    };

    let nextTurnPhase: TurnPhase = 'MOVING';
    let newMovesRemaining = state.movesRemaining;

    if (pendingTile.eventTrigger) {
        nextTurnPhase = 'EVENT_RESOLVING';
        newMovesRemaining = 0;
        get().triggerSpecificEvent(pendingTile.eventTrigger);
    } else if (pendingTile.cardSymbol && pendingTile.cardSymbol !== 'NONE') {
        nextTurnPhase = 'EVENT_RESOLVING';
        newMovesRemaining = 0;
        get().drawCard(pendingTile.cardSymbol);
    } else {
        if (newMovesRemaining === 0) nextTurnPhase = 'DONE';
    }

    set({
        map: { ...state.map, [`${newTileInstance.x},${newTileInstance.y}`]: newTileInstance },
        players: newPlayers,
        pendingTile: null,
        pendingTargetPosition: null,
        pendingMoveDirection: null,
        turnPhase: nextTurnPhase,
        movesRemaining: newMovesRemaining 
    });
    state.addLog(`探索发现了 ${pendingTile.name}。`, 'success');
    get().addPersonalLog(state.activePlayerId, `探索并进入了 ${pendingTile.name}。`, 'info');
  },

  isPlacementValid: () => {
    const { pendingTile, pendingTileRotation, pendingTargetPosition, pendingMoveDirection, map } = get();
    if (!pendingTile || !pendingTargetPosition || !pendingMoveDirection) return false;
    if (map[`${pendingTargetPosition.x},${pendingTargetPosition.y}`]) return false;
    const rotatedEdges = getRotatedEdges(pendingTile.edges, pendingTileRotation);
    return rotatedEdges[getOpposite(pendingMoveDirection)] !== 'WALL';
  },

  cancelTilePlacement: () => {
    const state = get();
    if (!state.pendingTile) return;
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
      // 检查是否在网络模式
      if (network.isInNetworkMode()) {
          // 网络模式：发送抽卡请求
          network.sendDrawCard(type);
          return;
      }
      
      // 本地模式：直接处理
      const state = get();
      const deck = state.decks[type];
      if (deck.length === 0) {
          state.addLog(`${type} 牌组已空！`, 'alert');
          set({ turnPhase: 'DONE' });
          return;
      }
      set({ activeCard: deck[0], decks: { ...state.decks, [type]: deck.slice(1) } });
  },

  triggerSpecificEvent: (eventId: string) => {
      const event = EVENTS_DB[eventId];
      if (event) set({ activeCard: event });
  },

  triggerStatRoll: () => {}, 
  resolveDiceRoll: () => {},
  applyCardOutcome: () => {},
  acknowledgeEventOutcome: () => {
     set({ 
        activeCard: null, 
        activeRoll: null, 
        lastRollResult: null, 
        eventOutcome: null, 
        turnPhase: 'DONE' 
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
              if (total < state.omenCount) {
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
    
    // Determine the scenario using the matrix
    const omenId = state.lastTriggeredOmen || '';
    const tileDefId = state.lastTriggeredTile || '';
    const scenarioId = getScenarioId(omenId, tileDefId);
    
    const selectedScenario = SCENARIOS_DB[scenarioId] || SCENARIOS_DB['haunt_00'];
    
    // Determine Traitor with refined logic
    const traitorId = resolveTraitor(selectedScenario, state.activePlayerId, state.players);

    // Update player teams and heal traitor
    const updatedPlayers = { ...state.players };
    Object.keys(updatedPlayers).forEach(id => {
      if (id === traitorId) {
        updatedPlayers[id].team = 'TRAITOR';
        updatedPlayers[id] = healTraitor(updatedPlayers[id]);
        get().addPersonalLog(id, '你已被邪恶力量腐蚀，成为了叛徒。', 'alert');
      } else {
        updatedPlayers[id].team = 'HERO';
        get().addPersonalLog(id, '作祟爆发。你必须作为英雄生存下去。', 'alert');
      }
    });

    set({ 
      phase: GamePhase.Haunt,
      currentScenario: selectedScenario,
      traitorId: traitorId,
      players: updatedPlayers
    });

    state.addLog(`剧本已揭晓：${selectedScenario.name}`, "alert");
    state.addLog(selectedScenario.introText, "narrative");
    
    const traitor = updatedPlayers[traitorId];
    state.addLog(`叛徒已经产生：${traitor.character.name}。英雄们，团结起来！`, "alert");
    state.addLog(`${traitor.character.name} 感到一股恶兆之力充满了全身，伤口已经愈合。`, 'narrative');
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
      // 检查是否在网络模式
      if (network.isInNetworkMode()) {
          // 网络模式：发送使用物品请求
          network.sendUseItem(itemId, targetId);
          return;
      }
      
      // 本地模式：直接处理
      const state = get();
      const player = state.players[state.activePlayerId];
      if (player.isDead) return;
      
      const itemIndex = player.items.findIndex(i => i.id === itemId);
      if (itemIndex === -1) return;
      const item = player.items[itemIndex];
      get().addPersonalLog(state.activePlayerId, `使用了 ${item.name}。`, 'info');
      
      // Check if item needs a target and none was provided
      if (item.usage?.target === 'OPPONENT' && !targetId) {
          state.showFeedback('该物品需要指定目标，请在交互菜单中使用。', 'warning');
          return;
      }

      if (item.usage?.effects) {
          // Prepare context with specific target if needed
          const context: GameContext = {
              state: state,
              activePlayerId: state.activePlayerId,
              selectedPartnerId: targetId
          };
          
          // Adapt script action to logic engine effects if possible
          const effects = item.usage.effects as any[];
          executeEffects(effects, context);

          if (item.usage.isConsumable) {
              const newPlayers = { ...state.players };
              newPlayers[state.activePlayerId].items.splice(itemIndex, 1);
              set({ players: newPlayers });
          }
          set({ isInventoryOpen: false });
      }
  },

  dropItem: (itemId) => {
      const state = get();
      const player = state.players[state.activePlayerId];
      const playerPos = `${player.position.x},${player.position.y}`;
      const tile = state.map[playerPos];
      
      const itemIndex = player.items.findIndex(i => i.id === itemId);
      if (itemIndex === -1) return;

      const item = player.items[itemIndex];
      const newItems = player.items.filter((_, i) => i !== itemIndex);
      
      const newPlayers = { ...state.players };
      newPlayers[state.activePlayerId].items = newItems;

      const updatedTile = {
          ...tile,
          droppedItems: [...tile.droppedItems, item]
      };

      set({ 
          players: newPlayers, 
          map: { ...state.map, [playerPos]: updatedTile } 
      });
      state.addLog(`放下了物品 ${item.name}。`, 'info');
      get().addPersonalLog(state.activePlayerId, `丢弃了 ${item.name}。`, 'info');
  },

  interactWithWall: (direction) => {
      const state = get();
      const player = state.players[state.activePlayerId];
      if (player.isDead) return;
      
      const hasPickaxe = player.items.some(i => i.id === 'item_pickaxe');
      const might = get().getEffectiveAttributeValue(state.activePlayerId, AttributeName.Might);
      
      if (hasPickaxe || might > 5) {
          const newPlayers = { ...state.players };
          if (!hasPickaxe) {
             const attr = newPlayers[state.activePlayerId].character.attributes[AttributeName.Might];
             attr.current = Math.max(attr.floor, attr.current - 1);
             get().addPersonalLog(state.activePlayerId, '强行破坏墙壁导致力量 -1', 'alert');
          }
          set({ players: newPlayers });
          
          const currentTile = state.map[`${player.position.x},${player.position.y}`];
          const updatedCurrent = { ...currentTile, edges: { ...currentTile.edges, [direction]: 'RUBBLE' } };
          const newMap = { ...state.map, [`${updatedCurrent.x},${updatedCurrent.y}`]: updatedCurrent as TileInstance };

          let nx = player.position.x, ny = player.position.y;
          if (direction === Direction.North) ny--;
          else if (direction === Direction.South) ny++;
          else if (direction === Direction.East) nx++;
          else if (direction === Direction.West) nx--;
          
          const neighbor = newMap[`${nx},${ny}`];
          if (neighbor) {
             const updatedNeighbor = { ...neighbor, edges: { ...neighbor.edges, [getOpposite(direction)]: 'RUBBLE' } };
             newMap[`${nx},${ny}`] = updatedNeighbor as TileInstance;
          }
          set({ map: newMap });
          return;
      }
      
      const knowledge = get().getEffectiveAttributeValue(state.activePlayerId, AttributeName.Knowledge);
      set({ 
        activeRoll: {
          id: 'search_wall',
          attributeName: '知识',
          numberOfDice: knowledge,
          targetValue: 4,
          isCancellable: true,
          onComplete: (total) => {
              if (total >= 4) {
                  const s = get();
                  const p = s.players[s.activePlayerId];
                  const t = s.map[`${p.position.x},${p.position.y}`];
                  const ut = { ...t, edges: { ...t.edges, [direction]: 'SECRET_DOOR' } };
                  const nm = { ...s.map, [`${ut.x},${ut.y}`]: ut as TileInstance };
                  
                  let nx = p.position.x, ny = p.position.y;
                  if (direction === Direction.North) ny--;
                  else if (direction === Direction.South) ny++;
                  else if (direction === Direction.East) nx++;
                  else if (direction === Direction.West) nx--;
                  const n = nm[`${nx},${ny}`];
                  if (n) {
                      nm[`${nx},${ny}`] = { ...n, edges: { ...n.edges, [getOpposite(direction)]: 'SECRET_DOOR' } } as TileInstance;
                  }
                  set({ map: nm, activeRoll: null, lastRollResult: total, turnPhase: 'DONE' });
              } else {
                  set({ activeRoll: null, lastRollResult: total, turnPhase: 'DONE' });
              }
          }
        }
      });
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
