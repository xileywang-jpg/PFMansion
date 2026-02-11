
import { EventCard } from '../types';
import { EVENTS_DATA } from './source/events';

export const EVENTS_DB: Record<string, EventCard> = EVENTS_DATA as unknown as Record<string, EventCard>;
