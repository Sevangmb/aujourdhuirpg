
import type { GameState, Scenario, Player, ToneSettings, Position, JournalEntry, GameNotification, PlayerStats, Progression, Quest, PNJ, MajorDecision, Clue, GameDocument, QuestUpdate, InventoryItem, Transaction, HistoricalContact, StoryChoice } from './types';
import { calculateXpToNextLevel, applyStatChanges, addItemToInventory, removeItemFromInventory, addXP } from './player-state-helpers';
import { fetchNearbyPoisFromOSM } from '@/services/osm-service';
import { parsePlayerAction, type ParsedAction } from './action-parser';
import { getMasterItemById } from '@/data/items';
import { performSkillCheck } from './skill-check';
import { montmartreInitialChoices } from '@/data/choices';

// --- Initial Scenario ---
export function getInitialScenario(player: Player): Scenario {
  return {
    scenarioText: `<p>Bienvenue, ${player.name}. L'aventure commence... Que faites-vous ?</p>`,
    choices: montmartreInitialChoices,
  };
}

// --- Game Actions & Reducer ---
export type GameAction =
  | { type: 'EXECUTE_TRAVEL', payload: { destination: Position, travelNarrative: string, time: number, cost: number, energy: number } }
  | { type: 'SET_NEARBY_POIS'; payload: Position[] | null }
  | { type: 'SET_CURRENT_SCENARIO'; payload: Scenario }
  | { type: 'UPDATE_PLAYER_DATA'; payload: Partial<Player> }
  | { type: 'ADD_GAME_TIME'; payload: number }
  | { type: 'ADD_JOURNAL_ENTRY'; payload: Omit<JournalEntry, 'id' | 'timestamp'> }
  | { type: 'TRIGGER_EVENT_ACTIONS'; payload: GameAction[] }
  // AI-driven actions
  | { type: 'ADD_QUEST'; payload: Omit<Quest, 'dateAdded' | 'dateCompleted'> }
  | { type: 'UPDATE_QUEST'; payload: QuestUpdate }
  | { type: 'ADD_PNJ'; payload: Omit<PNJ, 'firstEncountered' | 'lastSeen' | 'interactionHistory'> }
  | { type: 'UPDATE_PNJ'; payload: { id: string; dispositionScore?: number; newInteractionLogEntry?: string; } }
  | { type: 'ADD_CLUE'; payload: Omit<Clue, 'dateFound'> }
  | { type: 'ADD_DOCUMENT'; payload: Omit<GameDocument, 'dateAcquired'> }
  | { type: 'UPDATE_INVESTIGATION_NOTES', payload: string }
  | { type: 'ADD_ITEM_TO_INVENTORY'; payload: { itemId: string; quantity: number } }
  | { type: 'ADD_TRANSACTION'; payload: Omit<Transaction, 'id' | 'timestamp' | 'locationName'> }
  | { type: 'ADD_XP'; payload: number }
  | { type: 'ADD_HISTORICAL_CONTACT'; payload: HistoricalContact };


export function gameReducer(state: GameState, action: GameAction): GameState {
  if (!state.player) return state;
  const now = state.gameTimeInMinutes || 0;
  const nowISO = new Date().toISOString(); // For dating new entries

  switch (action.type) {
    case 'EXECUTE_TRAVEL': {
      const { destination, travelNarrative, time, cost, energy } = action.payload;

      // 1. Update location, time, money, stats
      const newStats = applyStatChanges(state.player.stats, { Energie: -energy });
      const newMoney = state.player.money - cost;
      const newTime = (state.gameTimeInMinutes || 0) + time;

      // 2. Create journal entry for the travel
      const newJournalEntry: JournalEntry = {
        id: `${newTime}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: newTime,
        type: 'location_change',
        text: `Voyage vers ${destination.name}.`,
        location: destination,
      };

      // 3. Create transaction if there was a cost
      const newTransaction: Transaction | null = cost > 0 ? {
        id: `${newTime}-tx-${Math.random().toString(36).substr(2, 9)}`,
        amount: -cost,
        type: 'expense',
        category: 'transport',
        description: `Transport vers ${destination.name}`,
        timestamp: new Date().toISOString(),
        locationName: state.player.currentLocation.name,
      } : null;

      const transactionLog = newTransaction ? [...(state.player.transactionLog || []), newTransaction] : state.player.transactionLog;

      // 4. Construct new scenario text
      const arrivalText = `<p>Vous arrivez à ${destination.name}.</p>`;
      const newScenarioText = `${travelNarrative}\n${arrivalText}`;

      return {
        ...state,
        gameTimeInMinutes: newTime,
        player: {
          ...state.player,
          currentLocation: destination,
          stats: newStats,
          money: newMoney,
          transactionLog: transactionLog || [],
        },
        currentScenario: { scenarioText: newScenarioText, choices: montmartreInitialChoices /* TODO: Make dynamic */ },
        nearbyPois: null, // Clear POIs since we moved
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
    
    // --- AI-Driven Reducers ---
    case 'ADD_QUEST': {
        const newQuest: Quest = { ...action.payload, dateAdded: nowISO, status: action.payload.status || (action.payload.type === 'job' ? 'inactive' : 'active') };
        return {
            ...state,
            player: { ...state.player, questLog: [...(state.player.questLog || []), newQuest] },
        };
    }
    case 'UPDATE_QUEST': {
        const { questId, newStatus, updatedObjectives } = action.payload;
        const updatedQuestLog = state.player.questLog.map(quest => {
            if (quest.id === questId) {
                const newQuest = { ...quest };
                if (newStatus) {
                    newQuest.status = newStatus;
                    if (['completed', 'failed'].includes(newStatus) && !newQuest.dateCompleted) {
                        newQuest.dateCompleted = nowISO;
                    }
                }
                if (updatedObjectives) {
                    newQuest.objectives = newQuest.objectives.map(obj => {
                        const update = updatedObjectives.find(u => u.objectiveId === obj.id);
                        return update ? { ...obj, isCompleted: update.isCompleted } : obj;
                    });
                }
                // Check if all objectives are completed to auto-complete the quest
                if (newQuest.objectives.every(obj => obj.isCompleted)) {
                    newQuest.status = 'completed';
                    if (!newQuest.dateCompleted) {
                        newQuest.dateCompleted = nowISO;
                    }
                }
                return newQuest;
            }
            return quest;
        });
        return { ...state, player: { ...state.player, questLog: updatedQuestLog } };
    }
    case 'ADD_PNJ': {
        const newPNJ: PNJ = { 
            ...action.payload, 
            firstEncountered: state.player.currentLocation.name, 
            lastSeen: nowISO, 
            interactionHistory: [action.payload.newInteractionLogEntry || "Rencontre initiale."],
            dispositionScore: action.payload.dispositionScore || 0,
        };
        return {
            ...state,
            player: { ...state.player, encounteredPNJs: [...(state.player.encounteredPNJs || []), newPNJ] },
        };
    }
    case 'UPDATE_PNJ': {
        const { id, dispositionScore, newInteractionLogEntry } = action.payload;
        const updatedPNJLog = (state.player.encounteredPNJs || []).map(pnj => {
            if (pnj.id === id) {
                const newPnj = { ...pnj };
                if (typeof dispositionScore === 'number') {
                    newPnj.dispositionScore = dispositionScore;
                }
                if (newInteractionLogEntry) {
                    newPnj.interactionHistory = [...(newPnj.interactionHistory || []), newInteractionLogEntry];
                }
                newPnj.lastSeen = nowISO;
                return newPnj;
            }
            return pnj;
        });
        return { ...state, player: { ...state.player, encounteredPNJs: updatedPNJLog } };
    }
    case 'ADD_ITEM_TO_INVENTORY': {
        const { itemId, quantity } = action.payload;
        const updatedInventory = addItemToInventory(state.player.inventory, itemId, quantity);
        return { ...state, player: { ...state.player, inventory: updatedInventory } };
    }
    case 'ADD_TRANSACTION': {
        const newTransaction: Transaction = {
            ...action.payload,
            id: `${now}-${Math.random().toString(36).substring(2, 9)}`,
            timestamp: new Date().toISOString(),
            locationName: state.player.currentLocation.name,
        };
        const newMoneyTotal = state.player.money + newTransaction.amount;
        return {
            ...state,
            player: {
                ...state.player,
                money: newMoneyTotal,
                transactionLog: [...(state.player.transactionLog || []), newTransaction],
            }
        };
    }
    case 'ADD_XP': {
        const { newProgression, leveledUp } = addXP(state.player.progression, action.payload);
        if (leveledUp) {
            // Can add a notification here later if needed
        }
        return { ...state, player: { ...state.player, progression: newProgression } };
    }
     case 'ADD_CLUE': {
        const newClue: Clue = { ...action.payload, dateFound: nowISO };
        return {
            ...state,
            player: { ...state.player, clues: [...(state.player.clues || []), newClue] },
        };
    }
    case 'ADD_DOCUMENT': {
        const newDocument: GameDocument = { ...action.payload, dateAcquired: nowISO };
        return {
            ...state,
            player: { ...state.player, documents: [...(state.player.documents || []), newDocument] },
        };
    }
    case 'UPDATE_INVESTIGATION_NOTES': {
        return {
            ...state,
            player: { ...state.player, investigationNotes: action.payload }
        };
    }
    case 'ADD_HISTORICAL_CONTACT': {
        const newContacts = [...(state.player.historicalContacts || []), action.payload];
        return {
            ...state,
            player: { ...state.player, historicalContacts: newContacts },
        };
    }
    default:
      return state;
  }
}

// --- Deterministic Logic ---

export async function calculateDeterministicEffects(
  player: Player,
  choice: StoryChoice
): Promise<{ updatedPlayer: Player; notifications: GameNotification[]; eventsForAI: string[]}> {
  const newPlayerState = JSON.parse(JSON.stringify(player));
  const notifications: GameNotification[] = [];
  const eventsForAI: string[] = [];

  // Apply energy cost from the choice
  if (choice.energyCost > 0) {
    newPlayerState.stats.Energie = Math.max(0, newPlayerState.stats.Energie - choice.energyCost);
    notifications.push({ type: 'stat_changed', title: 'Énergie', description: `Vous avez dépensé ${choice.energyCost} points d'énergie.` });
    eventsForAI.push(`Le joueur a dépensé ${choice.energyCost} énergie.`);
  }
  
  // Specific hardcoded effects for certain choices can be added here
  if (choice.id === 'montmartre_buy_crepe') {
       const crepeCost = 4.5;
       if (newPlayerState.money >= crepeCost) {
            newPlayerState.money -= crepeCost;
            newPlayerState.stats.Energie = Math.min(100, newPlayerState.stats.Energie + 5);
            notifications.push({ type: 'money_changed', title: 'Achat', description: `Vous avez acheté une crêpe pour ${crepeCost}€.`});
            notifications.push({ type: 'stat_changed', title: 'Énergie', description: `La crêpe vous redonne 5 points d'énergie.`});
            eventsForAI.push(`Le joueur a acheté une crêpe pour ${crepeCost}€ et a regagné 5 énergie.`);
       } else {
           notifications.push({ type: 'warning', title: 'Fonds insuffisants', description: "Vous n'avez pas assez d'argent pour une crêpe."});
           eventsForAI.push("Le joueur a tenté d'acheter une crêpe mais n'avait pas assez d'argent.");
       }
  }


  return { updatedPlayer: newPlayerState, notifications, eventsForAI };
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
      payload: { scenarioText: `<p>Vous êtes arrivé à l'Ancien Observatoire. La porte est entrouverte et une faible lumière filtre de l'intérieur.</p>`, choices: [] }
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
    if (!poisFromService || (poisFromService.message && poisFromService.pois.length === 0)) return [];
    
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

// --- AI Input Preparation ---
export function prepareAIInput(gameState: GameState, playerChoice: string, deterministicEvents: string[] = []): GenerateScenarioInput | null {
  if (!gameState.player) {
    console.error("Cannot prepare AI input: Player state is missing.");
    return null;
  }

  const player = gameState.player;

  return {
    playerName: player.name,
    playerGender: player.gender,
    playerAge: player.age,
    playerOrigin: player.origin,
    playerEra: player.era || 'Époque Contemporaine',
    playerStartingLocation: player.startingLocationName || player.currentLocation.name,
    playerBackground: player.background,
    playerStats: player.stats,
    playerSkills: player.skills,
    playerTraitsMentalStates: player.traitsMentalStates,
    playerProgression: player.progression,
    playerAlignment: player.alignment,
    playerInventory: player.inventory.map(item => ({ name: item.name, quantity: item.quantity })),
    playerMoney: player.money,
    playerChoice: playerChoice,
    currentScenario: gameState.currentScenario?.scenarioText || '',
    playerLocation: player.currentLocation,
    toneSettings: player.toneSettings,
    deterministicEvents: deterministicEvents,
    activeQuests: (player.questLog || [])
      .filter(q => q.status === 'active')
      .map(q => ({
        id: q.id,
        title: q.title,
        description: q.description.substring(0, 250),
        type: q.type,
        giver: q.giver,
        rewardDescription: q.rewardDescription,
        moneyReward: q.moneyReward,
        relatedLocation: q.relatedLocation,
        currentObjectivesDescriptions: (q.objectives || [])
          .filter(obj => !obj.isCompleted)
          .map(obj => obj.description)
      })),
    encounteredPNJsSummary: (player.encounteredPNJs || []).map(p => ({
        name: p.name,
        relationStatus: p.relationStatus,
        dispositionScore: p.dispositionScore,
        interactionHistorySummary: p.interactionHistory?.slice(-2).join('; ')
    })),
    currentCluesSummary: (player.clues || []).map(clue => ({ title: clue.title, summary: clue.description.substring(0, 150) })),
    currentDocumentsSummary: (player.documents || []).map(doc => ({ title: doc.title, summary: doc.content.substring(0, 150) })),
    currentInvestigationNotes: player.investigationNotes,
  };
}
