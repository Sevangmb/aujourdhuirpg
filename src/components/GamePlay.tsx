
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { GameState, Player, Position, JournalEntry, GameNotification } from '@/lib/types';
import { gameReducer, GameAction, fetchPoisForCurrentLocation } from '@/lib/game-logic';
import ScenarioDisplay from './ScenarioDisplay';
import { generateScenario, type GenerateScenarioInput, type GenerateScenarioOutput } from '@/ai/flows/generate-scenario';
// Removed generateLocationImage import as fetching is lifted
import { saveGameState, getInitialScenario } from '@/lib/game-logic';
import { initialPlayerLocation, initialToneSettings, UNKNOWN_STARTING_PLACE_NAME } from '@/data/initial-game-data';
import { processAndApplyAIScenarioOutput } from '@/lib/ai-game-effects';
import { useToast } from "@/hooks/use-toast";
import { Loader2, Star, Euro, Search as SearchIcon } from 'lucide-react';
import type { WeatherData } from '@/app/actions/get-current-weather';
// Removed getCurrentWeather import as fetching is lifted
import MapDisplay from './MapDisplay';
import WeatherDisplay from './WeatherDisplay';
import LocationImageDisplay from './LocationImageDisplay';
import PlayerInputForm from './PlayerInputForm';

import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile'; // Import useIsMobile

const prepareAIInput = (
  player: Player,
  currentScenarioText: string,
  actionText: string
): GenerateScenarioInput => {
  const simplifiedInventory = player.inventory?.map(item => ({ name: item.name, quantity: item.quantity })) || [];

  const playerProgressionForAI = player.progression ? {
    level: player.progression.level,
    xp: player.progression.xp,
    xpToNextLevel: player.progression.xpToNextLevel,
    perks: player.progression.perks || [],
  } : { level: 1, xp: 0, xpToNextLevel: 100, perks: [] };

  const activeQuestsSummary = (player.questLog || [])
    .filter(q => q.status === 'active')
    .map(q => ({
      id: q.id,
      title: q.title,
      description: q.description.substring(0, 150) + "...",
      type: q.type,
      moneyReward: q.moneyReward,
      currentObjectivesDescriptions: (q.objectives || []).filter(obj => !obj.isCompleted).map(obj => obj.description)
    }));

  const encounteredPNJsSummary = (player.encounteredPNJs || []).map(p => ({
    name: p.name,
    relationStatus: p.relationStatus,
    dispositionScore: p.dispositionScore, // Ensure this exists on PNJ type, default to 0 if not
    interactionHistory: p.interactionHistory || [], // Ensure this exists on PNJ type, default to [] if not
  }));

  const currentCluesSummary = (player.clues || []).map(c => ({ title: c.title, type: c.type }));
  const currentDocumentsSummary = (player.documents || []).map(d => ({ title: d.title, type: d.type }));

  return {
    playerName: player.name,
    playerGender: player.gender,
    playerAge: player.age,
    playerOrigin: player.origin,
    playerBackground: player.background,
    playerStats: player.stats,
    playerSkills: player.skills,
    playerTraitsMentalStates: player.traitsMentalStates || [],
    playerProgression: playerProgressionForAI,
    playerAlignment: player.alignment,
    playerInventory: simplifiedInventory,
    playerMoney: player.money,
    playerChoice: actionText.trim(),
    currentScenario: currentScenarioText,
    playerLocation: player.currentLocation,
    toneSettings: player.toneSettings || initialToneSettings,
    activeQuests: activeQuestsSummary,
    encounteredPNJsSummary: encounteredPNJsSummary,
    currentCluesSummary: currentCluesSummary,
    currentDocumentsSummary: currentDocumentsSummary,
    investigationNotes: player.investigationNotes,
  };
};

async function executeScenarioGenerationAndProcessOutput(
  aiInput: GenerateScenarioInput,
  currentPlayer: Player,
  playerChoice: string,
): Promise<{ updatedPlayer: Player; notifications: GameNotification[]; scenarioText: string }> {
  try {
    const aiOutput: GenerateScenarioOutput = await generateScenario(aiInput);

    const { updatedPlayer, notifications } = await processAndApplyAIScenarioOutput(currentPlayer, playerChoice, aiOutput);
    return {
      updatedPlayer,
      notifications,
      scenarioText: aiOutput.scenarioText,
    };
  } catch (error) {

    console.error("Error in executeScenarioGenerationAndProcessOutput:", error);
    throw error;
  }
}

interface GamePlayProps {
  initialGameState: GameState;
  onRestart: () => void;
  onStateUpdate: (newState: GameState) => void;
  // Props for context widgets from HomePageContent
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
  const isMobile = useIsMobile(); // Use the hook

  // Ensure initial scenario is set if not present
  useEffect(() => {
    if (initialGameState.player && initialGameState.player.currentLocation && !initialGameState.currentScenario) {
      const firstScenario = getInitialScenario(initialGameState.player);
      const updatedState = gameReducer(initialGameState, { type: 'SET_CURRENT_SCENARIO', payload: firstScenario });
      onStateUpdate(updatedState);
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
        console.error("GamePlay: Error fetching new POIs after move:", error);
        newState = gameReducer(newState, { type: 'SET_NEARBY_POIS', payload: null });
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
      if (!actionText.trim()){
        toast({ variant: "destructive", title: "Action vide", description: "Veuillez entrer une action." });
      }
      return;
    }
    if (!player.currentLocation || typeof player.currentLocation.latitude !== 'number' || typeof player.currentLocation.longitude !== 'number') {
      console.error("Critical Error: player.currentLocation is invalid before AI call.", player);
      toast({ variant: "destructive", title: "Erreur Critique du Jeu", description: "La localisation du joueur est manquante ou invalide." });
      return;
    }

    setIsLoading(true);
    const inputForAI = prepareAIInput(player, currentScenario.scenarioText, actionText);

    try {
      const { updatedPlayer: playerAfterAI, notifications, scenarioText: newScenarioText } = await executeScenarioGenerationAndProcessOutput(inputForAI, player, actionText);

      let updatedFullGameState: GameState = {
        ...initialGameState,
        player: playerAfterAI,
        currentScenario: { scenarioText: newScenarioText },
      };

      onStateUpdate(updatedFullGameState);
      await saveGameState(updatedFullGameState);

      notifications.forEach(notification => {
        let toastAction;
        if (notification.type === 'xp_gained' || notification.type === 'leveled_up') {
          toastAction = <Star className="text-yellow-400" />;
        } else if (['item_added', 'quest_added', 'clue_added', 'document_added'].includes(notification.type)) {
            toastAction = <Star className="text-green-400" />
        } else if (notification.type === 'money_changed') {
            toastAction = <Euro className="text-accent" />;
        } else if (notification.type === 'investigation_notes_updated') {
            toastAction = <SearchIcon className="text-blue-400" />;
        }
        toast({
          title: notification.title,
          description: notification.description,
          action: toastAction,
          duration: ['leveled_up', 'quest_added', 'money_changed', 'clue_added', 'document_added', 'investigation_notes_updated', 'tone_settings_updated'].includes(notification.type) ? 5000: 3000,
        });
      });
      setPlayerInput('');

    } catch (error) {
      let errorMessage = "Impossible de générer le prochain scénario ou d'appliquer ses effets.";
      if (error instanceof Error) { errorMessage += ` Détail: ${error.message}`; }
      console.error("GamePlay Error calling AI or processing output:", error);
      toast({ variant: "destructive", title: "Erreur de Connexion avec l'IA", description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  }, [initialGameState, onStateUpdate, toast]);


  const { player, currentScenario, journal, nearbyPois } = initialGameState;

  if (!player || !currentScenario) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl">Chargement des données du jeu...</p>
      </div>
    );
  }

  const displayLocation = player.currentLocation || initialPlayerLocation;

  return (
    <div className="flex flex-col p-2 md:p-4 space-y-2 md:space-y-4 h-full">
      {/* Conditionally render widgets for desktop view */}
      {!isMobile && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 shrink-0">
          <WeatherDisplay weatherData={weatherData} isLoading={weatherLoading} error={weatherError} placeName={displayLocation.name} />
          <MapDisplay
            currentLocation={displayLocation}
            nearbyPois={nearbyPois || []}
          />

      </div>

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
