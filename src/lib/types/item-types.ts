
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
  usageCount: number; // How many times the item has been used.
  experience: number; // XP gained by using the item, can lead to evolution.
  lastUsed?: string; // ISO string date of last use.
}

// Master definition for an item, used in the item database
export interface MasterInventoryItem extends Omit<InventoryItem, 'quantity' | 'instanceId' | 'condition' | 'acquiredAt' | 'usageCount' | 'experience' | 'lastUsed'> {
  // These properties are instance-specific
}
