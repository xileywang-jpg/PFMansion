
import { Item } from '../types';
import { ITEMS_DATA } from './source/items';
import { OMENS_DATA } from './source/omens';

export const ITEMS_DB: Record<string, Item> = {
  ...ITEMS_DATA,
  ...OMENS_DATA
} as unknown as Record<string, Item>;
