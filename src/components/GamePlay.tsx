"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { GameState, GameNotification, Quest, PNJ, JournalEntry, Transaction, Position, StoryChoice } from '@/lib/types';
import { gameReducer, GameAction, calculateDeterministicEffects, prepareAIInput } from '@/lib/game-logic';
import ScenarioDisplay from './ScenarioDisplay';
import { generateScenario, type GenerateScenarioInput, type GenerateScenarioOutput } from '@/ai/flows/generate-scenario';
import { getInitialScenario } from '@/lib/game-logic';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';
import type { WeatherData } from '@/app/actions/get-current-weather';
import MapDisplay from './MapDisplay';
import WeatherDisplay from './WeatherDisplay';
import LocationImageDisplay from './LocationImageDisplay';
import ChoiceSelectionDisplay from './ChoiceSelectionDisplay';
import { montmartreInitialChoices } from '@/data/choices';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { UNKNOWN_STARTING_PLACE_NAME } from '@/data/initial-game-data';
import { getMasterItemById } from '@/data/items';
import { Skeleton } from './ui/skeleton';

interface GamePlayProps {
  initialGameState: GameState;
  onStateUpdate: (newState: GameState | ((prevState: GameState | null) => GameState | null)) => void;
  weatherData: WeatherData | null;
  weatherLoading: boolean;
  weatherError: string | null;
  locationImageUrl: string | null;
  locationImageLoading: boolean;
  locationImageError: string | null;
  onPoiClick?: (poi: Position) => void;
  handleGameAction: (action: GameAction) => void;
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
  onPoiClick,
  handleGameAction,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentChoices, setCurrentChoices] = useState<StoryChoice[]>(initialGameState.currentScenario?.choices || montmartreInitialChoices);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (initialGameState.player && !initialGameState.currentScenario) {
      const firstScenario = getInitialScenario(initialGameState.player);
      handleGameAction({ type: 'SET_CURRENT_SCENARIO', payload: firstScenario });
    }
  }, [initialGameState, handleGameAction]);

  useEffect(() => {
    setCurrentChoices(initialGameState.currentScenario?.choices || montmartreInitialChoices);
  }, [initialGameState.currentScenario]);

  const handleChoiceSelected = useCallback(async (choice: StoryChoice) => {
    const { player } = initialGameState;
    if (!player || !choice) return;

    setIsLoading(true);

    try {
      const { updatedPlayer, notifications, eventsForAI } = await calculateDeterministicEffects(player, choice);
      notifications.forEach(notification => toast({ title: notification.title, description: notification.description, duration: 3000 }));

      const tempGameStateForAI: GameState = { ...initialGameState, player: updatedPlayer };
      const inputForAI = prepareAIInput(tempGameStateForAI, choice.text, eventsForAI);
      if (!inputForAI) throw new Error("Failed to prepare AI input.");

      const aiOutput: GenerateScenarioOutput = await generateScenario(inputForAI);

      const allActions: GameAction[] = [];
      allActions.push({ type: 'UPDATE_PLAYER_DATA', payload: updatedPlayer });
      if (choice.timeCost > 0) allActions.push({ type: 'ADD_GAME_TIME', payload: choice.timeCost });

      allActions.push({ type: 'SET_CURRENT_SCENARIO', payload: { scenarioText: aiOutput.scenarioText, suggestedActions: aiOutput.suggestedActions } });
      allActions.push({ type: 'ADD_JOURNAL_ENTRY', payload: { type: 'player_action', text: choice.text, location: updatedPlayer.currentLocation } });
      
      // Translate AI output to game actions
      if (aiOutput.newQuests) aiOutput.newQuests.forEach(q => allActions.push({ type: 'ADD_QUEST', payload: q as any }));
      if (aiOutput.updatedQuests) aiOutput.updatedQuests.forEach(u => allActions.push({ type: 'UPDATE_QUEST', payload: u }));
      if (aiOutput.newPNJs) aiOutput.newPNJs.forEach(p => allActions.push({ type: 'ADD_PNJ', payload: p as any }));
      if (aiOutput.itemsToAddToInventory) aiOutput.itemsToAddToInventory.forEach(i => allActions.push({ type: 'ADD_ITEM_TO_INVENTORY', payload: i }));
      if (aiOutput.newTransactions) aiOutput.newTransactions.forEach(t => allActions.push({ type: 'ADD_TRANSACTION', payload: t }));
      if (aiOutput.xpGained) allActions.push({ type: 'ADD_XP', payload: aiOutput.xpGained });
      if (aiOutput.newClues) aiOutput.newClues.forEach(c => allActions.push({ type: 'ADD_CLUE', payload: c as any }));
      if (aiOutput.newDocuments) aiOutput.newDocuments.forEach(d => allActions.push({ type: 'ADD_DOCUMENT', payload: d as any }));
      if (aiOutput.updatedInvestigationNotes) allActions.push({ type: 'UPDATE_INVESTIGATION_NOTES', payload: aiOutput.updatedInvestigationNotes });

      handleGameAction({ type: 'TRIGGER_EVENT_ACTIONS', payload: allActions });

    } catch (error) {
      let errorMessage = "Impossible de générer le prochain scénario.";
      if (error instanceof Error) { errorMessage += ` Détail: ${error.message}`; }
      toast({ variant: "destructive", title: "Erreur de Connexion avec l'IA", description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  }, [initialGameState, handleGameAction, toast]);

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
          <WeatherDisplay weatherData={weatherData} isLoading={weatherLoading} error={weatherError} placeName={displayLocation.name} gameTimeInMinutes={initialGameState.gameTimeInMinutes} />
          <MapDisplay
            currentLocation={displayLocation}
            nearbyPois={nearbyPois || []}
            onPoiClick={onPoiClick}
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
        <ChoiceSelectionDisplay
          choices={currentChoices}
          onSelectChoice={handleChoiceSelected}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default GamePlay;
