
/**
 * @fileOverview Orchestrateur principal qui coordonne tous les modules
 * et sépare clairement la logique métier de l'IA narrative.
 */

import type { GameState, StoryChoice, GameEvent } from '@/lib/types';
import type { CascadeResult, EnrichedContext } from './types';
import { cascadeManager } from './cascade-manager';
import { runCascadeForAction } from './cascade-system';
import { GameLogicProcessor } from '../logic/game-logic-processor';
import { AIContextPreparer } from './ai-context-preparer';

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
    playerChoice: StoryChoice
  ): Promise<{
    gameLogicResult: {
      gameEvents: GameEvent[];
      cascadeResult: CascadeResult | null,
    };
    aiContext: any;
  }> {
    
    // 1. LOGIQUE MÉTIER PURE (pas d'IA)
    const gameLogicResult = await this.gameLogicProcessor.processAction(gameState, playerChoice);
    
    // Apply the deterministic events to get the next state for the cascade
    const stateAfterLogic = gameReducer(gameState, { type: 'APPLY_GAME_EVENTS', payload: gameLogicResult.gameEvents });
    
    // 2. ENRICHISSEMENT CONTEXTUEL VIA CASCADE
    // La cascade s'exécute sur l'état *après* la logique déterministe.
    const cascadeResult = await runCascadeForAction(stateAfterLogic, playerChoice);

    // 3. PRÉPARATION DU CONTEXTE POUR L'IA NARRATIVE
    const aiContext = this.aiContextPreparer.prepareContext(
      stateAfterLogic,
      gameLogicResult.gameEvents,
      cascadeResult,
      playerChoice
    );

    return {
      gameLogicResult: {
        ...gameLogicResult,
        cascadeResult,
      },
      aiContext
    };
  }
}

// Minimal reducer to apply events for state progression within the orchestrator
function gameReducer(state: GameState, action: { type: 'APPLY_GAME_EVENTS', payload: GameEvent[] }): GameState {
  // This is a simplified version of the main reducer. It's sufficient for the orchestrator's needs.
  let newState = { ...state };
  for (const event of action.payload) {
      if (event.type === 'PLAYER_TRAVELS' && newState.player) {
          newState = { ...newState, player: { ...newState.player, currentLocation: event.destination } };
      }
      // Add other critical state changes if needed for cascade dependencies
  }
  return newState;
}
