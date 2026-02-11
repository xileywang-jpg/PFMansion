
import { Condition, Effect, TargetSelector } from '../types/Logic';
import { Player, AttributeName } from '../types';
import { ITEMS_DB } from '../data/items';

export interface GameContext {
  state: any; // useGameStore state
  activePlayerId: string;
  currentTargetId?: string; // Contextual target for conditions
  selectedPartnerId?: string; // For Interaction Modal context
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
  const { state, activePlayerId, selectedPartnerId } = context;
  const players = state.players as Record<string, Player>;
  const self = players[activePlayerId];

  if (!self) return [];

  switch (selector.type) {
    case 'SELF':
      return [activePlayerId];

    case 'SELECTED_PARTNER':
      return selectedPartnerId ? [selectedPartnerId] : [];

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

    case 'IS_ALIVE':
      return !player.isDead;

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
            message: `[Logic] ${effect.stat} 变更 ${effect.amount > 0 ? '+' : ''}${effect.amount}`
          }]);
        });
        break;
      }

      case 'DAMAGE': {
        const targets = resolveTargets(effect.target, context);
        targets.forEach(tid => {
            // Damage usually targets Might unless specified
            state.executeScript([{
                type: 'modify_stat',
                target: tid,
                attribute: AttributeName.Might, 
                amount: -Math.abs(effect.amount),
                message: `[Logic] 受到 ${effect.amount} 点伤害`
            }]);
        });
        break;
      }

      case 'HEAL': {
        const targets = resolveTargets(effect.target, context);
        targets.forEach(tid => {
            state.executeScript([{
                type: 'heal',
                target: tid,
                attribute: effect.stat as AttributeName,
                amount: Math.abs(effect.amount)
            }]);
        });
        break;
      }

      case 'MOVE': {
        const targets = resolveTargets(effect.target, context);
        state.addLog(`[Logic] 移动指令: 目标 [${targets.join(', ')}] 移动 ${effect.steps} 步 (暂未实装物理移动)。`, 'info');
        break;
      }

      case 'TELEPORT': {
        const targets = resolveTargets(effect.target, context);
        targets.forEach(tid => {
             const location = effect.location === 'BASEMENT' ? 'basement' : 'ground'; // Simple mapping
             state.executeScript([{
                 type: 'move_player',
                 target: tid,
                 location: location
             }]);
        });
        break;
      }

      case 'ADD_ITEM': {
          const targets = resolveTargets(effect.target, context);
          targets.forEach(tid => {
             state.executeScript([{
                 type: 'add_item',
                 target: tid,
                 itemId: effect.itemId
             }]);
          });
          break;
      }

      case 'REMOVE_ITEM': {
        // Not implemented in executeScript yet, implement directly here or extend script
        state.addLog(`[Logic] 尝试移除物品 ${effect.itemId} (需扩展底层支持)`, 'warning');
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

      case 'LOG': {
          state.addLog(effect.message, effect.style || 'info');
          break;
      }

      case 'IF': {
        // We attempt to resolve a primary target to evaluate the condition against.
        // Default to active player if condition doesn't specify target implicitly?
        // For simple DSL, we use the global context active player or if we are iterating targets in a parent scope (complex)
        // Here we just use the current context.
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
