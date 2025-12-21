
import { EventCard, AttributeName } from '../types';

export const EVENTS_DB: Record<string, EventCard> = {
  'event_burning_man': {
    id: 'event_burning_man',
    type: 'EVENT',
    title: '燃烧之人',
    description: '一个被火焰包围的鬼魅人影在你面前无声地尖叫。',
    flavorText: '这火焰虽是幻象，但恐惧却真实无比。',
    icon: 'Flame',
    triggerType: 'ON_ENTER',
    interaction: {
      type: 'ATTRIBUTE_CHECK',
      attribute: AttributeName.Sanity,
      difficulty: 4,
      success: [
        { type: 'modify_stat', attribute: AttributeName.Knowledge, amount: 1, message: '你意识到这只是幻象并获得了洞察力。' },
        { type: 'narrative_log', message: '火焰如同出现时一样迅速熄灭了。' }
      ],
      failure: [
        { type: 'modify_stat', attribute: AttributeName.Sanity, amount: -1, message: '剧烈的恐惧灼伤了你的精神。' },
        { type: 'narrative_log', message: '你惊恐地逃离现场。' }
      ]
    }
  },
  'event_creaky_floor': {
    id: 'event_creaky_floor',
    type: 'EVENT',
    title: '腐烂的地板',
    description: '脚下的木头伴随着刺耳的断裂声突然崩塌。',
    flavorText: '下方的黑暗在等待着你。',
    icon: 'ArrowDown',
    triggerType: 'ON_ENTER',
    interaction: {
      type: 'ATTRIBUTE_CHECK',
      attribute: AttributeName.Speed,
      difficulty: 3,
      success: [
        { type: 'narrative_log', message: '你千钧一发之际跳到了安全地带。' }
      ],
      failure: [
        { type: 'move_player', location: 'basement', message: '你坠入了深不可测的黑暗。' },
        { type: 'modify_stat', attribute: AttributeName.Might, amount: -1, message: '坠落造成了 1 点物理伤害。' },
        { type: 'narrative_log', message: '你重重地摔在冰冷的石板地上。' }
      ]
    }
  },
  'event_ghost_whisper': {
    id: 'event_ghost_whisper',
    type: 'EVENT',
    title: '幽灵低语',
    description: '一个声音从阴影中低语着你的名字。“离开这里...”它嘶嘶作响。',
    icon: 'Ghost',
    triggerType: 'ON_ENTER',
    interaction: {
        type: 'ATTRIBUTE_CHECK',
        attribute: AttributeName.Sanity,
        difficulty: 4,
        success: [
          { type: 'modify_stat', attribute: AttributeName.Knowledge, amount: 1, message: '你稳住了心神，从低语中捕捉到了线索。' },
          { type: 'narrative_log', message: '你成功抵抗了恐惧。' }
        ],
        failure: [
          { type: 'modify_stat', attribute: AttributeName.Sanity, amount: -1, message: '这声音像爪子一样撕扯着你的理智。' },
          { type: 'narrative_log', message: '你发出了一声恐惧的尖叫。' }
        ]
    }
  },
  'event_vines': {
    id: 'event_vines',
    type: 'EVENT',
    title: '纠缠的藤蔓',
    description: '枯死的植物突然像活了一样，紧紧缠住了你的双脚！',
    icon: 'Trees',
    triggerType: 'ON_ENTER',
    interaction: {
        type: 'ATTRIBUTE_CHECK',
        attribute: AttributeName.Might,
        difficulty: 3,
        success: [
          { type: 'narrative_log', message: '你轻松挣脱了这些枯萎的藤蔓。' }
        ],
        failure: [
          { type: 'modify_stat', attribute: AttributeName.Speed, amount: -1, message: '长刺刺伤了你的腿，行动受阻。' },
          { type: 'narrative_log', message: '长刺深深扎入了你的皮肤。' }
        ]
    }
  }
};
