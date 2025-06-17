
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { GameState, Player, PlayerStats, LocationData, Scenario, ToneSettings } from '@/lib/types';
import ScenarioDisplay from './ScenarioDisplay';
import { generateScenario, type GenerateScenarioInput, type GenerateScenarioOutput } from '@/ai/flows/generate-scenario';
import { generateLocationImage } from '@/ai/flows/generate-location-image-flow';
import { saveGameState, getInitialScenario } from '@/lib/game-logic';
import { initialPlayerLocation, initialToneSettings } from '@/data/initial-game-data'; 
import { processAndApplyAIScenarioOutput } from '@/lib/ai-game-effects';
import { useToast } from "@/hooks/use-toast";
import { Loader2, Star, Euro, Search as SearchIcon } from 'lucide-react'; 
import { getCurrentWeather, type WeatherData } from '@/app/actions/get-current-weather';
import MapDisplay from './MapDisplay';
import WeatherDisplay from './WeatherDisplay';
import LocationImageDisplay from './LocationImageDisplay';
import PlayerInputForm from './PlayerInputForm';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Prepares the input object for the `generateScenario` AI flow.
 * It gathers all necessary player and game state information into the required format.
 * This function is defined outside the component to avoid being recreated on every render.
 *
 * @param player The current player object.
 * @param currentScenarioText The text of the current scenario the player is in.
 * @param actionText The action text input by the player.
 * @returns An object of type `GenerateScenarioInput` for the AI flow.
 */
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
  } : { level: 1, xp: 0, xpToNextLevel: 100, perks: [] }; // Provide default if undefined

  const activeQuestsSummary = (player.questLog || [])
    .filter(q => q.status === 'active')
    .map(q => ({
      id: q.id,
      title: q.title,
      description: q.description.substring(0, 150) + "...", // Ensure description is a string
      type: q.type,
      moneyReward: q.moneyReward,
      currentObjectivesDescriptions: (q.objectives || []).filter(obj => !obj.isCompleted).map(obj => obj.description)
    }));

  const encounteredPNJsSummary = (player.encounteredPNJs || []).map(p => ({
    name: p.name,
    relationStatus: p.relationStatus,
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
    currentInvestigationNotes: player.investigationNotes,
  };
};

/**
 * Calls the AI scenario generation service and processes its output.
 * This asynchronous function handles the direct interaction with the AI flow (`generateScenario`)
 * and then applies the results to the player's state using `processAndApplyAIScenarioOutput`.
 *
 * @param aiInput The input object prepared for the `generateScenario` AI flow.
 * @param currentPlayer The current player state before the AI effects are applied.
 * @returns A promise that resolves to an object containing the `updatedPlayer` state,
 *          an array of `notifications` for UI feedback, and the new `scenarioText`.
 */
async function executeScenarioGenerationAndProcessOutput(
  aiInput: GenerateScenarioInput,
  currentPlayer: Player
): Promise<{ updatedPlayer: Player; notifications: GameNotification[]; scenarioText: string }> {
  try {
    const aiOutput: GenerateScenarioOutput = await generateScenario(aiInput);
    const { updatedPlayer, notifications } = processAndApplyAIScenarioOutput(currentPlayer, aiOutput);
    return {
      updatedPlayer,
      notifications,
      scenarioText: aiOutput.scenarioText,
    };
  } catch (error) {
    // Re-throw the error to be caught by the calling function's try-catch block
    console.error("Error in executeScenarioGenerationAndProcessOutput:", error);
    throw error;
  }
}

interface GamePlayProps {
  initialGameState: GameState;
  onRestart: () => void; 
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>;
}

const GamePlay: React.FC<GamePlayProps> = ({ initialGameState, onRestart, setGameState }) => {
  const [player, setPlayerInternal] = useState<Player | null>(initialGameState.player);
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(initialGameState.currentScenario);
  const [previousStats, setPreviousStats] = useState<PlayerStats | undefined>(initialGameState.player?.stats);
  const [isLoading, setIsLoading] = useState(false);
  const [playerInput, setPlayerInput] = useState('');
  const { toast } = useToast();

  const [currentLocationForUI, setCurrentLocationForUI] = useState<LocationData>(
    initialGameState.player?.currentLocation || initialPlayerLocation
  );
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  const [locationImageUrl, setLocationImageUrl] = useState<string | null>(null);
  const [locationImageLoading, setLocationImageLoading] = useState(false);
  const [locationImageError, setLocationImageError] = useState<string | null>(null);


  useEffect(() => {
    if (initialGameState.player !== player) {
      setPlayerInternal(initialGameState.player);
      if(initialGameState.player?.stats) setPreviousStats(initialGameState.player.stats);
      if(initialGameState.player?.currentLocation) setCurrentLocationForUI(initialGameState.player.currentLocation);
    }
    if (initialGameState.currentScenario !== currentScenario) {
      setCurrentScenario(initialGameState.currentScenario);
    }
  }, [initialGameState.player, initialGameState.currentScenario, player, currentScenario]);


  /**
   * useEffect hook responsible for initializing the `currentScenario` when the game starts
   * or when the player data is loaded. It also handles a data consistency check:
   * if the `player` object is loaded but `player.currentLocation` is missing,
   * it initializes the location to a default, updates the player state, and saves it.
   */
  useEffect(() => {
    // This effect handles the initial setup of the currentScenario or corrects missing player location.

    // Condition 1: Player and their location are loaded, but there's no current scenario yet.
    // This typically happens at the very start of the game.
    if (player && player.currentLocation && !currentScenario) {
      const firstScenario = getInitialScenario(player);
      setCurrentScenario(firstScenario);
      // Note: No saveGameState here as this is usually the initial, non-interactive scenario.
      // If saving is needed, it should be considered carefully based on game flow.
    }
    // Condition 2: Player data is loaded, but their currentLocation is missing.
    // This indicates an inconsistent state that needs correction.
    else if (player && !player.currentLocation) {
        console.warn("Player object missing currentLocation. Initializing with default location and saving state.");

        // Create a new player object with the default location.
        const playerWithDefaultLocation = { ...player, currentLocation: initialPlayerLocation };

        // Update local component state for player and UI.
        setPlayerInternal(playerWithDefaultLocation); 
        setCurrentLocationForUI(initialPlayerLocation); // Ensure UI elements like map/weather also update.

        // Generate the initial scenario with the corrected player data.
        const firstScenario = getInitialScenario(playerWithDefaultLocation);
        setCurrentScenario(firstScenario);

        // Update the global game state (passed via props).
        // This also ensures the parent component has the corrected player state.
        setGameState(prevState => prevState ?
          {...prevState, player: playerWithDefaultLocation, currentScenario: firstScenario } :
          {player: playerWithDefaultLocation, currentScenario: firstScenario });

        // Persist the corrected game state.
        saveGameState({ player: playerWithDefaultLocation, currentScenario: firstScenario });
        // This useEffect will re-run after setPlayerInternal/setGameState.
        // On the next run:
        // - `player.currentLocation` will exist.
        // - `!currentScenario` might still be true if setCurrentScenario hasn't flushed.
        // - Or, if setCurrentScenario has flushed, `currentScenario` will exist.
        // - If `!currentScenario` is true, it will fall into the first `if` block, which is fine.
        // - If `currentScenario` is set, neither block will execute, preventing further loops.
    }
  }, [player, currentScenario, setGameState]); // Dependencies:
                                               // - player: to react to player data loading or changes.
                                               // - currentScenario: to check if the initial scenario is set.
                                               // - setGameState: to update the global state if player location is corrected.

  useEffect(() => {
    const fetchWeatherForLocation = async (loc: LocationData) => {
      setWeatherLoading(true);
      setWeatherError(null);
      try {
        const result = await getCurrentWeather(loc.latitude, loc.longitude);
        if ('error' in result) {
          setWeatherError(result.error);
          setWeather(null);
        } else {
          setWeather(result);
        }
      } catch (e: any) {
        const errorMessage = e.message || "Une erreur inconnue est survenue lors de la récupération de la météo.";
        setWeatherError(errorMessage);
        setWeather(null);
      } finally {
        setWeatherLoading(false);
      }
    };

    const locationToFetch = player?.currentLocation;
    if (locationToFetch && typeof locationToFetch.latitude === 'number' && typeof locationToFetch.longitude === 'number') {
       fetchWeatherForLocation(locationToFetch);
       if (currentLocationForUI.placeName !== locationToFetch.placeName ||
           currentLocationForUI.latitude !== locationToFetch.latitude ||
           currentLocationForUI.longitude !== locationToFetch.longitude) {
         setCurrentLocationForUI(locationToFetch);
       }
    } else if (typeof currentLocationForUI.latitude === 'number' && typeof currentLocationForUI.longitude === 'number') {
      fetchWeatherForLocation(currentLocationForUI);
    }

  }, [player?.currentLocation, currentLocationForUI]); 

  useEffect(() => {
    const fetchLocationImage = async () => {
      if (player?.currentLocation?.placeName) {
        setLocationImageLoading(true);
        setLocationImageUrl(null); 
        setLocationImageError(null);
        try {
          const result = await generateLocationImage({ placeName: player.currentLocation.placeName });
          if (result.imageUrl && result.imageUrl.startsWith('data:image')) {
            setLocationImageUrl(result.imageUrl);
          } else {
            const errorMsg = result.error || "L'IA n'a pas pu générer une image pour ce lieu.";
            setLocationImageError(errorMsg);
          }
        } catch (e: any) {
          const errorMsg = e.message || "Erreur inconnue lors de la génération de l'image du lieu.";
          setLocationImageError(errorMsg);
        } finally {
          setLocationImageLoading(false);
        }
      }
    };

    fetchLocationImage();
  }, [player?.currentLocation?.placeName]);


  /**
   * Asynchronously handles the submission of a player's action.
   * This function orchestrates the process:
   * 1. Validates the current game state and player input.
   * 2. Prepares the input for the AI using `prepareAIInput`.
   * 3. Calls `executeScenarioGenerationAndProcessOutput` to get the AI-generated scenario and its effects.
   * 4. Updates the local and global game state with the new player data and scenario.
   * 5. Displays notifications (toasts) to the player based on the outcomes.
   * 6. Handles any errors during the process and provides UI feedback.
   *
   * @param actionText The text string of the action submitted by the player.
   */
  const handlePlayerActionSubmit = useCallback(async (actionText: string) => {
    if (!player || !currentScenario || !actionText.trim()) {
      if (!actionText.trim()){
        toast({
          variant: "destructive",
          title: "Action vide",
          description: "Veuillez entrer une action.",
        });
      }
      return;
    }

    if (!player.currentLocation || typeof player.currentLocation.latitude !== 'number' || typeof player.currentLocation.longitude !== 'number') {
      console.error("Critical Error: player.currentLocation is invalid before AI call.", player);
      toast({
          variant: "destructive",
          title: "Erreur Critique du Jeu",
          description: "La localisation du joueur est manquante ou invalide. Essayez de redémarrer le jeu.",
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    if(player.stats) setPreviousStats(player.stats);

    const inputForAI = prepareAIInput(player, currentScenario.scenarioText, actionText);

    try {
      const { updatedPlayer, notifications, scenarioText } = await executeScenarioGenerationAndProcessOutput(inputForAI, player);
      
      setPlayerInternal(updatedPlayer);
      setGameState(prevState => prevState ? {...prevState, player: updatedPlayer, currentScenario: { scenarioText }} : { player: updatedPlayer, currentScenario: { scenarioText }});

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

      const nextScenario: Scenario = { scenarioText };
      setCurrentScenario(nextScenario); 
      setPlayerInput('');

    } catch (error) {
      // Error is already logged by executeScenarioGenerationAndProcessOutput
      let errorMessage = "Impossible de générer le prochain scénario ou d'appliquer ses effets.";
      if (error instanceof Error) {
        errorMessage += ` Détail: ${error.message}`;
      }
      toast({
        variant: "destructive",
        title: "Erreur de Connexion avec l'IA",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, [player, currentScenario, toast, setGameState]);


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
    <div className="flex flex-col p-4 md:p-6 space-y-4"> 
      <Card className="shadow-lg shrink-0 border-border bg-card/80 backdrop-blur-sm">
        <CardContent className="p-3 md:p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <WeatherDisplay weatherData={weather} isLoading={weatherLoading} error={weatherError} placeName={displayLocation.placeName} />
            <MapDisplay latitude={displayLocation.latitude} longitude={displayLocation.longitude} placeName={displayLocation.placeName} />
            <LocationImageDisplay 
                imageUrl={locationImageUrl} 
                placeName={displayLocation.placeName} 
                isLoading={locationImageLoading} 
                error={locationImageError} 
            />
          </div>
        </CardContent>
      </Card>

      {/* This div is the flex-growing middle section */}
      <div className="flex-grow flex flex-col min-h-0"> {/* Removed relative */}
        <ScrollArea className="flex-grow min-h-0"> {/* ScrollArea itself will grow and handle its scroll */}
            <ScenarioDisplay
            scenarioHTML={currentScenario.scenarioText}
            isLoading={isLoading}
            />
        </ScrollArea>
      </div>
      
      <div className="shrink-0">
        <PlayerInputForm
            playerInput={playerInput}
            onPlayerInputChange={setPlayerInput}
            onSubmit={handlePlayerActionSubmit}
            isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default GamePlay;
