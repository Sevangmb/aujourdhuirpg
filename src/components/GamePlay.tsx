
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { StoryChoice, GameEvent } from '@/lib/types';
import { processPlayerAction, prepareAIInput, gameReducer, convertAIOutputToEvents, generateActionsForPOIs, generatePlayerStateActions, enrichAIChoicesWithLogic, generateCascadeBasedActions, generateCombatActions } from '@/lib/game-logic';
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


const GamePlay: React.FC = () => {
  const { gameState, dispatch } = useGame();
  const { weather: { data: weatherData } } = gameState.contextualData;
  const { currentEnemy } = gameState;

  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const handleChoiceSelected = useCallback(async (choice: StoryChoice) => {
    if (!gameState || !gameState.player) return;
    setIsLoading(true);

    try {
      // Phase 1: Run cascade for context (only for non-combat actions)
      const cascadeResult = gameState.currentEnemy ? null : await runCascadeForAction(gameState, choice);

      // Phase 2: Process action to get deterministic events
      const { events: deterministicEvents } = await processPlayerAction(
        gameState.player, 
        gameState.currentEnemy || null, 
        choice, 
        weatherData,
        cascadeResult
      );
      
      // Phase 3: Apply events to a temporary state to get the state *after* the action, for the AI's context
      const stateAfterAction = gameReducer(gameState, { type: 'APPLY_GAME_EVENTS', payload: deterministicEvents });

      // Phase 4: Prepare input for the AI with the calculated events and future state
      const inputForAI = prepareAIInput(stateAfterAction, choice, deterministicEvents, cascadeResult);
      if (!inputForAI) throw new Error("Failed to prepare AI input.");
      
      // Phase 5: Get the narration, next choices, and potential new game events from the AI
      const aiOutput: GenerateScenarioOutput = await generateScenario(inputForAI);

      // Phase 6: Convert AI proposals (new quests, items, etc.) into game events
      const aiGeneratedEvents = convertAIOutputToEvents(aiOutput);

      // Phase 7: Dispatch ALL events (deterministic + AI-generated) to *actually* update the state
      const allEvents = [...deterministicEvents, ...aiGeneratedEvents];
      dispatch({ type: 'APPLY_GAME_EVENTS', payload: allEvents });
      
      // Phase 8: Post-AI logic - enrich choices and add contextual ones
      // This is now done after the main state update to have the final final state
      const finalState = gameReducer(stateAfterAction, { type: 'APPLY_GAME_EVENTS', payload: aiGeneratedEvents });
      
      const enrichedAIChoices = enrichAIChoicesWithLogic(aiOutput.choices || [], finalState.player!);
      const cascadeActions = generateCascadeBasedActions(cascadeResult, finalState.player!);
      const poiActions = generateActionsForPOIs(finalState.nearbyPois || [], finalState.player!, finalState.gameTimeInMinutes);
      const stateBasedActions = generatePlayerStateActions(finalState.player!);
      
      let allChoices = [...enrichedAIChoices, ...cascadeActions, ...poiActions, ...stateBasedActions];

      if (finalState.currentEnemy) {
        allChoices = generateCombatActions(finalState.player, finalState.currentEnemy);
      }


      dispatch({ type: 'SET_CURRENT_SCENARIO', payload: { 
          scenarioText: aiOutput.scenarioText, 
          choices: allChoices, 
          aiRecommendation: aiOutput.aiRecommendation 
      }});
      
    } catch (error) {
      let errorMessage = "Impossible de générer le prochain scénario.";
      if (error instanceof Error) { errorMessage += ` Détail: ${error.message}`; }
      toast({ variant: "destructive", title: "Erreur de Connexion avec l'IA", description: errorMessage });
      // Reset loading state on error to allow player to try again
      setIsLoading(false); 
    }
  }, [gameState, dispatch, toast, weatherData]);


  useEffect(() => {
    // This effect ensures the loading spinner is correctly turned off after the state update from handleChoiceSelected completes.
    if(isLoading && gameState) {
      setIsLoading(false);
    }
  }, [gameState, isLoading]);


  if (!gameState || !gameState.player || !gameState.currentScenario) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl">Chargement des données du jeu...</p>
      </div>
    );
  }

  const { currentScenario } = gameState;
  
  // Determine which choices to display
  const availableChoices = currentEnemy 
    ? generateCombatActions(gameState.player, currentEnemy)
    : currentScenario.choices || [];


  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <div className="flex-grow flex flex-col p-4 md:p-6 space-y-6">
        {currentEnemy && <CombatStatusDisplay enemy={currentEnemy} />}
        <ScenarioDisplay scenarioHTML={currentScenario.scenarioText} isLoading={isLoading} />
        {!isLoading && (
          <ChoiceSelectionDisplay
            choices={availableChoices}
            onSelectChoice={handleChoiceSelected}
            isLoading={isLoading}
            aiRecommendation={currentEnemy ? null : currentScenario.aiRecommendation || null}
          />
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
