
import { Condition, Effect, TargetSelector } from '../types/Logic';
import { Player, AttributeName } from '../types';

export interface GameContext {
  state: any; // useGameStore state
  activePlayerId: string;
  currentTargetId?: string; // Contextual target for conditions
}

/**
 * Calculates Manhattan distance between two points.
 */
const getDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
  return Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
};

/**
 * Resolves a TargetSelector into actual player IDs.
 */
export const resolveTargets = (selector: TargetSelector, context: GameContext): string[] => {
  const { state, activePlayerId } = context;
  const players = state.players as Record<string, Player>;
  const self = players[activePlayerId];

  if (!self) return [];

  switch (selector.type) {
    case 'SELF':
      return [activePlayerId];

    case 'ALL_OTHERS':
      return Object.keys(players).filter(id => id !== activePlayerId && !players[id].isDead);

    case 'NEAREST_ENEMY': {
      const livingOthers = Object.values(players).filter(p => p.id !== activePlayerId && !p.isDead);
      if (livingOthers.length === 0) return [];

      // If Haunt is active, enemies are on opposite teams. 
      // Otherwise, everyone else is a potential target for "enemy" effects.
      const potentialEnemies = state.isHauntActive 
        ? livingOthers.filter(p => p.team !== self.team) 
        : livingOthers;

      if (potentialEnemies.length === 0) return [];

      let minDist = Infinity;
      let closest: string[] = [];

      potentialEnemies.forEach(p => {
        const dist = getDistance(self.position, p.position);
        if (dist < minDist) {
          minDist = dist;
          closest = [p.id];
        } else if (dist === minDist) {
          closest.push(p.id);
        }
      });

      // Betrayal usually targets a single entity for "nearest", tie-break by ID or logic
      return closest.length > 0 ? [closest[0]] : [];
    }

    case 'TILE_AT': {
      let tx = self.position.x;
      let ty = self.position.y;
      if (selector.direction === 'N') ty--;
      else if (selector.direction === 'S') ty++;
      else if (selector.direction === 'E') tx++;
      else if (selector.direction === 'W') tx--;

      // Return player IDs at that specific coordinate
      return Object.keys(players).filter(id => 
        players[id].position.x === tx && 
        players[id].position.y === ty && 
        !players[id].isDead
      );
    }

    default:
      return [];
  }
};

/**
 * Evaluates a logical condition against the current game state.
 */
export const evaluateCondition = (condition: Condition, context: GameContext): boolean => {
  const { state, activePlayerId, currentTargetId } = context;
  
  // Use currentTargetId if provided (e.g. within an IF block that follows a Target resolution)
  const targetId = currentTargetId || activePlayerId;
  const player = state.players[targetId] as Player;

  if (!player) return false;

  switch (condition.op) {
    case 'AND':
      return condition.conditions.every(c => evaluateCondition(c, context));
    case 'OR':
      return condition.conditions.some(c => evaluateCondition(c, context));
    
    case 'GT': {
      const statVal = player.character.attributes[condition.stat as AttributeName]?.current ?? 0;
      return statVal > condition.value;
    }
    case 'LT': {
      const statVal = player.character.attributes[condition.stat as AttributeName]?.current ?? 0;
      return statVal < condition.value;
    }
    case 'EQ': {
      const statVal = player.character.attributes[condition.stat as AttributeName]?.current ?? 0;
      return statVal === condition.value;
    }
    
    case 'HAS_ITEM':
      return player.items.some(item => item.id === condition.itemId);
    
    case 'IS_TRAITOR':
      return player.team === 'TRAITOR';

    default:
      return false;
  }
};

/**
 * Executes an array of Effects by updating the game store.
 */
export const executeEffects = (effects: Effect[], context: GameContext): void => {
  const { state } = context;

  effects.forEach(effect => {
    switch (effect.type) {
      case 'MODIFY_STAT': {
        const targets = resolveTargets(effect.target, context);
        targets.forEach(tid => {
          state.executeScript([{
            type: 'modify_stat',
            target: tid,
            attribute: effect.stat as AttributeName,
            amount: effect.amount,
            message: `[Logic] ${effect.stat} 修改了 ${effect.amount}`
          }]);
        });
        break;
      }

      case 'MOVE': {
        const targets = resolveTargets(effect.target, context);
        // Movement logic depends on game implementation, for now we log it
        state.addLog(`[Logic] 移动指令: 目标 [${targets.join(', ')}] 移动 ${effect.steps} 步。`, 'info');
        break;
      }

      case 'DRAW_CARD': {
        state.drawCard(effect.deck);
        break;
      }

      case 'SPAWN_TOKEN': {
        const loc = resolveTargets(effect.location, context);
        state.addLog(`[Logic] 令牌生成: ${effect.tokenId} 于 ${loc.length > 0 ? loc[0] : '未知位置'}`, 'narrative');
        break;
      }

      case 'IF': {
        // Advanced: we want to evaluate the condition against the target of the previous stat modification
        // if possible. For simple DSL support, we'll try to guess the target context.
        if (evaluateCondition(effect.condition, context)) {
          executeEffects(effect.then, context);
        } else if (effect.else) {
          executeEffects(effect.else, context);
        }
        break;
      }
    }
  });
};
