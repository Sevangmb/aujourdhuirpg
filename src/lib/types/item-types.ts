
import type { PlayerStats } from './player-types';

export type InventoryItemType = 'wearable' | 'consumable' | 'key' | 'electronic' | 'tool' | 'misc' | 'quest';

export interface InventoryItem {
  instanceId: string; // Unique ID for THIS SPECIFIC instance of the item.
  id: string; // ID of the master item template.
  name: string;
  description: string;
  type: InventoryItemType;
  iconName: string; 
  quantity: number;
  stackable: boolean; 
  value?: number; 
  effects?: Partial<PlayerStats>;
  // Dynamic properties
  condition: number; // Durability from 0 to 100.
  acquiredAt: string; // ISO string date of when the item was acquired.
}

// Master definition for an item, used in the item database
export interface MasterInventoryItem extends Omit<InventoryItem, 'quantity' | 'instanceId' | 'condition' | 'acquiredAt'> {
  // These properties are instance-specific
}
