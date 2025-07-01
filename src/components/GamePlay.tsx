
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { StoryChoice, GameEvent } from '@/lib/types';
import type { Enemy } from '@/modules/combat/types';
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
import type { CascadeResult } from '@/core/cascade/types';


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
      // 1. Process the action (combat or exploration) to get deterministic events
      const { events: deterministicEvents } = await processPlayerAction(
        gameState.player, 
        gameState.currentEnemy || null, 
        choice, 
        weatherData, 
        null // No cascade for combat actions for now
      );
      
      // 2. Apply events to a temporary state to get the state *after* the action, for the AI's context
      const stateAfterAction = gameReducer(gameState, { type: 'APPLY_GAME_EVENTS', payload: deterministicEvents });

      // 3. Prepare the input for the AI with the calculated events and the future state
      const inputForAI = prepareAIInput(stateAfterAction, choice, deterministicEvents, null);
      if (!inputForAI) throw new Error("Failed to prepare AI input.");
      
      // 4. Get the narration, next choices, and potential new game events from the AI
      const aiOutput: GenerateScenarioOutput = await generateScenario(inputForAI);

      // 5. Convert AI proposals (new quests, items, etc.) into game events
      const aiGeneratedEvents = convertAIOutputToEvents(aiOutput);

      // 6. Dispatch ALL events (deterministic + AI-generated) to *actually* update the state
      const allEvents = [...deterministicEvents, ...aiGeneratedEvents];
      dispatch({ type: 'APPLY_GAME_EVENTS', payload: allEvents });
      
      // --- This part is now skipped for combat turns, narration is enough ---
      if (!stateAfterAction.currentEnemy) {
          const finalStateAfterAllEvents = gameReducer(stateAfterAction, { type: 'APPLY_GAME_EVENTS', payload: aiGeneratedEvents });
          const cascadeResult = await runCascadeForAction(finalStateAfterAllEvents, choice);
          const cascadeActions = generateCascadeBasedActions(cascadeResult, finalStateAfterAllEvents.player!);
          const poiActions = generateActionsForPOIs(finalStateAfterAllEvents.nearbyPois || [], finalStateAfterAllEvents.player!, finalStateAfterAllEvents.gameTimeInMinutes);
          const stateBasedActions = generatePlayerStateActions(finalStateAfterAllEvents.player!);
          const enrichedAIChoices = enrichAIChoicesWithLogic(aiOutput.choices || [], finalStateAfterAllEvents.player!);
          const allChoices = [...enrichedAIChoices, ...cascadeActions, ...poiActions, ...stateBasedActions];
          dispatch({ type: 'SET_CURRENT_SCENARIO', payload: { scenarioText: aiOutput.scenarioText, choices: allChoices, aiRecommendation: aiOutput.aiRecommendation } });
      } else {
           dispatch({ type: 'SET_CURRENT_SCENARIO', payload: { ...aiOutput, choices: [] } }); // Clear choices in combat, AI gives narration
      }

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
