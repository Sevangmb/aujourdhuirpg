
import type { GameState, Scenario, Player, InventoryItem, ToneSettings } from './types';
import { getMasterItemById, type MasterInventoryItem } from '@/data/items'; // Added MasterInventoryItem import
import { saveGameStateToFirestore } from '@/services/firestore-service';
import {
  initialPlayerStats,
  initialSkills,
  initialTraitsMentalStates,
  initialProgression,
  initialAlignment,
  initialInventory,
  initialPlayerLocation,
  defaultAvatarUrl,
  initialPlayerMoney,
  initialQuestLog,
  initialEncounteredPNJs,
  initialDecisionLog,
  initialClues,
  initialDocuments,
  initialInvestigationNotes,
  initialToneSettings,
  UNKNOWN_STARTING_PLACE_NAME // Import the new constant
} from '@/data/initial-game-data';


export const LOCAL_STORAGE_KEY = 'aujourdhuiRPGGameState';

// --- Initial Scenario ---
export function getInitialScenario(player: Player): Scenario {
  if (player.currentLocation && player.currentLocation.placeName === UNKNOWN_STARTING_PLACE_NAME) {
    // This very first scenario text is mostly a placeholder.
    // The AI will use playerLocation.placeName === UNKNOWN_STARTING_PLACE_NAME as a trigger
    // to execute special logic to find a suitable inhabited starting location.
    return {
      scenarioText: `
        <p>Initialisation du point de départ aléatoire...</p>
        <p>L'IA détermine votre environnement initial.</p>
      `,
    };
  }
  // Fallback for any other case, though typically the above should be hit for new characters.
  return {
    scenarioText: `
      <p>Bienvenue, ${player.name}. Que l'aventure commence !</p>
      <p>Vous vous trouvez à ${player.currentLocation?.placeName || 'un endroit non spécifié'}.</p>
      <p>Que faites-vous ?</p>
    `,
  };
}

// --- Game State Persistence ---
export interface SaveGameResult {
  localSaveSuccess: boolean;
  cloudSaveSuccess: boolean | null; // null if not attempted (e.g., anonymous user)
}

export async function saveGameState(state: GameState): Promise<SaveGameResult> {
  const result: SaveGameResult = {
    localSaveSuccess: false,
    cloudSaveSuccess: null,
  };

  if (!state || !state.player) {
    console.warn("Save Game Warning: Attempted to save invalid or incomplete game state. Aborting save.", state);
    return result; // Return default (all false)
  }

  if (typeof window !== 'undefined' && localStorage) {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
      result.localSaveSuccess = true;
      console.log("LocalStorage Success: Game state saved to LocalStorage.");
    } catch (error) {
      result.localSaveSuccess = false;
      console.error("LocalStorage Error: Failed to save game state to LocalStorage:", error);
    }
  } else {
    result.localSaveSuccess = false;
    console.warn("Save Game Warning: LocalStorage is not available. Skipping local save.");
  }

  if (state.player && state.player.uid) {
    try {
      await saveGameStateToFirestore(state.player.uid, state);
      result.cloudSaveSuccess = true;
    } catch (error) {
      result.cloudSaveSuccess = false;
      // Log already happens in firestore-service, but good to note here too.
      console.error("GameLogic Error: Cloud save attempt failed:", error);
    }
  } else {
    result.cloudSaveSuccess = null; // Not attempted
    console.log("GameLogic Info: Player UID not found in game state. Skipping Firestore save. This is normal for anonymous users.");
  }
  return result;
}

const calculateXpToNextLevelForHydration = (level: number): number => {
  if (level <= 0) level = 1;
  return level * 100 + 50 * (level -1) * level;
};

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
    inventory: [],
    currentLocation: { ...initialPlayerLocation, ...(savedPlayer?.currentLocation || {}) },
    toneSettings: { ...initialToneSettings, ...(savedPlayer?.toneSettings || {}) },
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
    player.inventory = initialInventory.map(item => ({...item}));
  }

  if (player.progression.level <= 0) player.progression.level = 1;
  if (typeof player.progression.xp !== 'number' || player.progression.xp < 0) player.progression.xp = 0;
  player.progression.xpToNextLevel = calculateXpToNextLevelForHydration(player.progression.level);
  if (!Array.isArray(player.progression.perks)) player.progression.perks = [];
  if (typeof player.money !== 'number') player.money = initialPlayerMoney;

  if (player.inventory.length === 0 && initialInventory.length > 0) {
    player.inventory = initialInventory.map(item => ({...item}));
  }

  // Ensure currentLocation has valid numeric lat/lon
  if (typeof player.currentLocation.latitude !== 'number' || isNaN(player.currentLocation.latitude)) {
    player.currentLocation.latitude = initialPlayerLocation.latitude;
  }
  if (typeof player.currentLocation.longitude !== 'number' || isNaN(player.currentLocation.longitude)) {
    player.currentLocation.longitude = initialPlayerLocation.longitude;
  }
  if (!player.currentLocation.placeName) {
    player.currentLocation.placeName = initialPlayerLocation.placeName;
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

