
/**
 * @fileOverview Contains the core business logic for the Inventory module.
 */

import type { PlayerStats, IntelligentItem, Position, MasterIntelligentItem, DynamicItemCreationPayload, GameEvent } from '@/lib/types';
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

  if (item.id === 'water_bottle_01' && location.name.toLowerCase().includes('marseille')) {
    newLocalValue *= 1.5;
  }

  if (item.id === 'mysterious_key_01' && location.name.toLowerCase().includes('marais')) {
    newItem.contextual_properties.utility_rating = Math.min(100, (newItem.contextual_properties.utility_rating || 50) + 25);
  }

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
      name: overrides?.name || masterItem.name,
      description: overrides?.description || masterItem.description,
      effects: overrides?.effects ? { ...masterItem.effects, ...overrides.effects } : masterItem.effects,
      physiologicalEffects: overrides?.physiologicalEffects ? { ...masterItem.physiologicalEffects, ...overrides.physiologicalEffects } : masterItem.physiologicalEffects,
      skillModifiers: overrides?.skillModifiers ? { ...masterItem.skillModifiers, ...overrides.skillModifiers } : masterItem.skillModifiers,
      instanceId: uuidv4(),
      quantity: 1, 
      condition: { durability: 100 },
      itemLevel: 1,
      itemXp: 0,
      xpToNextItemLevel: masterItem.xpToNextItemLevel,
      memory: {
        acquiredAt: new Date().toISOString(),
        acquisitionStory: `Trouvé à ${location.name}.`,
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
  
  if (overrides) {
      newInventory.push(createNewInstanceFromMaster(masterItem, location, overrides));
      return newInventory;
  }
  
  if (masterItem.stackable) {
    const existingItemIndex = newInventory.findIndex(item => item.id === itemId);
    if (existingItemIndex > -1) {
      newInventory[existingItemIndex].quantity += quantityToAdd;
      return newInventory;
    }
  } 
  
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
    removedItemEffects = itemBeingRemoved.effects as Partial<Record<keyof PlayerStats, number>> | undefined;
    removedItemName = itemBeingRemoved.name;

    if (itemBeingRemoved.stackable) {
        if (itemBeingRemoved.quantity <= quantityToRemove) {
          newInventory.splice(itemIndex, 1);
        } else {
          newInventory[itemIndex].quantity -= quantityToRemove;
        }
    } else {
        newInventory.splice(itemIndex, 1);
    }
  } else {
    console.warn(`Inventory Warning: Attempted to remove item not in inventory: ${itemIdToRemoveOrName}`);
  }
  return { updatedInventory: newInventory, removedItemEffects, removedItemName };
}

/**
 * Calculates item XP gain and generates level-up or evolution events.
 * @param item The item gaining XP.
 * @param xpGained The amount of XP gained.
 * @returns An array of game events resulting from the XP gain.
 */
export function grantXpToItem(item: IntelligentItem, xpGained: number): GameEvent[] {
  if (item.xpToNextItemLevel === 0) return []; // Cannot gain XP

  const events: GameEvent[] = [];
  let currentXp = item.itemXp + xpGained;
  let currentLevel = item.itemLevel;
  let xpToNext = item.xpToNextItemLevel;

  events.push({ type: 'ITEM_XP_GAINED', instanceId: item.instanceId, itemName: item.name, xp: xpGained });
  
  const masterItem = getMasterItemById(item.id);
  
  while (currentXp >= xpToNext) {
    currentLevel += 1;
    currentXp -= xpToNext;
    xpToNext = Math.round(xpToNext * 1.5); // Increase next threshold
    
    events.push({ 
      type: 'ITEM_LEVELED_UP', 
      instanceId: item.instanceId, 
      itemName: item.name, 
      newLevel: currentLevel,
      newXp: currentXp,
      newXpToNextLevel: xpToNext
    });

    // Check for evolution
    if (masterItem?.evolution && currentLevel >= masterItem.evolution.levelRequired) {
      const evolvedMasterItem = getMasterItemById(masterItem.evolution.targetItemId);
      if (evolvedMasterItem) {
        events.push({
          type: 'ITEM_EVOLVED',
          instanceId: item.instanceId,
          oldItemName: item.name,
          newItemId: evolvedMasterItem.id,
          newItemName: evolvedMasterItem.name,
        });
        break; // Stop leveling up as the item is being replaced
      }
    }
  }
  
  return events;
}
