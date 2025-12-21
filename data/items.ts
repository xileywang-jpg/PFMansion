
import { Item, AttributeName } from '../types';

export const ITEMS_DB: Record<string, Item> = {
  'item_revolver': {
    id: 'item_revolver',
    name: '生锈的左轮手枪',
    description: '一把旧式勤务武器。握在手里沉稳可靠。',
    icon: 'Crosshair',
    type: 'WEAPON',
    usage: {
      actionLabel: '开火',
      isConsumable: false,
      target: 'OPPONENT',
      effects: [
        { type: 'narrative_log', message: '你开火了！（战斗系统尚未上线）' }
      ]
    },
    passiveEffects: [{ type: 'buff', text: '攻击时力量 +2' }]
  },
  'item_dagger': {
    id: 'item_dagger',
    name: '祭祀匕首',
    description: '刀刃上刻有奇怪的凹槽，似乎渴望着鲜血。',
    icon: 'Sword',
    type: 'WEAPON',
    grantedSkills: ['skill_vampiric_strike'],
    passiveEffects: [{ type: 'buff', text: '获得技能：嗜血打击' }]
  },
  'item_amulet': {
    id: 'item_amulet',
    name: '神圣护身符',
    description: '它在你的胸口散发着淡淡的暖意。',
    icon: 'Gem',
    type: 'PASSIVE',
    passiveEffects: [{ type: 'buff', text: '理智 +1' }]
  },
  'item_adrenaline': {
    id: 'item_adrenaline',
    name: '肾上腺素针剂',
    description: '紧急医疗兴奋剂。请谨慎使用。',
    icon: 'Syringe',
    type: 'CONSUMABLE',
    usage: {
      actionLabel: '注射',
      isConsumable: true,
      target: 'SELF',
      effects: [
        { type: 'modify_stat', attribute: AttributeName.Speed, amount: 2, message: '你感到一股力量涌遍全身！' },
        { type: 'modify_stat', attribute: AttributeName.Might, amount: 1 }
      ]
    }
  },
  'omen_crystal_ball': {
    id: 'omen_crystal_ball',
    name: '水晶球',
    description: '球体深处闪烁着不详的微光，仿佛在揭示未来的终局。',
    icon: 'Eye',
    type: 'OMEN',
    passiveEffects: [{ type: 'buff', text: '知识 +2，理智 -1' }]
  },
  'omen_girl': {
    id: 'omen_girl',
    name: '镜中少女',
    description: '镜中的倒影模仿着你... 几乎完美。她似乎想帮忙。',
    icon: 'User',
    type: 'OMEN',
    passiveEffects: [{ type: 'buff', text: '知识 +1' }]
  },
  'omen_book': {
    id: 'omen_book',
    name: '亡灵之书',
    description: '封面的质感摸起来像极了人皮，让人感到极度不安。',
    icon: 'BookOpen',
    type: 'OMEN',
    passiveEffects: [{ type: 'buff', text: '知识 +2，理智 -1' }]
  },
  'omen_ring': {
    id: 'omen_ring',
    name: '所罗门之戒',
    description: '上面刻满了令你双眼酸涩流泪的符号。',
    icon: 'Circle',
    type: 'OMEN',
    passiveEffects: [{ type: 'buff', text: '理智 +1' }]
  }
};
