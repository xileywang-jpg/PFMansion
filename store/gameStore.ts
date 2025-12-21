
import { create } from 'zustand';
import { 
  Player, TileInstance, TileDef, GamePhase, Direction, 
  CardDef, CardSymbol, LogEntry, AttributeName, TurnPhase, ScriptAction, Item, ActiveRoll, DirectionalEdges,
  Scenario
} from '../types';
import { ActionDefinition } from '../types/Logic';
import { 
  MOCK_CHARACTERS, STARTING_TILE, TILE_DECK, 
  MOCK_EVENTS_DECK, MOCK_ITEMS_DECK, MOCK_OMENS_DECK 
} from '../constants';
import { EVENTS_DB } from '../data/events';
import { ITEMS_DB } from '../data/items';
import { SCENARIOS_DB } from '../data/scenarios';
import { SKILL_TREES } from '../data/skillTrees';
import { getScenarioId } from '../data/hauntMatrix';
import { resolveTraitor, healTraitor } from '../utils/scenarioUtils';
import { evaluateCondition, executeEffects, GameContext, resolveTargets } from '../utils/logicEngine';

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

  omenCount: number;
  isHauntActive: boolean;
  currentScenario: Scenario | null;
  traitorId: string | null;
  
  // Haunt Context
  lastTriggeredOmenId: string | null;
  lastTriggeredTileId: string | null;

  pendingTile: TileDef | null;
  pendingTileRotation: number;
  pendingTargetPosition: { x: number, y: number } | null;
  pendingMoveDirection: Direction | null;

  hoveredTileId: string | null;
  isInventoryOpen: boolean;
  isInteractionModalOpen: boolean;
  isSkillTreeOpen: boolean; // New state

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
  incrementOmenCount: () => void;
  performHauntRoll: () => void; 
  startHaunt: () => void;
  addLog: (text: string, type?: LogEntry['type']) => void;
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

  executeLogicAction: (action: ActionDefinition) => void;
  unlockSkillNode: (nodeId: string) => void; // New action

  setState: (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void;

  inventoryOpen: () => void; 
  toggleInventory: () => void;
  toggleInteractionModal: () => void;
  toggleSkillTree: () => void; // New toggle
  useItem: (itemId: string) => void;
  dropItem: (itemId: string) => void;
  
  interactWithWall: (direction: Direction) => void;
  cancelActiveRoll: () => void;

  isPlacementValid: () => boolean;
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
  omenCount: 0,
  isHauntActive: false,
  currentScenario: null,
  traitorId: null,
  lastTriggeredOmenId: null,
  lastTriggeredTileId: null,
  pendingTile: null,
  pendingTileRotation: 0,
  pendingTargetPosition: null,
  pendingMoveDirection: null,
  hoveredTileId: null,
  isInventoryOpen: false,
  isInteractionModalOpen: false,
  isSkillTreeOpen: false,
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

  initializeGame: () => {
    const startTile: TileInstance = {
      instanceId: 'start_instance',
      defId: STARTING_TILE.id,
      x: 0,
      y: 0,
      rotation: 0,
      edges: STARTING_TILE.edges,
      hasEventTriggered: true,
      visibility: 'VISIBLE',
      droppedItems: []
    };

    const playersDict: Record<string, Player> = {};
    const ids: string[] = [];

    MOCK_CHARACTERS.forEach((char, index) => {
      const id = `p${index + 1}`;
      ids.push(id);
      
      // Calculate initial skill points based on Knowledge attribute (simple game mechanic)
      const initialSkillPoints = char.attributes[AttributeName.Knowledge].current;

      playersDict[id] = {
        id,
        character: char,
        position: { x: 0, y: 0 },
        items: [],
        buffs: [],
        skills: [],
        isDead: false,
        team: 'UNASSIGNED',
        skillPoints: initialSkillPoints,
        unlockedSkillNodes: []
      };
    });

    set({
      players: playersDict,
      playerIds: ids,
      activePlayerId: ids[0],
      map: { "0,0": startTile },
      tileDeck: [...TILE_DECK].sort(() => Math.random() - 0.5),
      decks: {
        EVENT: [...MOCK_EVENTS_DECK].sort(() => Math.random() - 0.5),
        ITEM: [...MOCK_ITEMS_DECK].sort(() => Math.random() - 0.5),
        OMEN: [...MOCK_OMENS_DECK].sort(() => Math.random() - 0.5),
      },
      logs: [{
        id: 'init_log',
        timestamp: Date.now(),
        text: '大厦沉重的大门在你们身后砰然关上。',
        type: 'narrative'
      }],
      movesRemaining: playersDict[ids[0]].character.attributes[AttributeName.Speed].current,
      turnIndex: 1,
      turnPhase: 'MOVING',
      phase: GamePhase.Exploration,
      pendingTile: null,
      activeCard: null,
      lastRollResult: null,
      activeRoll: null,
      activeCombat: null,
      omenCount: 0,
      isHauntActive: false,
      currentScenario: null,
      traitorId: null,
      lastTriggeredOmenId: null,
      lastTriggeredTileId: null,
      isInventoryOpen: false,
      isInteractionModalOpen: false,
      isSkillTreeOpen: false,
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

    const nextPlayer = state.players[nextId];
    // Simple mechanic: Gain 1 skill point every 3 turns
    const shouldGainSkillPoint = (state.turnIndex + 1) % 3 === 0;
    if (shouldGainSkillPoint) {
        state.addLog(`${nextPlayer.character.name} 在探索中获得了新的领悟 (+1 技能点)`, 'success');
        const newPlayers = { ...state.players };
        newPlayers[nextId].skillPoints += 1;
        set({ players: newPlayers });
    }

    const speed = nextPlayer.character.attributes[AttributeName.Speed].current;
    // Apply speed buffs from skill tree if any (simplified)
    const bonusSpeed = nextPlayer.buffs.includes('移动速度 +1') ? 1 : 0;

    set({
      activePlayerId: nextId,
      movesRemaining: speed + bonusSpeed,
      turnPhase: 'MOVING',
      turnIndex: state.turnIndex + 1,
      activeCard: null,
      lastRollResult: null,
      pendingTile: null,
      activeRoll: null,
      activeCombat: null,
      phase: state.phase === GamePhase.GameOver ? GamePhase.GameOver : (state.isHauntActive ? GamePhase.Haunt : GamePhase.Exploration),
      isInventoryOpen: false,
      isInteractionModalOpen: false,
      isSkillTreeOpen: false,
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

      const newMoves = state.movesRemaining - 1;
      let nextPhase: TurnPhase = 'MOVING';
      const def = TILE_DECK.find(t => t.id === existingTile.defId) || STARTING_TILE;
      
      if (!existingTile.hasEventTriggered && (def.cardSymbol || def.eventTrigger)) {
          set({ movesRemaining: 0 }); 
          nextPhase = 'EVENT_RESOLVING';
          if (def.eventTrigger) get().triggerSpecificEvent(def.eventTrigger);
          else if (def.cardSymbol) get().drawCard(def.cardSymbol);
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
  },

  startCombat: (attackerId, defenderId, attribute) => {
    const state = get();
    const attacker = state.players[attackerId];
    const defender = state.players[defenderId];

    if (!defender || defender.isDead) {
        state.showFeedback("无法攻击已阵亡的目标", "error");
        return;
    }

    const attackerDice = attacker.character.attributes[attribute].current;

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
          const defenderDice = defender.character.attributes[attribute].current;
          
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
    } else {
      state.addLog("进攻被化解了，未造成伤害。", 'info');
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
          const targetId = action.target === 'self' || !action.target ? currentPlayerId : action.target;
          const player = newPlayers[targetId];
          if (!player) return;

          switch(action.type) {
              case 'modify_stat': {
                  if (action.attribute && action.amount) {
                      const attr = player.character.attributes[action.attribute];
                      const damageMitigation = player.buffs.includes('伤害减免 +1') && action.amount < 0 ? 1 : 0;
                      const actualAmount = action.amount < 0 ? Math.min(0, action.amount + damageMitigation) : action.amount;

                      const newVal = attr.current + actualAmount;
                      
                      if (newVal <= attr.floor) {
                          deathTriggeredIds.push(targetId);
                          attr.current = attr.floor;
                      } else {
                          attr.current = Math.min(attr.max, newVal);
                      }
                      
                      if (action.message) state.addLog(action.message, actualAmount > 0 ? 'success' : 'alert');
                  }
                  break;
              }
              case 'heal': {
                  if (action.attribute && action.amount) {
                      const attr = player.character.attributes[action.attribute];
                      attr.current = Math.min(attr.max, attr.current + action.amount);
                  }
                  break;
              }
              case 'add_item': {
                  if (action.itemId) {
                      const item = ITEMS_DB[action.itemId];
                      if (item) {
                          player.items.push(item);
                          state.addLog(`获得了 ${item.name}`, 'success');
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
          }
      });

      set({ players: newPlayers });

      deathTriggeredIds.forEach(id => {
          get().handlePlayerDeath(id);
      });
  },

  executeLogicAction: (action: ActionDefinition) => {
    const state = get();
    const context: GameContext = {
      state: state,
      activePlayerId: state.activePlayerId
    };

    if (action.condition && !evaluateCondition(action.condition, context)) {
      state.showFeedback(`无法执行: ${action.name} (条件未满足)`, 'warning');
      return;
    }

    state.addLog(`执行技能: ${action.name}`, 'info');
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
        instanceId: `tile_${Date.now()}`,
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

    let nextTurnPhase: TurnPhase = 'DONE';
    if (pendingTile.eventTrigger) {
        nextTurnPhase = 'EVENT_RESOLVING';
        get().triggerSpecificEvent(pendingTile.eventTrigger);
    } else if (pendingTile.cardSymbol) {
        nextTurnPhase = 'EVENT_RESOLVING';
        get().drawCard(pendingTile.cardSymbol);
    }

    set({
        map: { ...state.map, [`${newTileInstance.x},${newTileInstance.y}`]: newTileInstance },
        players: newPlayers,
        pendingTile: null,
        pendingTargetPosition: null,
        pendingMoveDirection: null,
        turnPhase: nextTurnPhase,
        movesRemaining: 0 
    });
    state.addLog(`探索发现了 ${pendingTile.name}。`, 'success');
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
    const omenId = state.lastTriggeredOmenId || '';
    const tileDefId = state.lastTriggeredTileId || '';
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
      } else {
        updatedPlayers[id].team = 'HERO';
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

  addLog: (text, type = 'info') => {
      set(s => ({ logs: [{ id: Date.now().toString(), timestamp: Date.now(), text, type }, ...s.logs] }));
  },

  setHoveredTileId: (id) => set({ hoveredTileId: id }),

  setState: (fn) => set(fn),
  inventoryOpen: () => set({ isInventoryOpen: true }),
  toggleInventory: () => set(s => ({ isInventoryOpen: !s.isInventoryOpen })),
  toggleInteractionModal: () => set(s => ({ isInteractionModalOpen: !s.isInteractionModalOpen })),
  toggleSkillTree: () => set(s => ({ isSkillTreeOpen: !s.isSkillTreeOpen })),

  useItem: (itemId) => {
      const state = get();
      const player = state.players[state.activePlayerId];
      if (player.isDead) return;
      
      const itemIndex = player.items.findIndex(i => i.id === itemId);
      if (itemIndex === -1) return;
      const item = player.items[itemIndex];
      if (item.usage?.effects) {
          get().executeScript(item.usage.effects);
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
  },

  interactWithWall: (direction) => {
      const state = get();
      const player = state.players[state.activePlayerId];
      if (player.isDead) return;
      
      const hasPickaxe = player.items.some(i => i.id === 'item_pickaxe');
      const might = player.character.attributes[AttributeName.Might].current;
      
      if (hasPickaxe || might > 5) {
          const newPlayers = { ...state.players };
          if (!hasPickaxe) {
             const attr = newPlayers[state.activePlayerId].character.attributes[AttributeName.Might];
             attr.current = Math.max(attr.floor, attr.current - 1);
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
      
      const knowledge = player.character.attributes[AttributeName.Knowledge].current;
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
