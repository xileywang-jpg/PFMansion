
import { useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { EventCard, ActiveRoll, Item, GamePhase } from '../types';

export const useEventSystem = () => {
  const { 
    triggerSpecificEvent, 
    drawCard, 
    setState, 
    executeScript, 
    addLog, 
    players, 
    currentPlayerIndex,
    map,
    incrementOmenCount
  } = useGameStore();

  const triggerEvent = useCallback((eventId: string) => {
    triggerSpecificEvent(eventId);
  }, [triggerSpecificEvent]);

  const triggerRandomEvent = useCallback(() => {
    drawCard('EVENT');
  }, [drawCard]);

  /**
   * The "Brain" of the resolution engine.
   * Calculates success/failure and executes script actions.
   */
  const resolveEventResult = useCallback((event: EventCard, total: number) => {
    if (event.interaction.type !== 'ATTRIBUTE_CHECK') return;

    const { difficulty, success, failure } = event.interaction;
    const passed = total >= difficulty;
    
    // 1. Feedback
    addLog(
      `Rolled ${total} vs Target ${difficulty}. ${passed ? 'Success!' : 'Failure...'}`, 
      passed ? 'success' : 'alert'
    );

    // 2. Execute Effects
    const outcomeActions = passed ? success : failure;
    executeScript(outcomeActions);

    // 3. Finalize
    // Mark tile as resolved
    const player = players[currentPlayerIndex];
    const tileKey = `${player.position.x},${player.position.y}`;
    const updatedMap = { ...map };
    
    // Only mark if we are indeed standing on that tile (usually true)
    if (updatedMap[tileKey]) {
        updatedMap[tileKey] = { ...updatedMap[tileKey], hasEventTriggered: true };
    }

    // Update state to close modal and roll UI
    setState({
        activeCard: null,
        activeRoll: null,
        lastRollResult: total, // Keep result for a moment if needed, or null
        map: updatedMap,
        turnPhase: 'DONE' // Event usually ends movement
    });
  }, [addLog, executeScript, players, currentPlayerIndex, map, setState]);

  /**
   * Handles Item/Omen pickup from the modal.
   * Manages inventory and Haunt Roll triggers.
   */
  const resolveItemPickup = useCallback((item: Item) => {
    // 1. Add to inventory
    const player = players[currentPlayerIndex];
    const newPlayers = [...players];
    newPlayers[currentPlayerIndex].items.push(item);
    
    addLog(`${player.character.name} acquired ${item.name}.`, 'success');

    // 2. Mark tile as resolved
    const tileKey = `${player.position.x},${player.position.y}`;
    const updatedMap = { ...map };
    if (updatedMap[tileKey]) {
        updatedMap[tileKey] = { ...updatedMap[tileKey], hasEventTriggered: true };
    }

    // 3. Logic Branch: Omen vs Item
    if (item.type === 'OMEN') {
        incrementOmenCount();
        addLog(`Omen found. The house grows restless...`, 'narrative');
        
        // Trigger Haunt Roll Phase
        setState({
            players: newPlayers,
            map: updatedMap,
            activeCard: null,
            phase: GamePhase.HauntRoll
        });
    } else {
        // Normal Item: End Turn
        setState({
            players: newPlayers,
            map: updatedMap,
            activeCard: null,
            turnPhase: 'DONE'
        });
    }
  }, [players, currentPlayerIndex, map, addLog, incrementOmenCount, setState]);

  /**
   * Bridges the UI to the Store.
   * Sets up the active roll and provides the callback to resolve it.
   */
  const initiateEventRoll = useCallback((event: EventCard) => {
    if (event.interaction.type !== 'ATTRIBUTE_CHECK') return;
    
    const attr = event.interaction.attribute;
    const player = players[currentPlayerIndex];
    const diceCount = player.character.attributes[attr].current;

    const rollData: ActiveRoll = {
        id: `evt_${event.id}_${Date.now()}`,
        attributeName: attr,
        numberOfDice: diceCount,
        targetValue: event.interaction.difficulty,
        onComplete: (total) => resolveEventResult(event, total)
    };

    setState({ activeRoll: rollData });
  }, [players, currentPlayerIndex, resolveEventResult, setState]);

  return { 
    triggerEvent,
    triggerRandomEvent,
    initiateEventRoll,
    resolveEventResult,
    resolveItemPickup
  };
};
