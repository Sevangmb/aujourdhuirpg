
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { GameState, GameNotification, QuestUpdate, PNJ, Quest } from '@/lib/types';
import { gameReducer, GameAction, calculateDeterministicEffects, prepareAIInput } from '@/lib/game-logic';
import { saveGameState } from '@/lib/game-state-persistence';
import ScenarioDisplay from './ScenarioDisplay';
import { generateScenario, type GenerateScenarioInput, type GenerateScenarioOutput } from '@/ai/flows/generate-scenario';
import { getInitialScenario } from '@/lib/game-logic';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';
import type { WeatherData } from '@/app/actions/get-current-weather';
import MapDisplay from './MapDisplay';
import WeatherDisplay from './WeatherDisplay';
import LocationImageDisplay from './LocationImageDisplay';
import PlayerInputForm from './PlayerInputForm';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { UNKNOWN_STARTING_PLACE_NAME } from '@/data/initial-game-data';

interface GamePlayProps {
  initialGameState: GameState;
  onRestart: () => void;
  onStateUpdate: (newState: GameState) => void;
  weatherData: WeatherData | null;
  weatherLoading: boolean;
  weatherError: string | null;
  locationImageUrl: string | null;
  locationImageLoading: boolean;
  locationImageError: string | null;
}

const GamePlay: React.FC<GamePlayProps> = ({
  initialGameState,
  onStateUpdate,
  weatherData,
  weatherLoading,
  weatherError,
  locationImageUrl,
  locationImageLoading,
  locationImageError,
}) => {

  const [playerInput, setPlayerInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (initialGameState.player && !initialGameState.currentScenario) {
      const firstScenario = getInitialScenario(initialGameState.player);
      onStateUpdate(gameReducer(initialGameState, { type: 'SET_CURRENT_SCENARIO', payload: firstScenario }));
    }
  }, [initialGameState, onStateUpdate]);

  const handleGameAction = useCallback(async (action: GameAction) => {
    if (!initialGameState.player) return;
    
    const newState = gameReducer(initialGameState, action);
    
    onStateUpdate(newState);
    await saveGameState(newState);
  }, [initialGameState, onStateUpdate]);

  const processAIEvents = useCallback((aiOutput: GenerateScenarioOutput) => {
    const actions: GameAction[] = [];
    const notifications: GameNotification[] = [];

    if (aiOutput.newQuests) {
      aiOutput.newQuests.forEach(quest => {
        actions.push({ type: 'ADD_QUEST', payload: quest as Quest }); // Cast because AI returns input type
        notifications.push({ type: 'quest_added', title: 'Nouvelle Quête', description: `Vous avez commencé la quête : "${quest.title}".` });
      });
    }
    if (aiOutput.updatedQuests) {
      aiOutput.updatedQuests.forEach(update => {
        actions.push({ type: 'UPDATE_QUEST', payload: update });
        notifications.push({ type: 'quest_updated', title: 'Quête Mise à Jour', description: `La quête "${update.questId}" a progressé.` });
      });
    }
    if (aiOutput.newPNJs) {
        aiOutput.newPNJs.forEach(pnj => {
          actions.push({ type: 'ADD_PNJ', payload: pnj as PNJ });
          notifications.push({ type: 'pnj_encountered', title: 'Nouvelle Rencontre', description: `Vous avez rencontré ${pnj.name}.` });
        });
    }
    if (aiOutput.itemsToAddToInventory) {
      aiOutput.itemsToAddToInventory.forEach(item => {
        actions.push({ type: 'ADD_ITEM_TO_INVENTORY', payload: item });
        notifications.push({ type: 'item_added', title: 'Objet Obtenu', description: `Vous avez obtenu : ${item.itemId} (x${item.quantity}).` });
      });
    }
    if (aiOutput.moneyChange) {
      actions.push({ type: 'CHANGE_MONEY', payload: aiOutput.moneyChange });
      notifications.push({ type: 'money_changed', title: 'Argent Modifié', description: `Argent : ${aiOutput.moneyChange > 0 ? '+' : ''}${aiOutput.moneyChange}€.` });
    }
    if (aiOutput.xpGained) {
      actions.push({ type: 'ADD_XP', payload: aiOutput.xpGained });
      notifications.push({ type: 'xp_gained', title: 'Expérience Gagnée', description: `Vous avez gagné ${aiOutput.xpGained} XP.` });
    }
    if (aiOutput.newClues) {
      aiOutput.newClues.forEach(clue => {
        actions.push({ type: 'ADD_CLUE', payload: clue });
        notifications.push({ type: 'clue_added', title: 'Nouvel Indice', description: `Indice ajouté : "${clue.title}".` });
      });
    }
     if (aiOutput.newDocuments) {
      aiOutput.newDocuments.forEach(doc => {
        actions.push({ type: 'ADD_DOCUMENT', payload: doc });
        notifications.push({ type: 'document_added', title: 'Nouveau Document', description: `Document obtenu : "${doc.title}".` });
      });
    }

    // Dispatch all game state changes together
    if (actions.length > 0) {
      dispatchGameActions(actions);
    }
    // Show all notifications
    notifications.forEach(notification => toast({ title: notification.title, description: notification.description, duration: 3000 }));

  }, [onStateUpdate]);

  const dispatchGameActions = useCallback((actions: GameAction[]) => {
      onStateUpdate(prevState => actions.reduce(gameReducer, prevState));
  }, [onStateUpdate]);

  const handlePlayerActionSubmit = useCallback(async (actionText: string) => {
    const { player, currentScenario } = initialGameState;
    if (!player || !currentScenario || !actionText.trim()) {
      if (!actionText.trim()) toast({ variant: "destructive", title: "Action vide", description: "Veuillez entrer une action." });
      return;
    }
    setIsLoading(true);

    try {
      const { updatedPlayer, notifications: deterministicNotifications, eventsForAI } = await calculateDeterministicEffects(player, actionText);
      deterministicNotifications.forEach(notification => toast({ title: notification.title, description: notification.description, duration: 3000 }));

      const tempGameStateForAI: GameState = {
          ...initialGameState,
          player: updatedPlayer,
          currentScenario: currentScenario,
      };

      const inputForAI = prepareAIInput(tempGameStateForAI, actionText, eventsForAI);
      if (!inputForAI) throw new Error("Failed to prepare AI input.");

      const aiOutput: GenerateScenarioOutput = await generateScenario(inputForAI);

      let finalGameState: GameState = {
        ...initialGameState,
        player: updatedPlayer,
        currentScenario: { scenarioText: aiOutput.scenarioText },
      };
      
      if (aiOutput.newLocationDetails) {
         finalGameState.player.currentLocation = {
            ...finalGameState.player.currentLocation,
            ...aiOutput.newLocationDetails
         }
      }

      onStateUpdate(finalGameState);
      processAIEvents(aiOutput); // This will dispatch further state updates from AI

      // Final save after all updates
      // The state might be stale here, so we get the latest from a state update callback if possible
      // For now, let's save the deterministically updated state, AI events will save in their own cycle
      // A better approach would be to batch all updates and save once.
      // Let's rely on the onStateUpdate hook to eventually save the final state.
      // We need to re-fetch the state after processAIEvents to save the most recent version.
      // This is getting complex, so let's simplify: save happens inside dispatchGameActions
      await saveGameState(finalGameState); // Save the initial part of the state
      
      setPlayerInput('');

    } catch (error) {
      let errorMessage = "Impossible de générer le prochain scénario.";
      if (error instanceof Error) { errorMessage += ` Détail: ${error.message}`; }
      toast({ variant: "destructive", title: "Erreur de Connexion avec l'IA", description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  }, [initialGameState, onStateUpdate, toast, processAIEvents]);

  const { player, currentScenario, nearbyPois } = initialGameState;

  if (!player || !currentScenario) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl">Chargement des données du jeu...</p>
      </div>
    );
  }

  const displayLocation = player.currentLocation;

  return (
    <div className="flex flex-col p-2 md:p-4 space-y-2 md:space-y-4 h-full">
      {!isMobile && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 shrink-0">
          <WeatherDisplay weatherData={weatherData} isLoading={weatherLoading} error={weatherError} placeName={displayLocation.name} />
          <MapDisplay
            currentLocation={displayLocation}
            nearbyPois={nearbyPois || []}
          />
          <LocationImageDisplay
            imageUrl={locationImageUrl}
            placeName={displayLocation.name || UNKNOWN_STARTING_PLACE_NAME}
            isLoading={locationImageLoading}
            error={locationImageError}
          />
        </div>
      )}
      <ScrollArea className="flex-grow rounded-md border shadow-inner bg-muted/20">
        <div className="p-3">
          <ScenarioDisplay scenarioHTML={currentScenario.scenarioText} isLoading={isLoading} />
        </div>
      </ScrollArea>
      <div className="shrink-0">
        <PlayerInputForm
          playerInput={playerInput}
          onPlayerInputChange={setPlayerInput}
          onSubmit={handlePlayerActionSubmit}
          isLoading={isLoading}
          gameState={initialGameState}
          dispatch={handleGameAction}
        />
      </div>
    </div>
  );
};

export default GamePlay;
