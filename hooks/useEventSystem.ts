
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
    addPersonalLog,
    players, 
    activePlayerId,
    map,
    incrementOmenCount,
    getEffectiveAttributeValue
  } = useGameStore();

  const triggerEvent = useCallback((eventId: string) => {
    triggerSpecificEvent(eventId);
  }, [triggerSpecificEvent]);

  const triggerRandomEvent = useCallback(() => {
    drawCard('EVENT');
  }, [drawCard]);

  const resolveEventResult = useCallback((event: EventCard, total: number) => {
    if (event.interaction.type !== 'ATTRIBUTE_CHECK') return;

    const { difficulty, success, failure } = event.interaction;
    const passed = total >= difficulty;
    
    addLog(
      `投掷结果: ${total} (目标: ${difficulty})。 ${passed ? '成功！' : '失败...'}`, 
      passed ? 'success' : 'alert'
    );
    addPersonalLog(
        activePlayerId,
        `进行 ${event.interaction.attribute} 检定: 结果 ${total} ${passed ? '(成功)' : '(失败)'}`,
        passed ? 'success' : 'alert'
    );

    const outcomeActions = passed ? success : failure;
    
    // Generate feedback text from action messages
    const outcomes = outcomeActions.filter(a => a.message).map(a => a.message);
    const resultText = outcomes.length > 0 ? outcomes.join(' ') : (passed ? "你安然无恙。" : "你遭遇了不幸。");

    executeScript(outcomeActions);

    const player = players[activePlayerId];
    const tileKey = `${player.position.x},${player.position.y}`;
    const updatedMap = { ...map };
    
    if (updatedMap[tileKey]) {
        updatedMap[tileKey] = { ...updatedMap[tileKey], hasEventTriggered: true };
    }

    setState({
        // activeCard: null, // Don't clear activeCard yet, so the modal stays open
        activeRoll: null,
        lastRollResult: total,
        map: updatedMap,
        // turnPhase: 'DONE', // Don't finish turn yet
        eventOutcome: {
            title: passed ? '检定成功' : '检定失败',
            description: resultText,
            type: passed ? 'success' : 'failure',
            roll: total,
            target: difficulty
        }
    });
  }, [addLog, addPersonalLog, executeScript, players, activePlayerId, map, setState]);

  const resolveItemPickup = useCallback((item: Item) => {
    const player = players[activePlayerId];
    const newPlayers = { ...players };
    newPlayers[activePlayerId] = {
        ...newPlayers[activePlayerId],
        items: [...newPlayers[activePlayerId].items, item]
    };
    
    addLog(`${player.character.name} 获得了 ${item.name}。`, 'success');
    addPersonalLog(activePlayerId, `拾取了 ${item.name}。`, 'success');

    const tileKey = `${player.position.x},${player.position.y}`;
    const currentTile = map[tileKey];
    const updatedMap = { ...map };
    if (updatedMap[tileKey]) {
        updatedMap[tileKey] = { ...updatedMap[tileKey], hasEventTriggered: true };
    }

    if (item.type === 'OMEN') {
        incrementOmenCount();
        addLog(`发现了预兆。大厦变得更加躁动不安...`, 'narrative');
        
        setState({
            players: newPlayers,
            map: updatedMap,
            activeCard: null,
            phase: GamePhase.HauntRoll,
            // 记录作祟上下文
            lastTriggeredOmenId: item.id,
            lastTriggeredTileId: currentTile.defId
        });
    } else {
        setState({
            players: newPlayers,
            map: updatedMap,
            activeCard: null,
            turnPhase: 'DONE'
        });
    }
  }, [players, activePlayerId, map, addLog, addPersonalLog, incrementOmenCount, setState]);

  const initiateEventRoll = useCallback((event: EventCard) => {
    if (event.interaction.type !== 'ATTRIBUTE_CHECK') return;
    
    const attr = event.interaction.attribute;
    // Fix: Use effective attribute value including items and buffs
    const diceCount = getEffectiveAttributeValue(activePlayerId, attr);

    const rollData: ActiveRoll = {
        id: `evt_${event.id}_${crypto.randomUUID()}`,
        attributeName: attr,
        numberOfDice: diceCount,
        targetValue: event.interaction.difficulty,
        onComplete: (total) => resolveEventResult(event, total)
    };

    setState({ activeRoll: rollData });
  }, [players, activePlayerId, resolveEventResult, setState, getEffectiveAttributeValue]);

  return { 
    triggerEvent,
    triggerRandomEvent,
    initiateEventRoll,
    resolveEventResult,
    resolveItemPickup
  };
};
