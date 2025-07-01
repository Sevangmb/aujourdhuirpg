"use client";

import React, { useState, useCallback } from 'react';
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
    if (isLoading || !gameState || !gameState.player) return;
    setIsLoading(true);

    try {
      const cascadeResult = gameState.currentEnemy ? null : await runCascadeForAction(gameState, choice);
      
      const { events: deterministicEvents } = await processPlayerAction(
        gameState.player, 
        gameState.currentEnemy || null, 
        choice, 
        weatherData,
        cascadeResult
      );
      
      const stateAfterAction = gameReducer(gameState, { type: 'APPLY_GAME_EVENTS', payload: deterministicEvents });

      const inputForAI = prepareAIInput(stateAfterAction, choice, deterministicEvents, cascadeResult);
      if (!inputForAI) throw new Error("Failed to prepare AI input.");
      
      const aiOutput: GenerateScenarioOutput = await generateScenario(inputForAI);

      const aiGeneratedEvents = convertAIOutputToEvents(aiOutput);

      const allEvents = [...deterministicEvents, ...aiGeneratedEvents];
      dispatch({ type: 'APPLY_GAME_EVENTS', payload: allEvents });
      
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
    } finally {
        setIsLoading(false);
    }
  }, [gameState, dispatch, toast, weatherData, isLoading]);


  if (!gameState || !gameState.player || !gameState.currentScenario) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl">Chargement des données du jeu...</p>
      </div>
    );
  }

  const { currentScenario } = gameState;
  
  const availableChoices = currentEnemy 
    ? generateCombatActions(gameState.player, currentEnemy)
    : currentScenario.choices || [];


  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <div className="flex-grow flex flex-col p-4 md:p-6 space-y-6">
        {currentEnemy && <CombatStatusDisplay enemy={currentEnemy} />}
        <ScenarioDisplay scenarioHTML={currentScenario.scenarioText} isLoading={isLoading} />
        <ChoiceSelectionDisplay
            choices={availableChoices}
            onSelectChoice={handleChoiceSelected}
            isLoading={isLoading}
            aiRecommendation={currentEnemy ? null : currentScenario.aiRecommendation || null}
          />
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
