

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
                case 'PLAYER_TRAVELS': {
                    const newInventory = player.inventory.map(item => updateItemContextualProperties(item, { name: event.to, latitude: 0, longitude: 0 })); // Simplified location for update
                    const newLocation: Position = { name: event.to, latitude: 0, longitude: 0, ...player.currentLocation }; // Needs proper update
                    // This event needs more logic to actually update the position object correctly.
                    // For now, we just update the name.
                    newLocation.name = event.to;
                    return { ...currentState, player: { ...player, currentLocation: newLocation, inventory: newInventory }, gameTimeInMinutes: currentState.gameTimeInMinutes + event.duration };
                }
                case 'MONEY_CHANGED':
                    return { ...currentState, player: { ...player, money: event.finalBalance, transactionLog: [...(player.transactionLog || []), { id: uuidv4(), amount: event.amount, description: event.description, timestamp: nowISO, type: event.amount > 0 ? 'income' : 'expense', category: 'other_expense', locationName: player.currentLocation.name }] } };
                // Add cases for all other GameEvent types here...
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
  
  playerState.stats.Energie -= choice.energyCost;
  events.push({ type: 'PLAYER_STAT_CHANGE', stat: 'Energie', change: -choice.energyCost, finalValue: playerState.stats.Energie });

  playerState.physiology.basic_needs.hunger.level -= hungerDecay;
  events.push({ type: 'PLAYER_PHYSIOLOGY_CHANGE', stat: 'hunger', change: -hungerDecay, finalValue: playerState.physiology.basic_needs.hunger.level });
  
  playerState.physiology.basic_needs.thirst.level -= thirstDecay;
  events.push({ type: 'PLAYER_PHYSIOLOGY_CHANGE', stat: 'thirst', change: -thirstDecay, finalValue: playerState.physiology.basic_needs.thirst.level });


  if (choice.physiologicalEffects) {
      if (choice.physiologicalEffects.hunger) {
        playerState.physiology.basic_needs.hunger.level += choice.physiologicalEffects.hunger;
        events.push({ type: 'PLAYER_PHYSIOLOGY_CHANGE', stat: 'hunger', change: choice.physiologicalEffects.hunger, finalValue: playerState.physiology.basic_needs.hunger.level });
      }
      if (choice.physiologicalEffects.thirst) {
        playerState.physiology.basic_needs.thirst.level += choice.physiologicalEffects.thirst;
        events.push({ type: 'PLAYER_PHYSIOLOGY_CHANGE', stat: 'thirst', change: choice.physiologicalEffects.thirst, finalValue: playerState.physiology.basic_needs.thirst.level });
      }
  }
  
  if (choice.statEffects) {
    for (const [stat, value] of Object.entries(choice.statEffects)) {
        playerState.stats[stat] += value;
        events.push({ type: 'PLAYER_STAT_CHANGE', stat: stat as keyof PlayerStats, change: value, finalValue: playerState.stats[stat] });
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
      const { updatedSkills } = applySkillGains(playerState.skills, choice.skillGains);
      playerState.skills = updatedSkills;
      for (const [skillPath, gain] of Object.entries(choice.skillGains)) {
        // We can add a specific event for skill gain if needed, or let the XP gain suffice
      }
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
