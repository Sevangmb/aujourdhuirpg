
import type { GameState, Scenario, Player, ToneSettings, Position, JournalEntry, GameNotification, PlayerStats, Progression, Quest, PNJ, MajorDecision, Clue, GameDocument, QuestUpdate, IntelligentItem, Transaction, HistoricalContact, StoryChoice, AdvancedSkillSystem, QuestObjective, ItemUsageRecord, DynamicItemCreationPayload, Enemy, GameEvent } from './types';
import { calculateXpToNextLevel, applyStatChanges, addItemToInventory, removeItemFromInventory, addXP, applySkillGains, updateItemContextualProperties, createNewInstanceFromMaster, processItemUpdates as processItemUpdatesHelper } from './player-state-helpers';
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
// This reducer now directly applies the effects of GameEvents calculated by the game logic.
export type GameAction =
  | { type: 'APPLY_GAME_EVENTS', payload: GameEvent[] }
  | { type: 'SET_CURRENT_SCENARIO'; payload: Scenario }
  | { type: 'SET_NEARBY_POIS'; payload: Position[] | null }
  | { type: 'ADD_GAME_TIME'; payload: number }
  | { type: 'ADD_JOURNAL_ENTRY'; payload: Omit<JournalEntry, 'id' | 'timestamp'> }
  | { type: 'UPDATE_PLAYER_DATA', payload: Player };


export function gameReducer(state: GameState, action: GameAction): GameState {
  if (!state.player) return state;
  const now = state.gameTimeInMinutes || 0;
  const nowISO = new Date().toISOString(); // For dating new entries

  switch (action.type) {
    case 'APPLY_GAME_EVENTS': {
        // This is the new core of the reducer. It processes the event list from the logic layer.
        return action.payload.reduce((currentState, event) => {
            const player = currentState.player;
            if (!player) return currentState;

            switch (event.type) {
                case 'PLAYER_STAT_CHANGE':
                    return { ...currentState, player: { ...player, stats: { ...player.stats, [event.stat]: event.finalValue } } };
                
                case 'PLAYER_PHYSIOLOGY_CHANGE':
                    return { ...currentState, player: { ...player, physiology: { ...player.physiology, basic_needs: { ...player.physiology.basic_needs, [event.stat]: { ...player.physiology.basic_needs[event.stat], level: event.finalValue } } } } };
                
                case 'XP_GAINED': {
                    const {newProgression} = addXP(player.progression, event.amount);
                    return { ...currentState, player: { ...player, progression: newProgression } };
                }
                
                case 'ITEM_ADDED':
                    return { ...currentState, player: { ...player, inventory: addItemToInventory(player.inventory, event.itemId, event.quantity, player.currentLocation) } };
                
                case 'ITEM_REMOVED': {
                    const { updatedInventory } = removeItemFromInventory(player.inventory, event.itemId, event.quantity);
                    return { ...currentState, player: { ...player, inventory: updatedInventory } };
                }
                
                case 'ITEM_USED': {
                    const updatedInventory = player.inventory.map(item => {
                        if (item.instanceId === event.instanceId) {
                            return { ...item, memory: { ...item.memory, usageHistory: [...item.memory.usageHistory, { timestamp: nowISO, event: event.description, locationName: player.currentLocation.name }] } };
                        }
                        return item;
                    });
                    return { ...currentState, player: { ...player, inventory: updatedInventory } };
                }

                case 'ITEM_XP_GAINED': {
                  const { updatedInventory } = processItemUpdatesHelper(player.inventory, [{ instanceId: event.instanceId, xpGained: event.xp }]);
                  return { ...currentState, player: { ...player, inventory: updatedInventory } };
                }
        
                case 'ITEM_EVOLVED': {
                  const itemIndex = player.inventory.findIndex(i => i.instanceId === event.instanceId);
                  if (itemIndex === -1) return currentState;
                  const evolvedMasterItem = getMasterItemById(event.newItemId);
                  if (!evolvedMasterItem) return currentState;
                  
                  const newInventory = [...player.inventory];
                  const originalItem = player.inventory[itemIndex];
                  const evolvedItem: IntelligentItem = {
                      ...evolvedMasterItem,
                      instanceId: originalItem.instanceId,
                      quantity: 1,
                      condition: { durability: 100 },
                      itemLevel: 1,
                      itemXp: 0,
                      xpToNextItemLevel: evolvedMasterItem.xpToNextItemLevel,
                      memory: { ...originalItem.memory, evolution_history: [...(originalItem.memory.evolution_history || []), { fromItemId: originalItem.id, toItemId: evolvedMasterItem.id, atLevel: originalItem.itemLevel, timestamp: nowISO }] },
                      contextual_properties: { local_value: evolvedMasterItem.economics.base_value, legal_status: 'legal', social_perception: 'normal', utility_rating: 50 },
                  };
                  newInventory[itemIndex] = evolvedItem;
                  return { ...currentState, player: { ...player, inventory: newInventory } };
                }

                case 'PLAYER_TRAVELS': {
                    const newLocation: Position = event.destination;
                    const newInventory = player.inventory.map(item => updateItemContextualProperties(item, newLocation));
                    return { ...currentState, player: { ...player, currentLocation: newLocation, inventory: newInventory }, gameTimeInMinutes: currentState.gameTimeInMinutes + event.duration };
                }
                
                case 'MONEY_CHANGED':
                    return { ...currentState, player: { ...player, money: event.finalBalance, transactionLog: [...(player.transactionLog || []), { id: uuidv4(), amount: event.amount, description: event.description, timestamp: nowISO, type: event.amount > 0 ? 'income' : 'expense', category: 'other_expense', locationName: player.currentLocation.name }] } };

                case 'QUEST_ADDED': {
                  const newQuest: Quest = { ...event.quest, id: uuidv4(), dateAdded: nowISO, status: 'active' };
                  return { ...currentState, player: { ...player, questLog: [...(player.questLog || []), newQuest] } };
                }
        
                case 'QUEST_STATUS_CHANGED': {
                    const newQuestLog = player.questLog.map(q => 
                        q.id === event.questId ? { ...q, status: event.newStatus, dateCompleted: ['completed', 'failed'].includes(event.newStatus) ? nowISO : q.dateCompleted } : q
                    );
                    return { ...currentState, player: { ...player, questLog: newQuestLog } };
                }
        
                case 'QUEST_OBJECTIVE_CHANGED': {
                    const newQuestLog = player.questLog.map(q => {
                        if (q.id === event.questId) {
                            const newObjectives = q.objectives.map(o => 
                                o.id === event.objectiveId ? { ...o, isCompleted: event.completed } : o
                            );
                            return { ...q, objectives: newObjectives };
                        }
                        return q;
                    });
                    return { ...currentState, player: { ...player, questLog: newQuestLog } };
                }
        
                case 'PNJ_ENCOUNTERED': {
                    const newPNJ: PNJ = { ...event.pnj, id: uuidv4(), firstEncountered: player.currentLocation.name, lastSeen: nowISO };
                    return { ...currentState, player: { ...player, encounteredPNJs: [...(player.encounteredPNJs || []), newPNJ] } };
                }
        
                case 'PNJ_RELATION_CHANGED': {
                    const newPNJs = player.encounteredPNJs.map(p =>
                        p.id === event.pnjId ? { ...p, dispositionScore: event.finalDisposition, lastSeen: nowISO } : p
                    );
                    return { ...currentState, player: { ...player, encounteredPNJs: newPNJs } };
                }

                case 'COMBAT_STARTED':
                    return { ...currentState, currentEnemy: event.enemy };
                
                case 'COMBAT_ENDED':
                    return { ...currentState, currentEnemy: null };
                
                case 'COMBAT_ACTION':
                    if (event.target === 'player' && player) {
                        const newPlayer = { ...player, stats: { ...player.stats, Sante: event.newHealth } };
                        return { ...currentState, player: newPlayer };
                    } else if (event.target === 'enemy' && currentState.currentEnemy) {
                        const newEnemy = { ...currentState.currentEnemy, health: event.newHealth };
                        return { ...currentState, currentEnemy: newEnemy };
                    }
                    return currentState;

                // Events that don't change state but are for the AI to narrate
                case 'SKILL_CHECK_RESULT':
                case 'TEXT_EVENT':
                case 'TRAVEL_EVENT':
                    return currentState; // No state change needed

                default:
                    return currentState;
            }
        }, state);
    }
    case 'ADD_JOURNAL_ENTRY':
      return {
        ...state,
        journal: [...(state.journal || []), { ...action.payload, id: `${now}-${Math.random()}`, timestamp: now }],
      };
    case 'SET_NEARBY_POIS':
      return { ...state, nearbyPois: action.payload };
    case 'SET_CURRENT_SCENARIO':
      return { ...state, currentScenario: action.payload };
    case 'ADD_GAME_TIME':
      return { ...state, gameTimeInMinutes: (state.gameTimeInMinutes || 0) + action.payload };
    case 'UPDATE_PLAYER_DATA':
        return { ...state, player: action.payload };
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
  
  if (skillPath.includes('observation') || skillPath.includes('navigation')) {
    if (isBadWeather) {
      modifier = -10;
      reason = `Le mauvais temps (${weatherData.description}) pénalise cette action.`;
    }
  }

  if (skillPath.includes('stealth')) {
    if (isBadWeather) {
      modifier = 10;
      reason = `Le mauvais temps (${weatherData.description}) favorise cette action.`;
    }
  }

  return { modifier, reason };
}

/**
 * Processes a player's action and returns a list of resulting game events.
 * This is the new core of the game's logic engine.
 */
export async function processPlayerAction(
  player: Player,
  currentEnemy: Enemy | null,
  choice: StoryChoice,
  weatherData: WeatherData | null
): Promise<{
    playerBeforeAction: Player;
    events: GameEvent[];
}> {
  const playerState = JSON.parse(JSON.stringify(player));
  const events: GameEvent[] = [];

  // --- PHYSIOLOGY & ENERGY ---
  const timeDecayFactor = 0.05;
  const energyDecayFactor = 0.1;
  let hungerDecay = (choice.timeCost * timeDecayFactor) + (choice.energyCost * energyDecayFactor);
  let thirstDecay = (choice.timeCost * timeDecayFactor) + (choice.energyCost * energyDecayFactor * 1.5);
  
  const newEnergy = playerState.stats.Energie - choice.energyCost;
  events.push({ type: 'PLAYER_STAT_CHANGE', stat: 'Energie', change: -choice.energyCost, finalValue: newEnergy });

  const newHunger = playerState.physiology.basic_needs.hunger.level - hungerDecay;
  events.push({ type: 'PLAYER_PHYSIOLOGY_CHANGE', stat: 'hunger', change: -hungerDecay, finalValue: newHunger });
  
  const newThirst = playerState.physiology.basic_needs.thirst.level - thirstDecay;
  events.push({ type: 'PLAYER_PHYSIOLOGY_CHANGE', stat: 'thirst', change: -thirstDecay, finalValue: newThirst });


  if (choice.physiologicalEffects) {
      if (choice.physiologicalEffects.hunger) {
        const finalHunger = newHunger + choice.physiologicalEffects.hunger;
        events.push({ type: 'PLAYER_PHYSIOLOGY_CHANGE', stat: 'hunger', change: choice.physiologicalEffects.hunger, finalValue: finalHunger });
      }
      if (choice.physiologicalEffects.thirst) {
        const finalThirst = newThirst + choice.physiologicalEffects.thirst;
        events.push({ type: 'PLAYER_PHYSIOLOGY_CHANGE', stat: 'thirst', change: choice.physiologicalEffects.thirst, finalValue: finalThirst });
      }
  }
  
  if (choice.statEffects) {
    for (const [stat, value] of Object.entries(choice.statEffects)) {
        const finalValue = playerState.stats[stat] + value;
        events.push({ type: 'PLAYER_STAT_CHANGE', stat: stat as keyof PlayerStats, change: value, finalValue: finalValue });
    }
  }
  
  // --- SKILL CHECK ---
  if (choice.skillCheck) {
    const { skill, difficulty } = choice.skillCheck;
    const { modifier: weatherModifier } = getWeatherModifier(skill, weatherData);
    const skillCheckResult = performSkillCheck(playerState.skills, playerState.stats, skill, difficulty, playerState.inventory, weatherModifier, playerState.physiology);

    events.push({
        type: 'SKILL_CHECK_RESULT',
        skill: skill,
        success: skillCheckResult.success,
        degree: skillCheckResult.degreeOfSuccess,
        roll: skillCheckResult.rollValue,
        total: skillCheckResult.totalAchieved,
        difficulty: skillCheckResult.difficultyTarget,
    });

    if (skillCheckResult.success && choice.skillGains) {
      // Skill gain itself is handled by the XP event for now.
      // This could be a separate event if we want more granular control.
      const { newProgression } = addXP(playerState.progression, 5); // Base XP for successful check
      playerState.progression = newProgression;
      events.push({ type: 'XP_GAINED', amount: 5 });
    }
  }

  // This is where you would add logic for combat, item discovery, etc.
  // Each piece of logic would push new events to the `events` array.

  return { playerBeforeAction: player, events };
}


// --- Event Triggers ---
export function checkForLocationBasedEvents(newLocation: Position, gameState: GameState): GameAction[] {
  const triggeredActions: GameAction[] = [];
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
      zone: { name: poi.subtype || poi.type || "Zone" },
      tags: poi.tags,
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
export function prepareAIInput(gameState: GameState, playerChoice: StoryChoice, gameEvents: GameEvent[]): any | null {
  if (!gameState.player) {
    console.error("Cannot prepare AI input: Player state is missing.");
    return null;
  }

  const { player } = gameState;

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
        memory: { acquisitionStory: item.memory.acquisitionStory },
      })),
      money: player.money,
      currentLocation: {
        latitude: player.currentLocation.latitude,
        longitude: player.currentLocation.longitude,
        name: player.currentLocation.name,
        type: player.currentLocation.zone?.name,
        description: player.currentLocation.summary,
        tags: player.currentLocation.tags,
      },
      toneSettings: player.toneSettings,
  };

  return {
    player: playerInputForAI,
    playerChoiceText: playerChoice.text,
    previousScenarioText: gameState.currentScenario?.scenarioText || '',
    gameEvents: JSON.stringify(gameEvents, null, 2),
  };
}
