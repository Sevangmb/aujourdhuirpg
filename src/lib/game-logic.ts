
import type { GameState, Scenario, Player, ToneSettings, Position, JournalEntry, GameNotification, PlayerStats, Progression, Quest, PNJ, MajorDecision, Clue, GameDocument, QuestUpdate, IntelligentItem, Transaction, StoryChoice, AdvancedSkillSystem, QuestObjective, ItemUsageRecord, DynamicItemCreationPayload, GameEvent, EnrichedObject, MomentumSystem, EnhancedPOI, POIService, ActionType, ChoiceIconName, BookSearchResult, EnrichedRecipe } from './types';
import type { HistoricalContact } from '@/modules/historical/types';
import type { Enemy } from '@/modules/combat/types';
import { addItemToInventory, removeItemFromInventory, updateItemContextualProperties, grantXpToItem } from '@/modules/inventory/logic';
import { getMasterItemById } from '@/data/items';
import { performSkillCheck, calculateSuccessProbability } from './skill-check';
import { v4 as uuidv4 } from 'uuid';
import { addPlayerXp, getSkillXp, applySkillXp } from '@/modules/player/logic';
import { handleCombatAction, handleCombatEnded, handleCombatStarted } from '@/modules/combat/logic';
import { handleAddQuest, handleQuestStatusChange, handleQuestObjectiveChange } from '@/modules/quests/logic';
import { handleMoneyChange } from '@/modules/economy/logic';
import { handleAddHistoricalContact } from '@/modules/historical/logic';
import { getDistanceInKm } from '@/lib/utils/geo-utils';
import { isShopOpen } from '@/lib/utils/time-utils';
import type { CascadeResult } from '@/core/cascade/types';
import type { WeatherData } from '@/app/actions/get-current-weather';
import type { GenerateScenarioOutput } from '@/ai/flows/generate-scenario';

// --- Game Actions & Reducer ---
// This reducer now directly applies the effects of GameEvents calculated by the logic layer.
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
    
    default:
      return state;
  }
}

export function enrichAIChoicesWithLogic(choices: StoryChoice[], player: Player): StoryChoice[] {
    if (!choices) return [];

    return choices.map(choice => {
        const enrichedChoice = { ...choice };

        if (enrichedChoice.timeCost === undefined || enrichedChoice.timeCost === null) {
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
        if (enrichedChoice.energyCost === undefined || enrichedChoice.energyCost === null) {
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

/**
 * Summarizes a list of game events into a single, human-readable string for the AI.
 * This is a critical function for separating game logic from AI narration.
 * @param events The array of GameEvent objects.
 * @returns A string summarizing the events.
 */
export function summarizeGameEventsForAI(events: GameEvent[]): string {
  if (events.length === 0) {
    return "Aucun événement particulier ne s'est produit.";
  }

  const summaries: string[] = [];

  for (const event of events) {
    switch (event.type) {
      case 'SKILL_CHECK_RESULT':
        summaries.push(`Résultat d'un test de compétence (${event.skill}): ${event.success ? 'réussite' : 'échec'}.`);
        break;
      case 'TEXT_EVENT':
        summaries.push(event.text);
        break;
      case 'PLAYER_STAT_CHANGE':
        if (Math.abs(event.change) > 2) { // Only report significant changes
            summaries.push(`Votre stat de ${event.stat} a changé de ${event.change}.`);
        }
        break;
       case 'PLAYER_PHYSIOLOGY_CHANGE':
        if(event.stat === 'hunger') summaries.push(event.change > 0 ? 'Votre faim a été apaisée.' : 'Vous avez ressenti la faim.');
        if(event.stat === 'thirst') summaries.push(event.change > 0 ? 'Votre soif a été étanchée.' : 'Vous avez ressenti la soif.');
        break;
      case 'XP_GAINED':
        summaries.push(`Vous avez gagné ${event.amount} points d'expérience.`);
        break;
      case 'PLAYER_LEVELED_UP':
        summaries.push(`Vous êtes monté au niveau ${event.newLevel} !`);
        break;
      case 'SKILL_LEVELED_UP':
         summaries.push(`Votre compétence en ${event.skill} a atteint le niveau ${event.newLevel}.`);
         break;
      case 'ITEM_ADDED':
        summaries.push(`Vous avez obtenu : ${event.itemName} (x${event.quantity}).`);
        break;
      case 'DYNAMIC_ITEM_ADDED':
        summaries.push(`Vous avez obtenu un nouvel objet : ${event.payload.overrides.name || event.payload.baseItemId}.`);
        break;
      case 'ITEM_REMOVED':
        summaries.push(`Vous avez utilisé ou perdu : ${event.itemName} (x${event.quantity}).`);
        break;
      case 'ITEM_EVOLVED':
        summaries.push(`Votre ${event.oldItemName} a évolué en ${event.newItemName} !`);
        break;
      case 'QUEST_ADDED':
        summaries.push(`Nouvelle quête ajoutée : "${event.quest.title}".`);
        break;
      case 'QUEST_STATUS_CHANGED':
        summaries.push(`Le statut de votre quête a changé en : ${event.newStatus}.`);
        break;
      case 'MONEY_CHANGED':
        summaries.push(`Votre argent a changé de ${event.amount.toFixed(2)}€ suite à : ${event.description}.`);
        break;
      case 'PLAYER_TRAVELS':
        summaries.push(`Vous êtes arrivé à ${event.destination.name}.`);
        break;
      case 'COMBAT_STARTED':
         summaries.push(`Un combat a commencé contre ${event.enemy.name}.`);
         break;
      case 'COMBAT_ACTION':
         summaries.push(`${event.attacker} a attaqué, infligeant ${event.damage} dégâts.`);
         break;
      case 'COMBAT_ENDED':
         summaries.push(`Le combat est terminé. Le vainqueur est : ${event.winner}.`);
         break;
      // Other cases can be added as needed. Default is to not summarize.
    }
  }

  // Combine summaries into a single paragraph.
  return summaries.join(' ');
}


export function generatePlayerStateActions(player: Player): StoryChoice[] {
    const actions: StoryChoice[] = [];

    // Action to eat if hungry
    const foodItem = player.inventory.find(item => item.type === 'consumable' && item.physiologicalEffects?.hunger && item.physiologicalEffects.hunger > 0);
    if (player.physiology.basic_needs.hunger.level < 60 && foodItem) {
        actions.push({
            id: `use_item_${foodItem.instanceId}`,
            text: `Manger: ${foodItem.name}`,
            description: `Manger ${foodItem.name} pour calmer votre faim.`,
            iconName: 'Utensils',
            type: 'action',
            mood: 'social',
            energyCost: 1,
            timeCost: 5,
            consequences: [`Restaure la faim`, `Utilise 1x ${foodItem.name}`]
        });
    }

    // Action to drink if thirsty
    const drinkItem = player.inventory.find(item => item.type === 'consumable' && item.physiologicalEffects?.thirst && item.physiologicalEffects.thirst > 0);
    if (player.physiology.basic_needs.thirst.level < 70 && drinkItem) {
        actions.push({
            id: `use_item_${drinkItem.instanceId}`,
            text: `Boire: ${drinkItem.name}`,
            description: `Boire ${drinkItem.name} pour étancher votre soif.`,
            iconName: 'GlassWater',
            type: 'action',
            mood: 'social',
            energyCost: 1,
            timeCost: 2,
            consequences: [`Restaure la soif`, `Utilise 1x ${drinkItem.name}`]
        });
    }

    // Action to heal if health is not full
    const medkitItem = player.inventory.find(item => item.type === 'consumable' && item.effects?.Sante && item.effects.Sante > 0);
    if (player.stats.Sante.value < player.stats.Sante.max! && medkitItem) {
         actions.push({
            id: `use_item_${medkitItem.instanceId}`,
            text: `Se soigner: ${medkitItem.name}`,
            description: `Utiliser ${medkitItem.name} pour restaurer votre santé.`,
            iconName: 'Heart',
            type: 'action',
            mood: 'adventurous',
            energyCost: 2,
            timeCost: 10,
            consequences: [`Restaure la santé`, `Utilise 1x ${medkitItem.name}`]
        });
    }

    // Action to read a book
    const bookItem = player.inventory.find(item => item.id === 'generic_book_01');
     if (bookItem) {
         actions.push({
            id: `use_item_${bookItem.instanceId}`,
            text: `Lire: ${bookItem.name}`,
            description: `Prendre un moment pour lire "${bookItem.name}".`,
            iconName: 'BookOpen',
            type: 'reflection',
            mood: 'contemplative',
            energyCost: 1,
            timeCost: 20,
            consequences: [`Gain de connaissances`, `Passe le temps`],
            skillGains: { 'savoir.histoire': 10 }
        });
    }

    // Action to use smartphone
    const phone = player.inventory.find(item => item.id === 'smartphone_01');
     if (phone) {
         actions.push({
            id: `use_item_${phone.instanceId}`,
            text: `Consulter le smartphone`,
            description: `Utiliser votre téléphone pour consulter les actualités ou des messages.`,
            iconName: 'Smartphone',
            type: 'reflection',
            mood: 'social',
            energyCost: 1,
            timeCost: 10,
            consequences: [`Informations`, `Distraction`]
        });
    }


    return actions;
}

export function generateCascadeBasedActions(cascadeResult: CascadeResult | null, player: Player): StoryChoice[] {
    if (!cascadeResult) return [];

    const actions: StoryChoice[] = [];
    
    // Cuisine Module Actions
    const cuisineData = cascadeResult.results.get('cuisine')?.data;
    if (cuisineData?.cookableRecipes) {
        for (const recipe of (cuisineData.cookableRecipes as EnrichedRecipe[])) {
            actions.push({
                id: `craft_recipe_${recipe.id}`,
                text: `Cuisiner: ${recipe.name}`,
                description: `Utiliser vos ingrédients pour préparer un plat de ${recipe.name}.`,
                iconName: 'ChefHat',
                type: 'action',
                mood: 'artistic',
                energyCost: 15,
                timeCost: 30,
                consequences: [`Obtenir 1x ${recipe.name}`, 'Utilise des ingrédients'],
                craftingPayload: { recipe },
                skillGains: { 'survie.premiers_secours': 10 } // Placeholder for actual skill from recipe
            });
        }
    }

    // Livre Module Actions
    const livreData = cascadeResult.results.get('livre')?.data;
    if (livreData?.foundBooks && livreData.foundBooks.length > 0) {
        const firstBook = livreData.foundBooks[0] as BookSearchResult;
        actions.push({
            id: `read_book_${firstBook.title.replace(/\s+/g, '_')}`,
            text: `Lire: ${firstBook.title.substring(0, 25)}...`,
            description: `Prendre le temps de lire le livre trouvé : "${firstBook.title}".`,
            iconName: 'BookOpen',
            type: 'reflection',
            mood: 'contemplative',
            energyCost: 2,
            timeCost: 20,
            consequences: ['Acquérir des connaissances', 'Gagner de l\'XP'],
            skillGains: { 'savoir.histoire': 15 } // Example skill gain
        });
    }

    return actions;
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

export function generateActionsForPOIs(pois: EnhancedPOI[], player: Player, gameTimeInMinutes?: number): StoryChoice[] {
    const contextualChoices: StoryChoice[] = [];
    if (!pois) return [];
  
    for (const poi of pois.slice(0, 8)) { // Limit total POIs considered
      let actionsForThisPoi = 0;
      for (const service of poi.services) {
        if (actionsForThisPoi >= 1) break; // Limit actions to 1 per POI for clarity
  
        if (service.cost.min > player.money) {
          continue; // Cannot afford
        }

        if(gameTimeInMinutes !== undefined && !isShopOpen(gameTimeInMinutes, service.availability)) {
          continue; // Shop is closed
        }
  
        const descriptionDistance = `à proximité`;

        const choice: StoryChoice = {
          id: `${poi.osmId}_${service.id}`,
          text: `${service.name} (${poi.name})`,
          description: `${service.description}, ${descriptionDistance}.`,
          iconName: getIconForService(service.id),
          type: getActionTypeForService(service.id),
          mood: 'adventurous',
          energyCost: Math.round(service.duration / 10) + 1,
          timeCost: service.duration,
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
