
import type { GameState, Scenario, Player, ToneSettings, Position, JournalEntry, GameNotification, PlayerStats, Progression } from './types';
import type { InventoryItem } from './types/item-types'; // Import InventoryItem if needed here
import { calculateXpToNextLevel, applyStatChanges, addItemToInventory, removeItemFromInventory, addXP } from './player-state-helpers';
import { saveGameStateToFirestore } from '@/services/firestore-service';
import { initialPlayerStats, initialPlayerMoney } from '@/data/initial-game-data';
import { fetchNearbyPoisFromOSM } from '@/services/osm-service';
import {
  initialSkills,
  initialTraitsMentalStates,
  initialProgression,
  initialAlignment,
  initialInventory,
  initialPlayerLocation,
  defaultAvatarUrl,
  initialQuestLog,
  initialEncounteredPNJs,
  initialDecisionLog,
  initialClues,
  initialDocuments,
  initialInvestigationNotes,
  initialToneSettings,
  UNKNOWN_STARTING_PLACE_NAME
} from '@/data/initial-game-data';
import { parsePlayerAction, type ParsedAction } from './action-parser';
import { getMasterItemById } from '@/data/items';
import { performSkillCheck } from './skill-check';

export const LOCAL_STORAGE_KEY = 'aujourdhuiRPGGameState';

// --- Initial Scenario ---
export function getInitialScenario(player: Player): Scenario {
  if (player.currentLocation && player.currentLocation.name === UNKNOWN_STARTING_PLACE_NAME) {
    return {
      scenarioText: `
        <p>Initialisation du point de départ aléatoire...</p>
        <p>L'IA détermine votre environnement initial.</p>
      `,
    };
  }
  return {
    scenarioText: `
      <p>Bienvenue, ${player.name}. Que l'aventure commence !</p>
      <p>Vous vous trouvez à ${player.currentLocation?.name || 'un endroit non spécifié'}.</p>
      <p>Que faites-vous ?</p>
    `,
  };
}

// --- Game State Persistence ---
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

  if (!player.progression.xpToNextLevel) {
    player.progression.xpToNextLevel = calculateXpToNextLevel(player.progression.level);
  }

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

// --- Game Actions & Reducer ---
export type GameAction =
  | { type: 'MOVE_TO_LOCATION'; payload: Position }
  | { type: 'SET_NEARBY_POIS'; payload: Position[] | null }
  | { type: 'SET_CURRENT_SCENARIO'; payload: Scenario }
  | { type: 'UPDATE_PLAYER_DATA'; payload: Partial<Player> }
  | { type: 'ADD_GAME_TIME'; payload: number }
  | { type: 'ADD_JOURNAL_ENTRY'; payload: Omit<JournalEntry, 'id' | 'timestamp'> }
  | { type: 'TRIGGER_EVENT_ACTIONS'; payload: GameAction[] };

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (!state.player) return state;
  const now = state.gameTimeInMinutes || 0;

  switch (action.type) {
    case 'MOVE_TO_LOCATION': {
      const newLocation = action.payload;
      const newJournalEntry: JournalEntry = {
        id: `${now}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: now,
        type: 'location_change',
        text: `Déplacé vers ${newLocation.name}.`,
        location: newLocation,
      };
      return {
        ...state,
        player: { ...state.player, currentLocation: newLocation },
        currentScenario: { scenarioText: `<p>Vous arrivez à ${newLocation.name}.</p>` },
        nearbyPois: null,
        journal: [...(state.journal || []), newJournalEntry],
      };
    }
    case 'TRIGGER_EVENT_ACTIONS':
      return action.payload.reduce(gameReducer, state);
    case 'ADD_JOURNAL_ENTRY':
      return {
        ...state,
        journal: [...(state.journal || []), { ...action.payload, id: `${now}-${Math.random()}`, timestamp: now }],
      };
    case 'SET_NEARBY_POIS':
      return { ...state, nearbyPois: action.payload };
    case 'SET_CURRENT_SCENARIO':
      return { ...state, currentScenario: action.payload };
    case 'UPDATE_PLAYER_DATA':
      return { ...state, player: { ...state.player, ...action.payload } };
    case 'ADD_GAME_TIME':
      return { ...state, gameTimeInMinutes: (state.gameTimeInMinutes || 0) + action.payload };
    default:
      return state;
  }
}

// --- Deterministic Logic ---

/**
 * Calculates all deterministic effects of a player's action, updating the player state.
 * @param player The current player object.
 * @param actionText The text of the action the player took.
 * @returns An object containing the updated player, UI notifications, and events for the AI to narrate.
 */
export async function calculateDeterministicEffects(
  player: Player,
  actionText: string
): Promise<{ updatedPlayer: Player; notifications: GameNotification[]; eventsForAI: string[] }> {
  let updatedPlayer = { ...player };
  const notifications: GameNotification[] = [];
  const eventsForAI: string[] = [];

  const parsedAction = await parsePlayerAction(actionText, /* gameState */);

  if (parsedAction.actionType === 'USE_ITEM' && parsedAction.itemUsed) {
    const itemInInventory = updatedPlayer.inventory.find(i => i.name.toLowerCase() === parsedAction.itemUsed!.toLowerCase());

    if (itemInInventory && itemInInventory.effects) {
      // 1. Apply effects
      updatedPlayer.stats = applyStatChanges(updatedPlayer.stats, itemInInventory.effects);

      // 2. Remove item
      const removalResult = removeItemFromInventory(updatedPlayer.inventory, itemInInventory.id, 1);
      updatedPlayer.inventory = removalResult.updatedInventory;

      // 3. Create notifications & AI events
      eventsForAI.push(`Le joueur a utilisé '${itemInInventory.name}'.`);
      notifications.push({
        type: 'item_removed',
        title: 'Objet Utilisé',description: `Vous avez utilisé : ${itemInInventory.name}.`,
      });

      for (const [stat, change] of Object.entries(itemInInventory.effects as Partial<PlayerStats>)) {
        if (typeof change === 'number') {
 notifications.push({
 type: 'stat_changed',
 title: `Statistique modifiée`,
 description: `${stat} a changé de ${change > 0 ? '+' : ''}${change}.`,
 });

        }
        eventsForAI.push(`Effet : ${stat} a changé de ${change}.`);
      }
    } else if (itemInInventory) {
        notifications.push({type: 'warning', title: "Action impossible", description: `L'objet '${itemInInventory.name}' n'a pas d'effet utilisable.`});
    } else {
        notifications.push({type: 'warning', title: "Action impossible", description: `Vous n'avez pas d'objet nommé '${parsedAction.itemUsed}'.`});
    }
  }

  // Future: Add handlers for other parsedAction.actionType like 'APPLY_SKILL', etc.

  return { updatedPlayer, notifications, eventsForAI };
}


// --- Event Triggers ---
export function checkForLocationBasedEvents(newLocation: Position, gameState: GameState): GameAction[] {
  const triggeredActions: GameAction[] = [];
  if (newLocation.zone?.name === "Forbidden Sector") {
    triggeredActions.push({
      type: 'ADD_JOURNAL_ENTRY',
      payload: { type: 'event', text: `Vous sentez un frisson vous parcourir l'échine en entrant dans le ${newLocation.zone.name}. Quelque chose ne va pas ici.` }
    });
  }
  if (newLocation.name === "Old Observatory") {
    triggeredActions.push({
      type: 'SET_CURRENT_SCENARIO',
      payload: { scenarioText: `<p>Vous êtes arrivé à l'Ancien Observatoire. La porte est entrouverte et une faible lumière filtre de l'intérieur.</p>` }
    });
  }
  return triggeredActions;
}

export async function fetchPoisForCurrentLocation(playerLocation: Position): Promise<Position[] | null> {
  if (!playerLocation) return null;
  try {
    const poisFromService = await fetchNearbyPoisFromOSM({
        latitude: playerLocation.latitude,
        longitude: playerLocation.longitude,
        radius: 500,
        limit: 10
    });
    if (poisFromService.message && poisFromService.pois.length === 0) return [];
    return poisFromService.pois.map(poi => ({
      latitude: poi.lat ?? playerLocation.latitude,
      longitude: poi.lon ?? playerLocation.longitude,
      name: poi.name || "Lieu Inconnu",
      summary: poi.tags?.description || poi.type,
      zone: { name: poi.subtype || poi.type || "Zone" }
    })).filter(poi => {
        if (poisFromService.pois.length === 1) return true;
        return !(poi.latitude === playerLocation.latitude && poi.longitude === playerLocation.longitude);
    });
  } catch (error) {
    console.error("Error fetching new POIs:", error);
    return null;
  }
}
