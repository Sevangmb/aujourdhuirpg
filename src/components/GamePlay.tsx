
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { StoryChoice, GameAction, Enemy } from '@/lib/types';
import { calculateDeterministicEffects, prepareAIInput } from '@/lib/game-logic';
import ScenarioDisplay from './ScenarioDisplay';
import { generateScenario, type GenerateScenarioOutput } from '@/ai/flows/generate-scenario';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { calculateSuccessProbability } from '@/lib/skill-check';

import ChoiceSelectionDisplay from './ChoiceSelectionDisplay';
import GameSidebar from './GameSidebar';
import { useGame } from '@/contexts/GameContext';
import { processItemUpdates } from '@/lib/player-state-helpers';
import CombatStatusDisplay from './CombatStatusDisplay';


const GamePlay: React.FC = () => {
  const { gameState, dispatch, contextualData } = useGame();
  const { weather: { data: weatherData } } = contextualData;

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
      const { updatedPlayer, updatedEnemy, notifications, eventsForAI } = await calculateDeterministicEffects(gameState.player, gameState.currentEnemy || null, choice, weatherData);
      
      notifications.forEach(notification => toast({ title: notification.title, description: notification.description, duration: 4000 }));
      
      const tempGameStateForAI = { ...gameState, player: updatedPlayer, currentEnemy: updatedEnemy };
      const inputForAI = prepareAIInput(tempGameStateForAI, choice.text, eventsForAI);
      if (!inputForAI) throw new Error("Failed to prepare AI input.");
      
      const aiOutput: GenerateScenarioOutput = await generateScenario(inputForAI);

      const allActions: GameAction[] = [];
      allActions.push({ type: 'UPDATE_PLAYER_DATA', payload: updatedPlayer });
      if (updatedEnemy) {
        allActions.push({ type: 'UPDATE_ENEMY', payload: updatedEnemy });
      }

      if (choice.timeCost > 0) allActions.push({ type: 'ADD_GAME_TIME', payload: choice.timeCost });

      allActions.push({ type: 'SET_CURRENT_SCENARIO', payload: { scenarioText: aiOutput.scenarioText, choices: aiOutput.choices, aiRecommendation: aiOutput.aiRecommendation } });
      allActions.push({ type: 'ADD_JOURNAL_ENTRY', payload: { type: 'player_action', text: choice.text, location: updatedPlayer.currentLocation } });
      
      // Handle Combat Events from AI
      if (aiOutput.combatEvent) {
          if (aiOutput.combatEvent.startCombat) {
              allActions.push({ type: 'START_COMBAT', payload: aiOutput.combatEvent.startCombat });
          }
          if (aiOutput.combatEvent.endCombat) {
              allActions.push({ type: 'END_COMBAT' });
          }
      }

      // Translate AI output to game actions
      if (aiOutput.newQuests) aiOutput.newQuests.forEach(q => allActions.push({ type: 'ADD_QUEST', payload: q as any }));
      if (aiOutput.updatedQuests) aiOutput.updatedQuests.forEach(u => allActions.push({ type: 'UPDATE_QUEST', payload: u }));
      if (aiOutput.newPNJs) aiOutput.newPNJs.forEach(p => allActions.push({ type: 'ADD_PNJ', payload: p as any }));
      if (aiOutput.updatedPNJs) aiOutput.updatedPNJs.forEach(u => allActions.push({ type: 'UPDATE_PNJ', payload: u }));
      if (aiOutput.itemsToAddToInventory) aiOutput.itemsToAddToInventory.forEach(i => allActions.push({ type: 'ADD_ITEM_TO_INVENTORY', payload: i }));
      if (aiOutput.newDynamicItems) aiOutput.newDynamicItems.forEach(i => allActions.push({ type: 'ADD_DYNAMIC_ITEM', payload: i }));
      if (aiOutput.newTransactions) aiOutput.newTransactions.forEach(t => allActions.push({ type: 'ADD_TRANSACTION', payload: t }));
      if (aiOutput.xpGained) allActions.push({ type: 'ADD_XP', payload: aiOutput.xpGained });
      if (aiOutput.newClues) aiOutput.newClues.forEach(c => allActions.push({ type: 'ADD_CLUE', payload: c as any }));
      if (aiOutput.newDocuments) aiOutput.newDocuments.forEach(d => allActions.push({ type: 'ADD_DOCUMENT', payload: d as any }));
      if (aiOutput.updatedInvestigationNotes) allActions.push({ type: 'UPDATE_INVESTIGATION_NOTES', payload: aiOutput.updatedInvestigationNotes });

      // Process item updates and evolutions
      if (aiOutput.itemUpdates && aiOutput.itemUpdates.length > 0) {
        const { newInventory, notifications: itemNotifications } = processItemUpdates(
          updatedPlayer.inventory,
          aiOutput.itemUpdates
        );

        itemNotifications.forEach(notification => {
          toast({
            title: notification.title,
            description: notification.description,
            duration: 5000,
          });
        });

        allActions.push({ type: 'SET_INVENTORY', payload: newInventory });
      }
      
      // Process item usage logs
      if (aiOutput.itemsUsed && aiOutput.itemsUsed.length > 0) {
        aiOutput.itemsUsed.forEach(usage => {
          allActions.push({ 
            type: 'LOG_ITEM_USAGE', 
            payload: { instanceId: usage.instanceId, usageDescription: usage.usageDescription } 
          });
        });
      }
      dispatch({ type: 'TRIGGER_EVENT_ACTIONS', payload: allActions });

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
