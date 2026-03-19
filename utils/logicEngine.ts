
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

      // ========== 新增效果 ==========

      case 'TRADE_ITEMS': {
        const targets = resolveTargets(effect.target, context);
        const { itemId, withPlayerId, withItemId } = effect;
        
        if (targets.length > 0 && withPlayerId && itemId && withItemId) {
          const playerId = targets[0];
          state.addLog(`[Logic] 交易: 玩家 ${playerId} 用 ${itemId} 换取 ${withPlayerId} 的 ${withItemId}`, 'info');
          state.executeScript([{
            type: 'trade_items',
            playerId1: playerId,
            itemId1: itemId,
            playerId2: withPlayerId,
            itemId2: withItemId
          }]);
        }
        break;
      }

      case 'TELEPORT_TO_REVEALED': {
        const targets = resolveTargets(effect.target, context);
        targets.forEach(tid => {
          state.executeScript([{
            type: 'teleport_to_revealed',
            target: tid,
            locationId: effect.locationId
          }]);
        });
        break;
      }

      case 'REVEAL_ALL_TILES': {
        state.executeScript([{ type: 'reveal_all_tiles' }]);
        state.addLog('[Logic] 地图已完全揭示！', 'success');
        break;
      }

      case 'REVEAL_NEXT_EVENT': {
        state.executeScript([{ 
          type: 'reveal_next_event', 
          toTop: effect.toTop !== false 
        }]);
        break;
      }

      case 'REVEAL_TRAIL': {
        state.executeScript([{ type: 'reveal_trail', target: context.activePlayerId }]);
        state.addLog('[Logic] 你的足迹已被标记在地图上', 'info');
        break;
      }

      case 'REROLL_DICE': {
        state.executeScript([{ 
          type: 'reroll_dice', 
          contextId: effect.contextId 
        }]);
        break;
      }

      case 'MIRROR_REFLECT': {
        const targets = resolveTargets(effect.target, context);
        const duration = effect.duration || 3;
        
        targets.forEach(tid => {
          state.executeScript([{
            type: 'add_status_effect',
            target: tid,
            effect: 'MIRROR_REFLECT',
            duration: duration
          }]);
        });
        state.addLog(`[Logic] 镜子反射效果已施加，持续 ${duration} 回合`, 'alert');
        break;
      }

      case 'DIVINATION': {
        state.executeScript([{
          type: 'divination',
          action: effect.action
        }]);
        break;
      }
    }
  });
};

// ============================================
// 地图卡触发器系统 (Tile Trigger System)
// ============================================

import { TileTrigger, TileInteraction, AttributeName as Attr } from '../types';

/**
 * 投掷骰子
 */
const rollDice = (sides: number = 6): number => {
  return Math.floor(Math.random() * sides) + 1;
};

/**
 * 处理地块进入/离开时的检定触发
 */
export const handleTileTrigger = (
  trigger: TileTrigger,
  context: GameContext
): { success: boolean; results: any[] } => {
  const { state, activePlayerId } = context;
  const player = state.players[activePlayerId];
  
  if (!player) return { success: false, results: [] };

  const results: any[] = [];

  switch (trigger.type) {
    case 'ATTRIBUTE_CHECK': {
      if (!trigger.attribute || !trigger.difficulty) break;
      
      const attrValue = player.character.attributes[trigger.attribute]?.current ?? 0;
      const roll = rollDice(6);
      const total = attrValue + roll;
      
      state.addLog(`[检定] ${trigger.attribute} 检定: ${attrValue} + 🎲${roll} = ${total} vs 难度${trigger.difficulty}`, 'info');
      
      const isSuccess = total >= trigger.difficulty;
      
      if (isSuccess && trigger.success) {
        trigger.success.forEach((effect: any) => {
          results.push({ type: 'success', ...effect });
        });
      } else if (!isSuccess && trigger.failure) {
        trigger.failure.forEach((effect: any) => {
          results.push({ type: 'failure', ...effect });
        });
      }
      
      return { success: isSuccess, results };
    }

    case 'DRAW_CARD': {
      const deck = trigger.deck || 'ITEM';
      const count = trigger.count || 1;
      
      state.addLog(`[抽牌] 从${deck}堆抽取${count}张卡牌！`, 'info');
      results.push({ type: 'draw_card', deck, count });
      return { success: true, results };
    }

    case 'RANDOM_EVENT': {
      if (!trigger.possibilities || trigger.possibilities.length === 0) {
        return { success: false, results: [] };
      }
      
      // 计算总权重
      const totalWeight = trigger.possibilities.reduce((sum, p) => sum + p.weight, 0);
      let random = Math.random() * totalWeight;
      
      for (const possibility of trigger.possibilities) {
        random -= possibility.weight;
        if (random <= 0) {
          state.addLog(`[随机事件] 发生了: ${possibility.type}`, 'info');
          results.push(possibility);
          break;
        }
      }
      
      return { success: true, results };
    }

    default:
      return { success: false, results: [] };
  }
};

/**
 * 处理地块互动
 */
export const handleTileInteraction = (
  interaction: TileInteraction,
  context: GameContext
): { canInteract: boolean; message: string; effects: any[] } => {
  const { state, activePlayerId } = context;
  const player = state.players[activePlayerId];
  
  if (!player) {
    return { canInteract: false, message: '玩家不存在', effects: [] };
  }

  // 检查条件
  if (interaction.condition) {
    const canProceed = evaluateCondition(interaction.condition, context);
    if (!canProceed) {
      return { canInteract: false, message: '条件不满足', effects: [] };
    }
  }

  // 检查消耗
  if (interaction.cost) {
    const attrValue = player.character.attributes[interaction.cost.type as Attr]?.current ?? 0;
    if (attrValue < interaction.cost.amount) {
      return { canInteract: false, message: `需要${interaction.cost.amount}点${interaction.cost.type}`, effects: [] };
    }
  }

  const effects: any[] = [];

  switch (interaction.type) {
    case 'TRADE':
      return { 
        canInteract: true, 
        message: '交易', 
        effects: [{ type: 'trade' }] 
      };

    case 'HEAL':
      return { 
        canInteract: true, 
        message: '治疗', 
        effects: [{ type: 'heal', amount: 999 }] 
      };

    case 'TELEPORT':
      return { 
        canInteract: true, 
        message: '传送', 
        effects: [{ type: 'teleport', destination: interaction.destination || 'any_revealed' }] 
      };

    case 'REVEAL_MAP':
      return { 
        canInteract: true, 
        message: '揭示地图', 
        effects: [{ type: 'reveal_all' }] 
      };

    case 'DIVINATION':
      return { 
        canInteract: true, 
        message: '占卜', 
        effects: [{ type: 'reveal_next_event' }] 
      };

    case 'MIRROR':
      return { 
        canInteract: true, 
        message: '镜中映射', 
        effects: [{ type: 'reveal_trail' }] 
      };

    case 'TIME_REWIND':
      return { 
        canInteract: true, 
        message: '时间回溯', 
        effects: [{ type: 'reroll_initiative' }] 
      };

    case 'FORGE':
      return { 
        canInteract: true, 
        message: '锻造', 
        effects: [{ type: 'forge' }] 
      };

    case 'CROSS':
      // 穿越危险区域
      if (interaction.difficulty && interaction.attribute) {
        const attrValue = player.character.attributes[interaction.attribute]?.current ?? 0;
        const roll = rollDice(6);
        const total = attrValue + roll;
        const isSuccess = total >= interaction.difficulty;
        
        return {
          canInteract: true,
          message: isSuccess ? (interaction.successMessage || '成功') : (interaction.failureMessage || '失败'),
          effects: isSuccess ? [] : [{ type: 'damage', amount: 1 }]
        };
      }
      return { canInteract: true, message: '穿越', effects: [] };

    default:
      return { canInteract: true, message: interaction.description, effects: [] };
  }
};

/**
 * 检查地块是否可以互动
 */
export const canInteractWithTile = (
  tileDef: { interact?: TileInteraction },
  context: GameContext
): boolean => {
  if (!tileDef.interact) return false;
  
  // 如果有条件，检查是否满足
  if (tileDef.interact.condition) {
    return evaluateCondition(tileDef.interact.condition, context);
  }
  
  return true;
};
