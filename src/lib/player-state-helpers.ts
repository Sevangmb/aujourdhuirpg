
import type { PlayerStats, IntelligentItem, Progression, AdvancedSkillSystem, GameNotification, Position, MasterIntelligentItem, DynamicItemCreationPayload } from './types';
import { getMasterItemById } from '@/data/items';
import { v4 as uuidv4 } from 'uuid';

/**
 * Updates the contextual properties of an item based on the player's current location.
 * This function can be expanded with more complex logic (e.g., using weather, local economy).
 *
 * @param item The item to update.
 * @param location The player's current location.
 * @returns The item with updated contextual properties.
 */
export function updateItemContextualProperties(item: IntelligentItem, location: Position): IntelligentItem {
  const newItem = { ...item };
  const baseValue = item.economics.base_value;
  let newLocalValue = baseValue;

  // This is a placeholder for more complex logic.
  // For example, a bottle of water could be more valuable in a hot climate.
  // A lockpick set could be perceived as more suspicious in a high-security area.

  // Example: Water is more valuable in hot areas. We don't have weather here, so let's use location name as a proxy.
  if (item.id === 'water_bottle_01' && location.name.toLowerCase().includes('marseille')) {
    newLocalValue *= 1.5; // 50% more expensive in a hot city like Marseille
  }

  // Example: A mysterious key might have higher utility in a historical district like "Le Marais".
  if (item.id === 'mysterious_key_01' && location.name.toLowerCase().includes('marais')) {
    newItem.contextual_properties.utility_rating = Math.min(100, (newItem.contextual_properties.utility_rating || 50) + 25);
  }

  // Example: Lockpicks are more suspicious.
  if (item.id === 'lockpicks_01') {
      newItem.contextual_properties.social_perception = 'suspicious';
      newItem.contextual_properties.legal_status = 'restricted';
  }

  newItem.contextual_properties.local_value = parseFloat(newLocalValue.toFixed(2));

  return newItem;
}


export function createNewInstanceFromMaster(masterItem: MasterIntelligentItem, location: Position, overrides?: DynamicItemCreationPayload['overrides']): IntelligentItem {
    const baseInstance: IntelligentItem = {
      ...masterItem,
      
      // Apply overrides if they exist
      name: overrides?.name || masterItem.name,
      description: overrides?.description || masterItem.description,
      effects: overrides?.effects ? { ...masterItem.effects, ...overrides.effects } : masterItem.effects,
      physiologicalEffects: overrides?.physiologicalEffects ? { ...masterItem.physiologicalEffects, ...overrides.physiologicalEffects } : masterItem.physiologicalEffects,
      skillModifiers: overrides?.skillModifiers ? { ...masterItem.skillModifiers, ...overrides.skillModifiers } : masterItem.skillModifiers,

      // Default instance properties
      instanceId: uuidv4(),
      quantity: 1, 
      condition: { durability: 100 },
      itemLevel: 1,
      itemXp: 0,
      xpToNextItemLevel: masterItem.xpToNextItemLevel,
      memory: {
        acquiredAt: new Date().toISOString(),
        acquisitionStory: `Trouvé à ${location.name}.`, // More appropriate for dynamic items
        usageHistory: [],
      },
      contextual_properties: {
        local_value: masterItem.economics.base_value,
        legal_status: 'legal',
        social_perception: 'normal',
        utility_rating: 50,
      },
    };
    return updateItemContextualProperties(baseInstance, location);
}


export function addItemToInventory(currentInventory: IntelligentItem[], itemId: string, quantityToAdd: number, location: Position, overrides?: DynamicItemCreationPayload['overrides']): IntelligentItem[] {
  const masterItem = getMasterItemById(itemId);
  if (!masterItem) {
    console.warn(`Inventory Warning: Attempted to add unknown item ID: ${itemId}. Item not added.`);
    return currentInventory;
  }

  const newInventory = [...currentInventory];
  
  // Overrides force creation of a new, unique item instance, ignoring stacking.
  if (overrides) {
      newInventory.push(createNewInstanceFromMaster(masterItem, location, overrides));
      return newInventory;
  }
  
  // Standard logic for stackable items without overrides.
  if (masterItem.stackable) {
    const existingItemIndex = newInventory.findIndex(item => item.id === itemId);
    if (existingItemIndex > -1) {
      newInventory[existingItemIndex].quantity += quantityToAdd;
      return newInventory;
    }
  } 
  
  // If not stackable, or stackable but not present, create new instances.
  for (let i = 0; i < quantityToAdd; i++) {
    newInventory.push(createNewInstanceFromMaster(masterItem, location));
  }
  return newInventory;
}


export function removeItemFromInventory(currentInventory: IntelligentItem[], itemIdToRemoveOrName: string, quantityToRemove: number): { updatedInventory: IntelligentItem[], removedItemEffects?: Partial<Record<keyof PlayerStats, number>>, removedItemName?: string } {
  const newInventory = [...currentInventory];
  const itemIndex = newInventory.findIndex(item => item.id === itemIdToRemoveOrName || item.name.toLowerCase() === itemIdToRemoveOrName.toLowerCase());

  let removedItemEffects: Partial<Record<keyof PlayerStats, number>> | undefined = undefined;
  let removedItemName: string | undefined = undefined;

  if (itemIndex > -1) {
    const itemBeingRemoved = newInventory[itemIndex];
    removedItemEffects = itemBeingRemoved.effects as Partial<Record<keyof PlayerStats, number>> | undefined; // Cast may be needed if effects type changes
    removedItemName = itemBeingRemoved.name;

    if (itemBeingRemoved.stackable) {
        if (itemBeingRemoved.quantity <= quantityToRemove) {
          // Remove the entire stack if quantity is not enough
          newInventory.splice(itemIndex, 1);
        } else {
          // Otherwise, just decrease the quantity
          newInventory[itemIndex].quantity -= quantityToRemove;
        }
    } else {
        // For non-stackable items, always remove the instance
        newInventory.splice(itemIndex, 1);
    }
  } else {
    console.warn(`Inventory Warning: Attempted to remove item not in inventory: ${itemIdToRemoveOrName}`);
  }
  return { updatedInventory: newInventory, removedItemEffects, removedItemName };
}