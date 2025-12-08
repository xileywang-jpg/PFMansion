
import { Item, AttributeName } from '../types';

export const ITEMS_DB: Record<string, Item> = {
  // --- Items ---
  'item_revolver': {
    id: 'item_revolver',
    name: 'Rusty Revolver',
    description: 'An old service weapon. It feels heavy and reliable.',
    icon: 'Crosshair',
    type: 'WEAPON',
    usage: {
      actionLabel: 'Shoot',
      isConsumable: false,
      target: 'OPPONENT',
      effects: [
        { type: 'narrative_log', message: 'You fire the revolver! (Combat not implemented)' }
      ]
    },
    passiveEffects: [{ type: 'buff', text: '+2 Might (Attack)' }]
  },
  'item_amulet': {
    id: 'item_amulet',
    name: 'Holy Amulet',
    description: 'It radiates a faint warmth against your chest.',
    icon: 'Gem',
    type: 'PASSIVE',
    passiveEffects: [{ type: 'buff', text: '+1 Sanity' }]
  },
  'item_adrenaline': {
    id: 'item_adrenaline',
    name: 'Adrenaline Shot',
    description: 'Emergency medical stimulant. Use with caution.',
    icon: 'Syringe',
    type: 'CONSUMABLE',
    usage: {
      actionLabel: 'Inject',
      isConsumable: true,
      target: 'SELF',
      effects: [
        { type: 'modify_stat', attribute: AttributeName.Speed, amount: 2, message: 'You feel a surge of energy!' },
        { type: 'modify_stat', attribute: AttributeName.Might, amount: 1 }
      ]
    }
  },

  // --- Omens ---
  'omen_girl': {
    id: 'omen_girl',
    name: 'Girl in the Mirror',
    description: 'The reflection mimics you... almost perfectly. It wants to help.',
    icon: 'User',
    type: 'OMEN',
    passiveEffects: [{ type: 'buff', text: '+1 Knowledge' }]
  },
  'omen_book': {
    id: 'omen_book',
    name: 'Book of the Dead',
    description: 'Bound in something that feels distressingly like skin.',
    icon: 'BookOpen',
    type: 'OMEN',
    passiveEffects: [{ type: 'buff', text: '+2 Knowledge, -1 Sanity' }]
  },
  'omen_ring': {
    id: 'omen_ring',
    name: 'Ring of Solomon',
    description: 'Inscribed with symbols that make your eyes water.',
    icon: 'Circle',
    type: 'OMEN',
    passiveEffects: [{ type: 'buff', text: '+1 Sanity' }]
  }
};
