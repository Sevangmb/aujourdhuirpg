
import type { PlayerStats, GameState, Scenario, Player, LocationData, Skills, TraitsMentalStates, Progression, Alignment, InventoryItem } from './types';
import { getMasterItemById, ALL_ITEMS } from '@/data/items'; // Import master item list and getter
import { saveGameStateToFirestore } from '@/services/firestore-service'; // Import Firestore save function
// import { useToast } from "@/hooks/use-toast"; // Cannot use hooks directly in non-React functions


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
  if (level <= 0) level = 1; // Ensure level is at least 1 for calculation
  return level * 100 + 50 * (level -1) * level; // Example formula: 1=100, 2=250, 3=450 etc. (adjusted to be more progressive)
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
  getMasterItemById('smartphone_01'),
  getMasterItemById('wallet_01'),
  getMasterItemById('keys_apartment_01'),
  getMasterItemById('energy_bar_01'),
]
.filter(item => item !== undefined) // Ensure no undefined items if ID is wrong
.map(masterItem => ({ ...masterItem!, quantity: masterItem!.id === 'energy_bar_01' ? 2 : 1 }));


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


export async function saveGameState(state: GameState): Promise<void> {
  if (!state || !state.player) {
    console.warn("Save Game Warning: Attempted to save invalid or incomplete game state. Aborting save.", state);
    return;
  }

  if (typeof window !== 'undefined' && localStorage) {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
      console.log("LocalStorage Success: Game state saved to LocalStorage.");
    } catch (error) {
      console.error("LocalStorage Error: Failed to save game state to LocalStorage:", error);
      // Potentially notify user if LocalStorage is critical and fails
    }
  } else {
    console.warn("Save Game Warning: LocalStorage is not available. Skipping local save.");
  }

  if (state.player && state.player.uid) {
    try {
      await saveGameStateToFirestore(state.player.uid, state);
      // Firestore save success/error is logged within saveGameStateToFirestore
    } catch (error) {
      // Error already logged by saveGameStateToFirestore.
      // We might want to inform the user here specifically that cloud save failed.
      // This usually means `saveGameState` itself doesn't need to show a generic Firestore error toast
      // as the service function handles more specific logging.
      console.log("GameLogic Info: Cloud save attempt finished (check Firestore logs for details).");
    }
  } else {
    console.log("GameLogic Info: Player UID not found in game state. Skipping Firestore save. This is normal for anonymous users.");
  }
}

function hydratePlayer(savedPlayer?: Partial<Player>): Player {
  const player: Player = {
    uid: savedPlayer?.uid,
    name: savedPlayer?.name || '',
    gender: savedPlayer?.gender || "Préfère ne pas préciser",
    age: typeof savedPlayer?.age === 'number' && savedPlayer.age > 0 ? savedPlayer.age : 25,
    avatarUrl: savedPlayer?.avatarUrl || defaultAvatarUrl,
    origin: savedPlayer?.origin || "Inconnue",
    background: savedPlayer?.background || '',
    stats: { ...initialPlayerStats, ...(savedPlayer?.stats || {}) },
    skills: { ...initialSkills, ...(savedPlayer?.skills || {}) },
    traitsMentalStates: Array.isArray(savedPlayer?.traitsMentalStates) && savedPlayer.traitsMentalStates.length > 0
      ? [...savedPlayer.traitsMentalStates]
      : [...initialTraitsMentalStates],
    progression: {
      ...initialProgression,
      ...(savedPlayer?.progression || {}),
    },
    alignment: { ...initialAlignment, ...(savedPlayer?.alignment || {}) },
    inventory: Array.isArray(savedPlayer?.inventory) && savedPlayer.inventory.length > 0
      ? savedPlayer.inventory
          .map(item => {
            const masterItem = getMasterItemById(item.id);
            if (masterItem) {
              return { ...masterItem, quantity: Math.max(1, item.quantity || 1) };
            }
            return null;
          })
          .filter(item => item !== null) as InventoryItem[]
      : [...initialInventory],
    currentLocation: { ...initialPlayerLocation, ...(savedPlayer?.currentLocation || {}) },
  };

  // Ensure progression is valid
  if (player.progression.level <= 0) player.progression.level = 1;
  if (typeof player.progression.xp !== 'number' || player.progression.xp < 0) player.progression.xp = 0;
  player.progression.xpToNextLevel = calculateXpToNextLevel(player.progression.level);
  if (!Array.isArray(player.progression.perks)) player.progression.perks = [];


  // If inventory ended up empty after potential filtering, re-initialize
  if (player.inventory.length === 0) {
    player.inventory = [...initialInventory];
  }
  
  return player;
}


export function loadGameState(): GameState | null {
  if (typeof window !== 'undefined' && localStorage) {
    const savedStateString = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedStateString) {
      try {
        const parsedSavedState = JSON.parse(savedStateString) as Partial<GameState>;

        if (!parsedSavedState || typeof parsedSavedState !== 'object') {
          console.warn("LocalStorage Warning: Loaded game state is not a valid object. Clearing corrupted state.");
          localStorage.removeItem(LOCAL_STORAGE_KEY);
          return null;
        }

        const hydratedPlayer = hydratePlayer(parsedSavedState.player);
        
        const currentScenario = parsedSavedState.currentScenario && parsedSavedState.currentScenario.scenarioText
          ? parsedSavedState.currentScenario
          : getInitialScenario(hydratedPlayer);

        console.log("LocalStorage Success: Game state loaded and hydrated from LocalStorage.");
        return { player: hydratedPlayer, currentScenario };

      } catch (error) {
        console.error("LocalStorage Error: Error parsing game state from LocalStorage:", error);
        localStorage.removeItem(LOCAL_STORAGE_KEY); // Clear corrupted state
        return null;
      }
    }
  } else {
      console.warn("LocalStorage Warning: LocalStorage is not available. Cannot load game state.");
  }
  return null;
}

export function clearGameState(): void {
  if (typeof window !== 'undefined' && localStorage) {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    console.log("LocalStorage Info: Game state cleared from LocalStorage.");
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
    console.warn(`Inventory Warning: Attempted to add unknown item ID: ${itemId}`);
    return currentInventory;
  }

  const newInventory = [...currentInventory];
  const existingItemIndex = newInventory.findIndex(item => item.id === itemId);

  if (existingItemIndex > -1 && masterItem.stackable) {
    newInventory[existingItemIndex].quantity += quantityToAdd;
  } else if (existingItemIndex > -1 && !masterItem.stackable) {
    // For non-stackable, add as new instance if not already there, or do nothing if trying to add more of existing non-stackable
    // Current logic doesn't prevent adding multiple non-stackable if ID is same but it comes as a "new item"
    // This part can be refined based on desired game logic for unique non-stackables
    console.warn(`Inventory Info: Item ${itemId} is not stackable. Adding as a new entry if not already present with quantity 1.`);
     if (!newInventory.find(item => item.id === itemId)) { // Only add if truly not there
        newInventory.push({ ...masterItem, quantity: 1 });
     }
  }
  else {
    newInventory.push({ ...masterItem, quantity: quantityToAdd });
  }
  return newInventory;
}

export function removeItemFromInventory(currentInventory: InventoryItem[], itemIdToRemoveOrName: string, quantityToRemove: number): InventoryItem[] {
  const newInventory = [...currentInventory];
  let itemIndex = newInventory.findIndex(item => item.id === itemIdToRemoveOrName);
  if (itemIndex === -1) {
    itemIndex = newInventory.findIndex(item => item.name.toLowerCase() === itemIdToRemoveOrName.toLowerCase());
  }

  if (itemIndex > -1) {
    if (newInventory[itemIndex].quantity <= quantityToRemove) {
      newInventory.splice(itemIndex, 1);
    } else {
      newInventory[itemIndex].quantity -= quantityToRemove;
    }
  } else {
    console.warn(`Inventory Warning: Attempted to remove item not in inventory: ${itemIdToRemoveOrName}`);
  }
  return newInventory;
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
    // Potentially add perk points or other level-up rewards here
  }
   // Ensure XP isn't negative after leveling down (if that were possible, or if xpToNextLevel calculation was off)
  if (newProgression.xp < 0) newProgression.xp = 0;

  return { newProgression, leveledUp };
}
