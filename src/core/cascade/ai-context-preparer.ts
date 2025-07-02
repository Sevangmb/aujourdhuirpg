
/**
 * @fileOverview Prépare le contexte enrichi pour l'IA narrative.
 * L'IA ne calcule plus, elle raconte seulement.
 */

import type { GameState, GameEvent, StoryChoice, Player, BookSearchResult, EnrichedRecipe, EnhancedPOI } from '@/lib/types';
import type { CascadeResult } from './types';
import { getDistanceInKm } from '@/lib/utils/geo-utils';
import { generateActionsForPOIs, summarizeGameEventsForAI } from '@/lib/game-logic';
import { AdvancedSkillSystem, PlayerStats } from '@/lib/types/player-types';

export class AIContextPreparer {
  
  prepareContext(
    gameState: GameState,
    gameEvents: GameEvent[],
    cascadeResult: CascadeResult | null,
    playerChoice: StoryChoice
  ) {
    if (!gameState.player) {
      throw new Error("Cannot prepare AI context without a player.");
    }

    const gameEventsSummary = summarizeGameEventsForAI(gameEvents);
    const cascadeSummary = this.summarizeCascadeResults(cascadeResult);
    
    const contextualActions = generateActionsForPOIs(gameState.nearbyPois || [], gameState.player, gameState.gameTimeInMinutes);
    const suggestedContextualActions = contextualActions.map(action => ({
        text: action.text,
        description: action.description,
        type: action.type,
        estimatedCost: action.economicImpact?.cost,
    }));
    
    return {
      player: this.preparePlayerContext(gameState.player),
      playerChoiceText: playerChoice.text,
      previousScenarioText: gameState.currentScenario?.scenarioText || "L'aventure commence.",
      gameEvents: gameEventsSummary.replace(/[\n\r]/g, ' '),
      cascadeResult: cascadeSummary.replace(/[\n\r]/g, ' '),
      suggestedContextualActions,
    };
  }

  private preparePlayerContext(player: Player) {
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

    return {
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
        instanceId: item.instanceId, id: item.id, name: item.name,
        description: item.description, type: item.type, quantity: item.quantity,
        condition: item.condition, economics: item.economics,
        memory: { acquisitionStory: item.memory.acquisitionStory },
      })),
      money: player.money,
      currentLocation: player.currentLocation,
      toneSettings: player.toneSettings,
      keyInventoryItems: player.inventory
        .filter(item => item.type !== 'misc' && item.type !== 'key' && item.type !== 'quest')
        .map(item => item.name),
      recentActionTypes: player.journal
        ?.slice(-3).map(entry => entry.type) || [],
      physiologicalState: {
        needsFood: player.physiology.basic_needs.hunger.level < 40,
        needsRest: player.stats.Energie.value < 30,
        isThirsty: player.physiology.basic_needs.thirst.level < 40
      },
    };
  }
  
  private summarizeCascadeResults(cascadeResult: CascadeResult | null): string {
    if (!cascadeResult || !cascadeResult.results.size) {
        return "Aucune analyse contextuelle supplémentaire disponible.";
    }
  
    const summaries: string[] = [];
    const cuisineData = cascadeResult.results.get('cuisine')?.data;
    if (cuisineData?.cookingOpportunities?.length > 0) {
        summaries.push(`Opportunités de Cuisine: ${cuisineData.cookingOpportunities.join(' ')}`);
    }

    const cultureData = cascadeResult.results.get('culture_locale')?.data;
    if (cultureData?.summary && !cultureData.summary.includes('Aucune information')) {
        summaries.push(`Contexte Culturel Local: ${cultureData.summary}`);
    }

    const livreData = cascadeResult.results.get('livre')?.data;
    if (livreData?.foundBooks?.length > 0) {
        const bookTitles = (livreData.foundBooks as BookSearchResult[]).map(b => b.title).join(', ');
        summaries.push(`Recherche de Livres: Des informations sur les livres suivants ont été trouvées: ${bookTitles}.`);
    }

    return summaries.length > 0 ? "Analyses contextuelles: " + summaries.join(" ") : "Aucune analyse contextuelle pertinente.";
  }

  public convertAIOutputToEvents(aiOutput: GenerateScenarioOutput): GameEvent[] {
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
            const pnjForEvent: Omit<PNJ, 'id' | 'firstEncountered' | 'lastSeen'> = { ...pnjData, interactionHistory: [] };
            events.push({ type: 'PNJ_ENCOUNTERED', pnj: pnjForEvent });
        });
    }

    if (aiOutput.newItems) {
        aiOutput.newItems.forEach(itemPayload => events.push({ type: 'DYNAMIC_ITEM_ADDED', payload: itemPayload }));
    }

    if (aiOutput.newTransactions) {
        aiOutput.newTransactions.forEach(txData => events.push({ type: 'MONEY_CHANGED', amount: txData.amount, description: txData.description }));
    }

    if (aiOutput.startCombat) {
        aiOutput.startCombat.forEach(enemyData => events.push({ type: 'COMBAT_STARTED', enemy: enemyData }));
    }

    return events;
  }
}
