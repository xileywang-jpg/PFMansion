
import { create } from 'zustand';
import { 
  Player, TileInstance, TileDef, GamePhase, Direction, 
  CardDef, CardSymbol, LogEntry, AttributeName, TurnPhase, ScriptAction, Item, ActiveRoll 
} from '../types';
import { 
  MOCK_CHARACTERS, STARTING_TILE, TILE_DECK, 
  MOCK_EVENTS_DECK, MOCK_ITEMS_DECK, MOCK_OMENS_DECK 
} from '../constants';
import { EVENTS_DB } from '../data/events'; // Import DB for specific lookups
import { ITEMS_DB } from '../data/items';
import { rollDice } from '../utils/dice';

interface GameState {
  phase: GamePhase;
  turnPhase: TurnPhase;
  turnIndex: number;
  players: Player[];
  currentPlayerIndex: number;
  map: Record<string, TileInstance>; // Key is "x,y"
  tileDeck: TileDef[];
  logs: LogEntry[];
  movesRemaining: number;
  
  // Card System (Active card can be Event or Item pickup)
  activeCard: CardDef | Item | null;
  decks: {
    EVENT: CardDef[];
    ITEM: Item[];
    OMEN: Item[];
  };
  lastRollResult: number | null;

  // Dice System
  activeRoll: ActiveRoll | null;

  // Haunt State
  omenCount: number;
  isHauntActive: boolean;

  // Placement State
  pendingTile: TileDef | null;
  pendingTileRotation: number;
  pendingTargetPosition: { x: number, y: number } | null;
  pendingMoveDirection: Direction | null;

  // Interaction State
  hoveredTileId: string | null;
  isInventoryOpen: boolean;

  // Actions
  initializeGame: () => void;
  nextTurn: () => void;
  movePlayer: (direction: Direction) => void;
  rotatePendingTile: () => void;
  confirmTilePlacement: () => void;
  drawCard: (type: CardSymbol) => void;
  triggerSpecificEvent: (eventId: string) => void; // New Action
  triggerStatRoll: () => void;
  resolveDiceRoll: (total: number) => void; // Callback from UI
  applyCardOutcome: () => void;
  incrementOmenCount: () => void;
  performHauntRoll: () => void; 
  addLog: (text: string, type?: LogEntry['type']) => void;
  setHoveredTileId: (id: string | null) => void;
  
  // Script Engine
  executeScript: (actions: ScriptAction[]) => void;
  setState: (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void;

  // Inventory Actions
  toggleInventory: () => void;
  useItem: (itemId: string) => void;
  dropItem: (itemId: string) => void;
  
  // Helpers
  isPlacementValid: () => boolean;
}

// --- Helpers ---

const getOpposite = (dir: Direction): Direction => {
  switch (dir) {
    case Direction.North: return Direction.South;
    case Direction.South: return Direction.North;
    case Direction.East: return Direction.West;
    case Direction.West: return Direction.East;
  }
};

const getRotatedOpenings = (openings: Direction[], rotation: number): Direction[] => {
  const rotationSteps = rotation / 90;
  const dirs = [Direction.North, Direction.East, Direction.South, Direction.West];
  
  return openings.map(dir => {
    const currentIndex = dirs.indexOf(dir);
    const newIndex = (currentIndex + rotationSteps) % 4;
    return dirs[newIndex];
  });
};

const areConnected = (fromDir: Direction, toTileOpenings: Direction[]): boolean => {
  const incomingDir = getOpposite(fromDir);
  return toTileOpenings.includes(incomingDir);
};

// --- Store ---

export const useGameStore = create<GameState>((set, get) => ({
  phase: GamePhase.Exploration,
  turnPhase: 'MOVING',
  turnIndex: 1,
  players: [],
  currentPlayerIndex: 0,
  map: {},
  tileDeck: [],
  logs: [],
  movesRemaining: 0,
  
  activeCard: null,
  decks: {
    EVENT: [],
    ITEM: [],
    OMEN: [],
  },
  lastRollResult: null,
  activeRoll: null,

  omenCount: 0,
  isHauntActive: false,

  // Placement State
  pendingTile: null,
  pendingTileRotation: 0,
  pendingTargetPosition: null,
  pendingMoveDirection: null,

  // Interaction State
  hoveredTileId: null,
  isInventoryOpen: false,

  initializeGame: () => {
    // Setup initial map
    const startTile: TileInstance = {
      instanceId: 'start_instance',
      defId: STARTING_TILE.id,
      x: 0,
      y: 0,
      rotation: 0,
      openings: STARTING_TILE.openings,
      hasEventTriggered: true, // Start tile usually doesn't trigger events
    };

    // Setup players (Mocking 1 player for now)
    const p1: Player = {
      id: 'p1',
      character: MOCK_CHARACTERS[0],
      position: { x: 0, y: 0 },
      items: [],
    };

    set({
      players: [p1],
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
        text: 'The heavy doors of the mansion slam shut behind you. There is no turning back.',
        type: 'narrative'
      }],
      movesRemaining: p1.character.attributes[AttributeName.Speed].current,
      turnIndex: 1,
      turnPhase: 'MOVING',
      phase: GamePhase.Exploration,
      pendingTile: null,
      pendingTargetPosition: null,
      pendingMoveDirection: null,
      hoveredTileId: null,
      activeCard: null,
      lastRollResult: null,
      activeRoll: null,
      omenCount: 0,
      isHauntActive: false,
      isInventoryOpen: false,
    });
  },

  nextTurn: () => {
    const state = get();
    // Resolve any pending cards automatically if forced next turn (safety)
    if (state.activeCard) {
      state.addLog("Turn ended forcefully while event was active.", 'alert');
    }

    const nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
    const nextPlayer = state.players[nextIndex];
    const speed = nextPlayer.character.attributes[AttributeName.Speed].current;

    set({
      currentPlayerIndex: nextIndex,
      movesRemaining: speed,
      turnPhase: 'MOVING',
      turnIndex: state.turnIndex + 1,
      activeCard: null, // Clear any hanging event
      lastRollResult: null,
      pendingTile: null, // Clear any pending placement
    });
    
    state.addLog(`Turn ${state.turnIndex + 1}: ${nextPlayer.character.name}'s turn.`, 'info');
  },

  movePlayer: (direction: Direction) => {
    const state = get();
    // Prevent moving if already handling an event, placement, roll, or turn is done
    if (state.activeCard || state.pendingTile || state.activeRoll || state.turnPhase === 'DONE' || state.phase === GamePhase.HauntRoll) return;
    
    if (state.movesRemaining <= 0) {
      state.addLog("You are exhausted and cannot move further this turn.", "alert");
      return;
    }

    const player = state.players[state.currentPlayerIndex];
    const currentTile = state.map[`${player.position.x},${player.position.y}`];
    
    // 1. Check Exit from current tile
    if (!currentTile.openings.includes(direction)) {
      state.addLog("There is no door in that direction.", "alert");
      return;
    }

    // Calculate Target
    let newX = player.position.x;
    let newY = player.position.y;
    if (direction === Direction.North) newY--;
    if (direction === Direction.South) newY++;
    if (direction === Direction.East) newX++;
    if (direction === Direction.West) newX--;

    const targetKey = `${newX},${newY}`;
    const existingTile = state.map[targetKey];

    if (existingTile) {
      // --- Case A: Move to Known Room ---
      if (!areConnected(direction, existingTile.openings)) {
        state.addLog("The door is blocked from the other side.", "alert");
        return;
      }
      
      const newPlayers = [...state.players];
      newPlayers[state.currentPlayerIndex].position = { x: newX, y: newY };
      
      const newMoves = state.movesRemaining - 1;

      // Check for Trigger on Entry (if not already triggered)
      let nextPhase = state.turnPhase;
      const def = TILE_DECK.find(t => t.id === existingTile.defId) || STARTING_TILE;
      
      if (!existingTile.hasEventTriggered && (def.cardSymbol || def.eventTrigger)) {
          // Stop movement to resolve event
          set({ movesRemaining: 0 }); // Consume all moves for event
          nextPhase = 'EVENT_RESOLVING';
          
          if (def.eventTrigger) {
              get().triggerSpecificEvent(def.eventTrigger);
          } else if (def.cardSymbol) {
              get().drawCard(def.cardSymbol);
          }
      }
      
      set({ 
        players: newPlayers, 
        movesRemaining: newMoves,
        turnPhase: newMoves === 0 ? 'DONE' : nextPhase
      });
      state.addLog(`Moved ${direction} into ${def.name}.`, 'info');

    } else {
      // --- Case B: Explore New Room (Stop & Place) ---
      if (state.tileDeck.length === 0) {
        state.addLog("You have explored the entire floor...", "alert");
        return;
      }

      // Draw Card
      const nextTileDef = state.tileDeck[0];
      const remainingDeck = state.tileDeck.slice(1);

      // Consume Move Point immediately for the "Action" of exploring
      set({
        movesRemaining: state.movesRemaining - 1,
        tileDeck: remainingDeck,
        pendingTile: nextTileDef,
        pendingTileRotation: 0,
        pendingTargetPosition: { x: newX, y: newY },
        pendingMoveDirection: direction
      });

      state.addLog("You peer into the darkness... Place the room.", "info");
    }
  },

  rotatePendingTile: () => {
    const { pendingTileRotation } = get();
    set({ pendingTileRotation: (pendingTileRotation + 90) % 360 });
  },

  isPlacementValid: () => {
    const state = get();
    const { pendingTile, pendingTileRotation, pendingMoveDirection } = state;
    if (!pendingTile || !pendingMoveDirection) return false;

    // Check connectivity back to source
    const requiredOpening = getOpposite(pendingMoveDirection);
    const rotatedOpenings = getRotatedOpenings(pendingTile.openings, pendingTileRotation);

    return rotatedOpenings.includes(requiredOpening);
  },

  confirmTilePlacement: () => {
    const state = get();
    if (!state.isPlacementValid()) {
      state.addLog("Cannot place tile: Doors do not align.", "alert");
      return;
    }

    const { pendingTile, pendingTileRotation, pendingTargetPosition, players, currentPlayerIndex } = state;
    if (!pendingTile || !pendingTargetPosition) return;

    // Create Tile Instance
    const rotatedOpenings = getRotatedOpenings(pendingTile.openings, pendingTileRotation);
    const newTile: TileInstance = {
      instanceId: `tile_${Date.now()}`,
      defId: pendingTile.id,
      x: pendingTargetPosition.x,
      y: pendingTargetPosition.y,
      rotation: pendingTileRotation,
      openings: rotatedOpenings,
      hasEventTriggered: false
    };

    // Place Tile & Move Player
    const targetKey = `${newTile.x},${newTile.y}`;
    const newPlayers = [...players];
    newPlayers[currentPlayerIndex].position = { x: newTile.x, y: newTile.y };

    // Determine next state
    let nextPhase: TurnPhase = state.movesRemaining === 0 ? 'DONE' : 'MOVING';
    let nextMoves = state.movesRemaining;
    
    // --- Card Trigger Logic ---
    if (pendingTile.cardSymbol || pendingTile.eventTrigger) {
      // Force stop
      nextMoves = 0;
      nextPhase = 'EVENT_RESOLVING';
      
      state.addLog(`Something is in this room...`, 'narrative');
    }

    set({
      map: { ...state.map, [targetKey]: newTile },
      players: newPlayers,
      pendingTile: null,
      pendingTargetPosition: null,
      pendingMoveDirection: null,
      pendingTileRotation: 0,
      movesRemaining: nextMoves,
      turnPhase: nextPhase,
    });

    state.addLog(`Discovered ${pendingTile.name}.`, 'narrative');

    // Trigger Draw or Specific Event
    if (pendingTile.eventTrigger) {
        get().triggerSpecificEvent(pendingTile.eventTrigger);
    } else if (pendingTile.cardSymbol) {
        get().drawCard(pendingTile.cardSymbol);
    }
  },

  drawCard: (type: CardSymbol) => {
    const state = get();
    
    if (type === 'EVENT') {
        const deck = state.decks.EVENT;
        if (deck.length === 0) {
            state.addLog(`The EVENT deck is empty!`, 'alert');
            set({ turnPhase: 'DONE' });
            return;
        }
        const drawnCard = deck[0];
        set({
            activeCard: drawnCard,
            decks: { ...state.decks, EVENT: deck.slice(1) },
            lastRollResult: null,
        });
        state.addLog(`Drew EVENT: ${drawnCard.title}`, 'info');

    } else {
        // Handle Item/Omen (They are Items now, not CardDefs)
        const deck = type === 'OMEN' ? state.decks.OMEN : state.decks.ITEM;
        if (deck.length === 0) {
            state.addLog(`The ${type} deck is empty!`, 'alert');
            set({ turnPhase: 'DONE' });
            return;
        }
        const drawnItem = deck[0];
        
        // Update Decks
        const newDecks = { ...state.decks };
        if (type === 'OMEN') newDecks.OMEN = deck.slice(1);
        else newDecks.ITEM = deck.slice(1);

        set({
            activeCard: drawnItem,
            decks: newDecks,
            lastRollResult: null,
        });
        state.addLog(`Found ${type}: ${drawnItem.name}`, 'info');
    }
  },

  triggerSpecificEvent: (eventId: string) => {
    const state = get();
    const event = EVENTS_DB[eventId];
    
    if (!event) {
        state.addLog(`Script Error: Event '${eventId}' not found.`, 'alert');
        set({ turnPhase: 'DONE' });
        return;
    }

    set({
        activeCard: event,
        lastRollResult: null,
        turnPhase: 'EVENT_RESOLVING',
        movesRemaining: 0 // Stop movement
    });
    state.addLog(`Triggered: ${event.title}`, 'info');
  },

  triggerStatRoll: () => {
    const state = get();
    const activeCard = state.activeCard;

    // Ensure it's an event with an attribute check
    if (!activeCard || activeCard.type !== 'EVENT' || activeCard.interaction.type !== 'ATTRIBUTE_CHECK') return;

    const player = state.players[state.currentPlayerIndex];
    const statName = activeCard.interaction.attribute;
    const statValue = player.character.attributes[statName].current;
    
    // Instead of resolving immediately, set activeRoll state
    set({
      activeRoll: {
        id: `roll_${Date.now()}`,
        attributeName: statName,
        numberOfDice: statValue,
        targetValue: activeCard.interaction.difficulty,
        onComplete: (total) => state.resolveDiceRoll(total)
      }
    });
  },

  resolveDiceRoll: (total: number) => {
    const state = get();
    
    // 1. Update Game State with result
    set({ 
      lastRollResult: total, 
      activeRoll: null // Close the dice UI
    });

    const activeCard = state.activeCard;
    if (activeCard && activeCard.type === 'EVENT' && activeCard.interaction.type === 'ATTRIBUTE_CHECK') {
      const target = activeCard.interaction.difficulty;
      const passed = total >= target;
      state.addLog(`Rolled ${total} (Target: ${target}). ${passed ? 'Success' : 'Failure'}.`, passed ? 'success' : 'alert');
    }
  },

  executeScript: (actions: ScriptAction[]) => {
    const state = get();
    const newPlayers = [...state.players];
    const currentPlayer = newPlayers[state.currentPlayerIndex];
    
    actions.forEach(action => {
        // modify_stat
        if (action.type === 'modify_stat' && action.attribute) {
            const attr = currentPlayer.character.attributes[action.attribute];
            let newIndex = attr.index + (action.amount || 0);
            
            // Clamp
            if (newIndex < 0) newIndex = 0; 
            if (newIndex >= attr.values.length) newIndex = attr.values.length - 1;
            
            attr.index = newIndex;
            attr.current = attr.values[newIndex];
            
            const changeText = (action.amount || 0) > 0 ? 'increased' : 'decreased';
            state.addLog(`${currentPlayer.character.name}'s ${action.attribute} ${changeText}. Now ${attr.current}.`, action.amount! > 0 ? 'success' : 'alert');
        }

        // heal
        if (action.type === 'heal' && action.attribute) {
            const attr = currentPlayer.character.attributes[action.attribute];
            let newIndex = attr.index + (action.amount || 1);
            // Cap at max (length - 1)
            if (newIndex >= attr.values.length) newIndex = attr.values.length - 1;
            
            attr.index = newIndex;
            attr.current = attr.values[newIndex];
            state.addLog(`${currentPlayer.character.name} healed ${action.attribute}.`, 'success');
        }

        // add_item
        if (action.type === 'add_item' && action.itemId) {
            const item = ITEMS_DB[action.itemId];
            if (item) {
                currentPlayer.items.push(item);
                state.addLog(`Obtained ${item.name}`, 'success');
            } else {
                console.warn(`Item ${action.itemId} not found in DB`);
            }
        }

        // move_player
        if (action.type === 'move_player') {
            // Simplified teleport logic - usually would need specific logic for "Basement Landing"
            if (action.location === 'basement') {
                 // Try to find basement landing
                 const landing = Object.values(state.map).find(t => t.defId === 'tile_basement_landing');
                 if (landing) {
                     currentPlayer.position = { x: landing.x, y: landing.y };
                     state.addLog("You were moved to the Basement Landing.", 'alert');
                 } else {
                     state.addLog("You fall into darkness... (Basement Landing not found)", 'alert');
                 }
            }
        }

        // narrative_log
        if (action.type === 'narrative_log' && action.message) {
            state.addLog(action.message, 'info');
        }
    });

    set({ players: newPlayers });
  },

  setState: (updater) => set(updater),
  
  incrementOmenCount: () => set(state => ({ omenCount: state.omenCount + 1 })),

  applyCardOutcome: () => {
    // Legacy support, mostly moved to useEventSystem
    const state = get();
    const active = state.activeCard;
    if (!active) return;
    set({ activeCard: null, turnPhase: 'DONE' });
  },

  performHauntRoll: () => {
    const state = get();
    
    // Instead of instant calc, trigger the UI
    set({
      activeRoll: {
        id: `haunt_roll_${Date.now()}`,
        attributeName: 'Haunt Roll',
        numberOfDice: 6,
        targetValue: state.omenCount, // Not strictly a target in "Success" sense, but threshold
        onComplete: (total) => {
            set({ activeRoll: null, lastRollResult: total });
            
            const hauntTriggered = total < get().omenCount;
            
            get().addLog(`Haunt Roll: ${total} (Omens: ${get().omenCount})`, hauntTriggered ? 'alert' : 'success');

            if (hauntTriggered) {
                set({ 
                    phase: GamePhase.HauntReveal,
                    isHauntActive: true
                });
            } else {
                set({ 
                    phase: GamePhase.Exploration,
                    turnPhase: 'DONE'
                });
                get().addLog(`The house settles... for now.`, 'narrative');
            }
        }
      }
    });
  },

  addLog: (text: string, type: LogEntry['type'] = 'info') => {
    const newLog: LogEntry = {
      id: Math.random().toString(36),
      timestamp: Date.now(),
      text,
      type
    };
    set(state => ({ logs: [newLog, ...state.logs] }));
  },

  setHoveredTileId: (id: string | null) => {
    set({ hoveredTileId: id });
  },

  toggleInventory: () => {
    set(state => ({ isInventoryOpen: !state.isInventoryOpen }));
  },

  useItem: (itemId: string) => {
    const state = get();

    if (state.activeCard || state.turnPhase === 'EVENT_RESOLVING') {
        state.addLog("You cannot use items while an event is resolving!", 'alert');
        return;
    }

    const newPlayers = [...state.players];
    const currentPlayer = newPlayers[state.currentPlayerIndex];
    const itemIndex = currentPlayer.items.findIndex(i => i.id === itemId);

    if (itemIndex === -1) return;

    const item = currentPlayer.items[itemIndex];
    if (!item.usage) return;

    get().executeScript(item.usage.effects);

    if (item.usage.isConsumable) {
        currentPlayer.items.splice(itemIndex, 1);
        state.addLog(`${item.name} was consumed.`, 'info');
    }

    set({ 
        players: newPlayers,
        isInventoryOpen: false 
    });
  },

  dropItem: (itemId: string) => {
      const state = get();
      const newPlayers = [...state.players];
      const currentPlayer = newPlayers[state.currentPlayerIndex];
      const itemIndex = currentPlayer.items.findIndex(i => i.id === itemId);
      
      if (itemIndex > -1) {
          const item = currentPlayer.items[itemIndex];
          currentPlayer.items.splice(itemIndex, 1);
          state.addLog(`${item.name} was dropped.`, 'info');
          set({ players: newPlayers });
      }
  }
}));
