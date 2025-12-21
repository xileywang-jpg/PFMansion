
/**
 * Mansion Protocol - Logic DSL
 * 用于驱动技能、事件和剧本效果的核心逻辑系统
 */

// --- 目标选择器 (Target Selector) ---
// 用于动态确定逻辑影响的对象
export type TargetSelector = 
  | { type: 'SELF' }
  | { type: 'ALL_OTHERS' }
  | { type: 'NEAREST_ENEMY' }
  | { type: 'TILE_AT', direction: 'N' | 'S' | 'E' | 'W' };

// --- 逻辑比较器 (Condition) ---
// 用于判定触发条件或 IF 分支
export type Condition = 
  | { op: 'AND' | 'OR', conditions: Condition[] }
  | { op: 'GT' | 'LT' | 'EQ', stat: string, value: number }
  | { op: 'HAS_ITEM', itemId: string }
  | { op: 'IS_TRAITOR' };

// --- 执行效果 (Effect) ---
// 对游戏状态产生的实际影响
export type Effect = 
  | { type: 'MODIFY_STAT', target: TargetSelector, stat: string, amount: number }
  | { type: 'MOVE', target: TargetSelector, steps: number }
  | { type: 'SPAWN_TOKEN', tokenId: string, location: TargetSelector }
  | { type: 'DRAW_CARD', deck: 'EVENT' | 'ITEM' }
  // 支持条件分支
  | { type: 'IF', condition: Condition, then: Effect[], else?: Effect[] };

// --- 技能/剧本节点定义 ---
export interface ActionDefinition {
  id: string;
  name: string;
  description: string;
  condition?: Condition;
  effects: Effect[];
}
