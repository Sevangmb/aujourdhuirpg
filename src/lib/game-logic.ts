
import type { PlayerStats, GameState, Scenario, Player, LocationData, Skills, TraitsMentalStates, Progression, Alignment, InventoryItem } from './types';
import { getMasterItemById, ALL_ITEMS } from '@/data/items'; // Import master item list and getter

export const LOCAL_STORAGE_KEY = 'aujourdhuiRPGGameState';

export const initialPlayerStats: PlayerStats = {
  Sante: 100,
  Charisme: 50,
  Intelligence: 50,
  Force: 50,
};

export const initialSkills: Skills = {
  Informatique: 10,
  Discretion: 5,
  Dialogue: 15,
  Perception: 12,
  Survie: 8,
};

export const initialTraitsMentalStates: TraitsMentalStates = ["Prudent", "Observateur"];

const calculateXpToNextLevel = (level: number): number => {
  return level * 100 + 50 * level; // Example formula: 1=150, 2=300, 3=450 etc.
};

export const initialProgression: Progression = {
  level: 1,
  xp: 0,
  xpToNextLevel: calculateXpToNextLevel(1),
  perks: [],
};

export const initialAlignment: Alignment = {
  chaosLawful: 0, // Neutre
  goodEvil: 0,    // Neutre
};

// Initialize inventory from master item list
export const initialInventory: InventoryItem[] = [
  { ...getMasterItemById('smartphone_01')!, quantity: 1 },
  { ...getMasterItemById('wallet_01')!, quantity: 1 },
  { ...getMasterItemById('keys_apartment_01')!, quantity: 1 },
  { ...getMasterItemById('energy_bar_01')!, quantity: 2 },
].filter(item => item.id); // Filter out any undefined items if IDs are mistyped

export const initialPlayerLocation: LocationData = {
  latitude: 48.8566, // Paris latitude
  longitude: 2.3522, // Paris longitude
  placeName: 'Paris, France',
};

export const defaultAvatarUrl = 'https://placehold.co/150x150.png';

export function getInitialScenario(player: Player): Scenario {
 return {
    scenarioText: `
      <h1 class="font-headline">Bienvenue, ${player.name}</h1>
      <p>Vous êtes ${player.name}, ${player.background}. Vous vous trouvez à ${player.currentLocation.placeName}, une ville pleine d'opportunités et de mystères. Le soleil du matin commence à réchauffer les rues pavées.</p>
      <p>Tapez ci-dessous ce que vous souhaitez faire pour commencer votre journée.</p>
    `,
  };
}


export function saveGameState(state: GameState): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  }
}

export function loadGameState(): GameState | null {
  if (typeof window !== 'undefined') {
    const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState) as GameState;
        if (parsedState.player) {
          // Ensure older game states without new fields get defaults
          if (!parsedState.player.currentLocation) {
            parsedState.player.currentLocation = initialPlayerLocation;
          }
          if (!parsedState.player.gender) parsedState.player.gender = "Préfère ne pas préciser";
          if (typeof parsedState.player.age !== 'number') parsedState.player.age = 25;
          if (!parsedState.player.avatarUrl) parsedState.player.avatarUrl = defaultAvatarUrl;
          if (!parsedState.player.origin) parsedState.player.origin = "Inconnue";
          if (!parsedState.player.skills) parsedState.player.skills = { ...initialSkills };
          if (!parsedState.player.traitsMentalStates) parsedState.player.traitsMentalStates = [...initialTraitsMentalStates];
          
          if (!parsedState.player.progression) {
            parsedState.player.progression = { ...initialProgression };
          } else { // Ensure xpToNextLevel is present even for older saves
            if (typeof parsedState.player.progression.xpToNextLevel === 'undefined') {
              parsedState.player.progression.xpToNextLevel = calculateXpToNextLevel(parsedState.player.progression.level);
            }
          }

          if (!parsedState.player.alignment) parsedState.player.alignment = { ...initialAlignment };
          if (!parsedState.player.inventory || parsedState.player.inventory.length === 0) {
             // Re-initialize from master list if inventory is missing or empty in save
             parsedState.player.inventory = [
                { ...getMasterItemById('smartphone_01')!, quantity: 1 },
                { ...getMasterItemById('wallet_01')!, quantity: 1 },
                { ...getMasterItemById('keys_apartment_01')!, quantity: 1 },
                { ...getMasterItemById('energy_bar_01')!, quantity: 2 },
             ].filter(item => item.id);
          } else {
            // Ensure all items in saved inventory have all MasterItem fields
            parsedState.player.inventory = parsedState.player.inventory.map(savedItem => {
              const masterItem = getMasterItemById(savedItem.id);
              if (masterItem) {
                return { ...masterItem, quantity: savedItem.quantity };
              }
              return savedItem; // Should not happen if data is consistent
            }).filter(item => item && item.id);
          }
        }
        return parsedState;
      } catch (error) {
        console.error("Erreur lors du chargement de l'état du jeu:", error);
        localStorage.removeItem(LOCAL_STORAGE_KEY); // Clear corrupted state
        return null;
      }
    }
  }
  return null;
}

export function clearGameState(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }
}

export function applyStatChanges(currentStats: PlayerStats, changes: Record<string, number>): PlayerStats {
  const newStats = { ...currentStats };
  for (const key in changes) {
    if (Object.prototype.hasOwnProperty.call(newStats, key)) {
      newStats[key] = Math.max(0, newStats[key] + changes[key]); // Ensure stats don't go below 0
    } else {
      newStats[key] = Math.max(0, changes[key]);
    }
  }
  return newStats;
}

export function addItemToInventory(currentInventory: InventoryItem[], itemId: string, quantityToAdd: number): InventoryItem[] {
  const masterItem = getMasterItemById(itemId);
  if (!masterItem) {
    console.warn(`Attempted to add unknown item ID: ${itemId}`);
    return currentInventory;
  }

  const newInventory = [...currentInventory];
  const existingItemIndex = newInventory.findIndex(item => item.id === itemId);

  if (existingItemIndex > -1 && masterItem.stackable) {
    newInventory[existingItemIndex].quantity += quantityToAdd;
  } else {
    // If not stackable or not found, add as new entry (or new stack if stackable but not found)
    newInventory.push({ ...masterItem, quantity: quantityToAdd });
  }
  return newInventory;
}

export function removeItemFromInventory(currentInventory: InventoryItem[], itemIdToRemoveOrName: string, quantityToRemove: number): InventoryItem[] {
  const newInventory = [...currentInventory];
  // Try to find by ID first, then by name if ID doesn't match an existing item (for AI `itemName` removal)
  let itemIndex = newInventory.findIndex(item => item.id === itemIdToRemoveOrName);
  if (itemIndex === -1) {
    itemIndex = newInventory.findIndex(item => item.name.toLowerCase() === itemIdToRemoveOrName.toLowerCase());
  }

  if (itemIndex > -1) {
    if (newInventory[itemIndex].quantity <= quantityToRemove) {
      newInventory.splice(itemIndex, 1); // Remove item if quantity becomes 0 or less
    } else {
      newInventory[itemIndex].quantity -= quantityToRemove;
    }
  } else {
    console.warn(`Attempted to remove item not in inventory: ${itemIdToRemoveOrName}`);
  }
  return newInventory;
}

export function addXP(currentProgression: Progression, xpGained: number): { newProgression: Progression, leveledUp: boolean } {
  const newProgression = { ...currentProgression };
  newProgression.xp += xpGained;
  let leveledUp = false;

  while (newProgression.xp >= newProgression.xpToNextLevel) {
    newProgression.level += 1;
    newProgression.xp -= newProgression.xpToNextLevel; // Subtract cost of current level
    newProgression.xpToNextLevel = calculateXpToNextLevel(newProgression.level);
    leveledUp = true;
    // Potentially add skill points or perk unlocks here in the future
  }
  return { newProgression, leveledUp };
}
