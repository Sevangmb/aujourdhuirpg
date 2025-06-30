
import type { PlayerStats } from './player-types';
import type { Position } from './game-types';
import type { GameEra } from './era-types';


export type InventoryItemType = 'wearable' | 'consumable' | 'key' | 'electronic' | 'tool' | 'misc' | 'quest';
export type LegalStatus = 'legal' | 'restricted' | 'illegal' | 'contextual';
export type SocialReaction = 'normal' | 'admired' | 'suspicious' | 'feared';

// Represents a record of a single use of an item.
export interface ItemUsageRecord {
  timestamp: string; // ISO string date of when the item was used.
  event: string; // Brief description of what the item was used for, e.g., "Opened the cellar door".
  locationName: string; // Name of the location where it was used.
}

// History of an item's transformations.
export interface ItemEvolutionRecord {
  fromItemId: string;
  toItemId: string;
  atLevel: number;
  timestamp: string; // ISO string date
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
  effects?: Partial<PlayerStats>;
  physiologicalEffects?: {
    hunger?: number;
    thirst?: number;
  };
  skillModifiers?: Partial<Record<string, number>>;
  
  // State that evolves with gameplay
  condition: {
    durability: number; // 0-100
  };
  
  // New: Item-specific progression
  itemLevel: number;
  itemXp: number;
  xpToNextItemLevel: number;

  // The "memory" of the item
  memory: {
    acquiredAt: string; // ISO string date of when the item was acquired.
    acquisitionStory: string; // A short, potentially AI-generated story about how the item was found.
    usageHistory: ItemUsageRecord[]; // A log of how the item has been used.
    lastUsed?: string; // ISO string date of last use.
    evolution_history?: ItemEvolutionRecord[]; // Log of transformations.
  };

  // Value and economic properties
  economics: {
    base_value: number;
    rarity_multiplier: number;
  };

  // Properties that can change based on the player's current context
  contextual_properties: {
    local_value: number;
    legal_status: LegalStatus;
    social_perception: SocialReaction;
    utility_rating: number; // 0-100
  };
}

// This is the template for an item, stored in the master item list (e.g., src/data/items.ts)
export interface MasterIntelligentItem extends Omit<IntelligentItem, 
  'quantity' | 
  'instanceId' | 
  'condition' | 
  'memory' |
  'contextual_properties' |
  'itemLevel' |
  'itemXp'
> {
  // All properties here are static and define the item's base state.
  evolution?: {
    levelRequired: number;
    targetItemId: string;
  };
}

// Payload for creating a dynamic item, typically from AI output.
export interface DynamicItemCreationPayload {
  baseItemId: string; // The ID of the master item to use as a template
  overrides: {
    name?: string;
    description?: string;
    effects?: Partial<PlayerStats>;
    skillModifiers?: Partial<Record<string, number>>;
    physiologicalEffects?: { hunger?: number; thirst?: number };
  };
}
