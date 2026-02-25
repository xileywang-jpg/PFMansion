
import OMENS_JSON from './omens.json';
import { Item } from '../../types';

export const OMENS_DATA: Record<string, Item> = OMENS_JSON as unknown as Record<string, Item>;
