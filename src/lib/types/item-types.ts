
import type { PlayerStats } from './player-types';

export type InventoryItemType = 'wearable' | 'consumable' | 'key' | 'electronic' | 'tool' | 'misc' | 'quest';

export interface InventoryItem {
  id: string; // Unique ID for the item
  name: string;
  description: string;
  type: InventoryItemType;
  iconName: string; // Preferably a keyof typeof LucideIcons, or a generic one
  quantity: number;
  stackable: boolean; // Changed from optional to mandatory
  value?: number; // Optional monetary value of the item
  effects?: Partial<PlayerStats>; // Effects the item has when used/consumed
}

// Master definition for an item, used in the item database
export interface MasterInventoryItem extends Omit<InventoryItem, 'quantity'> {
  // Quantity is not part of master def, it's instance-specific
}
