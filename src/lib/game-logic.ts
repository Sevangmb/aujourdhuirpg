
import type { GameState, Scenario, Player, ToneSettings, Position, JournalEntry, GameNotification, PlayerStats, Progression, Quest, PNJ, MajorDecision, Clue, GameDocument, QuestUpdate, IntelligentItem, Transaction, StoryChoice, AdvancedSkillSystem, QuestObjective, ItemUsageRecord, DynamicItemCreationPayload, GameEvent, EnrichedObject, MomentumSystem, EnhancedPOI, POIService, ActionType, ChoiceIconName, BookSearchResult, EnrichedRecipe, DegreeOfSuccess } from './types';
import type { HistoricalContact } from '@/modules/historical/types';
import type { Enemy } from '@/modules/combat/types';
import { addItemToInventory, removeItemFromInventory, updateItemContextualProperties, grantXpToItem } from '@/modules/inventory/logic';
import { getMasterItemById } from '@/data/items';
import { performSkillCheck, calculateSuccessProbability } from './skill-check';
import type { WeatherData } from '@/app/actions/get-current-weather';
import { v4 as uuidv4 } from 'uuid';
import type { CascadeResult } from '@/core/cascade/types';
import type { GenerateScenarioOutput } from '@/ai/flows/generate-scenario';
import { addPlayerXp, getSkillXp, applySkillXp } from '@/modules/player/logic';
import { calculateDamage, handleCombatAction, handleCombatEnded, handleCombatStarted } from '@/modules/combat/logic';
import { handleAddQuest, handleQuestStatusChange, handleQuestObjectiveChange } from '@/modules/quests/logic';
import { handleMoneyChange } from '@/modules/economy/logic';
import { handleAddHistoricalContact } from '@/modules/historical/logic';
import { getDistanceInKm } from '@/lib/utils/geo-utils';
import { isShopOpen } from '@/lib/utils/time-utils';


// --- Game Actions & Reducer ---
export type GameAction =
  | { type: 'APPLY_GAME_EVENTS', payload: GameEvent[] }
  | { type: 'SET_CURRENT_SCENARIO'; payload: Scenario }
  | { type: 'SET_NEARBY_POIS'; payload: EnhancedPOI[] | null }
  | { type: 'UPDATE_PLAYER_DATA', payload: Player }
  | { type: 'UPDATE_INVENTORY_ITEM', payload: { instanceId: string; enrichedObject: EnrichedObject } };


export function gameReducer(state: GameState, action: GameAction): GameState {
  if (!state.player) return state;

  switch (action.type) {
    case 'UPDATE_PLAYER_DATA':
        return { ...state, player: action.payload };
    case 'UPDATE_INVENTORY_ITEM': {
      if (!state.player) return state;
      const newInventory = state.player.inventory.map(item =>
        item.instanceId === action.payload.instanceId ? action.payload.enrichedObject : item
      );
      return { ...state, player: { ...state.player, inventory: newInventory } };
    }
    case 'APPLY_GAME_EVENTS': {
      let nextState = state;
      const eventQueue = [...action.payload];

      while (eventQueue.length > 0) {
        const event = eventQueue.shift()!;
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
                eventQueue.push(...xpEvents);
            }
            break;
          }
          case 'SKILL_XP_AWARDED': {
            const { updatedSkills, leveledUp, newLevel } = applySkillXp(player.skills, event.skill, event.amount);
            player = { ...player, skills: updatedSkills };
            if (leveledUp && newLevel) {
                const skillName = event.skill.split('.')[1] || event.skill;
                const journalEntry: GameEvent = { type: 'JOURNAL_ENTRY_ADDED', payload: { type: 'event', text: `Votre compétence ${skillName.replace(/_/g, ' ')} a atteint le niveau ${newLevel} !` }};
                eventQueue.push(journalEntry);
            }
            break;
          }
          case 'PLAYER_LEVELED_UP': {
            const journalEntry: GameEvent = { type: 'JOURNAL_ENTRY_ADDED', payload: { type: 'event', text: `Félicitations ! Vous avez atteint le niveau ${event.newLevel} !` }};
            eventQueue.push(journalEntry);
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
            const itemIndex = player.inventory.findIndex(i => i.instanceId === event.instanceId);
            if (itemIndex > -1) {
              const newInventory = [...player.inventory];
              const itemToUpdate = { ...newInventory[itemIndex] };
              const xpEvents = grantXpToItem(itemToUpdate, event.xp);
              eventQueue.push(...xpEvents);
            }
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
                memory: { 
                    ...originalItem.memory, 
                    evolution_history: [...(originalItem.memory.evolution_history || []), { fromItemId: originalItem.id, toItemId: evolvedMasterItem.id, atLevel: originalItem.itemLevel, timestamp: nowISO }] 
                },
                contextual_properties: { local_value: evolvedMasterItem.economics.base_value, legal_status: 'legal', social_perception: 'normal', utility_rating: 50 },
            };
            newInventory[itemIndex] = evolvedItem;
            player = { ...player, inventory: newInventory };
            const journalEntry: GameEvent = { type: 'JOURNAL_ENTRY_ADDED', payload: { type: 'event', text: `Votre ${event.oldItemName} a évolué en ${event.newItemName} !` } };
            eventQueue.push(journalEntry);
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
    
    default:
      return state;
  }
}

export function getWeatherModifier(skillPath: string, weatherData: WeatherData | null): { modifier: number, reason: string } {
  if (!weatherData) {
    return { modifier: 0, reason: "" };
  }

  const weatherDesc = weatherData.description.toLowerCase();
  let modifier = 0;
  
  if (weatherDesc.includes('brouillard')) {
    if (skillPath.includes('discretion') || skillPath.includes('pistage')) modifier += 10;
    if (skillPath.includes('navigation') || skillPath.includes('orientation')) modifier -= 10;
  }
  else if (weatherDesc.includes('pluie') || weatherDesc.includes('averses')) {
    if (skillPath.includes('discretion')) modifier += 5;
    if (skillPath.includes('persuasion') || skillPath.includes('seduction')) modifier -= 3;
  }
  
  let reason = "";
  if (modifier > 0) {
    reason = `Le temps (${weatherData.description}) favorise cette action.`;
  } else if (modifier < 0) {
    reason = `Le temps (${weatherData.description}) pénalise cette action.`;
  }

  return { modifier, reason };
}

export function processCombatTurn(player: Player, enemy: Enemy, choice: StoryChoice): { events: GameEvent[] } {
    const events: GameEvent[] = [];

    // --- Player's Turn ---
    if (choice.combatActionType === 'attack') {
        const weapon = player.inventory.find(i => i.type === 'tool' && i.combatStats?.damage) || 
                       { id: "unarmed", name: "Poings", combatStats: { damage: 1 } };
        let skillToUse: string;

        if (weapon.id.includes('knife') || weapon.id.includes('sword')) {
            skillToUse = 'physiques.arme_blanche';
        } else if (weapon.id.includes('gun') || weapon.id.includes('pistol')) { // Future-proofing
            skillToUse = 'physiques.arme_a_feu';
        } else {
            skillToUse = 'physiques.combat_mains_nues';
        }

        const attackCheck = performSkillCheck(player.skills, player.stats, skillToUse, enemy.defense, player.inventory, 0, player.physiology, player.momentum);
        events.push({
            type: 'SKILL_CHECK_RESULT',
            skill: attackCheck.skillUsed,
            success: attackCheck.success,
            degree: attackCheck.degreeOfSuccess,
            roll: attackCheck.rollValue,
            total: attackCheck.totalAchieved,
            difficulty: attackCheck.difficultyTarget,
        });

        if (attackCheck.success) {
            const playerDamage = calculateDamage(player.stats, weapon.combatStats!.damage!, enemy.defense, attackCheck.degreeOfSuccess);
            const newEnemyHealth = enemy.health - playerDamage;

            events.push({ type: 'COMBAT_ACTION', attacker: player.name, target: 'enemy', damage: playerDamage, newHealth: newEnemyHealth, action: `attaque avec ${weapon.name}` });

            if (newEnemyHealth <= 0) {
                events.push({ type: 'COMBAT_ENDED', winner: 'player' });
                const xpGained = (enemy.attack + enemy.defense) * 2;
                events.push({ type: 'XP_GAINED', amount: xpGained });
                if (Math.random() < 0.7) {
                    const moneyDropped = Math.floor(Math.random() * (enemy.attack * 2)) + 5;
                    events.push({ type: 'MONEY_CHANGED', amount: moneyDropped, finalBalance: player.money + moneyDropped, description: `Butin sur ${enemy.name}` });
                }
                return { events };
            }
        } else {
             events.push({ type: 'TEXT_EVENT', text: `${player.name} rate son attaque !` });
        }

    } else if (choice.id.startsWith('combat_use_item_')) {
        const instanceId = choice.id.replace('combat_use_item_', '');
        const item = player.inventory.find(i => i.instanceId === instanceId);
        if (item && item.effects?.Sante) {
            events.push({ type: 'ITEM_REMOVED', itemId: item.id, itemName: item.name, quantity: 1 });
            const newHealth = Math.min(player.stats.Sante.max!, player.stats.Sante.value + (item.effects.Sante as any));
            events.push({ type: 'PLAYER_STAT_CHANGE', stat: 'Sante', change: (item.effects.Sante as any), finalValue: newHealth });
            events.push({ type: 'TEXT_EVENT', text: `${player.name} utilise ${item.name} et récupère de la santé.` });
        }
    } else if (choice.combatActionType === 'flee') {
        const skillCheckResult = performSkillCheck(player.skills, player.stats, 'physiques.esquive', 60, player.inventory, 0, player.physiology, player.momentum);
        events.push({
            type: 'SKILL_CHECK_RESULT',
            skill: skillCheckResult.skillUsed,
            success: skillCheckResult.success,
            degree: skillCheckResult.degreeOfSuccess,
            roll: skillCheckResult.rollValue,
            total: skillCheckResult.totalAchieved,
            difficulty: skillCheckResult.difficultyTarget,
        });
        if (skillCheckResult.success) {
            events.push({ type: 'COMBAT_ENDED', winner: 'player' });
            return { events };
        } else {
             events.push({ type: 'TEXT_EVENT', text: `La fuite de ${player.name} échoue !` });
        }
    }

    // --- Enemy's Turn (if combat is not over) ---
    const enemyAttackPower = enemy.attack;
    const playerDefense = (player.stats.Constitution.value / 10) + (player.stats.Dexterite.value / 15);
    const enemyDamage = Math.max(1, enemyAttackPower - playerDefense);
    const newPlayerHealth = player.stats.Sante.value - enemyDamage;

    events.push({ type: 'COMBAT_ACTION', attacker: enemy.name, target: 'player', damage: Math.round(enemyDamage), newHealth: newPlayerHealth, action: 'riposte' });

    if (newPlayerHealth <= 0) {
        events.push({ type: 'COMBAT_ENDED', winner: 'enemy' });
    }

    return { events };
}


export async function processExplorationAction(
  player: Player,
  choice: StoryChoice,
  weatherData: WeatherData | null,
  cascadeResult: CascadeResult | null,
): Promise<{
    events: GameEvent[];
}> {
  const events: GameEvent[] = [];
  
  const tempPlayerState = JSON.parse(JSON.stringify(player)) as Player;

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

  if (choice.id.startsWith('cook_')) {
    const recipeName = choice.id.replace('cook_', '').replace(/_/g, ' ');
    const cuisineData = cascadeResult?.results.get('cuisine')?.data;
    const recipe = cuisineData?.cookableRecipes?.find((r: EnrichedRecipe) => r.name === recipeName);

    if (recipe) {
        let totalHungerRestored = 0;
        for (const ingredient of recipe.ingredients) {
            events.push({ type: 'ITEM_REMOVED', itemId: ingredient.name, itemName: ingredient.name, quantity: 1 });
            totalHungerRestored += 5;
        }
        totalHungerRestored += 20;

        const mealPayload: DynamicItemCreationPayload = {
            baseItemId: 'generic_meal_01',
            overrides: {
                name: recipe.name,
                description: `Un plat délicieux de ${recipe.name}, préparé avec soin.`,
                physiologicalEffects: { hunger: Math.min(100, totalHungerRestored) }
            }
        };
        events.push({ type: 'DYNAMIC_ITEM_ADDED', payload: mealPayload });
        events.push({ type: 'SKILL_XP_AWARDED', skill: 'techniques.artisanat_general', amount: 15 });
        events.push({ type: 'JOURNAL_ENTRY_ADDED', payload: { type: 'player_action', text: `Vous avez cuisiné : ${recipe.name}.` } });
    }
  }

  events.push({ type: 'GAME_TIME_PROGRESSED', minutes: choice.timeCost || 0 });
  if (!choice.id.startsWith('cook_')) {
    events.push({ type: 'JOURNAL_ENTRY_ADDED', payload: { type: 'player_action', text: choice.text } });
  }

  const hungerDecay = ((choice.timeCost || 0) * 0.05) + ((choice.energyCost || 0) * 0.1);
  const thirstDecay = ((choice.timeCost || 0) * 0.08) + ((choice.energyCost || 0) * 0.08);

  const totalEnergyChange = -(choice.energyCost || 0);
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
  
  if (choice.skillCheck) {
    const { skill, difficulty } = choice.skillCheck;
    const { modifier: weatherModifier } = getWeatherModifier(skill, weatherData);
    const skillCheckResult = performSkillCheck(tempPlayerState.skills, tempPlayerState.stats, skill, difficulty, tempPlayerState.inventory, weatherModifier, tempPlayerState.physiology, tempPlayerState.momentum);

    events.push({
        type: 'SKILL_CHECK_RESULT',
        skill: skillCheckResult.skillUsed,
        success: skillCheckResult.success,
        degree: skillCheckResult.degreeOfSuccess,
        roll: skillCheckResult.rollValue,
        total: skillCheckResult.totalAchieved,
        difficulty: skillCheckResult.difficultyTarget,
    });
    
    const newMomentum = { ...tempPlayerState.momentum };
    if (skillCheckResult.success) {
      newMomentum.consecutive_successes += 1;
      newMomentum.consecutive_failures = 0;
      newMomentum.momentum_bonus = Math.min(5, newMomentum.consecutive_successes);
      newMomentum.desperation_bonus = 0;
      if (newMomentum.momentum_bonus > 1) {
          events.push({ type: 'TEXT_EVENT', text: `Votre série de succès vous donne un bonus de +${newMomentum.momentum_bonus} !`});
      }
    } else {
      newMomentum.consecutive_failures += 1;
      newMomentum.consecutive_successes = 0;
      newMomentum.desperation_bonus = Math.min(8, newMomentum.consecutive_failures * 2);
      newMomentum.momentum_bonus = 0;
      if (newMomentum.desperation_bonus > 0) {
          events.push({ type: 'TEXT_EVENT', text: `Face à l'échec, votre détermination vous donne un bonus de +${newMomentum.desperation_bonus} !`});
      }
    }
    events.push({ type: 'MOMENTUM_UPDATED', newMomentum });

    const skillXpGained = getSkillXp(skillCheckResult.difficultyTarget, skillCheckResult.success);
    if (skillXpGained > 0) {
      events.push({ type: 'SKILL_XP_AWARDED', skill: skill, amount: skillXpGained });
    }

    if (skillCheckResult.success) {
      let totalPlayerXPGain = 10;
      
      for (const itemContribution of skillCheckResult.itemContributions) {
        const item = tempPlayerState.inventory.find((i: IntelligentItem) => i.name === itemContribution.name);
        if (item) {
          events.push({ type: 'ITEM_XP_GAINED', instanceId: item.instanceId, itemName: item.name, xp: 10 });
        }
      }
      
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

export async function processPlayerAction(
  player: Player,
  currentEnemy: Enemy | null,
  choice: StoryChoice,
  weatherData: WeatherData | null,
  cascadeResult: CascadeResult | null,
): Promise<{
    events: GameEvent[];
}> {
    if (currentEnemy) {
        return processCombatTurn(player, currentEnemy, choice);
    } else {
        return processExplorationAction(player, choice, weatherData, cascadeResult);
    }
}


function summarizeGameEventsForAI(events: GameEvent[]): string {
    if (!events || events.length === 0) {
        return "Aucun événement particulier ne s'est produit.";
    }

    const summaries: string[] = [];

    for (const event of events) {
        switch (event.type) {
            case 'COMBAT_ACTION':
                summaries.push(`- Au combat, ${event.attacker} a attaqué ${event.target === 'player' ? 'le joueur' : 'l\'ennemi'} avec ${event.action}, infligeant ${event.damage} dégâts. Nouvelle santé: ${event.newHealth}.`);
                break;
            case 'COMBAT_ENDED':
                 summaries.push(`- Le combat est terminé. Le vainqueur est : ${event.winner}.`);
                break;
            case 'SKILL_CHECK_RESULT':
                summaries.push(
                    `- Test de compétence (${event.skill.replace(/_/g, ' ')}): ${event.success ? 'RÉUSSITE' : 'ÉCHEC'}. ` +
                    `(Score: ${event.total} vs Difficulté: ${event.difficulty})`
                );
                break;
            case 'PLAYER_STAT_CHANGE':
                if (Math.abs(event.change) > 0) {
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
            default:
                break;
        }
    }

    if (summaries.length === 0) {
        return "L'action n'a pas eu de conséquences mécaniques notables à narrer.";
    }

    return summaries.join(' ');
}

export function prepareAIInput(gameState: GameState, playerChoice: StoryChoice | { text: string }, gameEvents?: GameEvent[], cascadeResult?: CascadeResult | null): any | null {
  if (!gameState.player) {
    console.error("Cannot prepare AI input: Player state is missing.");
    return null;
  }

  const { player } = gameState;

  const flatStats = (Object.keys(player.stats) as Array<keyof PlayerStats>).reduce((acc, key) => {
      acc[key] = player.stats[key].value;
      return acc;
  }, {} as Record<keyof PlayerStats, number>);

  const nestedSkills = (Object.keys(player.skills) as Array<keyof AdvancedSkillSystem>).reduce((acc, category) => {
    const skillsInCategory = player.skills[category];
    const subSkills: Record<string, number> = {};
    for (const skillName in skillsInCategory) {
        subSkills[skillName] = skillsInCategory[skillName].level;
    }
    acc[category] = subSkills;
    return acc;
  }, {} as Record<keyof AdvancedSkillSystem, Record<string, number>>);

  const playerInputForAI = {
      name: player.name,
      gender: player.gender,
      age: player.age,
      origin: player.origin,
      era: player.era,
      background: player.background,
      stats: flatStats,
      skills: nestedSkills,
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
      currentLocation: player.currentLocation,
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
          cascadeSummary = "Analyses contextuelles supplémentaires: " + summaries.join(" ");
      }
  }

  const gameEventsSummary = summarizeGameEventsForAI(gameEvents || []);

  const contextualActions = generateActionsForPOIs(gameState.nearbyPois || [], player, gameState.gameTimeInMinutes);
  const suggestedContextualActions = contextualActions.map(action => ({
    text: action.text,
    description: action.description,
    type: action.type,
    estimatedCost: action.economicImpact?.cost,
  }));

  return {
    player: playerInputForAI,
    playerChoiceText: playerChoice.text,
    previousScenarioText: gameState.currentScenario?.scenarioText || '',
    gameEvents: gameEventsSummary,
    cascadeResult: cascadeSummary.replace(/[\n\r]/g, ' '),
    suggestedContextualActions,
  };
}

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
        events.push({ type: 'MONEY_CHANGED', amount: txData.amount, description: txData.description, finalBalance: 0 });
    });
  }
  
  if (aiOutput.startCombat) {
      aiOutput.startCombat.forEach(enemyData => {
          events.push({ type: 'COMBAT_STARTED', enemy: enemyData });
      });
  }

  return events;
}

export function enrichAIChoicesWithLogic(choices: StoryChoice[], player: Player): StoryChoice[] {
    if (!choices) return [];

    return choices.map(choice => {
        const enrichedChoice = { ...choice };

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

        if (choice.skillCheck) {
            enrichedChoice.successProbability = calculateSuccessProbability(
                player.skills,
                player.stats,
                choice.skillCheck.skill,
                choice.skillCheck.difficulty,
                player.inventory,
                0,
                player.physiology,
                player.momentum
            );
        }

        return enrichedChoice;
    });
}


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
    if (serviceId.includes('take_power_nap')) return 'Zap';
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

export function generateActionsForPOIs(pois: EnhancedPOI[], player: Player, gameTimeInMinutes: number): StoryChoice[] {
    const contextualChoices: StoryChoice[] = [];
    if (!pois) return [];
  
    for (const poi of pois.slice(0, 8)) {
      let actionsForThisPoi = 0;
      const maxActionsPerPoi = 1;
      for (const service of poi.services) {
        if (actionsForThisPoi >= maxActionsPerPoi) break;
  
        if (service.availability && !isShopOpen(gameTimeInMinutes, service.availability)) {
            continue; 
        }

        if (service.cost.min > player.money) {
          continue;
        }
  
        const distance = getDistanceInKm(player.currentLocation.latitude, player.currentLocation.longitude, poi.latitude, poi.longitude);
        const travelTime = Math.ceil(distance * 12);
        
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
          mood: 'adventurous',
          energyCost: Math.round(service.duration / 10) + Math.ceil(distance * 5) + 1,
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
        };
        contextualChoices.push(choice);
        actionsForThisPoi++;
      }
    }
    return contextualChoices;
}

export function generatePlayerStateActions(player: Player): StoryChoice[] {
    const choices: StoryChoice[] = [];
    if (!player) return choices;

    const { inventory, physiology, stats } = player;

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
                statEffects: bestHeal.effects,
            });
        }
    }

    return choices;
}

export function generateCascadeBasedActions(cascadeResult: CascadeResult | null, player: Player): StoryChoice[] {
    const choices: StoryChoice[] = [];
    if (!cascadeResult) return choices;

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
                skillGains: { 'techniques.artisanat_general': 15 }
            });
        }
    }

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
                skillGains: { 'savoir.histoire': 10 }
            });
        }
    }
    
    return choices;
}


// --- COMBAT LOGIC ---
export function generateCombatActions(player: Player, enemy: Enemy): StoryChoice[] {
    const actions: StoryChoice[] = [];

    // Basic Attack
    actions.push({
        id: 'combat_attack',
        text: 'Attaquer',
        description: `Attaquer ${enemy.name} avec votre meilleure option.`,
        iconName: 'Sword',
        type: 'action',
        mood: 'adventurous',
        isCombatAction: true,
        combatActionType: 'attack',
        timeCost: 0,
        energyCost: 10,
        consequences: ['Dégâts potentiels', 'Riposte de l\'ennemi'],
    });

    // Use Healing Item
    const healingItems = player.inventory.filter(i => i.effects?.Sante && (i.effects.Sante as any) > 0);
    if (healingItems.length > 0) {
        const bestHeal = healingItems.sort((a,b) => (b.effects!.Sante as any) - (a.effects!.Sante as any))[0];
        actions.push({
            id: `combat_use_item_${bestHeal.instanceId}`,
            text: `Utiliser ${bestHeal.name}`,
            description: `Utiliser un objet pour récupérer de la santé.`,
            iconName: 'Heart',
            type: 'action',
            mood: 'social',
            isCombatAction: true,
            combatActionType: 'special',
            timeCost: 0,
            energyCost: 2,
            consequences: ['Récupération de santé'],
        });
    }

    // Flee
    actions.push({
        id: 'combat_flee',
        text: 'Fuir',
        description: 'Tenter de s\'échapper du combat.',
        iconName: 'Zap', // Placeholder icon
        type: 'action',
        mood: 'mysterious',
        isCombatAction: true,
        combatActionType: 'flee',
        timeCost: 0,
        energyCost: 15,
        consequences: ['Fin du combat ?', 'Risque d\'attaque dans le dos'],
        skillCheck: {
            skill: 'physiques.esquive',
            difficulty: 60, // Base difficulty to flee
        },
    });

    return actions;
}

export function summarizeCombatEvents(events: GameEvent[], playerName: string, enemyName: string): string {
    const summaryLines: string[] = [];

    for (const event of events) {
        if (event.type === 'COMBAT_ACTION') {
            const attacker = event.attacker === playerName ? 'Vous' : event.attacker;
            const target = event.target === 'player' ? 'vous' : enemyName;
            summaryLines.push(`${attacker} ${event.action.replace(playerName, 'vous').replace(enemyName, 'l\'ennemi')} et infligez ${event.damage} points de dégâts à ${target}.`);
        } else if (event.type === 'TEXT_EVENT') {
            summaryLines.push(event.text);
        } else if (event.type === 'SKILL_CHECK_RESULT' && !event.success) {
            summaryLines.push(`Votre tentative de ${event.skill.split('.')[1].replace(/_/g, ' ')} a échoué !`);
        }
    }
    
    return summaryLines.join('\n');
}
