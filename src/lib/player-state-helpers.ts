
import type { PlayerStats, IntelligentItem, Progression, AdvancedSkillSystem, GameNotification, Position } from './types';
import { getMasterItemById } from '@/data/items';
import { v4 as uuidv4 } from 'uuid';

export function calculateXpToNextLevel(level: number): number {
  if (level <= 0) level = 1; // Ensure level is at least 1
  return level * 100 + 50 * (level - 1) * level;
}

export function applyStatChanges(currentStats: PlayerStats, changes: Partial<PlayerStats>): PlayerStats {
  const newStats = { ...currentStats };
  for (const key in changes) {
    if (Object.prototype.hasOwnProperty.call(newStats, key)) {
      const statKey = key as keyof PlayerStats;
      newStats[statKey] = Math.max(0, (newStats[statKey] || 0) + (changes[statKey] || 0));
    }
  }
  return newStats;
}

/**
 * Recalculates the contextual properties of an item based on the player's location.
 * @param item The item to update.
 * @param location The player's current location.
 * @returns The item with updated contextual properties.
 */
export function updateItemContextualProperties(item: IntelligentItem, location: Position): IntelligentItem {
    const newItem = { ...item };
    let localValue = item.economics.base_value;

    // Example rule 1: Ancient Coin is more valuable in historical cities like Rome.
    if (item.id === 'ancient_coin_01' && location.name.toLowerCase().includes('rome')) {
        localValue *= 2;
    }
    
    // Example rule 2: A map of Paris is less valuable when you are in Paris.
    if (item.id === 'map_paris_01' && location.name.toLowerCase().includes('paris')) {
        localValue *= 0.5;
    }
    
    // Example rule 3: Lockpicks might be more valuable in a dense urban area with opportunities.
    if (item.id === 'lockpicks_01' && (location.name.toLowerCase().includes('paris') || location.name.toLowerCase().includes('new york'))) {
        localValue *= 1.5;
    }

    newItem.contextual_properties.local_value = parseFloat(localValue.toFixed(2));

    // Future logic for legal_status, social_perception etc. can go here.

    return newItem;
}


export function addItemToInventory(currentInventory: IntelligentItem[], itemId: string, quantityToAdd: number, location: Position): IntelligentItem[] {
  const masterItem = getMasterItemById(itemId);
  if (!masterItem) {
    console.warn(`Inventory Warning: Attempted to add unknown item ID: ${itemId}. Item not added.`);
    return currentInventory;
  }

  const newInventory = [...currentInventory];

  const createNewInstance = (): IntelligentItem => {
      const baseInstance: IntelligentItem = {
        ...masterItem,
        instanceId: uuidv4(),
        quantity: 1, // Will be adjusted for stackables
        condition: { durability: 100 },
        itemLevel: 1,
        itemXp: 0,
        xpToNextItemLevel: masterItem.xpToNextItemLevel,
        memory: {
          acquiredAt: new Date().toISOString(),
          acquisitionStory: `Acquis à ${location.name}.`,
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
  };

  if (masterItem.stackable) {
    const existingItemIndex = newInventory.findIndex(item => item.id === itemId);
    if (existingItemIndex > -1) {
      newInventory[existingItemIndex].quantity += quantityToAdd;
    } else {
      const newInstance = createNewInstance();
      newInstance.quantity = quantityToAdd;
      newInventory.push(newInstance);
    }
  } else {
    for (let i = 0; i < quantityToAdd; i++) {
      newInventory.push(createNewInstance());
    }
  }
  return newInventory;
}


export function removeItemFromInventory(currentInventory: IntelligentItem[], itemIdToRemoveOrName: string, quantityToRemove: number): { updatedInventory: IntelligentItem[], removedItemEffects?: Partial<PlayerStats>, removedItemName?: string } {
  const newInventory = [...currentInventory];
  const itemIndex = newInventory.findIndex(item => item.id === itemIdToRemoveOrName || item.name.toLowerCase() === itemIdToRemoveOrName.toLowerCase());

  let removedItemEffects: Partial<PlayerStats> | undefined = undefined;
  let removedItemName: string | undefined = undefined;

  if (itemIndex > -1) {
    const itemBeingRemoved = newInventory[itemIndex];
    removedItemEffects = itemBeingRemoved.effects;
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

// Internal function to handle XP and evolution for a single item.
function addXpAndEvolveItem(
  inventory: IntelligentItem[],
  instanceId: string,
  xpToAdd: number
): { updatedInventory: IntelligentItem[]; notifications: GameNotification[] } {
  const newInventory = JSON.parse(JSON.stringify(inventory));
  const notifications: GameNotification[] = [];
  const itemIndex = newInventory.findIndex((item: IntelligentItem) => item.instanceId === instanceId);

  if (itemIndex === -1) {
    console.warn(`Item XP Warning: Item with instanceId ${instanceId} not found.`);
    return { updatedInventory: inventory, notifications: [] };
  }

  const item = newInventory[itemIndex];
  const masterItem = getMasterItemById(item.id);

  if (!masterItem) {
    console.warn(`Master item with id ${item.id} not found.`);
    return { updatedInventory: inventory, notifications: [] };
  }

  // Only add XP if the item can evolve
  if (item.xpToNextItemLevel > 0) {
    item.itemXp += xpToAdd;

    while (item.itemXp >= item.xpToNextItemLevel && item.xpToNextItemLevel > 0) {
      item.itemLevel += 1;
      item.itemXp -= item.xpToNextItemLevel;
      // For now, let's just double the XP requirement for the next level.
      item.xpToNextItemLevel *= 2;

      notifications.push({
        type: 'info',
        title: 'Niveau d\'objet supérieur !',
        description: `${item.name} a atteint le niveau ${item.itemLevel}.`,
      });

      // Check for evolution
      if (masterItem.evolution && item.itemLevel >= masterItem.evolution.levelRequired) {
        const evolvedMasterItem = getMasterItemById(masterItem.evolution.targetItemId);
        if (evolvedMasterItem) {
          const originalItemName = item.name;
          const evolvedItem: IntelligentItem = {
            ...evolvedMasterItem,
            instanceId: item.instanceId, // Keep the same instance ID for tracking
            quantity: 1,
            condition: { durability: 100 }, // Restore condition on evolution
            itemLevel: 1, // Reset level for the new form
            itemXp: 0,
            xpToNextItemLevel: evolvedMasterItem.xpToNextItemLevel,
            memory: {
              ...item.memory,
              acquisitionStory: item.memory.acquisitionStory, // Preserve original story
              evolution_history: [
                ...(item.memory.evolution_history || []),
                {
                  fromItemId: item.id,
                  toItemId: evolvedMasterItem.id,
                  atLevel: item.itemLevel,
                  timestamp: new Date().toISOString(),
                }
              ]
            },
            contextual_properties: {
              local_value: evolvedMasterItem.economics.base_value,
              legal_status: 'legal',
              social_perception: 'normal',
              utility_rating: 50,
            },
          };
          newInventory[itemIndex] = evolvedItem;
          notifications.push({
            type: 'leveled_up', // A more impactful type for UI
            title: 'Objet Évolué !',
            description: `Votre ${originalItemName} est devenu : ${evolvedItem.name} !`,
          });
          // Break the loop after evolution to prevent multiple evolutions in one go
          break;
        }
      }
    }
  }

  return { updatedInventory: newInventory, notifications };
}

// New exported function to process all item updates from an AI response.
export function processItemUpdates(
  currentInventory: IntelligentItem[],
  updates: { instanceId: string; xpGained: number }[]
): { newInventory: IntelligentItem[]; notifications: GameNotification[] } {
  let processedInventory = JSON.parse(JSON.stringify(currentInventory));
  const allNotifications: GameNotification[] = [];

  for (const update of updates) {
    const { updatedInventory, notifications: singleItemNotifications } = addXpAndEvolveItem(
      processedInventory,
      update.instanceId,
      update.xpGained
    );
    processedInventory = updatedInventory;
    allNotifications.push(...singleItemNotifications);
  }

  return { newInventory: processedInventory, notifications: allNotifications };
}
