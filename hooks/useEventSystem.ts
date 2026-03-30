
import { useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { EventCard, ActiveRoll } from '../types';
import { generateId } from '../utils/idGenerator';

export const useEventSystem = () => {
  const { 
    setState,
    activePlayerId,
    getEffectiveAttributeValue
  } = useGameStore();

  const initiateEventRoll = useCallback((event: EventCard) => {
    if (event.interaction.type !== 'ATTRIBUTE_CHECK' || !event.interaction.attribute) return;
    
    const attr = event.interaction.attribute;
    // 检定骰子数以后端同步的当前属性值为准。
    const diceCount = getEffectiveAttributeValue(activePlayerId, attr);

    const rollData: ActiveRoll = {
        id: generateId(`evt_${event.id}`),
        attributeName: attr,
        numberOfDice: diceCount,
        targetValue: event.interaction.difficulty,
        onComplete: () => {}
    };

    setState({ activeRoll: rollData, lastRollResult: null, lastCheckSuccess: null });
    }, [activePlayerId, setState, getEffectiveAttributeValue]);

  return { 
    initiateEventRoll
  };
};
