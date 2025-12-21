
import { Player, Scenario, AttributeName } from '../types';

/**
 * Resolves who the traitor is based on scenario rules.
 * Handles tie-breaking by prioritizing the trigger player.
 */
export const resolveTraitor = (
  scenario: Scenario, 
  triggerPlayerId: string, 
  players: Record<string, Player>
): string => {
  const livingPlayers = Object.values(players).filter(p => !p.isDead);
  
  switch (scenario.traitorRule) {
    case 'TRIGGER_PLAYER':
      return triggerPlayerId;

    case 'HIGHEST_MIGHT': {
      const sorted = [...livingPlayers].sort((a, b) => {
        const diff = b.character.attributes[AttributeName.Might].current - a.character.attributes[AttributeName.Might].current;
        if (diff === 0) {
           // Tie-breaker: If tied, and one is trigger player, they become traitor
           if (a.id === triggerPlayerId) return -1;
           if (b.id === triggerPlayerId) return 1;
        }
        return diff;
      });
      return sorted[0].id;
    }

    case 'LOWEST_SANITY': {
      const sorted = [...livingPlayers].sort((a, b) => {
        const diff = a.character.attributes[AttributeName.Sanity].current - b.character.attributes[AttributeName.Sanity].current;
        if (diff === 0) {
           if (a.id === triggerPlayerId) return -1;
           if (b.id === triggerPlayerId) return 1;
        }
        return diff;
      });
      return sorted[0].id;
    }

    case 'SPECIFIC_CHAR_ID': {
      const specific = livingPlayers.find(p => p.character.id === scenario.traitorRuleValue);
      return specific ? specific.id : triggerPlayerId;
    }

    default:
      return triggerPlayerId;
  }
};

/**
 * Heals the traitor's stats back to their starting base values 
 * (or better) to ensure they aren't immediately defeated.
 */
export const healTraitor = (traitor: Player): Player => {
  const newAttributes = { ...traitor.character.attributes };
  
  (Object.keys(newAttributes) as AttributeName[]).forEach(attrName => {
    const attr = newAttributes[attrName];
    // Heal back to base starting values if current is lower
    if (attr.current < attr.base) {
      attr.current = attr.base;
    }
  });

  return {
    ...traitor,
    character: {
      ...traitor.character,
      attributes: newAttributes
    }
  };
};
