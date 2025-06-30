
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { StoryChoice, GameAction, Enemy, GameEvent } from '@/lib/types';
import { processPlayerAction, prepareAIInput, gameReducer } from '@/lib/game-logic';
import ScenarioDisplay from './ScenarioDisplay';
import { generateScenario, type GenerateScenarioOutput } from '@/ai/flows/generate-scenario';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { calculateSuccessProbability } from '@/lib/skill-check';
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
  const [currentChoices, setCurrentChoices] = useState<StoryChoice[]>([]);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  useEffect(() => {
    const player = gameState?.player;
    const choices = gameState?.currentScenario?.choices || [];

    if (player) {
      const choicesWithProbability = choices.map(choice => {
        if (choice.skillCheck) {
          const probability = calculateSuccessProbability(
            player.skills,
            player.stats,
            choice.skillCheck.skill,
            choice.skillCheck.difficulty,
            player.inventory, // Pass inventory for accurate calculation
            0, // Situational modifiers from weather etc. are calculated server-side in deterministic effects
            player.physiology
          );
          return { ...choice, successProbability: probability };
        }
        return choice;
      });
      setCurrentChoices(choicesWithProbability);
    } else {
      setCurrentChoices(choices);
    }
  }, [gameState?.currentScenario, gameState?.player]);


  const handleChoiceSelected = useCallback(async (choice: StoryChoice) => {
    if (!gameState || !gameState.player) return;

    setIsLoading(true);

    try {
      // 1. Process the action in the game logic layer to get a list of events
      const { events } = await processPlayerAction(gameState.player, gameState.currentEnemy || null, choice, weatherData);
      
      // 2. Apply events to a temporary state to get the state *after* the action, for the AI's context
      const stateAfterAction = gameReducer(gameState, { type: 'APPLY_GAME_EVENTS', payload: events });

      // 3. === CASCADE ENRICHMENT ===
      const cascadeResult = await runCascadeForAction(stateAfterAction, choice);
      
      // 4. Prepare the input for the AI with the calculated events, the future state, and cascade results
      const inputForAI = prepareAIInput(stateAfterAction, choice, events, cascadeResult);
      if (!inputForAI) throw new Error("Failed to prepare AI input.");
      
      // 5. Get the narration and next choices from the AI
      const aiOutput: GenerateScenarioOutput = await generateScenario(inputForAI);

      // 6. Dispatch the game events to *actually* update the state
      dispatch({ type: 'APPLY_GAME_EVENTS', payload: events });
      
      // 7. Set the new scenario from the AI's output
      dispatch({ type: 'SET_CURRENT_SCENARIO', payload: { scenarioText: aiOutput.scenarioText, choices: aiOutput.choices, aiRecommendation: aiOutput.aiRecommendation } });

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
        {!isLoading && (
          <ChoiceSelectionDisplay
            choices={currentChoices}
            onSelectChoice={handleChoiceSelected}
            isLoading={isLoading}
            aiRecommendation={currentScenario.aiRecommendation || null}
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
