
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { GameState, Player, Position, JournalEntry, GameNotification } from '@/lib/types';
import { gameReducer, GameAction, fetchPoisForCurrentLocation, checkForLocationBasedEvents, calculateDeterministicEffects, saveGameState } from '@/lib/game-logic';
import ScenarioDisplay from './ScenarioDisplay';
import { generateScenario, type GenerateScenarioInput, type GenerateScenarioOutput } from '@/ai/flows/generate-scenario';
import { getInitialScenario } from '@/lib/game-logic';
import { initialToneSettings, UNKNOWN_STARTING_PLACE_NAME } from '@/data/initial-game-data';
import { useToast } from "@/hooks/use-toast";
import { Loader2, Star, Euro, Search as SearchIcon } from 'lucide-react';
import type { WeatherData } from '@/app/actions/get-current-weather';
import MapDisplay from './MapDisplay';
import WeatherDisplay from './WeatherDisplay';
import LocationImageDisplay from './LocationImageDisplay';
import PlayerInputForm from './PlayerInputForm';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';

const prepareAIInput = (
  player: Player,
  currentScenarioText: string,
  actionText: string,
  deterministicEvents: string[]
): GenerateScenarioInput => {
  return {
    playerName: player.name,
    playerGender: player.gender,
    playerAge: player.age,
    playerOrigin: player.origin,
    playerBackground: player.background,
    playerStats: player.stats,
    playerSkills: player.skills,
    playerTraitsMentalStates: player.traitsMentalStates || [],
    playerProgression: player.progression,
    playerAlignment: player.alignment,
    playerInventory: player.inventory?.map(item => ({ name: item.name, quantity: item.quantity })) || [],
    playerMoney: player.money,
    playerChoice: actionText.trim(),
    currentScenario: currentScenarioText,
    playerLocation: player.currentLocation,
    toneSettings: player.toneSettings || initialToneSettings,
    deterministicEvents, // Pass the pre-calculated events to the AI
    // Pass summaries for narrative context
    activeQuests: (player.questLog || []).filter(q => q.status === 'active').map(q => ({
      id: q.id, title: q.title, description: q.description.substring(0, 150), type: q.type, moneyReward: q.moneyReward,
      currentObjectivesDescriptions: (q.objectives || []).filter(obj => !obj.isCompleted).map(obj => obj.description)
    })),
    encounteredPNJsSummary: (player.encounteredPNJs || []).map(p => ({
      name: p.name, relationStatus: p.relationStatus, dispositionScore: p.dispositionScore,
      interactionHistorySummary: (p.interactionHistory || []).slice(-3).join('; ')
    })),
    currentCluesSummary: (player.clues || []).map(c => ({ title: c.title, summary: c.description.substring(0,100) })),
    currentDocumentsSummary: (player.documents || []).map(d => ({ title: d.title, summary: d.content.substring(0,100) })),
    investigationNotes: player.investigationNotes,
  };
};

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
    let newState = gameReducer(initialGameState, action);
    if (action.type === 'MOVE_TO_LOCATION') {
      newState = gameReducer(newState, { type: 'ADD_GAME_TIME', payload: 30 });
      try {
        setIsLoading(true);
        const newNearbyPois = await fetchPoisForCurrentLocation(action.payload);
        newState = gameReducer(newState, { type: 'SET_NEARBY_POIS', payload: newNearbyPois });
      } catch (error) {
        toast({ title: "Erreur réseau", description: "Impossible de charger les lieux proches.", variant: "destructive"});
      } finally {
        setIsLoading(false);
      }
    }
    onStateUpdate(newState);
    await saveGameState(newState);
  }, [initialGameState, onStateUpdate, toast]);

  const handlePlayerActionSubmit = useCallback(async (actionText: string) => {
    const { player, currentScenario } = initialGameState;
    if (!player || !currentScenario || !actionText.trim()) {
      if (!actionText.trim()) toast({ variant: "destructive", title: "Action vide", description: "Veuillez entrer une action." });
      return;
    }
    setIsLoading(true);

    try {
      // 1. CALCULATE DETERMINISTIC EFFECTS (Code)
      const { updatedPlayer, notifications, eventsForAI } = await calculateDeterministicEffects(player, actionText);

      // 2. PREPARE AI INPUT
      const inputForAI = prepareAIInput(updatedPlayer, currentScenario.scenarioText, actionText, eventsForAI);

      // 3. GENERATE NARRATIVE (IA)
      const aiOutput: GenerateScenarioOutput = await generateScenario(inputForAI);

      // 4. APPLY FINAL STATE
      let finalGameState: GameState = {
        ...initialGameState,
        player: updatedPlayer, // Use the deterministically updated player
        currentScenario: { scenarioText: aiOutput.scenarioText }, // Use the new narrative
      };
      
      // If AI suggested a location change, apply it
      if (aiOutput.newLocationDetails) {
         finalGameState.player.currentLocation = {
            ...finalGameState.player.currentLocation,
            ...aiOutput.newLocationDetails
         }
      }

      onStateUpdate(finalGameState);
      await saveGameState(finalGameState);

      // 5. SHOW NOTIFICATIONS
      notifications.forEach(notification => {
        toast({
          title: notification.title,
          description: notification.description,
          duration: 3000,
        });
      });
      setPlayerInput('');

    } catch (error) {
      let errorMessage = "Impossible de générer le prochain scénario.";
      if (error instanceof Error) { errorMessage += ` Détail: ${error.message}`; }
      toast({ variant: "destructive", title: "Erreur de Connexion avec l'IA", description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  }, [initialGameState, onStateUpdate, toast]);

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
