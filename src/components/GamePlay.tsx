"use client";

import React, { useState, useEffect, useCallback, useReducer } from 'react';
import type { GameState, Player, PlayerStats, LocationData, Scenario, ToneSettings, Position, JournalEntry, GameNotification } from '@/lib/types';
import { gameReducer, GameAction, fetchPoisForCurrentLocation } from '@/lib/game-logic'; // Import reducer and actions
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
import JournalDisplay from './JournalDisplay'; // Import JournalDisplay
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
// import { v4 as uuidv4 } from 'uuid'; // For unique journal IDs if needed, using simple one for now

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
    investigationNotes: player.investigationNotes,
  };
};

/**
 * Calls the AI scenario generation service and processes its output.
 * This asynchronous function handles the direct interaction with the AI flow (`generateScenario`)
 * and then applies the results to the player's state using `processAndApplyAIScenarioOutput`.
 *
 * @param aiInput The input object prepared for the `generateScenario` AI flow.
 * @param currentPlayer The current player state before the AI effects are applied.
 * @param playerChoice The original text input from the player.
 * @returns A promise that resolves to an object containing the `updatedPlayer` state,
 *          an array of `notifications` for UI feedback, and the new `scenarioText`.
 */
async function executeScenarioGenerationAndProcessOutput(
  aiInput: GenerateScenarioInput,
  currentPlayer: Player,
  playerChoice: string, // Added playerChoice here
): Promise<{ updatedPlayer: Player; notifications: GameNotification[]; scenarioText: string }> {
  try {
    const aiOutput: GenerateScenarioOutput = await generateScenario(aiInput);
    // Pass playerChoice to processAndApplyAIScenarioOutput
    const { updatedPlayer, notifications } = await processAndApplyAIScenarioOutput(currentPlayer, playerChoice, aiOutput);
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
  initialGameState: GameState; // This will be the single source of truth for the current game state
  onRestart: () => void;
  // setGameState will now be called by our internal dispatching logic after reducer updates state
  // The prop 'setGameState' from the parent now represents the function to persist the new state
  // and cause a re-render of the whole game from App.tsx or similar.
  onStateUpdate: (newState: GameState) => void;
}

const GamePlay: React.FC<GamePlayProps> = ({ initialGameState, onRestart, onStateUpdate }) => {
  // Use a local state for playerInput, isLoading, etc.
  // The main GameState is now managed by the prop initialGameState and updated via onStateUpdate
  const [playerInput, setPlayerInput] = useState('');
  const [isLoading, setIsLoading] = useState(false); // For AI actions primarily
  const { toast } = useToast();

  // Local state for UI elements that depend on player location but don't need to be in global GameState immediately
  const [currentLocationForUI, setCurrentLocationForUI] = useState<Position>(
    initialGameState.player?.currentLocation || initialPlayerLocation
  );
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  const [locationImageUrl, setLocationImageUrl] = useState<string | null>(null);
  const [locationImageLoading, setLocationImageLoading] = useState(false);
  const [locationImageError, setLocationImageError] = useState<string | null>(null);

  // This effect ensures that if the initialGameState prop changes from parent,
  // the UI-specific states are updated.
  useEffect(() => {
    if (initialGameState.player?.currentLocation) {
      setCurrentLocationForUI(initialGameState.player.currentLocation);
    }
  }, [initialGameState.player?.currentLocation]);


  /**
   * useEffect hook responsible for initializing the `currentScenario` if it's missing,
   * assuming player data is available.
   */
  useEffect(() => {
    if (initialGameState.player && initialGameState.player.currentLocation && !initialGameState.currentScenario) {
      const firstScenario = getInitialScenario(initialGameState.player);
      // Dispatch an action to update the currentScenario in the GameState
      // This pattern assumes that such an action would update the state via onStateUpdate
      const updatedState = gameReducer(initialGameState, { type: 'SET_CURRENT_SCENARIO', payload: firstScenario });
      onStateUpdate(updatedState);
    }
    // If player location itself is missing, it's a more critical issue,
    // potentially handled by a loading screen or an error state before GamePlay is rendered.
    // Or, a specific action could be dispatched to initialize the player fully.
  }, [initialGameState, onStateUpdate]);


  // Weather fetching logic (remains largely the same, uses currentLocationForUI)
  useEffect(() => {
    const fetchWeatherForLocation = async (loc: Position) => {
      if (!loc || typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') return;
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
    fetchWeatherForLocation(currentLocationForUI);
  }, [currentLocationForUI]);

  // Location Image fetching
  useEffect(() => {
    const fetchLocationImage = async () => {
      if (initialGameState.player?.currentLocation?.name) { // Changed from placeName to name
        setLocationImageLoading(true);
        setLocationImageUrl(null); 
        setLocationImageError(null);
        try {
          const result = await generateLocationImage({ placeName: initialGameState.player.currentLocation.name }); // Changed from placeName to name
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
  }, [initialGameState.player?.currentLocation?.name]); // Changed from placeName to name


  // Custom dispatch function to handle game actions
  const handleGameAction = useCallback(async (action: GameAction) => {
    if (!initialGameState.player) return; // Should not happen if GamePlay is rendered

    let newState = gameReducer(initialGameState, action);

    // Handle async operations based on action type
    if (action.type === 'MOVE_TO_LOCATION') {
      // Add time for movement
      newState = gameReducer(newState, { type: 'ADD_GAME_TIME', payload: 30 }); // Example: 30 mins

      // Fetch new POIs for the new location
      try {
        setIsLoading(true); // Indicate loading for POI fetch
        const newNearbyPois = await fetchPoisForCurrentLocation(action.payload); // action.payload is the new location
        newState = gameReducer(newState, { type: 'SET_NEARBY_POIS', payload: newNearbyPois });
      } catch (error) {
        console.error("GamePlay: Error fetching new POIs after move:", error);
        newState = gameReducer(newState, { type: 'SET_NEARBY_POIS', payload: null });
        toast({ title: "Erreur réseau", description: "Impossible de charger les lieux proches.", variant: "destructive"});
      } finally {
        setIsLoading(false);
      }
    }

    onStateUpdate(newState); // Update the global state via the prop
    await saveGameState(newState); // Persist the new state
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
      const { updatedPlayer: playerAfterAI, notifications, scenarioText: newScenarioText } = await executeScenarioGenerationAndProcessOutput(inputForAI, player, actionText); // Pass actionText
      
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
      toast({ variant: "destructive", title: "Erreur de Connexion avec l'IA", description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  }, [initialGameState, onStateUpdate, toast]);


  const { player, currentScenario, journal, nearbyPois, gameTimeInMinutes } = initialGameState;

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
    <div className="flex flex-col p-4 md:p-6 space-y-4 h-full"> {/* Make GamePlay take full height */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 shrink-0"> {/* Top section for map, weather, image */}
        <WeatherDisplay weatherData={weather} isLoading={weatherLoading} error={weatherError} placeName={displayLocation.name} />
        <MapDisplay
          currentLocation={displayLocation}
          nearbyPois={nearbyPois || []}
        />
        <LocationImageDisplay
            imageUrl={locationImageUrl}
            placeName={displayLocation.name}
            isLoading={locationImageLoading}
            error={locationImageError}
        />
      </div>

      {/* Middle section with Scenario and Journal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-grow min-h-0">
        <div className="lg:col-span-2 flex-grow min-h-0 flex flex-col"> {/* Ensure this container also grows */}
          <ScrollArea className="flex-grow min-h-0"> {/* ScrollArea will now fill its flex parent */}
            <ScenarioDisplay
              scenarioHTML={currentScenario.scenarioText}
              isLoading={isLoading}
            />
          </ScrollArea>
        </div>
        <div className="flex-grow min-h-0 flex flex-col"> {/* Ensure this container also grows */}
          <ScrollArea className="flex-grow min-h-0"> {/* ScrollArea will now fill its flex parent */}
            <JournalDisplay journal={journal || []} />
          </ScrollArea>
        </div>
      </div>
      
      {/* Bottom section for Player Input */}
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