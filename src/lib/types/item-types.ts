
import type { PlayerStats } from './player-types';

export type InventoryItemType = 'wearable' | 'consumable' | 'key' | 'electronic' | 'tool' | 'misc' | 'quest';

// NEW: Represents a record of a single use of an item.
export interface ItemUsageRecord {
  timestamp: string; // ISO string date of when the item was used.
  event: string; // Brief description of what the item was used for, e.g., "Opened the cellar door".
  locationName: string; // Name of the location where it was used.
}

// This represents an actual item instance in the player's inventory, with its own history and state.
export interface IntelligentItem {
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
  
  // State that evolves with gameplay
  condition: {
    durability: number; // 0-100
  };
  experience: number; // XP gained by using the item, can lead to evolution.

  // The "memory" of the item
  memory: {
    acquiredAt: string; // ISO string date of when the item was acquired.
    acquisitionStory: string; // A short, potentially AI-generated story about how the item was found.
    usageHistory: ItemUsageRecord[]; // A log of how the item has been used.
    lastUsed?: string; // ISO string date of last use.
  };
}

// This is the template for an item, stored in the master item list (e.g., src/data/items.ts)
// It contains the base properties of an item before it becomes a unique instance.
export interface MasterIntelligentItem extends Omit<IntelligentItem, 
  'quantity' | 
  'instanceId' | 
  'condition' | 
  'experience' |
  'memory'
> {
  // All properties here are static and define the item's base state.
  // The omitted properties are instance-specific.
}
