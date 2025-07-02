
/**
 * @fileOverview Processeur de logique métier pure - PAS D'IA ICI.
 * Calcule tous les effets déterministes des actions du joueur.
 */

import type { GameState, StoryChoice, GameEvent, Player, IntelligentItem, PlayerStats, DynamicItemCreationPayload, WeatherData, EnhancedPOI } from '@/lib/types';
import { performSkillCheck } from '@/lib/skill-check';
import { getDistanceInKm } from '@/lib/utils/geo-utils';
import { processCombatTurn } from '@/modules/combat/logic';
import { getMasterItemById } from '@/data/items';
import { getWeatherModifier } from '@/lib/game-logic';
import { ESTABLISHMENT_SERVICES } from '@/data/establishment-services';


export class GameLogicProcessor {
  
  processAction(gameState: GameState, choice: StoryChoice, weatherData: WeatherData | null): {
    gameEvents: GameEvent[];
  } {
    if (!gameState.player) {
      console.warn("GameLogicProcessor: processAction called without a player.");
      return { gameEvents: [] };
    }

    const events: GameEvent[] = [];
    events.push({ type: 'JOURNAL_ENTRY_ADDED', payload: { type: 'player_action', text: choice.text } });

    // Combat logic takes precedence
    if (gameState.currentEnemy) {
        const combatResult = processCombatTurn(gameState.player, gameState.currentEnemy, choice);
        events.push(...combatResult.events);
        // Check for combat end
        const finalEnemyHealth = combatResult.events.reduce((health, event) => {
            if(event.type === 'COMBAT_ACTION' && event.target === 'enemy') return event.newHealth;
            return health;
        }, gameState.currentEnemy.health);

        if (finalEnemyHealth <= 0) {
            events.push({ type: 'COMBAT_ENDED', winner: 'player' });
        }
        return { gameEvents: events };
    }
    
    // Non-combat logic
    if (choice.travelChoiceInfo) {
      this.processTravel(gameState, choice, events);
    } else if (choice.poiReference) {
      this.processPoiInteraction(gameState, choice, events);
    } else if (choice.id.startsWith('use_item_')) {
      this.processUseItem(gameState, choice, events);
    } else if (choice.craftingPayload) {
      this.processCrafting(gameState, choice, events);
    }

    // Generic effects for most actions
    this.applyGenericActionEffects(gameState, choice, events);

    // Apply skill check if present
    if (choice.skillCheck) {
      this.processSkillCheck(gameState, choice, weatherData, events);
    }

    return { gameEvents: events };
  }

  private processSkillCheck(state: GameState, choice: StoryChoice, weatherData: WeatherData | null, events: GameEvent[]): void {
    if (!choice.skillCheck || !state.player) return;

    const { player } = state;
    const { skill, difficulty } = choice.skillCheck;
    
    // Get weather modifier for the skill check
    const weatherMod = getWeatherModifier(skill, weatherData);
    if (weatherMod.reason) {
        events.push({ type: 'TEXT_EVENT', text: weatherMod.reason });
    }
    
    const result = performSkillCheck(player.skills, player.stats, skill, difficulty, player.inventory, weatherMod.modifier, player.physiology, player.momentum);
    
    events.push({
      type: 'SKILL_CHECK_RESULT', skill, success: result.success, degree: result.degreeOfSuccess,
      roll: result.rollValue, total: result.totalAchieved, difficulty: result.difficultyTarget,
    });
    
    // Update Momentum
    const newMomentum = { ...player.momentum };
    if (result.success) {
      newMomentum.consecutive_successes += 1;
      newMomentum.consecutive_failures = 0;
      newMomentum.momentum_bonus = Math.min(5, newMomentum.consecutive_successes);
      newMomentum.desperation_bonus = 0;
    } else {
      newMomentum.consecutive_failures += 1;
      newMomentum.consecutive_successes = 0;
      newMomentum.desperation_bonus = Math.min(10, newMomentum.consecutive_failures * 2);
      newMomentum.momentum_bonus = 0;
    }
    events.push({ type: 'MOMENTUM_UPDATED', newMomentum });

    // Award skill XP based on result
    const xpGained = result.success ? 10 : 3;
    events.push({ type: 'SKILL_XP_AWARDED', skill, amount: xpGained });

    // Award player XP and item XP only on success
    if (result.success) {
      events.push({ type: 'XP_GAINED', amount: 15 });
      result.itemContributions.forEach(contribution => {
        const item = player.inventory.find(i => i.name === contribution.name);
        if (item) {
          events.push({ type: 'ITEM_XP_GAINED', instanceId: item.instanceId, itemName: item.name, xp: 5 });
        }
      });
    }
  }
  
  private processTravel(state: GameState, choice: StoryChoice, events: GameEvent[]): void {
    if (!choice.travelChoiceInfo || !state.player) return;

    const { destination, mode } = choice.travelChoiceInfo;
    const { player } = state;
    const origin = player.currentLocation;

    const distance = getDistanceInKm(origin.latitude, origin.longitude, destination.latitude, destination.longitude);

    let time = 0, cost = 0, energy = 0;
    if (mode === 'walk') {
      time = Math.round(distance * 12);
      energy = Math.round(distance * 5) + 1;
    } else if (mode === 'metro') {
      time = Math.round(distance * 4 + 10);
      cost = 1.90;
      energy = Math.round(distance * 1) + 1;
    } else { // taxi
      time = Math.round(distance * 2 + 5);
      cost = parseFloat((5 + distance * 1.5).toFixed(2));
      energy = Math.round(distance * 0.5);
    }

    if (player.money < cost || player.stats.Energie.value < energy) {
      events.push({ type: 'TEXT_EVENT', text: "Vous ne pouvez pas effectuer ce voyage." });
      return;
    }
    
    if (cost > 0) {
      events.push({ type: 'MONEY_CHANGED', amount: -cost, description: `Transport en ${mode}` });
    }

    events.push({ type: 'PLAYER_TRAVELS', from: origin.name, destination: destination, mode: mode, duration: time });
    events.push({ type: 'PLAYER_STAT_CHANGE', stat: 'Energie', change: -energy, finalValue: player.stats.Energie.value - energy });
  }

  private processPoiInteraction(state: GameState, choice: StoryChoice, events: GameEvent[]): void {
    if (!choice.poiReference || !state.player || !state.nearbyPois) return;
  
    const { player, nearbyPois } = state;
    const { poiReference } = choice;
  
    const poi = nearbyPois.find(p => p.osmId === poiReference.osmId);
    if (!poi) {
      events.push({ type: 'TEXT_EVENT', text: "Ce lieu n'est plus disponible." });
      return;
    }
  
    const service = poi.services.find(s => s.id === poiReference.serviceId);
    if (!service) {
      events.push({ type: 'TEXT_EVENT', text: "Ce service n'est plus disponible." });
      return;
    }
  
    const cost = service.cost.min; // Use min cost for simplicity
    if (player.money < cost) {
      events.push({ type: 'TEXT_EVENT', text: `Vous n'avez pas assez d'argent. Il vous faut ${cost.toFixed(2)}€.` });
      return;
    }
  
    if (cost > 0) {
      events.push({ type: 'MONEY_CHANGED', amount: -cost, description: `${service.name} à ${poi.name}` });
    }
  
    if (service.resultingItemId) {
      const masterItem = getMasterItemById(service.resultingItemId);
      if (masterItem) {
        events.push({
          type: 'ITEM_ADDED',
          itemId: masterItem.id,
          itemName: masterItem.name,
          quantity: 1
        });
      }
    }
  }

  private processUseItem(state: GameState, choice: StoryChoice, events: GameEvent[]): void {
    if (!state.player) return;
    
    const instanceId = choice.id.replace('use_item_', '');
    const item = state.player.inventory.find(i => i.instanceId === instanceId);
    if (!item) {
      events.push({ type: 'TEXT_EVENT', text: "Objet non trouvé." });
      return;
    }
    
    events.push({ type: 'ITEM_USED', instanceId, itemName: item.name, description: `Utilisation de ${item.name}` });

    if (item.type === 'consumable') {
      events.push({ type: 'ITEM_REMOVED', itemId: item.id, itemName: item.name, quantity: 1 });
      if (item.effects) {
        Object.entries(item.effects).forEach(([stat, value]) => {
          events.push({ type: 'PLAYER_STAT_CHANGE', stat: stat as keyof PlayerStats, change: value, finalValue: state.player!.stats[stat as keyof PlayerStats].value + value });
        });
      }
      if (item.physiologicalEffects) {
        Object.entries(item.physiologicalEffects).forEach(([stat, value]) => {
            if (value === undefined) return;
            const finalValue = state.player!.physiology.basic_needs[stat as 'hunger' | 'thirst'].level + value;
            events.push({ type: 'PLAYER_PHYSIOLOGY_CHANGE', stat: stat as 'hunger' | 'thirst', change: value, finalValue });
        });
      }
    }
  }

  private processCrafting(state: GameState, choice: StoryChoice, events: GameEvent[]): void {
    if (!state.player || !choice.craftingPayload?.recipe) {
      return;
    }
    const { recipe } = choice.craftingPayload;
    const { player } = state;

    // 1. Verify and collect ingredients to remove
    const ingredientsToRemove: { itemId: string; quantity: number }[] = [];
    const inventoryCopy = [...player.inventory];
    let canCraft = true;

    for (const recipeIngredient of recipe.ingredients) {
      const ingredientNameLower = recipeIngredient.name.toLowerCase();
      
      const itemIndex = inventoryCopy.findIndex(invItem => 
        invItem.name.toLowerCase().includes(ingredientNameLower) && invItem.quantity > 0
      );
      
      if (itemIndex > -1) {
        const playerItem = inventoryCopy[itemIndex];
        ingredientsToRemove.push({ itemId: playerItem.id, quantity: 1 });
        // Reduce quantity in copy to prevent using the same item for multiple ingredients
        inventoryCopy[itemIndex] = { ...playerItem, quantity: playerItem.quantity - 1 };
      } else {
        canCraft = false;
        break; // Missing an ingredient
      }
    }

    if (!canCraft) {
      events.push({ type: 'TEXT_EVENT', text: "Il vous manque des ingrédients pour cuisiner cela." });
      return;
    }
    
    // 2. Generate events to remove ingredients
    for (const item of ingredientsToRemove) {
      const masterItem = getMasterItemById(item.itemId);
      if(masterItem) {
          events.push({ type: 'ITEM_REMOVED', itemId: item.itemId, itemName: masterItem.name, quantity: item.quantity });
      }
    }

    // 3. Generate event to add the crafted meal
    const mealPayload: DynamicItemCreationPayload = {
        baseItemId: 'generic_meal_01',
        overrides: {
            name: recipe.name,
            description: `Un plat de ${recipe.name} que vous avez préparé. Ça sent délicieusement bon.`,
            physiologicalEffects: { hunger: 50, thirst: 10 },
        }
    };
    events.push({ type: 'DYNAMIC_ITEM_ADDED', payload: mealPayload });

    // 4. Add skill XP gain for crafting
    if (choice.skillGains) {
        for(const [skill, amount] of Object.entries(choice.skillGains)) {
            events.push({ type: 'SKILL_XP_AWARDED', skill, amount });
        }
    }

    events.push({ type: 'TEXT_EVENT', text: `Vous avez réussi à cuisiner : ${recipe.name}!` });
  }

  private applyGenericActionEffects(state: GameState, choice: StoryChoice, events: GameEvent[]): void {
    if (!state.player) return;

    const { player } = state;
    const timeCost = choice.timeCost || 0;
    const energyCost = choice.energyCost || 0;

    events.push({ type: 'GAME_TIME_PROGRESSED', minutes: timeCost });
    
    if (energyCost > 0) {
      events.push({ type: 'PLAYER_STAT_CHANGE', stat: 'Energie', change: -energyCost, finalValue: player.stats.Energie.value - energyCost });
    }
    
    // Generic physiological decay
    const hungerDecay = (timeCost * 0.05) + (energyCost * 0.1);
    const thirstDecay = (timeCost * 0.08) + (energyCost * 0.08);

    if (hungerDecay > 0) {
        events.push({ type: 'PLAYER_PHYSIOLOGY_CHANGE', stat: 'hunger', change: -hungerDecay, finalValue: player.physiology.basic_needs.hunger.level - hungerDecay });
    }
    if (thirstDecay > 0) {
        events.push({ type: 'PLAYER_PHYSIOLOGY_CHANGE', stat: 'thirst', change: -thirstDecay, finalValue: player.physiology.basic_needs.thirst.level - thirstDecay });
    }
  }
}
