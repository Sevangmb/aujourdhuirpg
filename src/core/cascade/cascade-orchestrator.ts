
/**
 * @fileOverview Orchestrateur principal qui coordonne tous les modules
 * et sépare clairement la logique métier de l'IA narrative.
 */

import type { GameState, StoryChoice, GameEvent, WeatherData, PlayerStats } from '@/lib/types';
import type { CascadeResult, EnrichedContext } from './types';
import { runCascadeForAction } from './cascade-system';
import { GameLogicProcessor } from '../logic/game-logic-processor';
import { AIContextPreparer } from './ai-context-preparer';
import { gameReducer } from '@/lib/game-logic';
import type { GameContextData } from '@/contexts/GameContext';
import { generateTravelEvent } from '@/ai/flows/generate-travel-event-flow';


export class CascadeOrchestrator {
  public gameLogicProcessor: GameLogicProcessor;
  public aiContextPreparer: AIContextPreparer;

  constructor() {
    this.gameLogicProcessor = new GameLogicProcessor();
    this.aiContextPreparer = new AIContextPreparer();
  }

  /**
   * Point d'entrée principal pour traiter une action du joueur.
   * 1. Traite la logique métier déterministe.
   * 2. Exécute la cascade d'enrichissement contextuel.
   * 3. Prépare le contexte final pour l'IA narrative.
   */
  async processPlayerAction(
    gameState: GameState, 
    contextualData: GameContextData,
    playerChoice: StoryChoice
  ): Promise<{
    gameLogicResult: {
      gameEvents: GameEvent[];
      cascadeResult: CascadeResult | null;
    };
    aiContext: any;
  }> {
    
    // 1. LOGIQUE MÉTIER PURE (pas d'IA)
    // C'est maintenant un appel synchrone.
    let { gameEvents } = this.gameLogicProcessor.processAction(
      gameState, 
      playerChoice,
      contextualData.weather.data
    );

    // 2. ORCHESTRATION DES FLUX SECONDAIRES
    // L'orchestrateur, et non le processeur logique, appelle les flux d'IA secondaires.
    const travelEvent = gameEvents.find(e => e.type === 'PLAYER_TRAVELS') as Extract<GameEvent, {type: 'PLAYER_TRAVELS'}> | undefined;
    if (travelEvent && gameState.player) {
        // Aplatir les stats pour correspondre au schéma Zod attendu par le flux Genkit
        const flatStats = (Object.keys(gameState.player.stats) as Array<keyof typeof gameState.player.stats>).reduce((acc, key) => {
            acc[key] = gameState.player!.stats[key].value;
            return acc;
        }, {} as Record<string, number>);

        // Aplatir les compétences pour correspondre au schéma Zod attendu (z.record(z.record(z.number())))
        const flatSkills = (Object.keys(gameState.player.skills) as Array<keyof typeof gameState.player.skills>).reduce((acc, category) => {
            const skillsInCategory = gameState.player!.skills[category];
            const subSkills: Record<string, number> = {};
            for (const skillName in skillsInCategory) {
                subSkills[skillName] = skillsInCategory[skillName].level;
            }
            acc[category] = subSkills;
            return acc;
        }, {} as Record<string, Record<string, number>>);


        const travelNarrativeResult = await generateTravelEvent({
            travelMode: travelEvent.mode as 'walk' | 'metro' | 'taxi',
            origin: gameState.player.currentLocation,
            destination: travelEvent.destination,
            gameTimeInMinutes: gameState.gameTimeInMinutes,
            playerStats: flatStats as any,
            playerSkills: flatSkills as any,
        });

        if (travelNarrativeResult.narrative) {
            gameEvents.push({ type: 'TRAVEL_EVENT', narrative: travelNarrativeResult.narrative });
        }
    }
    
    // Appliquer les événements déterministes pour obtenir l'état suivant pour la cascade
    const stateAfterLogic = gameReducer(gameState, { type: 'APPLY_GAME_EVENTS', payload: gameEvents });
    
    // 3. ENRICHISSEMENT CONTEXTUEL VIA CASCADE
    const cascadeResult = await runCascadeForAction(stateAfterLogic, playerChoice);

    // 4. PRÉPARATION DU CONTEXTE POUR L'IA NARRATIVE PRINCIPALE
    const aiContext = this.aiContextPreparer.prepareContext(
      stateAfterLogic,
      gameEvents,
      cascadeResult,
      playerChoice
    );

    return {
      gameLogicResult: {
        gameEvents,
        cascadeResult,
      },
      aiContext
    };
  }
}
