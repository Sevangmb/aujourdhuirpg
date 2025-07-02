
import type { GameState, Scenario, Player, ToneSettings, Position, JournalEntry, GameNotification, PlayerStats, Progression, Quest, PNJ, MajorDecision, Clue, GameDocument, QuestUpdate, IntelligentItem, Transaction, StoryChoice, AdvancedSkillSystem, QuestObjective, ItemUsageRecord, DynamicItemCreationPayload, GameEvent, EnrichedObject, MomentumSystem, EnhancedPOI, POIService, ActionType, ChoiceIconName, BookSearchResult, EnrichedRecipe } from './types';
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
import { calculateDamage, handleCombatAction, handleCombatEnded, handleCombatStarted, summarizeCombatEvents } from '@/modules/combat/logic';
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
  | { type: 'UPDATE_PLAYER_DATA', payload: Partial<Player> }
  | { type: 'UPDATE_INVENTORY_ITEM', payload: { instanceId: string; enrichedObject: EnrichedObject } };


export function gameReducer(state: GameState, action: GameAction): GameState {
  if (!state.player) return state;

  switch (action.type) {
    case 'UPDATE_PLAYER_DATA':
        return { ...state, player: { ...state.player, ...action.payload} };
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
              const itemToUpdate = { ...player.inventory[itemIndex] };
              const xpEvents = grantXpToItem(itemToUpdate, event.xp);
              eventQueue.push(...xpEvents);
            }
            break;
          }
          case 'ITEM_LEVELED_UP': {
            const newInventory = player.inventory.map(item => {
              if (item.instanceId === event.instanceId) {
                const updatedItem = { ...item, itemLevel: event.newLevel, itemXp: event.newXp };
                if (event.newXpToNextLevel !== undefined) {
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
