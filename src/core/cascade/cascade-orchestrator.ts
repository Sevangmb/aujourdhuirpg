
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
      newGameState: GameState;
      gameEvents: GameEvent[];
      cascadeResult: CascadeResult | null,
    };
    aiContext: any;
  }> {
    
    // 1. LOGIQUE MÉTIER PURE (pas d'IA)
    const gameLogicResult = await this.gameLogicProcessor.processAction(gameState, playerChoice);
    
    // 2. ENRICHISSEMENT CONTEXTUEL VIA CASCADE
    // La cascade s'exécute sur l'état *après* la logique déterministe.
    const cascadeResult = await runCascadeForAction(gameLogicResult.newGameState, playerChoice);

    // 3. PRÉPARATION DU CONTEXTE POUR L'IA NARRATIVE
    const aiContext = this.aiContextPreparer.prepareContext(
      gameLogicResult.newGameState,
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
