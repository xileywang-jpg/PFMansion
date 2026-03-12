/**
 * 状态效果系统
 * 处理状态效果的添加、移除、回合递减
 */

import { Player, StatusEffect, StatusEffectType } from '../types';

/**
 * 添加状态效果
 */
export const addStatusEffect = (
  player: Player,
  effect: StatusEffect
): boolean => {
  // 检查是否已有同类效果
  const existingIndex = player.statusEffects.findIndex(e => e.type === effect.type);
  
  if (existingIndex >= 0) {
    // 刷新持续时间
    player.statusEffects[existingIndex].duration = Math.max(
      player.statusEffects[existingIndex].duration,
      effect.duration
    );
  } else {
    // 添加新效果
    player.statusEffects.push({ ...effect });
  }
  
  return true;
};

/**
 * 移除状态效果
 */
export const removeStatusEffect = (
  player: Player,
  type: StatusEffectType
): boolean => {
  const index = player.statusEffects.findIndex(e => e.type === type);
  if (index >= 0) {
    player.statusEffects.splice(index, 1);
    return true;
  }
  return false;
};

/**
 * 回合结束时减少状态效果持续时间
 * 返回是否有效果被移除
 */
export const decrementStatusEffects = (player: Player): string[] => {
  const removed: string[] = [];
  
  player.statusEffects = player.statusEffects.filter(effect => {
    if (effect.duration === -1) return true; // 永久效果
    
    effect.duration--;
    
    if (effect.duration <= 0) {
      removed.push(effect.type);
      return false;
    }
    return true;
  });
  
  return removed;
};

/**
 * 检查玩家是否有特定状态效果
 */
export const hasStatusEffect = (
  player: Player,
  type: StatusEffectType
): boolean => {
  return player.statusEffects.some(e => e.type === type);
};

/**
 * 获取状态效果信息
 */
export const getStatusEffect = (
  player: Player,
  type: StatusEffectType
): StatusEffect | undefined => {
  return player.statusEffects.find(e => e.type === type);
};

/**
 * 处理状态效果效果
 * 返回效果描述
 */
export const applyStatusEffectOnTurnStart = (
  player: Player
): string[] => {
  const logs: string[] = [];
  
  player.statusEffects.forEach(effect => {
    switch (effect.type) {
      case 'BURNING':
        if (effect.damage && effect.damage > 0) {
          // 灼烧伤害在受伤系统处理
          logs.push(`灼烧效果造成 ${effect.damage} 点伤害！`);
        }
        break;
        
      case 'PETRIFIED':
        logs.push('石化状态：无法移动！');
        break;
        
      case 'CONFUSED':
        logs.push('混乱状态：攻击可能出错！');
        break;
        
      case 'INVISIBLE':
        logs.push('隐身状态：敌人无法主动攻击！');
        break;
        
      case 'DISGUISED':
        logs.push(`伪装状态：被视为 ${effect.faction || '中立'}`);
        break;
        
      case 'PHASING':
        logs.push('相位状态：可以穿过墙壁！');
        break;
        
      case 'BLESSED':
        logs.push('祝福状态：全属性提升！');
        break;
        
      case 'CURSED':
        logs.push('诅咒状态：全属性下降！');
        break;
        
      case 'STEALTH':
        logs.push(`潜行状态：速度+${effect.amount || 2}！`);
        break;
    }
  });
  
  return logs;
};

/**
 * 检查状态效果对属性的修正
 */
export const getStatusEffectModifiers = (
  player: Player
): { attribute: string; amount: number }[] => {
  const modifiers: { attribute: string; amount: number }[] = [];
  
  player.statusEffects.forEach(effect => {
    switch (effect.type) {
      case 'STEALTH':
        modifiers.push({ attribute: 'speed', amount: effect.amount || 2 });
        break;
        
      case 'BLESSED':
        modifiers.push({ attribute: 'might', amount: 1 });
        modifiers.push({ attribute: 'speed', amount: 1 });
        modifiers.push({ attribute: 'sanity', amount: 1 });
        modifiers.push({ attribute: 'knowledge', amount: 1 });
        break;
        
      case 'CURSED':
        modifiers.push({ attribute: 'might', amount: -1 });
        modifiers.push({ attribute: 'speed', amount: -1 });
        modifiers.push({ attribute: 'sanity', amount: -1 });
        modifiers.push({ attribute: 'knowledge', amount: -1 });
        break;
    }
  });
  
  return modifiers;
};

/**
 * 创建常见状态效果
 */
export const createStatusEffect = (
  type: StatusEffectType,
  duration: number,
  options?: {
    damage?: number;
    faction?: string;
    amount?: number;
    source?: string;
  }
): StatusEffect => {
  return {
    type,
    duration,
    source: options?.source,
    damage: options?.damage,
    faction: options?.faction,
    amount: options?.amount
  };
};
