

import type { PlayerStats } from './player-types';

export type InventoryItemType = 'wearable' | 'consumable' | 'key' | 'electronic' | 'tool' | 'misc' | 'quest';

// This represents an actual item instance in the player's inventory
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
  // Dynamic properties that evolve with gameplay
  condition: number; // Durability from 0 to 100.
  acquiredAt: string; // ISO string date of when the item was acquired.
  usageCount: number; // How many times the item has been used.
  experience: number; // XP gained by using the item, can lead to evolution.
  lastUsed?: string; // ISO string date of last use.
}

// This is the template for an item, stored in the master item list (e.g., src/data/items.ts)
// It contains the base properties of an item before it becomes a unique instance.
export interface MasterInventoryItem extends Omit<InventoryItem, 
  'quantity' | 
  'instanceId' | 
  'condition' | 
  'acquiredAt' | 
  'usageCount' | 
  'experience' | 
  'lastUsed'
> {
  // All properties here are static and define the item's base state.
  // The omitted properties are instance-specific.
}
