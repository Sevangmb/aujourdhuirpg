
import type { GameState, Scenario, Player, InventoryItem, ToneSettings } from './types';
import { getMasterItemById } from '@/data/items';
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
  initialToneSettings
} from '@/data/initial-game-data';


export const LOCAL_STORAGE_KEY = 'aujourdhuiRPGGameState';

// --- Initial Scenario ---
export function getInitialScenario(player: Player): Scenario {
  if (player.currentLocation && player.currentLocation.placeName === "Lieu de Départ Inconnu") {
    return {
      scenarioText: `
        <p>${player.name}, vous vous réveillez dans un lieu inconnu. Vos sens s'éveillent lentement...</p>
        <p>Que faites-vous ?</p>
      `,
    };
  }
  return {
    scenarioText: `
      <p>Où vous trouvez-vous, ${player.name} ?</p>
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
