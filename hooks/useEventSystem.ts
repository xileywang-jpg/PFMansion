
import { useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { EventCard, ActiveRoll, Item, GamePhase } from '../types';
import { generateId } from '../utils/idGenerator';
import { applyPassiveEffects } from '../utils/passiveEffectParser';
import { sendPickupItem } from '../ws/network';

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

    // 注意：后端已在 ResolveEventChoice 中应用效果，此处不再重复执行
    // executeScript(outcomeActions);

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
    // 深拷贝玩家数据，避免修改原对象
    const newPlayers = JSON.parse(JSON.stringify(players)) as typeof players;
    const newPlayer = newPlayers[activePlayerId];
    newPlayer.items = [...(newPlayer.items || []), item];
    
    addLog(`${player.character.name} 获得了 ${item.name}。`, 'success');
    addPersonalLog(activePlayerId, `拾取了 ${item.name}。`, 'success');

    // 应用被动效果
    if (item.passiveEffects && item.passiveEffects.length > 0) {
      const effectResults = applyPassiveEffects(newPlayer, item.passiveEffects);
      
      for (const result of effectResults) {
        if (result.startsWith('[')) {
          addLog(`${item.name}: ${result}`, 'info');
        } else {
          addLog(`${item.name}效果: ${result}`, 'success');
        }
        addPersonalLog(activePlayerId, `获得效果: ${result}`, 'success');
      }
    }

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
            lastTriggeredOmen: item.id,
            lastTriggeredTile: currentTile.defId
        });
    } else {
        setState({
            players: newPlayers,
            map: updatedMap,
            activeCard: null,
            turnPhase: 'DONE'
        });
    }

    // Bug Fix: 发送网络请求通知后端物品拾取
    // 乐观更新已完成，后端同步确认
    sendPickupItem(item.id);
  }, [players, activePlayerId, map, addLog, addPersonalLog, incrementOmenCount, setState]);

  const initiateEventRoll = useCallback((event: EventCard) => {
    if (event.interaction.type !== 'ATTRIBUTE_CHECK') return;
    
    const attr = event.interaction.attribute;
    // Fix: Use effective attribute value including items and buffs
    const diceCount = getEffectiveAttributeValue(activePlayerId, attr);

    const rollData: ActiveRoll = {
        id: generateId(`evt_${event.id}`),
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
