import type { PlayerStats, InventoryItem, Progression, AdvancedSkillSystem } from './types';
import { getMasterItemById } from '@/data/items'; // Assuming getMasterItemById is needed

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

export function addItemToInventory(currentInventory: InventoryItem[], itemId: string, quantityToAdd: number): InventoryItem[] {
  const masterItem = getMasterItemById(itemId);
  if (!masterItem) {
    console.warn(`Inventory Warning: Attempted to add unknown item ID: ${itemId}. Item not added.`);
    return currentInventory;
  }

  const newInventory = [...currentInventory];

  if (masterItem.stackable) {
    const existingItemIndex = newInventory.findIndex(item => item.id === itemId);
    if (existingItemIndex > -1) {
      newInventory[existingItemIndex].quantity += quantityToAdd;
    } else {
      // Add new stackable item instance
      newInventory.push({
        ...masterItem,
        instanceId: `stack_${itemId}_${Math.random().toString(36).substring(2)}`,
        quantity: quantityToAdd,
        condition: 100,
        acquiredAt: new Date().toISOString(),
        usageCount: 0,
        experience: 0,
      });
    }
  } else {
    // Add one new instance for each quantity of a non-stackable item
    for (let i = 0; i < quantityToAdd; i++) {
      newInventory.push({
        ...masterItem,
        instanceId: `${itemId}_${Math.random().toString(36).substring(2)}`,
        quantity: 1,
        condition: 100,
        acquiredAt: new Date().toISOString(),
        usageCount: 0,
        experience: 0,
      });
    }
  }
  return newInventory;
}


export function removeItemFromInventory(currentInventory: InventoryItem[], itemIdToRemoveOrName: string, quantityToRemove: number): { updatedInventory: InventoryItem[], removedItemEffects?: Partial<PlayerStats>, removedItemName?: string } {
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
