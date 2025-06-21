import type { GameState, Player, InventoryItem, ToneSettings, Position, JournalEntry, PlayerStats, Progression, Quest, PNJ, MajorDecision, Clue, GameDocument } from './types';
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
  initialToneSettings,
  UNKNOWN_STARTING_PLACE_NAME,
} from '@/data/initial-game-data';
import { getInitialScenario } from './game-logic'; // We will keep getInitialScenario in game-logic for now

export const LOCAL_STORAGE_KEY = 'aujourdhuiRPGGameState';

export interface SaveGameResult {
  localSaveSuccess: boolean;
  cloudSaveSuccess: boolean | null;
}

export async function saveGameState(state: GameState): Promise<SaveGameResult> {
  const result: SaveGameResult = { localSaveSuccess: false, cloudSaveSuccess: null };
  if (!state || !state.player) {
    console.warn("Save Game Warning: Attempted to save invalid or incomplete game state.", state);
    return result;
  }
  if (typeof window !== 'undefined' && localStorage) {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
      result.localSaveSuccess = true;
    } catch (error) {
      console.error("LocalStorage Error: Failed to save game state:", error);
    }
  }
  if (state.player && state.player.uid) {
    try {
      await saveGameStateToFirestore(state.player.uid, state);
      result.cloudSaveSuccess = true;
    } catch (error) {
      result.cloudSaveSuccess = false;
      console.error("GameLogic Error: Cloud save attempt failed:", error);
    }
  }
  return result;
}

export function hydratePlayer(savedPlayer?: Partial<Player>): Player {
  const player: Player = {
    uid: savedPlayer?.uid,
    name: savedPlayer?.name || '',
    gender: savedPlayer?.gender || "Préfère ne pas préciser",
    age: savedPlayer?.age || 25,
    avatarUrl: savedPlayer?.avatarUrl || defaultAvatarUrl,
    origin: savedPlayer?.origin || "Inconnue",
    background: savedPlayer?.background || '',
    era: savedPlayer?.era, // Include era here
    stats: { ...initialPlayerStats, ...(savedPlayer?.stats || {}) },
    skills: { ...initialSkills, ...(savedPlayer?.skills || {}) },
    traitsMentalStates: savedPlayer?.traitsMentalStates || [...initialTraitsMentalStates],
    progression: { ...initialProgression, ...(savedPlayer?.progression || {}) },
    alignment: { ...initialAlignment, ...(savedPlayer?.alignment || {}) },
    money: typeof savedPlayer?.money === 'number' ? savedPlayer.money : initialPlayerMoney,
    inventory: [],
    currentLocation: savedPlayer?.currentLocation || initialPlayerLocation,
    toneSettings: { ...initialToneSettings, ...(savedPlayer?.toneSettings || {}) },
    questLog: savedPlayer?.questLog || [...initialQuestLog],
    encounteredPNJs: savedPlayer?.encounteredPNJs || [...initialEncounteredPNJs],
    decisionLog: savedPlayer?.decisionLog || [...initialDecisionLog],
    clues: savedPlayer?.clues || [...initialClues],
    documents: savedPlayer?.documents || [...initialDocuments],
    investigationNotes: savedPlayer?.investigationNotes || initialInvestigationNotes,
  };

  // Assuming calculateXpToNextLevel will be imported or handled elsewhere
  // if (!player.progression.xpToNextLevel) {
  //   player.progression.xpToNextLevel = calculateXpToNextLevel(player.progression.level);
  // }

  if (savedPlayer?.inventory && savedPlayer.inventory.length > 0) {
    player.inventory = savedPlayer.inventory.map(item => ({
      ...getMasterItemById(item.id)!, ...item
    })).filter(Boolean) as InventoryItem[];
  } else {
    player.inventory = initialInventory.map(item => ({...item}));
  }

  return player;
}

export function loadGameStateFromLocal(): GameState | null {
  if (typeof window !== 'undefined' && localStorage) {
    const savedStateString = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedStateString) {
      try {
        const parsedState = JSON.parse(savedStateString) as Partial<GameState>;
        if (!parsedState.player) return null;
        const hydratedPlayer = hydratePlayer(parsedState.player);
        return {
          player: hydratedPlayer,
          currentScenario: parsedState.currentScenario || getInitialScenario(hydratedPlayer),
          nearbyPois: parsedState.nearbyPois || null,
          gameTimeInMinutes: parsedState.gameTimeInMinutes || 0,
          journal: parsedState.journal || [],
          toneSettings: parsedState.toneSettings || initialToneSettings,
        };
      } catch (error) {
        console.error("LocalStorage Error: Error parsing game state:", error);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    }
  }
  return null;
}

export function clearGameState(): void {
  if (typeof window !== 'undefined' && localStorage) {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    console.log("LocalStorage Info: Game state cleared.");
  }
}