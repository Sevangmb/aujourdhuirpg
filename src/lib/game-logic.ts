
import type { PlayerStats, GameState, Scenario, Player, LocationData, Skills, TraitsMentalStates, Progression, Alignment, InventoryItem, Quest, PNJ, MajorDecision, Clue, GameDocument } from './types';
import { getMasterItemById, ALL_ITEMS } from '@/data/items';
import { saveGameStateToFirestore } from '@/services/firestore-service';


export const LOCAL_STORAGE_KEY = 'aujourdhuiRPGGameState';

// --- Initial Player Data ---
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

const calculateXpToNextLevelForInitial = (level: number): number => {
  if (level <= 0) level = 1;
  return level * 100 + 50 * (level -1) * level;
};

export const initialProgression: Progression = {
  level: 1,
  xp: 0,
  xpToNextLevel: calculateXpToNextLevelForInitial(1),
  perks: [],
};

export const initialAlignment: Alignment = {
  chaosLawful: 0,
  goodEvil: 0,
};

export const initialInventory: InventoryItem[] = [
  getMasterItemById('smartphone_01'),
  getMasterItemById('wallet_01'),
  getMasterItemById('keys_apartment_01'),
  getMasterItemById('energy_bar_01'),
]
.filter(item => item !== undefined)
.map(masterItem => {
  if (!masterItem) throw new Error("Unreachable: masterItem is undefined after filter"); // Should not happen
  return { 
    ...masterItem, 
    quantity: masterItem.id === 'energy_bar_01' ? 2 : 1 // Non-stackable (like smartphone) defaults to 1
  };
});


export const initialPlayerLocation: LocationData = {
  latitude: 48.8566,
  longitude: 2.3522,
  placeName: 'Paris, France',
};

export const defaultAvatarUrl = 'https://placehold.co/150x150.png';
export const initialPlayerMoney: number = 50;

export const initialQuestLog: Quest[] = [];
export const initialEncounteredPNJs: PNJ[] = [];
export const initialDecisionLog: MajorDecision[] = [];
export const initialClues: Clue[] = [];
export const initialDocuments: GameDocument[] = [];
export const initialInvestigationNotes: string = "Aucune note d'enquête pour le moment.";
// --- End Initial Player Data ---

export function getInitialScenario(player: Player): Scenario {
 return {
    scenarioText: `
      <h1 class="font-headline">Bienvenue, ${player.name}</h1>
      <p>Vous êtes ${player.name}, ${player.background}. Vous vous trouvez à ${player.currentLocation.placeName}, une ville pleine d'opportunités et de mystères. Vous avez ${player.money}€ en poche. Le soleil du matin commence à réchauffer les rues pavées.</p>
      <p>Tapez ci-dessous ce que vous souhaitez faire pour commencer votre journée.</p>
    `,
  };
}


// --- Game State Persistence ---
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
    }
  } else {
    console.warn("Save Game Warning: LocalStorage is not available. Skipping local save.");
  }

  if (state.player && state.player.uid) {
    try {
      await saveGameStateToFirestore(state.player.uid, state);
    } catch (error) {
      console.log("GameLogic Info: Cloud save attempt finished (check Firestore logs for details).");
    }
  } else {
    console.log("GameLogic Info: Player UID not found in game state. Skipping Firestore save. This is normal for anonymous users.");
  }
}

export function hydratePlayer(savedPlayer?: Partial<Player>): Player {
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
    money: typeof savedPlayer?.money === 'number' ? savedPlayer.money : initialPlayerMoney,
    inventory: [], // Initialize as empty, will be populated below
    currentLocation: { ...initialPlayerLocation, ...(savedPlayer?.currentLocation || {}) },
    questLog: Array.isArray(savedPlayer?.questLog) ? savedPlayer.questLog : [...initialQuestLog],
    encounteredPNJs: Array.isArray(savedPlayer?.encounteredPNJs) ? savedPlayer.encounteredPNJs : [...initialEncounteredPNJs],
    decisionLog: Array.isArray(savedPlayer?.decisionLog) ? savedPlayer.decisionLog : [...initialDecisionLog],
    clues: Array.isArray(savedPlayer?.clues) ? savedPlayer.clues : [...initialClues],
    documents: Array.isArray(savedPlayer?.documents) ? savedPlayer.documents : [...initialDocuments],
    investigationNotes: typeof savedPlayer?.investigationNotes === 'string' ? savedPlayer.investigationNotes : initialInvestigationNotes,
  };

  if (Array.isArray(savedPlayer?.inventory) && savedPlayer.inventory.length > 0) {
    player.inventory = savedPlayer.inventory
      .map(itemFromSave => {
        const masterItem = getMasterItemById(itemFromSave.id);
        if (masterItem) {
          // All properties from master item, only quantity from save
          return { 
            ...masterItem, 
            quantity: Math.max(1, itemFromSave.quantity || 1) 
          };
        }
        console.warn(`Hydration Warning: Item with ID "${itemFromSave.id}" from save data not found in master item list. Skipping.`);
        return null;
      })
      .filter(item => item !== null) as InventoryItem[];
  } else {
    // If no saved inventory or it's empty, use a deep copy of the initial inventory
    player.inventory = initialInventory.map(item => ({...item}));
  }


  if (player.progression.level <= 0) player.progression.level = 1;
  if (typeof player.progression.xp !== 'number' || player.progression.xp < 0) player.progression.xp = 0;
  player.progression.xpToNextLevel = calculateXpToNextLevelForInitial(player.progression.level); // Use specific initial calc
  if (!Array.isArray(player.progression.perks)) player.progression.perks = [];
  if (typeof player.money !== 'number') player.money = initialPlayerMoney;
  
  // Ensure inventory is not empty if initial inventory has items and saved one was empty
  if (player.inventory.length === 0 && initialInventory.length > 0) {
    player.inventory = initialInventory.map(item => ({...item}));
  }
  
  return player;
}


export function loadGameStateFromLocal(): GameState | null {
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
        localStorage.removeItem(LOCAL_STORAGE_KEY);
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
