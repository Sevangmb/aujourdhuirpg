
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


export function calculateXpToNextLevel(level: number): number {
  if (level <= 0) level = 1; // Ensure level is at least 1
  return level * 100 + 50 * (level - 1) * level;
}

export function applyStatChanges(currentStats: PlayerStats, changes: Partial<Record<keyof PlayerStats, number>>): PlayerStats {
  const newStats = JSON.parse(JSON.stringify(currentStats));
  for (const key in changes) {
    if (Object.prototype.hasOwnProperty.call(newStats, key)) {
      const statKey = key as keyof PlayerStats;
      const changeValue = changes[statKey] || 0;
      const statToChange = newStats[statKey];

      const newValue = statToChange.value + changeValue;
      const maxValue = statToChange.max !== undefined ? statToChange.max : newValue;
      statToChange.value = Math.max(0, Math.min(newValue, maxValue));
    }
  }
  return newStats;
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

export function addXP(currentProgression: Progression, xpGained: number): { newProgression: Progression, leveledUp: boolean } {
  const newProgression = { ...currentProgression };
  if (typeof newProgression.level !== 'number' || newProgression.level <= 0) newProgression.level = 1;
  if (typeof newProgression.xp !== 'number' || newProgression.xp < 0) newProgression.xp = 0;
  if (typeof newProgression.xpToNextLevel !== 'number' || newProgression.xpToNextLevel <= 0) {
    newProgression.xpToNextLevel = calculateXpToNextLevel(newProgression.level);
  }

  newProgression.xp += xpGained;
  let leveledUp = false;

  while (newProgression.xp >= newProgression.xpToNextLevel && newProgression.xpToNextLevel > 0) {
    newProgression.level += 1;
    newProgression.xp -= newProgression.xpToNextLevel;
    newProgression.xpToNextLevel = calculateXpToNextLevel(newProgression.level);
    leveledUp = true;
  }
  if (newProgression.xp < 0) newProgression.xp = 0;

  return { newProgression, leveledUp };
}

export function applySkillGains(currentSkills: AdvancedSkillSystem, gains: Record<string, number>): { updatedSkills: AdvancedSkillSystem, notifications: string[] } {
    const newSkills = JSON.parse(JSON.stringify(currentSkills)); // Deep copy
    const notifications: string[] = [];

    for (const skillPath in gains) {
        if (Object.prototype.hasOwnProperty.call(gains, skillPath)) {
            const pathParts = skillPath.split('.');
            if (pathParts.length === 2) {
                const [category, subSkill] = pathParts as [keyof AdvancedSkillSystem, string];
                const categorySkills = newSkills[category];
                if (categorySkills && typeof (categorySkills as any)[subSkill] === 'number') {
                    (categorySkills as any)[subSkill] += gains[skillPath];
                    const skillName = subSkill.charAt(0).toUpperCase() + subSkill.slice(1).replace(/_/g, ' ');
                    notifications.push(`${skillName} a augmenté de +${gains[skillPath]}.`);
                }
            }
        }
    }
    return { updatedSkills: newSkills, notifications };
}
