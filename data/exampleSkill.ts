
import { ActionDefinition } from '../types/Logic';

/**
 * 示例技能：嗜血打击 (Vampiric Strike)
 * 
 * 逻辑描述：
 * 1. 条件：检查执行者是否持有 "item_dagger"。
 * 2. 效果：
 *    - 对最近的敌人减少 2 点 Might (力量)。
 *    - 如果敌人当前 Might > 0 (模拟打击成功)，则自己增加 1 点 Might。
 */
export const VAMPIRIC_STRIKE: ActionDefinition = {
  id: 'skill_vampiric_strike',
  name: '嗜血打击',
  description: '如果你持有匕首，你可以对最近的敌人造成 2 点物理伤害，并从其痛苦中汲取生命。',
  condition: {
    op: 'HAS_ITEM',
    itemId: 'item_dagger'
  },
  effects: [
    // 效果 A: 伤害敌人
    {
      type: 'MODIFY_STAT',
      target: { type: 'NEAREST_ENEMY' },
      stat: 'might',
      amount: -2
    },
    // 效果 B: 如果目标依然存在/力量大于0（模拟伤害生效），则自身吸血
    {
      type: 'IF',
      condition: {
        op: 'GT',
        stat: 'might', // 此处上下文应指向 target (NEAREST_ENEMY)
        value: 0
      },
      then: [
        {
          type: 'MODIFY_STAT',
          target: { type: 'SELF' },
          stat: 'might',
          amount: 1
        }
      ]
    }
  ]
};
