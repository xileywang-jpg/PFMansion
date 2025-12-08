
import { EventCard, AttributeName } from '../types';

export const EVENTS_DB: Record<string, EventCard> = {
  'event_burning_man': {
    id: 'event_burning_man',
    type: 'EVENT',
    title: 'The Burning Man',
    description: 'A spectral figure engulfed in flames screams silently before you.',
    flavorText: 'The heat is phantom, but the fear is real.',
    icon: 'Flame',
    triggerType: 'ON_ENTER',
    interaction: {
      type: 'ATTRIBUTE_CHECK',
      attribute: AttributeName.Sanity,
      difficulty: 4,
      success: [
        { type: 'modify_stat', attribute: AttributeName.Knowledge, amount: 1, message: 'You realize it is an illusion and gain insight.' },
        { type: 'narrative_log', message: 'The fire fades as quickly as it appeared.' }
      ],
      failure: [
        { type: 'modify_stat', attribute: AttributeName.Sanity, amount: -1, message: 'The horror sears your mind.' },
        { type: 'narrative_log', message: 'You scramble away, terrified.' }
      ]
    }
  },
  'event_creaky_floor': {
    id: 'event_creaky_floor',
    type: 'EVENT',
    title: 'Creaky Floorboard',
    description: 'The wood beneath your feet gives way with a sickening crack.',
    flavorText: 'Darkness awaits below.',
    icon: 'ArrowDown',
    triggerType: 'ON_ENTER',
    interaction: {
      type: 'ATTRIBUTE_CHECK',
      attribute: AttributeName.Speed,
      difficulty: 3,
      success: [
        { type: 'narrative_log', message: 'You leap to safety just in time.' }
      ],
      failure: [
        { type: 'move_player', location: 'basement', message: 'You plummet into the darkness below.' },
        { type: 'modify_stat', attribute: AttributeName.Might, amount: -1, message: 'You take 1 physical damage from the fall.' },
        { type: 'narrative_log', message: 'You crash onto the cold stone floor.' }
      ]
    }
  },
  'event_ghost_whisper': {
    id: 'event_ghost_whisper',
    type: 'EVENT',
    title: 'Ghostly Whispers',
    description: 'A voice whispers your name from the shadows. "Leave this place..." it hisses.',
    icon: 'Ghost',
    triggerType: 'ON_ENTER',
    interaction: {
        type: 'ATTRIBUTE_CHECK',
        attribute: AttributeName.Sanity,
        difficulty: 4,
        success: [
          { type: 'modify_stat', attribute: AttributeName.Knowledge, amount: 1, message: 'You steel your mind and gain insight.' },
          { type: 'narrative_log', message: 'You resisted the fear.' }
        ],
        failure: [
          { type: 'modify_stat', attribute: AttributeName.Sanity, amount: -1, message: 'The voice claws at your mind.' },
          { type: 'narrative_log', message: 'You scream in terror.' }
        ]
    }
  },
  'event_vines': {
    id: 'event_vines',
    type: 'EVENT',
    title: 'Tangling Vines',
    description: 'The dead plants suddenly animate, wrapping around your legs!',
    icon: 'Trees',
    triggerType: 'ON_ENTER',
    interaction: {
        type: 'ATTRIBUTE_CHECK',
        attribute: AttributeName.Might,
        difficulty: 3,
        success: [
          { type: 'narrative_log', message: 'You tear through the vines easily.' }
        ],
        failure: [
          { type: 'modify_stat', attribute: AttributeName.Speed, amount: -1, message: 'Your leg is injured by the thorns.' },
          { type: 'narrative_log', message: 'The thorns dig deep.' }
        ]
    }
  }
};
