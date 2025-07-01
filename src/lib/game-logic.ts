
import type { GameState, Scenario, Player, ToneSettings, Position, JournalEntry, GameNotification, PlayerStats, Progression, Quest, PNJ, MajorDecision, Clue, GameDocument, QuestUpdate, IntelligentItem, Transaction, StoryChoice, AdvancedSkillSystem, QuestObjective, ItemUsageRecord, DynamicItemCreationPayload, GameEvent, EnrichedObject, MomentumSystem, EnhancedPOI, POIService, ActionType, ChoiceIconName, BookSearchResult, EnrichedRecipe } from './types';
import type { HistoricalContact } from '@/modules/historical/types';
import type { Enemy } from '@/modules/combat/types';
import { addItemToInventory, removeItemFromInventory, updateItemContextualProperties, grantXpToItem } from '@/modules/inventory/logic';
import { fetchNearbyPoisFromOSM } from '@/data-sources/establishments/overpass-api';
import { getMasterItemById } from '@/data/items';
import { performSkillCheck, calculateSuccessProbability } from './skill-check';
import type { WeatherData } from '@/app/actions/get-current-weather';
import { v4 as uuidv4 } from 'uuid';
import type { CascadeResult } from '@/core/cascade/types';
import type { GenerateScenarioOutput } from '@/ai/flows/generate-scenario';
import { addPlayerXp, getSkillXp, applySkillXp } from '@/modules/player/logic';
import { handleCombatAction, handleCombatEnded, handleCombatStarted } from '@/modules/combat/logic';
import { handleAddQuest, handleQuestStatusChange, handleQuestObjectiveChange } from '@/modules/quests/logic';
import { handleMoneyChange } from '@/modules/economy/logic';
import { handleAddHistoricalContact } from '@/modules/historical/logic';
import { getDistanceInKm } from '@/lib/utils/geo-utils';


// --- Game Actions & Reducer ---
// This reducer now directly applies the effects of GameEvents calculated by the logic layer.
export type GameAction =
  | { type: 'APPLY_GAME_EVENTS', payload: GameEvent[] }
  | { type: 'SET_CURRENT_SCENARIO'; payload: Scenario }
  | { type: 'SET_NEARBY_POIS'; payload: EnhancedPOI[] | null }
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
      let nextState = state;
      const eventQueue = [...action.payload]; // Initialize queue with incoming events

      while (eventQueue.length > 0) {
        const event = eventQueue.shift()!; // Process one event at a time
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
          case 'MOMENTUM_UPDATED':
            player = { ...player, momentum: event.newMomentum };
            break;
          case 'XP_GAINED': {
            const { newProgression, events: xpEvents } = addPlayerXp(player.progression, event.amount);
            player = { ...player, progression: newProgression };
            if (xpEvents.length > 0) {
                eventQueue.push(...xpEvents); // Add new events to the queue
            }
            break;
          }
          case 'SKILL_XP_AWARDED': {
            const { updatedSkills, leveledUp, newLevel } = applySkillXp(player.skills, event.skill, event.amount);
            player = { ...player, skills: updatedSkills };
            if (leveledUp && newLevel) {
                const skillName = event.skill.split('.')[1] || event.skill;
                const journalEntry: GameEvent = { type: 'JOURNAL_ENTRY_ADDED', payload: { type: 'misc', text: `Votre compétence ${skillName} a atteint le niveau ${newLevel} !` }};
                eventQueue.push(journalEntry); // Add new event to the queue
            }
            break;
          }
          case 'PLAYER_LEVELED_UP': {
            const journalEntry: GameEvent = { type: 'JOURNAL_ENTRY_ADDED', payload: { type: 'misc', text: `Félicitations ! Vous avez atteint le niveau ${event.newLevel} !` }};
            eventQueue.push(journalEntry); // Add new event to the queue
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
  const skill = skillPath.split('.').pop() || '';
  let modifier = 0;
  
  // Fog effects
  if (weatherDesc.includes('brouillard')) {
    if (skill === 'stealth') modifier += 15;
    if (skill === 'navigation') modifier -= 10;
    if (skill === 'observation') modifier -= 8;
  }
  // Rain effects
  else if (weatherDesc.includes('pluie') || weatherDesc.includes('averses')) {
    if (skill === 'stealth') modifier += 10;
    if (skill === 'observation') modifier -= 5;
    if (skill === 'persuasion' || skill === 'networking') modifier -= 3;
  }
  
  let reason = "";
  if (modifier > 0) {
    reason = `Le temps (${weatherData.description}) favorise cette action.`;
  } else if (modifier < 0) {
    reason = `Le temps (${weatherData.description}) pénalise cette action.`;
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
  weatherData: WeatherData | null,
  cascadeResult: CascadeResult | null,
): Promise<{
    events: GameEvent[];
}> {
  const events: GameEvent[] = [];
  
  const tempPlayerState = JSON.parse(JSON.stringify(player)) as Player;

  // Handle specific action types like using an item from inventory
  if (choice.id.startsWith('use_item_')) {
    const instanceId = choice.id.replace('use_item_', '');
    const itemToUse = player.inventory.find(i => i.instanceId === instanceId);
    if (itemToUse) {
        events.push({ type: 'ITEM_USED', instanceId: itemToUse.instanceId, itemName: itemToUse.name, description: `Utilisation de ${itemToUse.name}` });
        if (itemToUse.type === 'consumable') {
            events.push({ type: 'ITEM_REMOVED', itemId: itemToUse.id, itemName: itemToUse.name, quantity: 1 });
        }
    }
  }

  // Handle cooking action
  if (choice.id.startsWith('cook_')) {
    const recipeName = choice.id.replace('cook_', '').replace(/_/g, ' ');
    const cuisineData = cascadeResult?.results.get('cuisine')?.data;
    const recipe = cuisineData?.cookableRecipes?.find((r: EnrichedRecipe) => r.name === recipeName);

    if (recipe) {
        let totalHungerRestored = 0;
        // Consume ingredients
        for (const ingredient of recipe.ingredients) {
            events.push({ type: 'ITEM_REMOVED', itemId: ingredient.name, itemName: ingredient.name, quantity: 1 });
            totalHungerRestored += 5; // Base hunger restoration per ingredient
        }
        totalHungerRestored += 20; // Bonus for a full meal

        // Create the new meal item
        const mealPayload: DynamicItemCreationPayload = {
            baseItemId: 'generic_meal_01',
            overrides: {
                name: recipe.name,
                description: `Un plat délicieux de ${recipe.name}, préparé avec soin.`,
                physiologicalEffects: { hunger: Math.min(100, totalHungerRestored) }
            }
        };
        events.push({ type: 'DYNAMIC_ITEM_ADDED', payload: mealPayload });

        // Grant XP
        events.push({ type: 'SKILL_XP_AWARDED', skill: 'technical.crafting', amount: 15 });
        events.push({ type: 'JOURNAL_ENTRY_ADDED', payload: { type: 'player_action', text: `Vous avez cuisiné : ${recipe.name}.` } });
    }
  }


  // --- LOG ACTION & TIME ---
  events.push({ type: 'GAME_TIME_PROGRESSED', minutes: choice.timeCost || 0 });
  if (!choice.id.startsWith('cook_')) { // Avoid duplicate journal entries for cooking
    events.push({ type: 'JOURNAL_ENTRY_ADDED', payload: { type: 'player_action', text: choice.text } });
  }


  // --- PHYSIOLOGY, ENERGY & WEATHER EFFECTS (Rebalanced) ---
  const hungerDecay = ((choice.timeCost || 0) * 0.05) + ((choice.energyCost || 0) * 0.1);
  const thirstDecay = ((choice.timeCost || 0) * 0.08) + ((choice.energyCost || 0) * 0.08);

  let energyChangeFromWeather = 0;
  if (weatherData) {
      const weatherDesc = weatherData.description.toLowerCase();
      if (weatherDesc.includes('dégagé')) { // Sunny
          const finalHumeur = tempPlayerState.stats.Humeur.value + 5;
          events.push({ type: 'PLAYER_STAT_CHANGE', stat: 'Humeur', change: 5, finalValue: finalHumeur });
          energyChangeFromWeather = -3; // Endurance penalty
      }
  }
  
  const totalEnergyChange = -(choice.energyCost || 0) + energyChangeFromWeather;
  const newEnergy = tempPlayerState.stats.Energie.value + totalEnergyChange;
  events.push({ type: 'PLAYER_STAT_CHANGE', stat: 'Energie', change: totalEnergyChange, finalValue: newEnergy });

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
  
  // --- SKILL CHECK & CONSEQUENCES (XP, Item Evolution, Momentum) ---
  if (choice.skillCheck) {
    const { skill, difficulty } = choice.skillCheck;
    const { modifier: weatherModifier } = getWeatherModifier(skill, weatherData);
    const skillCheckResult = performSkillCheck(tempPlayerState.skills, tempPlayerState.stats, skill, difficulty, tempPlayerState.inventory, weatherModifier, tempPlayerState.physiology, tempPlayerState.momentum);

    events.push({
        type: 'SKILL_CHECK_RESULT',
        skill: skill,
        success: skillCheckResult.success,
        degree: skillCheckResult.degreeOfSuccess,
        roll: skillCheckResult.rollValue,
        total: skillCheckResult.totalAchieved,
        difficulty: skillCheckResult.difficultyTarget,
    });
    
    // Update Momentum
    const newMomentum = { ...tempPlayerState.momentum };
    if (skillCheckResult.success) {
      newMomentum.consecutive_successes += 1;
      newMomentum.consecutive_failures = 0;
      newMomentum.momentum_bonus = Math.min(5, newMomentum.consecutive_successes); // +1 per success, max +5
      newMomentum.desperation_bonus = 0;
      if (newMomentum.momentum_bonus > 1) {
          events.push({ type: 'TEXT_EVENT', text: `Votre série de succès vous donne un bonus de +${newMomentum.momentum_bonus} !`});
      }
    } else {
      newMomentum.consecutive_failures += 1;
      newMomentum.consecutive_successes = 0;
      newMomentum.desperation_bonus = Math.min(8, newMomentum.consecutive_failures * 2); // +2 per failure, max +8
      newMomentum.momentum_bonus = 0;
      if (newMomentum.desperation_bonus > 0) {
          events.push({ type: 'TEXT_EVENT', text: `Face à l'échec, votre détermination vous donne un bonus de +${newMomentum.desperation_bonus} !`});
      }
    }
    events.push({ type: 'MOMENTUM_UPDATED', newMomentum });

    // Grant Skill XP
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
        if (item) {
          const itemXpEvents = grantXpToItem(item, 10); // Grant 10 XP per use
          events.push(...itemXpEvents);
        }
      }
      
      // Grant bonus skill XP from choice
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

export async function fetchPoisForCurrentLocation(playerLocation: Position): Promise<EnhancedPOI[] | null> {
  if (!playerLocation) return null;
  try {
    const poisFromService = await fetchNearbyPoisFromOSM({
        latitude: playerLocation.latitude,
        longitude: playerLocation.longitude,
        radius: 500,
        limit: 15
    });
    return poisFromService;
  } catch (error) {
    console.error("Error fetching new POIs:", error);
    return null;
  }
}

/**
 * Translates a list of game events into a human-readable text summary for the AI.
 * @param events The array of game events.
 * @returns A string summarizing the events.
 */
function summarizeGameEventsForAI(events: GameEvent[]): string {
    if (!events || events.length === 0) {
        return "Aucun événement particulier ne s'est produit.";
    }

    const summaries: string[] = [];

    for (const event of events) {
        switch (event.type) {
            case 'SKILL_CHECK_RESULT':
                summaries.push(
                    `- Test de compétence (${event.skill}): ${event.success ? 'RÉUSSITE' : 'ÉCHEC'}. ` +
                    `(Score: ${event.total} vs Difficulté: ${event.difficulty})`
                );
                break;
            case 'PLAYER_STAT_CHANGE':
                if (Math.abs(event.change) > 0) { // Only report actual changes
                   summaries.push(`- Statistique modifiée: ${event.stat} ${event.change > 0 ? '+' : ''}${event.change} (Nouveau total: ${event.finalValue}).`);
                }
                break;
            case 'XP_GAINED':
                summaries.push(`- Le joueur a gagné ${event.amount} points d'expérience.`);
                break;
            case 'PLAYER_LEVELED_UP':
                summaries.push(`- FÉLICITATIONS: Le joueur a atteint le niveau ${event.newLevel} !`);
                break;
            case 'ITEM_ADDED':
                summaries.push(`- Objet ajouté à l'inventaire: ${event.quantity}x ${event.itemName}.`);
                break;
            case 'ITEM_REMOVED':
                 summaries.push(`- Objet retiré de l'inventaire: ${event.quantity}x ${event.itemName}.`);
                break;
            case 'ITEM_EVOLVED':
                summaries.push(`- ÉVOLUTION: ${event.oldItemName} est devenu ${event.newItemName} !`);
                break;
            case 'MONEY_CHANGED':
                 summaries.push(`- Transaction: ${event.amount > 0 ? '+' : ''}${event.amount.toFixed(2)}€ (${event.description}). Nouveau solde: ${event.finalBalance.toFixed(2)}€.`)
                break;
            case 'TEXT_EVENT':
                summaries.push(`- Événement narratif: ${event.text}`);
                break;
            // Other events can be ignored for the AI summary as they are either silent state changes or too detailed.
            default:
                break;
        }
    }

    if (summaries.length === 0) {
        return "L'action n'a pas eu de conséquences mécaniques notables à narrer.";
    }

    return summaries.join('\n');
}

// --- AI Input Preparation ---
export function prepareAIInput(gameState: GameState, playerChoice: StoryChoice | { text: string }, gameEvents?: GameEvent[], cascadeResult?: CascadeResult | null): any | null {
  if (!gameState.player) {
    console.error("Cannot prepare AI input: Player state is missing.");
    return null;
  }

  const { player } = gameState;

  // Create a simplified, nested skill object for the AI, matching the Zod schema
  const simplifiedSkills = Object.fromEntries(
    Object.entries(player.skills).map(([category, skills]) => [
      category,
      Object.fromEntries(
        Object.entries(skills).map(([skillName, skillDetail]) => [
          skillName,
          (skillDetail as any).level
        ])
      )
    ])
  );


  const playerInputForAI = {
      name: player.name,
      gender: player.gender,
      age: player.age,
      origin: player.origin,
      era: player.era || 'Époque Contemporaine',
      background: player.background,
      stats: Object.fromEntries(Object.entries(player.stats).map(([k, v]) => [k, v.value])),
      skills: simplifiedSkills, 
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
      keyInventoryItems: player.inventory
        .filter(item => item.type !== 'misc' && item.type !== 'key' && item.type !== 'quest')
        .map(item => item.name),
      recentActionTypes: gameState.journal
        ?.slice(-3)
        .map(entry => entry.type) || [],
      physiologicalState: {
        needsFood: player.physiology.basic_needs.hunger.level < 40,
        needsRest: player.stats.Energie.value < 30,
        isThirsty: player.physiology.basic_needs.thirst.level < 40
      },
  };
  
  let cascadeSummary = "Aucune analyse contextuelle supplémentaire disponible.";
  if (cascadeResult && cascadeResult.results) {
      const summaries: string[] = [];
      const cuisineData = cascadeResult.results.get('cuisine')?.data;
      if (cuisineData) {
          if (cuisineData.cookingOpportunities && cuisineData.cookingOpportunities.length > 0) {
              summaries.push(`- Opportunités de Cuisine: ${cuisineData.cookingOpportunities.join(' ')}`);
          }
          if (cuisineData.nutritionalStatus) {
              summaries.push(`- Statut Nutritionnel: ${cuisineData.nutritionalStatus}`);
          }
      }
      const cultureData = cascadeResult.results.get('culture_locale')?.data;
      if (cultureData && cultureData.summary && !cultureData.summary.includes('Aucune information')) {
          summaries.push(`- Contexte Culturel Local: ${cultureData.summary}`);
      }
      const livreData = cascadeResult.results.get('livre')?.data;
      if (livreData && livreData.foundBooks && livreData.foundBooks.length > 0) {
          const bookTitles = (livreData.foundBooks as BookSearchResult[]).map(b => b.title).join(', ');
          summaries.push(`- Recherche de Livres: Des informations sur les livres suivants ont été trouvées: ${bookTitles}.`);
      }

      if (summaries.length > 0) {
          cascadeSummary = "Analyses contextuelles supplémentaires:\n" + summaries.join("\n");
      }
  }

  const suggestedContextualActions = [
      ...generatePlayerStateActions(player),
      ...generateActionsForPOIs(gameState.nearbyPois || [], player)
  ].map(action => ({
    text: action.text,
    description: action.description,
    type: action.type,
    estimatedCost: action.economicImpact?.cost,
  }));

  const gameEventsSummary = summarizeGameEventsForAI(gameEvents || []);

  return {
    player: playerInputForAI,
    playerChoiceText: playerChoice.text,
    previousScenarioText: gameState.currentScenario?.scenarioText || '',
    gameEvents: gameEventsSummary,
    cascadeResult: cascadeSummary,
    suggestedContextualActions,
  };
}

/**
 * Converts AI-generated proposals into a list of concrete GameEvents.
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
  
  if (aiOutput.startCombat) {
      aiOutput.startCombat.forEach(enemyData => {
          events.push({ type: 'COMBAT_STARTED', enemy: enemyData });
      });
  }

  return events;
}

/**
 * Takes choices from the AI and enriches them with calculated mechanical data.
 * @param choices The raw choices from the AI.
 * @param player The current player state.
 * @returns The same choices, but with mechanical properties filled in.
 */
export function enrichAIChoicesWithLogic(choices: StoryChoice[], player: Player): StoryChoice[] {
    if (!choices) return [];

    return choices.map(choice => {
        const enrichedChoice = { ...choice };

        // Assign default costs based on action type if not provided
        if (enrichedChoice.timeCost === undefined) {
            switch(choice.type) {
                case 'reflection': enrichedChoice.timeCost = 10; break;
                case 'observation': enrichedChoice.timeCost = 15; break;
                case 'social': enrichedChoice.timeCost = 15; break;
                case 'exploration': enrichedChoice.timeCost = 30; break;
                case 'action': enrichedChoice.timeCost = 5; break;
                case 'job': enrichedChoice.timeCost = 60; break;
                default: enrichedChoice.timeCost = 10;
            }
        }
        if (enrichedChoice.energyCost === undefined) {
            switch(choice.type) {
                case 'reflection': enrichedChoice.energyCost = 2; break;
                case 'observation': enrichedChoice.energyCost = 5; break;
                case 'social': enrichedChoice.energyCost = 5; break;
                case 'exploration': enrichedChoice.energyCost = 10; break;
                case 'action': enrichedChoice.energyCost = 8; break;
                case 'job': enrichedChoice.energyCost = 20; break;
                default: enrichedChoice.energyCost = 5;
            }
        }

        // Calculate success probability if there's a skill check
        if (choice.skillCheck) {
            enrichedChoice.successProbability = calculateSuccessProbability(
                player.skills,
                player.stats,
                choice.skillCheck.skill,
                choice.skillCheck.difficulty,
                player.inventory,
                0, // No situational modifier for probability check, just raw chance
                player.physiology,
                player.momentum
            );
        }

        return enrichedChoice;
    });
}


// --- POI ACTION GENERATION ---

function getIconForService(serviceId: string): ChoiceIconName {
    if (serviceId.includes('buy_sandwich') || serviceId.includes('buy_pastry')) return 'Utensils';
    if (serviceId.includes('buy_')) return 'ShoppingCart';
    if (serviceId.includes('order_')) return 'NotebookPen';
    if (serviceId.includes('get_') || serviceId.includes('consultation')) return 'MessageSquare';
    if (serviceId.includes('book_')) return 'Briefcase';
    if (serviceId.includes('work_')) return 'Wrench';
    if (serviceId.includes('people_watch') || serviceId.includes('browse_')) return 'Eye';
    if (serviceId.includes('withdraw_')) return 'ShoppingCart';
    if (serviceId.includes('visit')) return 'Compass';
    if (serviceId.includes('take_power_nap')) return 'Zap'; // Using Zap for energy
    if (serviceId.includes('use_hotel_services')) return 'Briefcase';

    return 'Compass';
}

function getActionTypeForService(serviceId: string): ActionType {
    if (serviceId.includes('buy_') || serviceId.includes('order_') || serviceId.includes('rent_') || serviceId.includes('withdraw_')) return 'action';
    if (serviceId.includes('browse_') || serviceId.includes('people_watch') || serviceId.includes('visit')) return 'exploration';
    if (serviceId.includes('get_') || serviceId.includes('consultation') || serviceId.includes('meet_')) return 'social';
    if (serviceId.includes('book_') || serviceId.includes('work_') || serviceId.includes('use_hotel_services')) return 'job';
    if (serviceId.includes('take_power_nap')) return 'reflection';

    return 'action';
}

export function generateActionsForPOIs(pois: EnhancedPOI[], player: Player, maxActionsPerPoi = 1): StoryChoice[] {
    const contextualChoices: StoryChoice[] = [];
    if (!pois) return [];
  
    for (const poi of pois.slice(0, 8)) { // Limit total POIs considered
      let actionsForThisPoi = 0;
      for (const service of poi.services) {
        if (actionsForThisPoi >= maxActionsPerPoi) break;
  
        // Can player afford this?
        if (service.cost.min > player.money) {
          continue;
        }
  
        const distance = getDistanceInKm(player.currentLocation.latitude, player.currentLocation.longitude, poi.latitude, poi.longitude);
        const travelTime = Math.ceil(distance * 12); // ~12 min/km walking
        
        const descriptionDistance = distance < 0.1 ? 'juste ici' : 
                                  distance < 0.3 ? 'à quelques pas' :
                                  distance < 0.5 ? 'à proximité' : 
                                  `à ${Math.round(distance * 1000)}m`;

        const choice: StoryChoice = {
          id: `${poi.osmId}_${service.id}`,
          text: `${service.name} (${poi.name})`,
          description: `${service.description}, ${descriptionDistance}.`,
          iconName: getIconForService(service.id),
          type: getActionTypeForService(service.id),
          mood: 'adventurous', // Generic mood
          energyCost: Math.round(service.duration / 10) + Math.ceil(distance * 5) + 1, // Estimate energy cost
          timeCost: service.duration + travelTime,
          consequences: ['Interaction sociale', `Coût: ${service.cost.min}-${service.cost.max}€`],
          economicImpact: {
              cost: service.cost,
              location: poi.name,
          },
          poiReference: {
              osmId: poi.osmId,
              serviceId: service.id,
              establishmentType: poi.establishmentType,
          },
          // Skill checks for POI actions can be added in the future
        };
        contextualChoices.push(choice);
        actionsForThisPoi++;
      }
    }
    return contextualChoices;
}

/**
 * Generates utility actions based on player's state (hunger, thirst, health) and inventory.
 * @param player The current player object.
 * @returns An array of StoryChoice objects for using available items.
 */
export function generatePlayerStateActions(player: Player): StoryChoice[] {
    const choices: StoryChoice[] = [];
    if (!player) return choices;

    const { inventory, physiology, stats } = player;

    // Check hunger
    if (physiology.basic_needs.hunger.level < 50) {
        const foodItems = inventory.filter(item => item.type === 'consumable' && item.physiologicalEffects?.hunger);
        if (foodItems.length > 0) {
            const bestFood = foodItems[0];
            choices.push({
                id: `use_item_${bestFood.instanceId}`,
                text: `Manger: ${bestFood.name}`,
                description: `Consommer ${bestFood.name} pour calmer votre faim.`,
                iconName: 'Utensils',
                type: 'action',
                mood: 'social',
                energyCost: 1,
                timeCost: 5,
                consequences: ['Soulagement de la faim'],
                physiologicalEffects: bestFood.physiologicalEffects,
            });
        }
    }

    // Check thirst
    if (physiology.basic_needs.thirst.level < 60) {
        const drinkItems = inventory.filter(item => item.type === 'consumable' && item.physiologicalEffects?.thirst);
         if (drinkItems.length > 0) {
            const bestDrink = drinkItems[0];
            choices.push({
                id: `use_item_${bestDrink.instanceId}`,
                text: `Boire: ${bestDrink.name}`,
                description: `Consommer ${bestDrink.name} pour étancher votre soif.`,
                iconName: 'GlassWater',
                type: 'action',
                mood: 'social',
                energyCost: 1,
                timeCost: 2,
                consequences: ['Soulagement de la soif'],
                physiologicalEffects: bestDrink.physiologicalEffects,
            });
        }
    }
    
    // Check low health
    if (stats.Sante.value < (stats.Sante.max || 100) * 0.7) {
        const healingItems = inventory.filter(item => item.type === 'consumable' && item.effects?.Sante && (item.effects.Sante as unknown as number) > 0);
        if (healingItems.length > 0) {
            const bestHeal = healingItems[0];
            choices.push({
                id: `use_item_${bestHeal.instanceId}`,
                text: `Utiliser: ${bestHeal.name}`,
                description: `Utiliser ${bestHeal.name} pour soigner vos blessures.`,
                iconName: 'Heart',
                type: 'action',
                mood: 'social',
                energyCost: 1,
                timeCost: 3,
                consequences: ['Récupération de santé'],
                statEffects: bestHeal.effects as Partial<Record<keyof PlayerStats, number>>,
            });
        }
    }

    return choices;
}

/**
 * Generates contextual choices based on the results of the enrichment cascade.
 * @param cascadeResult The result from the cascade system.
 * @param player The current player object.
 * @returns An array of StoryChoice objects.
 */
export function generateCascadeBasedActions(cascadeResult: CascadeResult | null, player: Player): StoryChoice[] {
    const choices: StoryChoice[] = [];
    if (!cascadeResult) return choices;

    // 1. Check for Cuisine opportunities
    const cuisineResult = cascadeResult.results.get('cuisine');
    if (cuisineResult?.data?.cookableRecipes) {
        for (const recipe of (cuisineResult.data.cookableRecipes as EnrichedRecipe[])) {
            choices.push({
                id: `cook_${recipe.name.replace(/\s+/g, '_')}`,
                text: `Cuisiner : ${recipe.name}`,
                description: "Utiliser les ingrédients de votre inventaire pour préparer un plat délicieux et réconfortant.",
                iconName: 'ChefHat',
                type: 'action',
                mood: 'social',
                timeCost: 30,
                energyCost: 10,
                consequences: ['Repas préparé', 'Gain de compétence'],
                skillGains: { 'technical.crafting': 15 }
            });
        }
    }

    // 2. Check for Book opportunities
    const livreResult = cascadeResult.results.get('livre');
    if (livreResult?.data?.foundBooks && livreResult.data.foundBooks.length > 0) {
        for (const book of (livreResult.data.foundBooks as BookSearchResult[])) {
             choices.push({
                id: `read_${book.title.replace(/\s+/g, '_').substring(0,20)}`,
                text: `Lire : ${book.title}`,
                description: book.description?.substring(0, 100) + '...' || "Lire ce livre pour en apprendre plus.",
                iconName: 'BookOpen',
                type: 'reflection',
                mood: 'contemplative',
                timeCost: 45,
                energyCost: 5,
                consequences: ['Nouvelles connaissances', 'Gain de compétence'],
                skillGains: { 'cognitive.memory': 10 }
            });
        }
    }
    
    return choices;
}
