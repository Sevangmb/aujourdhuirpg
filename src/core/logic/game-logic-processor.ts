
/**
 * @fileOverview Processeur de logique métier pure - PAS D'IA ICI.
 * Calcule tous les effets déterministes des actions du joueur.
 */

import type { GameState, StoryChoice, GameEvent, Player, IntelligentItem, PlayerStats } from '@/lib/types';
import { performSkillCheck } from '@/lib/skill-check';
import { getDistanceInKm } from '@/lib/utils/geo-utils';
import { generateTravelEvent } from '@/ai/flows/generate-travel-event-flow';
import { processCombatTurn } from '@/modules/combat/logic';

export class GameLogicProcessor {
  
  async processAction(gameState: GameState, choice: StoryChoice): Promise<{
    gameEvents: GameEvent[];
  }> {
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
      await this.processTravel(gameState, choice, events);
    } else if (choice.economicImpact) {
      this.processPurchase(gameState, choice, events);
    } else if (choice.id.startsWith('use_item_')) {
      this.processUseItem(gameState, choice, events);
    }

    // Generic effects for most actions
    this.applyGenericActionEffects(gameState, choice, events);

    // Apply skill check if present
    if (choice.skillCheck) {
      this.processSkillCheck(gameState, choice, events);
    }

    return { gameEvents: events };
  }

  private processSkillCheck(state: GameState, choice: StoryChoice, events: GameEvent[]): void {
    if (!choice.skillCheck || !state.player) return;

    const { player } = state;
    const { skill, difficulty } = choice.skillCheck;
    
    const result = performSkillCheck(player.skills, player.stats, skill, difficulty, player.inventory, 0, player.physiology, player.momentum);
    
    events.push({
      type: 'SKILL_CHECK_RESULT', skill, success: result.success, degree: result.degreeOfSuccess,
      roll: result.rollValue, total: result.totalAchieved, difficulty: result.difficultyTarget,
    });
    
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
  
  private async processTravel(state: GameState, choice: StoryChoice, events: GameEvent[]): Promise<void> {
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

    const travelNarrativeResult = await generateTravelEvent({
        travelMode: mode, origin, destination, gameTimeInMinutes: state.gameTimeInMinutes,
        playerStats: player.stats, playerSkills: player.skills,
    });
    const travelNarrative = travelNarrativeResult.narrative;
    
    if (travelNarrative) {
      events.push({ type: 'TRAVEL_EVENT', narrative: travelNarrative });
    }

    events.push({ type: 'PLAYER_TRAVELS', from: origin.name, destination: destination, mode: mode, duration: time });
    events.push({ type: 'PLAYER_STAT_CHANGE', stat: 'Energie', change: -energy, finalValue: player.stats.Energie.value - energy });
  }

  private processPurchase(state: GameState, choice: StoryChoice, events: GameEvent[]): void {
    if (!choice.economicImpact || !state.player) return;

    const cost = choice.economicImpact.cost.min; // Use min cost for simplicity
    if (state.player.money < cost) {
      events.push({ type: 'TEXT_EVENT', text: "Pas assez d'argent." });
      return;
    }
    events.push({ type: 'MONEY_CHANGED', amount: -cost, description: `Achat: ${choice.text}` });
    
    // Here you could add the item to the inventory if the choice included an item ID
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
