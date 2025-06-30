
import type { GameState, Scenario, Player, ToneSettings, Position, JournalEntry, GameNotification, PlayerStats, Progression, Quest, PNJ, MajorDecision, Clue, GameDocument, QuestUpdate, IntelligentItem, Transaction, HistoricalContact, StoryChoice, AdvancedSkillSystem, QuestObjective, ItemUsageRecord } from './types';
import { calculateXpToNextLevel, applyStatChanges, addItemToInventory, removeItemFromInventory, addXP, applySkillGains, updateItemContextualProperties } from './player-state-helpers';
import { fetchNearbyPoisFromOSM } from '@/services/osm-service';
import { parsePlayerAction, type ParsedAction } from './action-parser';
import { getMasterItemById } from '@/data/items';
import { performSkillCheck } from './skill-check';
import { montmartreInitialChoices } from '@/data/choices';
import type { WeatherData } from '@/app/actions/get-current-weather';
import { v4 as uuidv4 } from 'uuid';

// --- Initial Scenario ---
export function getInitialScenario(player: Player): Scenario {
  return {
    scenarioText: `<p>Bienvenue, ${player.name}. L'aventure commence... Que faites-vous ?</p>`,
    choices: montmartreInitialChoices,
  };
}

// --- Game Actions & Reducer ---
// Types for simplified AI payloads
type AddQuestPayload = Omit<Quest, 'id' | 'dateAdded' | 'dateCompleted' | 'status' | 'objectives'> & { objectives: string[] };
type AddPnjPayload = Omit<PNJ, 'id' | 'firstEncountered' | 'lastSeen' | 'interactionHistory' | 'notes' | 'trustLevel'>;
type AddCluePayload = Omit<Clue, 'id' | 'dateFound'>;
type AddDocumentPayload = Omit<GameDocument, 'id' | 'dateAcquired'>;


export type GameAction =
  | { type: 'EXECUTE_TRAVEL', payload: { destination: Position, travelNarrative: string, time: number, cost: number, energy: number } }
  | { type: 'SET_NEARBY_POIS'; payload: Position[] | null }
  | { type: 'SET_CURRENT_SCENARIO'; payload: Scenario }
  | { type: 'UPDATE_PLAYER_DATA'; payload: Partial<Player> }
  | { type: 'SET_INVENTORY'; payload: IntelligentItem[] }
  | { type: 'ADD_GAME_TIME'; payload: number }
  | { type: 'ADD_JOURNAL_ENTRY'; payload: Omit<JournalEntry, 'id' | 'timestamp'> }
  | { type: 'LOG_ITEM_USAGE'; payload: { instanceId: string; usageDescription: string; } }
  | { type: 'TRIGGER_EVENT_ACTIONS'; payload: GameAction[] }
  // AI-driven actions from simplified schemas
  | { type: 'ADD_QUEST'; payload: AddQuestPayload }
  | { type: 'UPDATE_QUEST'; payload: QuestUpdate }
  | { type: 'ADD_PNJ'; payload: AddPnjPayload }
  | { type: 'UPDATE_PNJ'; payload: { id: string; dispositionScore?: number; newInteractionLogEntry?: string; } }
  | { type: 'ADD_CLUE'; payload: AddCluePayload }
  | { type: 'ADD_DOCUMENT'; payload: AddDocumentPayload }
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
      
      const mutablePlayer = { ...state.player };

      mutablePlayer.stats = applyStatChanges(mutablePlayer.stats, { Energie: -energy });
      mutablePlayer.money -= cost;
      
      const hungerDecay = (time * 0.02) + (energy * 0.2);
      const thirstDecay = (time * 0.03) + (energy * 0.3);
      mutablePlayer.physiology.basic_needs.hunger.level = Math.max(0, mutablePlayer.physiology.basic_needs.hunger.level - hungerDecay);
      mutablePlayer.physiology.basic_needs.thirst.level = Math.max(0, mutablePlayer.physiology.basic_needs.thirst.level - thirstDecay);

      const newTime = (state.gameTimeInMinutes || 0) + time;

      const newJournalEntry: JournalEntry = {
        id: `${newTime}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: newTime,
        type: 'location_change',
        text: `Voyage vers ${destination.name}.`,
        location: destination,
      };

      const newTransaction: Transaction | null = cost > 0 ? {
        id: `${newTime}-tx-${Math.random().toString(36).substr(2, 9)}`,
        amount: -cost,
        type: 'expense',
        category: 'transport',
        description: `Transport vers ${destination.name}`,
        timestamp: new Date().toISOString(),
        locationName: state.player.currentLocation.name,
      } : null;
      mutablePlayer.transactionLog = newTransaction ? [...(mutablePlayer.transactionLog || []), newTransaction] : mutablePlayer.transactionLog;

      // Re-contextualize the entire inventory on arrival
      mutablePlayer.inventory = mutablePlayer.inventory.map(item => 
        updateItemContextualProperties(item, destination)
      );
      mutablePlayer.currentLocation = destination;


      const arrivalText = `<p>Vous arrivez à ${destination.name}.</p>`;
      const newScenarioText = `${travelNarrative}\n${arrivalText}`;

      return {
        ...state,
        gameTimeInMinutes: newTime,
        player: mutablePlayer,
        currentScenario: { scenarioText: newScenarioText, choices: montmartreInitialChoices /* TODO: Make dynamic */ },
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
    case 'SET_INVENTORY':
        return { ...state, player: { ...state.player, inventory: action.payload } };
    case 'LOG_ITEM_USAGE': {
        const { instanceId, usageDescription } = action.payload;
        const updatedInventory = (state.player.inventory || []).map(item => {
            if (item.instanceId === instanceId) {
                const newUsageRecord: ItemUsageRecord = {
                    timestamp: new Date().toISOString(), // Use real-world time for this log
                    event: usageDescription,
                    locationName: state.player.currentLocation.name,
                };
                return {
                    ...item,
                    memory: {
                        ...item.memory,
                        usageHistory: [...item.memory.usageHistory, newUsageRecord],
                        lastUsed: new Date().toISOString(),
                    },
                };
            }
            return item;
        });
        return { ...state, player: { ...state.player, inventory: updatedInventory } };
    }
    case 'ADD_GAME_TIME':
      return { ...state, gameTimeInMinutes: (state.gameTimeInMinutes || 0) + action.payload };
    
    // --- AI-Driven Reducers ---
    case 'ADD_QUEST': {
        const newQuest: Quest = {
            id: uuidv4(),
            title: action.payload.title,
            description: action.payload.description,
            type: action.payload.type,
            giver: action.payload.giver,
            rewardDescription: action.payload.rewardDescription,
            moneyReward: action.payload.moneyReward,
            relatedLocation: action.payload.relatedLocation,
            dateAdded: nowISO,
            status: action.payload.type === 'job' ? 'inactive' : 'active',
            objectives: action.payload.objectives.map((desc): QuestObjective => ({
                id: uuidv4(),
                description: desc,
                isCompleted: false
            })),
        };
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
            id: uuidv4(),
            name: action.payload.name,
            description: action.payload.description,
            relationStatus: action.payload.relationStatus,
            importance: action.payload.importance,
            dispositionScore: action.payload.dispositionScore || 0,
            firstEncountered: state.player.currentLocation.name, 
            lastSeen: nowISO, 
            interactionHistory: ["Rencontre initiale."],
            trustLevel: 50,
            notes: [],
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
        const updatedInventory = addItemToInventory(state.player.inventory, itemId, quantity, state.player.currentLocation);
        return { ...state, player: { ...state.player, inventory: updatedInventory } };
    }
    case 'ADD_TRANSACTION': {
        const newTransaction: Transaction = {
            ...action.payload,
            id: uuidv4(),
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
        const newClue: Clue = { id: uuidv4(), ...action.payload, dateFound: nowISO };
        return {
            ...state,
            player: { ...state.player, clues: [...(state.player.clues || []), newClue] },
        };
    }
    case 'ADD_DOCUMENT': {
        const newDocument: GameDocument = { id: uuidv4(), ...action.payload, dateAcquired: nowISO };
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

export function getWeatherModifier(skillPath: string, weatherData: WeatherData | null): { modifier: number, reason: string } {
  if (!weatherData) {
    return { modifier: 0, reason: "" };
  }

  const weatherDesc = weatherData.description.toLowerCase();
  let modifier = 0;
  let reason = "";

  const isBadWeather = weatherDesc.includes('pluie') || weatherDesc.includes('brouillard') || weatherDesc.includes('neige') || weatherDesc.includes('orage');
  
  // Observation is harder in bad weather
  if (skillPath.includes('observation') || skillPath.includes('navigation')) {
    if (isBadWeather) {
      modifier = -10;
      reason = `Le mauvais temps (${weatherData.description}) pénalise cette action.`;
    }
  }

  // Stealth is easier in bad weather
  if (skillPath.includes('stealth')) {
    if (isBadWeather) {
      modifier = 10;
      reason = `Le mauvais temps (${weatherData.description}) favorise cette action.`;
    }
  }

  return { modifier, reason };
}

export async function calculateDeterministicEffects(
  player: Player,
  choice: StoryChoice,
  weatherData: WeatherData | null
): Promise<{ updatedPlayer: Player; notifications: GameNotification[]; eventsForAI: string[]}> {
  const newPlayerState = JSON.parse(JSON.stringify(player));
  const notifications: GameNotification[] = [];
  const eventsForAI: string[] = [];

  // --- PHYSIOLOGY DECAY ---
  // Decay based on time and energy spent. Rates can be tweaked.
  const timeDecayFactor = 0.05; // Hunger/Thirst points per minute
  const energyDecayFactor = 0.1; // Hunger/Thirst points per energy point

  let hungerDecay = (choice.timeCost * timeDecayFactor) + (choice.energyCost * energyDecayFactor);
  let thirstDecay = (choice.timeCost * timeDecayFactor) + (choice.energyCost * energyDecayFactor * 1.5); // Thirst decays faster

  newPlayerState.physiology.basic_needs.hunger.level = Math.max(0, newPlayerState.physiology.basic_needs.hunger.level - hungerDecay);
  newPlayerState.physiology.basic_needs.thirst.level = Math.max(0, newPlayerState.physiology.basic_needs.thirst.level - thirstDecay);
  
  // Apply energy cost from the choice
  if (choice.energyCost > 0) {
    newPlayerState.stats.Energie = Math.max(0, newPlayerState.stats.Energie - choice.energyCost);
    notifications.push({ type: 'stat_changed', title: 'Énergie', description: `Vous avez dépensé ${choice.energyCost} points d'énergie.` });
    eventsForAI.push(`Le joueur a dépensé ${choice.energyCost} énergie.`);
  }

  // Handle direct physiological effects from the choice (e.g., eating/drinking)
  if (choice.physiologicalEffects) {
    if (choice.physiologicalEffects.hunger) {
      newPlayerState.physiology.basic_needs.hunger.level = Math.min(100, newPlayerState.physiology.basic_needs.hunger.level + choice.physiologicalEffects.hunger);
      notifications.push({ type: 'info', title: 'Satiété', description: `Votre faim est apaisée.` });
      eventsForAI.push(`Le joueur a mangé, restaurant ${choice.physiologicalEffects.hunger} points de faim.`);
    }
    if (choice.physiologicalEffects.thirst) {
      newPlayerState.physiology.basic_needs.thirst.level = Math.min(100, newPlayerState.physiology.basic_needs.thirst.level + choice.physiologicalEffects.thirst);
      notifications.push({ type: 'info', title: 'Hydratation', description: `Votre soif est étanchée.` });
      eventsForAI.push(`Le joueur a bu, restaurant ${choice.physiologicalEffects.thirst} points de soif.`);
    }
  }

  // Handle skill checks
  if (choice.skillCheck) {
    const { skill, difficulty } = choice.skillCheck;
    
    const { modifier: weatherModifier, reason: weatherReason } = getWeatherModifier(skill, weatherData);
    if (weatherReason) {
      eventsForAI.push(weatherReason);
    }
    
    const skillCheckResult = performSkillCheck(
      newPlayerState.skills,
      newPlayerState.stats,
      skill,
      difficulty,
      newPlayerState.inventory,
      weatherModifier,
      newPlayerState.physiology // Pass physiology to skill check
    );

    const outcomeTextMap = {
      critical_success: "Réussite Critique !",
      success: "Réussite",
      failure: "Échec",
      critical_failure: "Échec Critique !"
    };
    const outcomeText = outcomeTextMap[skillCheckResult.degreeOfSuccess];

    let itemBonusText = "";
    if (skillCheckResult.itemContributions.length > 0) {
        const itemDetails = skillCheckResult.itemContributions
            .map(c => `${c.name} (${c.bonus > 0 ? '+' : ''}${c.bonus})`)
            .join(', ');
        itemBonusText = ` | Objets: ${itemDetails}`;
    }

    notifications.push({
      type: 'skill_check',
      title: `Jet de ${skill}`,
      description: `${outcomeText} (Jet: ${skillCheckResult.rollValue} + Mod: ${skillCheckResult.effectiveScore}${itemBonusText} = ${skillCheckResult.totalAchieved} vs Diff: ${skillCheckResult.difficultyTarget})`
    });

    eventsForAI.push(
      `Résultat du jet de compétence (${skill}) : ${outcomeText} (Jet: ${skillCheckResult.rollValue} + Score: ${skillCheckResult.effectiveScore} vs Difficulté: ${skillCheckResult.difficultyTarget})`
    );

    // --- APPLY SKILL GAINS ON SUCCESS ---
    if (skillCheckResult.success && choice.skillGains) {
        const { updatedSkills, notifications: skillGainNotifications } = applySkillGains(newPlayerState.skills, choice.skillGains);
        newPlayerState.skills = updatedSkills;
        
        skillGainNotifications.forEach(notif => {
            notifications.push({ type: 'info', title: 'Compétence Améliorée', description: notif });
        });
        eventsForAI.push(...skillGainNotifications.map(n => `Effet de la réussite: ${n}`));
    }
  }
  
  // Specific hardcoded effects for certain choices can be added here
    if (choice.id.startsWith('consume_item_')) {
        const itemIdToConsume = choice.id.replace('consume_item_', '');
        const itemInInventory = newPlayerState.inventory.find((i: IntelligentItem) => i.id === itemIdToConsume);
        
        if(itemInInventory) {
            const { updatedInventory, removedItemName } = removeItemFromInventory(newPlayerState.inventory, itemIdToConsume, 1);
            newPlayerState.inventory = updatedInventory;

            // Apply physiological effects
            if (itemInInventory.physiologicalEffects?.hunger) {
                newPlayerState.physiology.basic_needs.hunger.level = Math.min(100, newPlayerState.physiology.basic_needs.hunger.level + itemInInventory.physiologicalEffects.hunger);
            }
            if (itemInInventory.physiologicalEffects?.thirst) {
                newPlayerState.physiology.basic_needs.thirst.level = Math.min(100, newPlayerState.physiology.basic_needs.thirst.level + itemInInventory.physiologicalEffects.thirst);
            }
            
            // Apply stat effects
            if(itemInInventory.effects) {
                newPlayerState.stats = applyStatChanges(newPlayerState.stats, itemInInventory.effects);
            }

            const consumptionMessage = `Vous avez consommé: ${removedItemName}.`;
            notifications.push({ type: 'item_removed', title: 'Objet Consommé', description: consumptionMessage });
            eventsForAI.push(`Le joueur a consommé ${removedItemName}.`);
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
export function prepareAIInput(gameState: GameState, playerChoice: string, deterministicEvents: string[] = []): any | null {
  if (!gameState.player) {
    console.error("Cannot prepare AI input: Player state is missing.");
    return null;
  }

  const { player } = gameState;

  // We are creating a subset of the player object that matches PlayerInputSchema
  const playerInputForAI = {
      name: player.name,
      gender: player.gender,
      age: player.age,
      origin: player.origin,
      era: player.era || 'Époque Contemporaine',
      background: player.background,
      stats: player.stats,
      skills: player.skills,
      physiology: player.physiology,
      traitsMentalStates: player.traitsMentalStates,
      progression: player.progression,
      alignment: player.alignment,
      inventory: player.inventory.map(item => ({
        instanceId: item.instanceId,
        id: item.id,
        name: item.name,
        description: item.description,
        type: item.type,
        quantity: item.quantity,
        condition: item.condition,
        economics: item.economics,
        memory: {
          acquisitionStory: item.memory.acquisitionStory
        },
      })),
      money: player.money,
      currentLocation: player.currentLocation,
      toneSettings: player.toneSettings,
  };

  return {
    player: playerInputForAI,
    playerChoice: playerChoice,
    currentScenario: gameState.currentScenario?.scenarioText || '',
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
