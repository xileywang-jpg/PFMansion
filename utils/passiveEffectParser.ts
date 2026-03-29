/**
 * 被动效果解析器
 * 解析 Omen/Item 卡的 passiveEffects，支持两种格式：
 * 1. Original格式（字符串数组）: ["知识 +2", "理智 -1"]
 * 2. Volantis格式（对象数组）: [{"type":"buff","text":"知识+2"},{"type":"debuff","text":"理智-1"}]
 */

import { AttributeName, Player } from '../types';

// 属性名映射（中文 -> 英文）
const ATTRIBUTE_MAP: Record<string, AttributeName> = {
  '力量': AttributeName.Might,
  '速度': AttributeName.Speed,
  '理智': AttributeName.Sanity,
  '知识': AttributeName.Knowledge,
};

// 需要特殊处理的效果关键词（暂时不支持，作为备注显示）
const SPECIAL_KEYWORDS = [
  '攻击时', '获得技能', '允许', '可', '每场', '每回合', '免疫', '自动',
  '远程', '受到伤害', '队伍', '检定', '暴击率', '持续', '无条件'
];

// Volantis效果类型映射到内部类型
const VOLANTIS_TYPE_MAP: Record<string, 'buff' | 'debuff' | 'special' | 'heal'> = {
  'buff': 'buff',
  'debuff': 'debuff',
  'special': 'special',
  'heal': 'heal',
};

/**
 * 解析被动效果字符串
 * 输入如: "知识 +2，理智 -1" 或 "力量+2"
 * 输出如: [{ type: 'MODIFY_STAT', attribute: 'knowledge', amount: 2 }, ...]
 */
export interface ParsedEffect {
  type: 'MODIFY_STAT' | 'SPECIAL';
  attribute?: AttributeName;
  amount?: number;
  description?: string;  // 用于无法解析的特殊效果
}

export function parsePassiveEffect(effectStr: string): ParsedEffect[] {
  const effects: ParsedEffect[] = [];
  
  // 检查是否包含特殊关键词（暂时无法完全解析的效果）
  const hasSpecialKeyword = SPECIAL_KEYWORDS.some(keyword => effectStr.includes(keyword));
  
  // 分割多个效果（用 ， 或 、 或 , 分隔）
  const parts = effectStr.split(/[，、,]/).map(s => s.trim()).filter(s => s);
  
  for (const part of parts) {
    // 尝试匹配属性修改模式: "属性名 [+/-]数值" 或 "属性名[+/-]数值"
    // 例如: "知识 +2", "理智-1", "速度+2"
    let matched = false;
    
    for (const [cnName, attrEnum] of Object.entries(ATTRIBUTE_MAP)) {
      // 匹配模式：中文属性名 + 可选的空格 + +或- + 数字
      const pattern = new RegExp(`^${cnName}\\s*([+-])(\\d+)$`);
      const match = part.match(pattern);
      
      if (match) {
        const sign = match[1] === '+' ? 1 : -1;
        const amount = parseInt(match[2], 10) * sign;
        
        effects.push({
          type: 'MODIFY_STAT',
          attribute: attrEnum,
          amount,
        });
        matched = true;
        break;
      }
    }
    
    // 如果没有匹配到标准模式，检查是否是特殊效果
    if (!matched) {
      if (hasSpecialKeyword) {
        effects.push({
          type: 'SPECIAL',
          description: part,
        });
      }
      // else: 忽略无法解析的部分
    }
  }
  
  return effects;
}

/**
 * 解析单个效果项（支持字符串或对象格式）
 */
function parseEffectItem(item: string | { type?: string; text?: string }): ParsedEffect[] {
  // 如果是对象格式
  if (typeof item === 'object' && item !== null) {
    const text = item.text || '';
    const parsed = parsePassiveEffect(text);
    return parsed;
  }
  
  // 如果是字符串格式
  if (typeof item === 'string') {
    return parsePassiveEffect(item);
  }
  
  return [];
}

/**
 * 解析并应用被动效果到玩家
 * 支持两种格式的 passiveEffects
 * 
 * @param player 玩家对象
 * @param passiveEffects 被动效果数组（字符串或对象格式）
 * @returns 描述应用结果的字符串数组
 */
export function applyPassiveEffects(
  player: Player,
  passiveEffects: (string | { type?: string; text?: string })[]
): string[] {
  const results: string[] = [];
  
  for (const item of passiveEffects) {
    const parsedEffects = parseEffectItem(item);
    
    for (const effect of parsedEffects) {
      if (effect.type === 'MODIFY_STAT' && effect.attribute && effect.amount !== undefined) {
        const attrKey = effect.attribute;
        
        // 防御性检查：确保 player.character.attributes 存在且包含目标属性
        if (!player.character?.attributes?.[attrKey]) {
          console.warn(`[applyPassiveEffects] 属性 ${attrKey} 不存在，跳过效果应用`);
          continue;
        }
        
        const oldValue = player.character.attributes[attrKey].current;
        const newValue = Math.max(0, oldValue + effect.amount); // 不低于0
        
        player.character.attributes[attrKey].current = newValue;
        
        // 生成描述
        const attrNameCn = Object.entries(ATTRIBUTE_MAP).find(
          ([, v]) => v === attrKey
        )?.[0] || attrKey;
        
        const sign = effect.amount >= 0 ? '+' : '';
        results.push(`${attrNameCn} ${sign}${effect.amount} (${oldValue} → ${newValue})`);
      } else if (effect.type === 'SPECIAL' && effect.description) {
        results.push(`[${effect.description}]`);
      }
    }
  }
  
  return results;
}
