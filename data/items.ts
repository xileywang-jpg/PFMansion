
import { Item } from '../types';
import { ITEMS_DATA } from './source/items';

export const ITEMS_DB: Record<string, Item> = ITEMS_DATA as unknown as Record<string, Item>;
