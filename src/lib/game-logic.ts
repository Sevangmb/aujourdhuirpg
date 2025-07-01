
import type { GameState, Scenario, Player, ToneSettings, Position, JournalEntry, GameNotification, PlayerStats, Progression, Quest, PNJ, MajorDecision, Clue, GameDocument, QuestUpdate, IntelligentItem, Transaction, StoryChoice, AdvancedSkillSystem, QuestObjective, ItemUsageRecord, DynamicItemCreationPayload, GameEvent, EnrichedObject } from './types';
import type { HistoricalContact } from '@/modules/historical/types';
import type { Enemy } from '@/modules/combat/types';
import { addItemToInventory, removeItemFromInventory, updateItemContextualProperties } from '@/modules/inventory/logic';
import { fetchNearbyPoisFromOSM } from '@/services/osm-service';
import { parsePlayerAction, type ParsedAction } from './action-parser';
import { getMasterItemById } from '@/data/items';
import { performSkillCheck } from './skill-check';
import { montmartreInitialChoices } from '@/data/choices';
import type { WeatherData } from '@/app/actions/get-current-weather';
import { v4 as uuidv4 } from 'uuid';
import type { CascadeResult } from '@/core/cascade/types';
import type { GenerateScenarioOutput } from '@/ai/flows/generate-scenario';
import { addPlayerXp, getSkillXp, applySkillXp } from '@/modules/player/logic';
import { handleCombatAction, handleCombatEnded, handleCombatStarted } from '@/modules/combat/logic';
import { handleAddQuest, handleQuestStatusChange, handleQuestObjectiveChange } from '@/modules/quests/logic';
import { handleMoneyChange } from '@/modules/economy/logic';
import { handleAddHistoricalContact } from '@/modules/historical/logic';

// --- Initial Scenario ---
export function getInitialScenario(player: Player): Scenario {
  return {
    scenarioText: `<p>Bienvenue, ${player.name}. L'aventure commence... Que faites-vous ?</p>`,
    choices: montmartreInitialChoices,
  };
}

// --- Game Actions & Reducer ---
// This reducer now directly applies the effects of GameEvents calculated by the logic layer.
export type GameAction =
  | { type: 'APPLY_GAME_EVENTS', payload: GameEvent[] }
  | { type: 'SET_CURRENT_SCENARIO'; payload: Scenario }
  | { type: 'SET_NEARBY_POIS'; payload: Position[] | null }
  | { type: 'UPDATE_PLAYER_DATA', payload: Player }
  | { type: 'UPDATE_INVENTORY_ITEM', payload: { instanceId: string; enrichedObject: EnrichedObject } };


export function gameReducer(state: GameState, action: GameAction): GameState {
  if (!state.player) return state;

  switch (action.type) {
    case 'UPDATE_INVENTORY_ITEM': {
      if (!state.player) return state;
      const newInventory = state.player.inventory.map(item =>
        item.instanceId === action.payload.instanceId ? action.payload.enrichedObject : item
      );
      return { ...state, player: { ...state.player, inventory: newInventory } };
    }
    case 'APPLY_GAME_EVENTS': {
        // This is the new core of the reducer. It processes the event list from the logic layer.
        let nextState = state;
        for (const event of action.payload) {
            let player = nextState.player;
            if (!player) continue;

            switch (event.type) {
                case 'PLAYER_STAT_CHANGE': {
                    const statToChange = player.stats[event.stat as keyof PlayerStats];
                    if (statToChange) {
                        const maxValue = statToChange.max !== undefined ? statToChange.max : event.finalValue;
                        const clampedValue = Math.max(0, Math.min(event.finalValue, maxValue));
                        const newStat = { ...statToChange, value: clampedValue };
                        const newStats = { ...player.stats, [event.stat]: newStat };
                        player = { ...player, stats: newStats };
                    }
                    break;
                }
                 case 'PLAYER_PHYSIOLOGY_CHANGE':
                    player = { ...player, physiology: { ...player.physiology, basic_needs: { ...player.physiology.basic_needs, [event.stat]: { ...player.physiology.basic_needs[event.stat], level: event.finalValue } } } };
                    break;
                case 'XP_GAINED': {
                    const { newProgression, events: xpEvents } = addPlayerXp(player.progression, event.amount);
                    player = { ...player, progression: newProgression };
                    if (xpEvents.length > 0) {
                        nextState = gameReducer(nextState, { type: 'APPLY_GAME_EVENTS', payload: xpEvents });
                        player = nextState.player!;
                    }
                    break;
                }
                 case 'SKILL_XP_AWARDED': {
                    const { updatedSkills, leveledUp, newLevel } = applySkillXp(player.skills, event.skill, event.amount);
                    player = { ...player, skills: updatedSkills };
                    if (leveledUp && newLevel) {
                        const skillName = event.skill.split('.')[1] || event.skill;
                        const journalEntry: GameEvent = { type: 'JOURNAL_ENTRY_ADDED', payload: { type: 'misc', text: `Votre compétence ${skillName} a atteint le niveau ${newLevel} !` }};
                        nextState = gameReducer({ ...nextState, player }, { type: 'APPLY_GAME_EVENTS', payload: [journalEntry] });
                        player = nextState.player!;
                    }
                    break;
                }
                case 'PLAYER_LEVELED_UP': {
                    const journalEntry: GameEvent = { type: 'JOURNAL_ENTRY_ADDED', payload: { type: 'misc', text: `Félicitations ! Vous avez atteint le niveau ${event.newLevel} !` }};
                    nextState = gameReducer(nextState, { type: 'APPLY_GAME_EVENTS', payload: [journalEntry] });
                    player = nextState.player!;
                    break;
                }
                case 'ITEM_ADDED':
                    player = { ...player, inventory: addItemToInventory(player.inventory, event.itemId, event.quantity, player.currentLocation) };
                    break;
                case 'DYNAMIC_ITEM_ADDED': {
                    const { baseItemId, overrides } = event.payload;
                    player = { ...player, inventory: addItemToInventory(player.inventory, baseItemId, 1, player.currentLocation, overrides) };
                    break;
                }
                case 'ITEM_REMOVED': {
                    const { updatedInventory } = removeItemFromInventory(player.inventory, event.itemId, event.quantity);
                    player = { ...player, inventory: updatedInventory };
                    break;
                }
                case 'ITEM_USED': {
                    const nowISO = new Date().toISOString();
                    const updatedInventory = player.inventory.map(item => {
                        if (item.instanceId === event.instanceId) {
                            return { ...item, memory: { ...item.memory, usageHistory: [...item.memory.usageHistory, { timestamp: nowISO, event: event.description, locationName: player.currentLocation.name }] } };
                        }
                        return item;
                    });
                    player = { ...player, inventory: updatedInventory };
                    break;
                }
                case 'ITEM_XP_GAINED': {
                  const newInventory = player.inventory.map(item => {
                    if (item.instanceId === event.instanceId) {
                      return { ...item, itemXp: item.itemXp + event.xp };
                    }
                    return item;
                  });
                  player = { ...player, inventory: newInventory };
                  break;
                }
                case 'ITEM_LEVELED_UP': {
                  const newInventory = player.inventory.map(item => {
                    if (item.instanceId === event.instanceId) {
                      const updatedItem = { ...item, itemLevel: event.newLevel, itemXp: event.newXp };
                      if (event.newXpToNextLevel) {
                        updatedItem.xpToNextItemLevel = event.newXpToNextLevel;
                      }
                      return updatedItem;
                    }
                    return item;
                  });
                  player = { ...player, inventory: newInventory };
                  break;
                }
                case 'ITEM_EVOLVED': {
                  const itemIndex = player.inventory.findIndex(i => i.instanceId === event.instanceId);
                  if (itemIndex === -1) break;
                  const evolvedMasterItem = getMasterItemById(event.newItemId);
                  if (!evolvedMasterItem) break;
                  
                  const nowISO = new Date().toISOString();
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
                      memory: { 
                          ...originalItem.memory, 
                          evolution_history: [...(originalItem.memory.evolution_history || []), { fromItemId: originalItem.id, toItemId: evolvedMasterItem.id, atLevel: originalItem.itemLevel, timestamp: nowISO }] 
                      },
                      contextual_properties: { local_value: evolvedMasterItem.economics.base_value, legal_status: 'legal', social_perception: 'normal', utility_rating: 50 },
                  };
                  newInventory[itemIndex] = evolvedItem;
                  player = { ...player, inventory: newInventory };
                  break;
                }
                case 'PLAYER_TRAVELS': {
                    const newLocation: Position = event.destination;
                    const newInventory = player.inventory.map(item => updateItemContextualProperties(item, newLocation));
                    nextState = { ...nextState, gameTimeInMinutes: nextState.gameTimeInMinutes + event.duration };
                    player = { ...player, currentLocation: newLocation, inventory: newInventory };
                    break;
                }
                case 'MONEY_CHANGED':
                    nextState = handleMoneyChange(nextState, event.amount, event.description);
                    player = nextState.player!;
                    break;
                case 'QUEST_ADDED':
                    nextState = handleAddQuest(nextState, event.quest);
                    player = nextState.player!;
                    break;
                case 'QUEST_STATUS_CHANGED':
                    nextState = handleQuestStatusChange(nextState, event.questId, event.newStatus);
                    player = nextState.player!;
                    break;
                case 'QUEST_OBJECTIVE_CHANGED':
                    nextState = handleQuestObjectiveChange(nextState, event.questId, event.objectiveId, event.completed);
                    player = nextState.player!;
                    break;
                case 'PNJ_ENCOUNTERED': {
                    const nowISO = new Date().toISOString();
                    const newPNJ: PNJ = { ...event.pnj, id: uuidv4(), firstEncountered: player.currentLocation.name, lastSeen: nowISO };
                    player = { ...player, encounteredPNJs: [...(player.encounteredPNJs || []), newPNJ] };
                    break;
                }
                case 'HISTORICAL_CONTACT_ADDED':
                    nextState = handleAddHistoricalContact(nextState, event.payload as HistoricalContact);
                    player = nextState.player!;
                    break;
                case 'PNJ_RELATION_CHANGED': {
                    const nowISO = new Date().toISOString();
                    const newPNJs = player.encounteredPNJs.map(p =>
                        p.id === event.pnjId ? { ...p, dispositionScore: event.finalDisposition, lastSeen: nowISO } : p
                    );
                    player = { ...player, encounteredPNJs: newPNJs };
                    break;
                }
                case 'COMBAT_STARTED':
                    nextState = handleCombatStarted(nextState, event.enemy);
                    player = nextState.player!;
                    break;
                case 'COMBAT_ENDED':
                    nextState = handleCombatEnded(nextState);
                    player = nextState.player!;
                    break;
                case 'COMBAT_ACTION':
                    nextState = handleCombatAction(nextState, event.target, event.newHealth);
                    player = nextState.player!;
                    break;
                case 'GAME_TIME_PROGRESSED':
                    nextState = { ...nextState, gameTimeInMinutes: nextState.gameTimeInMinutes + event.minutes };
                    player = nextState.player!;
                    break;
                case 'JOURNAL_ENTRY_ADDED':
                    nextState = { ...nextState, journal: [...(nextState.journal || []), { ...event.payload, id: uuidv4(), timestamp: nextState.gameTimeInMinutes, location: player.currentLocation }] };
                    player = nextState.player!;
                    break;
                case 'SCENARIO_TEXT_SET':
                    nextState = { ...nextState, currentScenario: { ...nextState.currentScenario, scenarioText: event.text, choices: [] } };
                    player = nextState.player!;
                    break;
                // Events that don't change state but are for the AI to narrate
                case 'SKILL_CHECK_RESULT':
                case 'TEXT_EVENT':
                case 'TRAVEL_EVENT':
                case 'SKILL_LEVELED_UP':
                    break;
                default:
                    break;
            }
            nextState = { ...nextState, player };
        }
        return nextState;
    }
    case 'SET_NEARBY_POIS':
      return { ...state, nearbyPois: action.payload };
    case 'SET_CURRENT_SCENARIO':
      return { ...state, currentScenario: action.payload };
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
    events: GameEvent[];
}> {
  const events: GameEvent[] = [];
  
  const tempPlayerState = JSON.parse(JSON.stringify(player)) as Player;

  // --- LOG ACTION & TIME ---
  events.push({ type: 'GAME_TIME_PROGRESSED', minutes: choice.timeCost });
  events.push({ type: 'JOURNAL_ENTRY_ADDED', payload: { type: 'player_action', text: choice.text } });


  // --- PHYSIOLOGY & ENERGY (Rebalanced) ---
  const hungerDecay = (choice.timeCost * 0.05) + (choice.energyCost * 0.1);
  const thirstDecay = (choice.timeCost * 0.08) + (choice.energyCost * 0.08);
  
  const newEnergy = tempPlayerState.stats.Energie.value - choice.energyCost;
  events.push({ type: 'PLAYER_STAT_CHANGE', stat: 'Energie', change: -choice.energyCost, finalValue: newEnergy });

  const newHunger = tempPlayerState.physiology.basic_needs.hunger.level - hungerDecay;
  events.push({ type: 'PLAYER_PHYSIOLOGY_CHANGE', stat: 'hunger', change: -hungerDecay, finalValue: newHunger });
  
  const newThirst = tempPlayerState.physiology.basic_needs.thirst.level - thirstDecay;
  events.push({ type: 'PLAYER_PHYSIOLOGY_CHANGE', stat: 'thirst', change: -thirstDecay, finalValue: newThirst });


  if (choice.physiologicalEffects) {
      if (choice.physiologicalEffects.hunger) {
        const finalValue = newHunger + choice.physiologicalEffects.hunger;
        events.push({ type: 'PLAYER_PHYSIOLOGY_CHANGE', stat: 'hunger', change: choice.physiologicalEffects.hunger, finalValue: finalValue });
      }
      if (choice.physiologicalEffects.thirst) {
        const finalValue = newThirst + choice.physiologicalEffects.thirst;
        events.push({ type: 'PLAYER_PHYSIOLOGY_CHANGE', stat: 'thirst', change: choice.physiologicalEffects.thirst, finalValue: finalValue });
      }
  }
  
  if (choice.statEffects) {
    for (const [stat, value] of Object.entries(choice.statEffects)) {
        const statKey = stat as keyof PlayerStats;
        const finalValue = tempPlayerState.stats[statKey].value + value;
        events.push({ type: 'PLAYER_STAT_CHANGE', stat: statKey, change: value, finalValue: finalValue });
    }
  }
  
  // --- SKILL CHECK & CONSEQUENCES (XP, Item Evolution) ---
  if (choice.skillCheck) {
    const { skill, difficulty } = choice.skillCheck;
    const { modifier: weatherModifier } = getWeatherModifier(skill, weatherData);
    const skillCheckResult = performSkillCheck(tempPlayerState.skills, tempPlayerState.stats, skill, difficulty, tempPlayerState.inventory, weatherModifier, tempPlayerState.physiology);

    events.push({
        type: 'SKILL_CHECK_RESULT',
        skill: skill,
        success: skillCheckResult.success,
        degree: skillCheckResult.degreeOfSuccess,
        roll: skillCheckResult.rollValue,
        total: skillCheckResult.totalAchieved,
        difficulty: skillCheckResult.difficultyTarget,
    });
    
    const skillXpGained = getSkillXp(skillCheckResult.difficultyTarget, skillCheckResult.success);
    if (skillXpGained > 0) {
      events.push({ type: 'SKILL_XP_AWARDED', skill: skill, amount: skillXpGained });
    }

    if (skillCheckResult.success) {
      // Grant Player XP
      let totalPlayerXPGain = 10; // Base XP for succeeding at a check
      
      // Grant Item XP
      for (const itemContribution of skillCheckResult.itemContributions) {
        const item = tempPlayerState.inventory.find((i: IntelligentItem) => i.name === itemContribution.name);
        if (item && item.xpToNextItemLevel > 0) {
          events.push({ type: 'ITEM_XP_GAINED', instanceId: item.instanceId, itemName: item.name, xp: 10 });
        }
      }
      
      // Grant bonus player XP from choice
      if (choice.skillGains) {
        for (const [skillPath, amount] of Object.entries(choice.skillGains)) {
          events.push({ type: 'SKILL_XP_AWARDED', skill: skillPath, amount: amount });
        }
      }

      events.push({ type: 'XP_GAINED', amount: totalPlayerXPGain });
    }
  }
  
  return { events };
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
export function prepareAIInput(gameState: GameState, playerChoice: StoryChoice | { text: string }, gameEvents?: GameEvent[], cascadeResult?: CascadeResult | null): any | null {
  if (!gameState.player) {
    console.error("Cannot prepare AI input: Player state is missing.");
    return null;
  }

  const { player } = gameState;

  // Flatten stats for AI
  const flatStats = Object.fromEntries(
    Object.entries(player.stats).map(([key, statObj]) => [key, statObj.value])
  );
  
  // Flatten skills for AI
  const flatSkills = Object.fromEntries(
    Object.entries(player.skills).flatMap(([category, skills]) => 
      Object.entries(skills).map(([skillName, skillDetail]) => [`${category}.${skillName}`, (skillDetail as any).level])
    )
  );


  const playerInputForAI = {
      name: player.name,
      gender: player.gender,
      age: player.age,
      origin: player.origin,
      era: player.era || 'Époque Contemporaine',
      background: player.background,
      stats: flatStats,
      skills: flatSkills, // Sending flattened skills
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
  
  const cascadeData = cascadeResult ? {
    executionChain: cascadeResult.executionChain,
    results: Array.from(cascadeResult.results.entries()).reduce((acc, [key, value]) => {
      (acc as any)[key] = {
        data: value.data,
        enrichmentLevel: value.enrichmentLevel,
        executionTime: value.executionTime,
      };
      return acc;
    }, {}),
  } : null;

  return {
    player: playerInputForAI,
    playerChoiceText: playerChoice.text,
    previousScenarioText: gameState.currentScenario?.scenarioText || '',
    gameEvents: JSON.stringify(gameEvents || [], null, 2),
    cascadeResult: cascadeData ? JSON.stringify(cascadeData, null, 2) : "{}",
  };
}

/**
 * NEW: Converts AI-generated proposals into a list of concrete GameEvents.
 * This acts as a security and validation layer between the AI and the game engine.
 * @param aiOutput The output from the generateScenario AI flow.
 * @returns An array of GameEvent objects.
 */
export function convertAIOutputToEvents(aiOutput: GenerateScenarioOutput): GameEvent[] {
  const events: GameEvent[] = [];

  if (aiOutput.newQuests) {
    aiOutput.newQuests.forEach(questData => {
      const questForEvent: Omit<Quest, 'id' | 'dateAdded' | 'status'> = {
        ...questData,
        objectives: questData.objectives.map(desc => ({ id: '', description: desc, isCompleted: false }))
      };
      events.push({ type: 'QUEST_ADDED', quest: questForEvent });
    });
  }

  if (aiOutput.questUpdates) {
    aiOutput.questUpdates.forEach(update => {
      if (update.newStatus) {
        events.push({ type: 'QUEST_STATUS_CHANGED', questId: update.questId, newStatus: update.newStatus });
      }
      if (update.updatedObjectives) {
        update.updatedObjectives.forEach(objUpdate => {
          events.push({ type: 'QUEST_OBJECTIVE_CHANGED', questId: update.questId, objectiveId: objUpdate.objectiveId, completed: objUpdate.isCompleted });
        });
      }
    });
  }
  
  if (aiOutput.newPNJs) {
    aiOutput.newPNJs.forEach(pnjData => {
       const pnjForEvent: Omit<PNJ, 'id' | 'firstEncountered' | 'lastSeen'> = {
            ...pnjData,
            interactionHistory: [],
       };
       events.push({ type: 'PNJ_ENCOUNTERED', pnj: pnjForEvent });
    });
  }

  if (aiOutput.newItems) {
    aiOutput.newItems.forEach(itemPayload => {
        const masterItem = getMasterItemById(itemPayload.baseItemId);
        if (masterItem) {
            events.push({ 
                type: 'DYNAMIC_ITEM_ADDED', 
                payload: itemPayload 
            });
        }
    });
  }

  if (aiOutput.newTransactions) {
    aiOutput.newTransactions.forEach(txData => {
        // The reducer will calculate the finalBalance. We just provide the change.
        events.push({ type: 'MONEY_CHANGED', amount: txData.amount, description: txData.description, finalBalance: 0 /* Placeholder */ });
    });
  }

  return events;
}
