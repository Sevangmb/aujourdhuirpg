
import type { GameState, Scenario, Player, InventoryItem, ToneSettings, Position, JournalEntry, GameNotification, PlayerStats, Progression, ItemEffect, Quest, PNJ, MajorDecision, Clue, GameDocument } from './types';
import { getMasterItemById, type MasterInventoryItem } from '@/data/items';
import { saveGameStateToFirestore } from '@/services/firestore-service';
import { fetchNearbyPoisFromOSM } from '@/services/osm-service';
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
  UNKNOWN_STARTING_PLACE_NAME
} from '@/data/initial-game-data';
import { parsePlayerAction, type ParsedAction } from './action-parser';
import { performSkillCheck } from './skill-check';

export const LOCAL_STORAGE_KEY = 'aujourdhuiRPGGameState';

// --- Game State Helpers ---

function calculateXpToNextLevel(level: number): number {
  if (level <= 0) level = 1;
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
  const existingItemIndex = newInventory.findIndex(item => item.id === itemId);

  if (existingItemIndex > -1) {
    if (masterItem.stackable) {
      newInventory[existingItemIndex].quantity += quantityToAdd;
    } else {
      console.warn(`Inventory Info: Item '${masterItem.name}' (ID: ${itemId}) is not stackable and player already possesses one. Quantity not changed.`);
    }
  } else {
    newInventory.push({
      ...masterItem,
      quantity: masterItem.stackable ? quantityToAdd : 1
    });
  }
  return newInventory;
}


export function removeItemFromInventory(currentInventory: InventoryItem[], itemIdToRemoveOrName: string, quantityToRemove: number): { updatedInventory: InventoryItem[], removedItemEffects?: ItemEffect, removedItemName?: string } {
  const newInventory = [...currentInventory];
  let itemIndex = newInventory.findIndex(item => item.id === itemIdToRemoveOrName);
  if (itemIndex === -1) {
    itemIndex = newInventory.findIndex(item => item.name.toLowerCase() === itemIdToRemoveOrName.toLowerCase());
  }

  let removedItemEffects: Partial<PlayerStats> | undefined = undefined;
  let removedItemName: string | undefined = undefined;

  if (itemIndex > -1) {
    const itemBeingRemoved = newInventory[itemIndex];
    removedItemEffects = itemBeingRemoved.effects;
    removedItemName = itemBeingRemoved.name;

    if (itemBeingRemoved.quantity <= quantityToRemove) {
      newInventory.splice(itemIndex, 1);
    } else {
      newInventory[itemIndex].quantity -= quantityToRemove;
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
        title: 'Objet Utilisé',
        description: `Vous avez utilisé : ${itemInInventory.name}.`,
      });

      for (const [stat, change] of Object.entries(itemInInventory.effects)) {
        notifications.push({
          type: 'stat_changed',
          title: `Statistique modifiée`,
          description: `${stat} a changé de ${change > 0 ? '+' : ''}${change}.`,
        });
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
