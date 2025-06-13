
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
].filter(item => item && item.id); // Filter out any undefined items if IDs are mistyped

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

export function loadGameState(): GameState | null {
  if (typeof window !== 'undefined' && localStorage) {
    const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState) as GameState;
        // Perform more thorough validation/migration if necessary
        if (!parsedState.player || !parsedState.currentScenario) {
            console.warn("LocalStorage Warning: Loaded game state is missing critical player or scenario data. Clearing corrupted state.");
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            return null;
        }
        
        // Ensure player object is fully populated, especially for older save states
        const basePlayer: Player = {
            uid: parsedState.player.uid || undefined,
            name: '', // Will be overridden if present
            gender: "Préfère ne pas préciser",
            age: 25,
            avatarUrl: defaultAvatarUrl,
            origin: "Inconnue",
            stats: { ...initialPlayerStats },
            skills: { ...initialSkills },
            traitsMentalStates: [...initialTraitsMentalStates],
            progression: { ...initialProgression },
            alignment: { ...initialAlignment },
            inventory: [ ...initialInventory ],
            currentLocation: { ...initialPlayerLocation },
            background: '' // Will be overridden if present
        };

        parsedState.player = {
            ...basePlayer,
            ...parsedState.player,
        };
        
        // Specific checks for nested objects that might be missing or need defaults
        if (!parsedState.player.currentLocation) parsedState.player.currentLocation = { ...initialPlayerLocation };
        if (!parsedState.player.stats) parsedState.player.stats = { ...initialPlayerStats };
        else parsedState.player.stats = { ...initialPlayerStats, ...parsedState.player.stats }; // Merge with defaults

        if (!parsedState.player.skills) parsedState.player.skills = { ...initialSkills };
        else parsedState.player.skills = { ...initialSkills, ...parsedState.player.skills };

        if (!Array.isArray(parsedState.player.traitsMentalStates)) parsedState.player.traitsMentalStates = [...initialTraitsMentalStates];
        
        if (!parsedState.player.progression) {
          parsedState.player.progression = { ...initialProgression };
        } else {
          parsedState.player.progression = { ...initialProgression, ...parsedState.player.progression };
          if (typeof parsedState.player.progression.xpToNextLevel === 'undefined' || parsedState.player.progression.xpToNextLevel <= 0) {
            parsedState.player.progression.xpToNextLevel = calculateXpToNextLevel(parsedState.player.progression.level);
          }
        }

        if (!parsedState.player.alignment) parsedState.player.alignment = { ...initialAlignment };
        else parsedState.player.alignment = { ...initialAlignment, ...parsedState.player.alignment };

        if (!Array.isArray(parsedState.player.inventory) || parsedState.player.inventory.length === 0) {
           parsedState.player.inventory = [ ...initialInventory ];
        } else {
          parsedState.player.inventory = parsedState.player.inventory.map(savedItem => {
            const masterItem = getMasterItemById(savedItem.id);
            if (masterItem) {
              return { ...masterItem, quantity: savedItem.quantity };
            }
            return null; 
          }).filter(item => item !== null) as InventoryItem[];
          // If after filtering, inventory is empty, re-init with starting items.
          if(parsedState.player.inventory.length === 0) {
            parsedState.player.inventory = [ ...initialInventory ];
          }
        }
        
        console.log("LocalStorage Success: Game state loaded and validated/migrated from LocalStorage.");
        return parsedState;
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
  } else {
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
  newProgression.xp += xpGained;
  let leveledUp = false;

  while (newProgression.xp >= newProgression.xpToNextLevel && newProgression.xpToNextLevel > 0) {
    newProgression.level += 1;
    newProgression.xp -= newProgression.xpToNextLevel; 
    newProgression.xpToNextLevel = calculateXpToNextLevel(newProgression.level);
    leveledUp = true;
  }
  return { newProgression, leveledUp };
}

