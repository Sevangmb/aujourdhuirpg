
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { StoryChoice, GameAction, GameEvent } from '@/lib/types';
import type { Enemy } from '@/modules/combat/types';
import { processPlayerAction, prepareAIInput, gameReducer, convertAIOutputToEvents, generateActionsForPOIs, generatePlayerStateActions } from '@/lib/game-logic';
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
            player.inventory,
            0,
            player.physiology,
            player.momentum
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
      // 1. Process the action in the game logic layer to get a list of deterministic events
      const { events: deterministicEvents } = await processPlayerAction(gameState.player, gameState.currentEnemy || null, choice, weatherData);
      
      // 2. Apply events to a temporary state to get the state *after* the action, for the AI's context
      const stateAfterAction = gameReducer(gameState, { type: 'APPLY_GAME_EVENTS', payload: deterministicEvents });

      // 3. Run the enrichment cascade
      const cascadeResult = await runCascadeForAction(stateAfterAction, choice);
      
      // 4. Prepare the input for the AI with the calculated events, the future state, and cascade results
      const inputForAI = prepareAIInput(stateAfterAction, choice, deterministicEvents, cascadeResult);
      if (!inputForAI) throw new Error("Failed to prepare AI input.");
      
      // 5. Get the narration, next choices, and potential new game events from the AI
      const aiOutput: GenerateScenarioOutput = await generateScenario(inputForAI);

      // 6. Convert AI proposals (new quests, items, etc.) into game events
      const aiGeneratedEvents = convertAIOutputToEvents(aiOutput);

      // 7. Dispatch ALL events (deterministic + AI-generated) to *actually* update the state
      dispatch({ type: 'APPLY_GAME_EVENTS', payload: [...deterministicEvents, ...aiGeneratedEvents] });
      
      // --- NEW: Generate contextual actions based on POIs and Player State in the new state ---
      const finalStateAfterAllEvents = gameReducer(stateAfterAction, { type: 'APPLY_GAME_EVENTS', payload: aiGeneratedEvents });
      const poiActions = generateActionsForPOIs(finalStateAfterAllEvents.nearbyPois || [], finalStateAfterAllEvents.player!);
      const stateBasedActions = generatePlayerStateActions(finalStateAfterAllEvents.player!);
      const allChoices = [...(aiOutput.choices || []), ...poiActions, ...stateBasedActions];

      // 8. Set the new scenario from the AI's output, now with merged choices
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
