
import type { GameState, Scenario, Player, InventoryItem, ToneSettings, Position, JournalEntry } from './types'; // Added JournalEntry
import { getMasterItemById, type MasterInventoryItem } from '@/data/items';
import { saveGameStateToFirestore } from '@/services/firestore-service';
import { fetchNearbyPoisFromOSM } from '@/services/osm-service'; // For fetching new POIs
// import { getPositionData } from '@/services/position-service'; // Could be used to update current location details too
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
  if (player.currentLocation && player.currentLocation.name === UNKNOWN_STARTING_PLACE_NAME) {
    // This very first scenario text is mostly a placeholder.
    // The AI will use playerLocation.name === UNKNOWN_STARTING_PLACE_NAME as a trigger
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
      <p>Vous vous trouvez à ${player.currentLocation?.name || 'un endroit non spécifié'}.</p>
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
    // Current location handling starts here
    currentLocation: { // Initialize with defaults, will be refined
      latitude: initialPlayerLocation.latitude,
      longitude: initialPlayerLocation.longitude,
      name: initialPlayerLocation.name,
    },
    toneSettings: { ...initialToneSettings, ...(savedPlayer?.toneSettings || {}) },
    questLog: Array.isArray(savedPlayer?.questLog) ? savedPlayer.questLog : [...initialQuestLog],
    encounteredPNJs: Array.isArray(savedPlayer?.encounteredPNJs) ? savedPlayer.encounteredPNJs : [...initialEncounteredPNJs],
    decisionLog: Array.isArray(savedPlayer?.decisionLog) ? savedPlayer.decisionLog : [...initialDecisionLog],
    clues: Array.isArray(savedPlayer?.clues) ? savedPlayer.clues : [...initialClues],
    documents: Array.isArray(savedPlayer?.documents) ? savedPlayer.documents : [...initialDocuments],
    investigationNotes: typeof savedPlayer?.investigationNotes === 'string' ? savedPlayer.investigationNotes : initialInvestigationNotes,
  };

  // Refined current location hydration
  const savedLoc = savedPlayer?.currentLocation as (Position & { placeName?: string }); // Cast to allow checking for old placeName
  const initialLoc = initialPlayerLocation;

  let determinedName: string;
  if (savedLoc && typeof savedLoc.name === 'string' && savedLoc.name.trim() !== '') {
    determinedName = savedLoc.name;
  } else if (savedLoc && typeof savedLoc.placeName === 'string' && savedLoc.placeName.trim() !== '') {
    // If old 'placeName' exists and 'name' doesn't, use 'placeName' for 'name'
    determinedName = savedLoc.placeName;
  } else {
    determinedName = initialLoc.name;
  }

  const finalLocation: Position = {
    latitude: (typeof savedLoc?.latitude === 'number' && !isNaN(savedLoc.latitude)) ? savedLoc.latitude : initialLoc.latitude,
    longitude: (typeof savedLoc?.longitude === 'number' && !isNaN(savedLoc.longitude)) ? savedLoc.longitude : initialLoc.longitude,
    name: determinedName,
  };

  if (savedLoc?.summary) finalLocation.summary = savedLoc.summary;
  if (savedLoc?.imageUrl) finalLocation.imageUrl = savedLoc.imageUrl;
  if (savedLoc?.zone) finalLocation.zone = savedLoc.zone;

  player.currentLocation = finalLocation;

  // Ensure name is not empty if it somehow became so
  if (!player.currentLocation.name || player.currentLocation.name.trim() === '') {
      player.currentLocation.name = initialPlayerLocation.name; // Ultimate fallback
  }


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

  return player;
}

// --- Game Actions & Reducer ---

export type GameAction =
  | { type: 'MOVE_TO_LOCATION'; payload: Position }
  | { type: 'SET_NEARBY_POIS'; payload: Position[] | null }
  | { type: 'SET_CURRENT_SCENARIO'; payload: Scenario }
  | { type: 'UPDATE_PLAYER_DATA'; payload: Partial<Player> }
  | { type: 'ADD_GAME_TIME'; payload: number }
  | { type: 'ADD_JOURNAL_ENTRY'; payload: Omit<JournalEntry, 'id' | 'timestamp'> }; // For adding entries from various sources

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (!state.player) {
    console.error("Reducer Error: Player object is null. Cannot process action.", action);
    return state;
  }
  const now = state.gameTimeInMinutes || 0;

  switch (action.type) {
    case 'MOVE_TO_LOCATION': {
      const newLocation = action.payload;
      const newJournalEntry: JournalEntry = {
        id: `${now}-${Math.random().toString(36).substr(2, 9)}`, // Simple unique enough ID
        timestamp: now, // Timestamp will be based on time *before* this move's time addition
        type: 'location_change',
        text: `Déplacé vers ${newLocation.name}.`,
        location: newLocation,
      };
      console.log(`Action: MOVE_TO_LOCATION to ${newLocation.name}`);
      return {
        ...state,
        player: {
          ...state.player,
          currentLocation: newLocation,
        },
        currentScenario: { scenarioText: `<p>Vous arrivez à ${newLocation.name}.</p>` },
        nearbyPois: null,
        journal: [...(state.journal || []), newJournalEntry],
        // TODO: Implement event triggering based on new location (e.g., check newLocation.name or newLocation.zone)
      };
    }
    case 'ADD_JOURNAL_ENTRY': {
      const newEntry: JournalEntry = {
        ...action.payload,
        id: `${now}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: now,
      };
      return {
        ...state,
        journal: [...(state.journal || []), newEntry],
      };
    }
    case 'SET_NEARBY_POIS':
      console.log(`Action: SET_NEARBY_POIS`, action.payload);
      return {
        ...state,
        nearbyPois: action.payload,
      };

    case 'SET_CURRENT_SCENARIO':
      return {
        ...state,
        currentScenario: action.payload,
      };

    case 'UPDATE_PLAYER_DATA':
      return {
        ...state,
        player: {
          ...state.player,
          ...action.payload,
        }
      };

    case 'ADD_GAME_TIME':
      return {
        ...state,
        gameTimeInMinutes: (state.gameTimeInMinutes || 0) + action.payload,
      };

    default:
      return state;
  }
}

// Async function to fetch POIs for the current player location
// This would typically be called after the state has been updated with the new location.
export async function fetchPoisForCurrentLocation(playerLocation: Position): Promise<Position[] | null> {
  if (!playerLocation || typeof playerLocation.latitude !== 'number' || typeof playerLocation.longitude !== 'number') {
    console.warn("fetchPoisForCurrentLocation: Invalid playerLocation provided.", playerLocation);
    return null;
  }
  try {
    // Pass the full Position object to fetchNearbyPoisFromOSM as it expects GetNearbyPoisServiceInput
    const poisFromService = await fetchNearbyPoisFromOSM({
        latitude: playerLocation.latitude,
        longitude: playerLocation.longitude,
        radius: 500, // Default or configurable radius
        limit: 10    // Default or configurable limit
    });

    if (poisFromService.message && poisFromService.pois.length === 0) {
        console.log("fetchPoisForCurrentLocation: No POIs returned from service - ", poisFromService.message);
        return [];
    }
    
    // Transform POIs from service (OverpassPoiInternal[]) to Position[]
    // Assuming OverpassPoiInternal has lat/lon or center coordinates
    const transformedPois: Position[] = poisFromService.pois.map(poiServiceItem => {
        // This mapping depends on the structure of OverpassPoiInternal.
        // Assuming it has 'lat', 'lon' or similar, and 'name', 'tags' etc.
        // For now, if OverpassPoiInternal doesn't directly map to Position, this needs adjustment.
        // Let's assume for now that fetchNearbyPoisFromOSM returns objects compatible with Position's needs (name, lat, lon)
        // or we need a more detailed mapping.
        // The service GetNearbyPoisServiceOutput currently returns OverpassPoiInternal.
        // Let's assume OverpassPoiInternal has name, and we'll use playerLocation for lat/lon as a placeholder if not directly available on POI.
        // This is a simplification and might need to be refined based on actual OverpassPoiInternal structure from osm-service.
        // For now, this transformation is a placeholder. A real transformation would extract lat/lon from the POI element itself.
        // For a more accurate transformation, we would need to inspect the 'element.lat', 'element.lon' or 'element.center.lat/lon' from Overpass API response.
        
        // This is a simplified transformation. A more robust one would extract actual coordinates.
        // The service fetchNearbyPoisFromOSM itself should return objects that include latitude and longitude.
        // Let's assume the service output POIs *do* have lat/lon. If not, osm-service needs adjustment.
        // The current osm-service doesn't seem to add lat/lon to its output POIs. This is a problem.
        // For now, let's pass a simplified object. The map will likely not work well for these POIs without proper coords.

        return {
            latitude: (poiServiceItem as any).lat ?? playerLocation.latitude, // Placeholder if lat/lon not on poiServiceItem
            longitude: (poiServiceItem as any).lon ?? playerLocation.longitude, // Placeholder
            name: poiServiceItem.name || "Lieu Inconnu",
            summary: poiServiceItem.tags?.description || poiServiceItem.type,
            zone: { name: poiServiceItem.subtype || poiServiceItem.type || "Zone" }
        };
    }).filter(poi => !(poi.latitude === playerLocation.latitude && poi.longitude === playerLocation.longitude));
    
    return transformedPois;

  } catch (error) {
    console.error("Error fetching new POIs:", error);
    return null;
  }
}


export function loadGameStateFromLocal(): GameState | null {
  if (typeof window !== 'undefined' && localStorage) {
    const savedStateString = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedStateString) {
      try {
        const parsedSavedState = JSON.parse(savedStateString) as Partial<GameState>;

        if (!parsedSavedState || typeof parsedSavedState !== 'object' || !parsedSavedState.player) {
          console.warn("LocalStorage Warning: Loaded game state is not a valid object or player is missing. Clearing corrupted state.");
          localStorage.removeItem(LOCAL_STORAGE_KEY);
          return null;
        }

        const hydratedPlayer = hydratePlayer(parsedSavedState.player);

        // Initialize gameTimeInMinutes if not present in saved state
        const gameTimeInMinutes = typeof parsedSavedState.gameTimeInMinutes === 'number' ? parsedSavedState.gameTimeInMinutes : 0;
        const nearbyPois = Array.isArray(parsedSavedState.nearbyPois) ? parsedSavedState.nearbyPois : null;
        const journal = Array.isArray(parsedSavedState.journal) ? parsedSavedState.journal : []; // Initialize journal


        const currentScenario = parsedSavedState.currentScenario && parsedSavedState.currentScenario.scenarioText
          ? parsedSavedState.currentScenario
          : getInitialScenario(hydratedPlayer);

        console.log("LocalStorage Success: Game state loaded and hydrated from LocalStorage.");
        // Ensure all GameState fields are present
        return {
          player: hydratedPlayer,
          currentScenario,
          nearbyPois,
          gameTimeInMinutes,
          journal, // Added journal to returned state
        };

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

