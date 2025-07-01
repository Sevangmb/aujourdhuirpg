
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { StoryChoice, GameAction, GameEvent } from '@/lib/types';
import type { Enemy } from '@/modules/combat/types';
import { processPlayerAction, prepareAIInput, gameReducer, convertAIOutputToEvents, generateActionsForPOIs, generatePlayerStateActions, enrichAIChoicesWithLogic, generateCascadeBasedActions } from '@/lib/game-logic';
import ScenarioDisplay from './ScenarioDisplay';
import { generateScenario, type GenerateScenarioOutput } from '@/ai/flows/generate-scenario';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { runCascadeForAction } from '@/core/cascade/cascade-system';

import ChoiceSelectionDisplay from './ChoiceSelectionDisplay';
import GameSidebar from './GameSidebar';
import { useGame } from '@/contexts/GameContext';
import CombatStatusDisplay from './CombatStatusDisplay';
import type { CascadeResult } from '@/core/cascade/types';


const GamePlay: React.FC = () => {
  const { gameState, dispatch } = useGame();
  const { weather: { data: weatherData } } = gameState.contextualData;

  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const handleChoiceSelected = useCallback(async (choice: StoryChoice) => {
    if (!gameState || !gameState.player) return;

    setIsLoading(true);

    try {
      // 1. Run the enrichment cascade based on the chosen action
      const cascadeResult = await runCascadeForAction(gameState, choice);

      // 2. Process the action in the game logic layer to get a list of deterministic events
      const { events: deterministicEvents } = await processPlayerAction(gameState.player, gameState.currentEnemy || null, choice, weatherData, cascadeResult);
      
      // 3. Apply events to a temporary state to get the state *after* the action, for the AI's context
      const stateAfterAction = gameReducer(gameState, { type: 'APPLY_GAME_EVENTS', payload: deterministicEvents });

      // 4. Prepare the input for the AI with the calculated events, the future state, and cascade results
      const inputForAI = prepareAIInput(stateAfterAction, choice, deterministicEvents, cascadeResult);
      if (!inputForAI) throw new Error("Failed to prepare AI input.");
      
      // 5. Get the narration, next choices, and potential new game events from the AI
      const aiOutput: GenerateScenarioOutput = await generateScenario(inputForAI);

      // 6. Convert AI proposals (new quests, items, etc.) into game events
      const aiGeneratedEvents = convertAIOutputToEvents(aiOutput);

      // 7. Dispatch ALL events (deterministic + AI-generated) to *actually* update the state
      const allEvents = [...deterministicEvents, ...aiGeneratedEvents];
      dispatch({ type: 'APPLY_GAME_EVENTS', payload: allEvents });
      
      // 8. Generate contextual actions based on POIs and Player State in the new state
      // We need to re-run the reducer on a temp variable to get the final state for choice generation
      const finalStateAfterAllEvents = gameReducer(stateAfterAction, { type: 'APPLY_GAME_EVENTS', payload: aiGeneratedEvents });
      
      // 9. Generate actions based on the cascade result
      const cascadeActions = generateCascadeBasedActions(cascadeResult, finalStateAfterAllEvents.player!);

      const poiActions = generateActionsForPOIs(finalStateAfterAllEvents.nearbyPois || [], finalStateAfterAllEvents.player!);
      const stateBasedActions = generatePlayerStateActions(finalStateAfterAllEvents.player!);
      
      // 10. Enrich AI choices with calculated costs and probabilities
      const enrichedAIChoices = enrichAIChoicesWithLogic(aiOutput.choices || [], finalStateAfterAllEvents.player!);
      
      // 11. Merge all choices
      const allChoices = [...enrichedAIChoices, ...cascadeActions, ...poiActions, ...stateBasedActions];

      // 12. Set the new scenario from the AI's output, now with fully enriched and merged choices
      dispatch({ type: 'SET_CURRENT_SCENARIO', payload: { scenarioText: aiOutput.scenarioText, choices: allChoices, aiRecommendation: aiOutput.aiRecommendation } });

    } catch (error) {
      let errorMessage = "Impossible de générer le prochain scénario.";
      if (error instanceof Error) { errorMessage += ` Détail: ${error.message}`; }
      toast({ variant: "destructive", title: "Erreur de Connexion avec l'IA", description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  }, [gameState, dispatch, toast, weatherData]);


  if (!gameState || !gameState.player || !gameState.currentScenario) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl">Chargement des données du jeu...</p>
      </div>
    );
  }

  const { currentScenario, currentEnemy } = gameState;

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <div className="flex-grow flex flex-col p-4 md:p-6 space-y-6">
        {currentEnemy && <CombatStatusDisplay enemy={currentEnemy} />}
        <ScenarioDisplay scenarioHTML={currentScenario.scenarioText} isLoading={isLoading} />
        {!isLoading && !currentEnemy && (
          <ChoiceSelectionDisplay
            choices={currentScenario.choices || []}
            onSelectChoice={handleChoiceSelected}
            isLoading={isLoading}
            aiRecommendation={currentScenario.aiRecommendation || null}
          />
        )}
         {!isLoading && currentEnemy && (
          <div className="text-center p-4">
              <p className="font-bold text-destructive">LE COMBAT EST ENGAGÉ !</p>
              <p className="text-muted-foreground text-sm">Le système de combat n'est pas encore implémenté.</p>
          </div>
        )}
      </div>

      {!isMobile && <GameSidebar />}
      {isMobile && (
        <div className="md:hidden sticky bottom-0 z-10">
          <GameSidebar />
        </div>
      )}
    </div>
  );
};

export default GamePlay;
