
"use client";

import React, { useState, useEffect, useCallback, useReducer } from 'react';
import type { GameState, Player, PlayerStats, LocationData, Scenario, ToneSettings, Position, JournalEntry, GameNotification } from '@/lib/types';
import { gameReducer, GameAction, fetchPoisForCurrentLocation } from '@/lib/game-logic'; 
import ScenarioDisplay from './ScenarioDisplay';
import { generateScenario, type GenerateScenarioInput, type GenerateScenarioOutput } from '@/ai/flows/generate-scenario';
import { generateLocationImage } from '@/ai/flows/generate-location-image-flow';
import { saveGameState, getInitialScenario } from '@/lib/game-logic';
import { initialPlayerLocation, initialToneSettings, UNKNOWN_STARTING_PLACE_NAME } from '@/data/initial-game-data'; 
import { processAndApplyAIScenarioOutput } from '@/lib/ai-game-effects';
import { useToast } from "@/hooks/use-toast";
import { Loader2, Star, Euro, Search as SearchIcon } from 'lucide-react'; 
import { getCurrentWeather, type WeatherData } from '@/app/actions/get-current-weather';
import MapDisplay from './MapDisplay';
import WeatherDisplay from './WeatherDisplay';
import LocationImageDisplay from './LocationImageDisplay';
import PlayerInputForm from './PlayerInputForm';
import JournalDisplay from './JournalDisplay'; 
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';


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
}

const GamePlay: React.FC<GamePlayProps> = ({ initialGameState, onRestart, onStateUpdate }) => {
  
  const [playerInput, setPlayerInput] = useState('');
  const [isLoading, setIsLoading] = useState(false); 
  const { toast } = useToast();

  const [currentLocationForUI, setCurrentLocationForUI] = useState<Position>(
    initialGameState.player?.currentLocation || initialPlayerLocation
  );
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  const [locationImageUrl, setLocationImageUrl] = useState<string | null>(null);
  const [locationImageLoading, setLocationImageLoading] = useState(false);
  const [locationImageError, setLocationImageError] = useState<string | null>(null);

  useEffect(() => {
    if (initialGameState.player?.currentLocation) {
      setCurrentLocationForUI(initialGameState.player.currentLocation);
    }
  }, [initialGameState.player?.currentLocation]);


  useEffect(() => {
    if (initialGameState.player && initialGameState.player.currentLocation && !initialGameState.currentScenario) {
      const firstScenario = getInitialScenario(initialGameState.player);
      const updatedState = gameReducer(initialGameState, { type: 'SET_CURRENT_SCENARIO', payload: firstScenario });
      onStateUpdate(updatedState);
    }
  }, [initialGameState, onStateUpdate]);


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

  useEffect(() => {
    const fetchLocationImage = async () => {
      if (initialGameState.player?.currentLocation?.name && initialGameState.player.currentLocation.name !== UNKNOWN_STARTING_PLACE_NAME) {
        setLocationImageLoading(true);
        setLocationImageUrl(null); 
        setLocationImageError(null);
        try {
          const result = await generateLocationImage({ placeName: initialGameState.player.currentLocation.name }); 
          if (result.imageUrl && result.imageUrl.startsWith('data:image')) {
            setLocationImageUrl(result.imageUrl);
          } else {
            const errorMsg = result.error || "L'IA n'a pas pu générer une image pour ce lieu.";
            setLocationImageError(errorMsg);
            console.warn("Location Image Generation Warning:", errorMsg, "Input placeName:", initialGameState.player.currentLocation.name);
          }
        } catch (e: any) {
          const errorMsg = e.message || "Erreur inconnue lors de la génération de l'image du lieu.";
          setLocationImageError(errorMsg);
          console.error("Location Image Generation Error:", e, "Input placeName:", initialGameState.player.currentLocation.name);
        } finally {
          setLocationImageLoading(false);
        }
      } else {
        setLocationImageUrl(null);
        setLocationImageLoading(false);
        setLocationImageError(null);
      }
    };

    fetchLocationImage();
  }, [initialGameState.player?.currentLocation?.name]);


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
    <div className="flex flex-col p-2 md:p-4 space-y-2 md:space-y-4 h-full">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 shrink-0">
        <WeatherDisplay weatherData={weather} isLoading={weatherLoading} error={weatherError} placeName={displayLocation.name} />
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 md:gap-4 flex-grow min-h-0">
        <div className="lg:col-span-2 flex-grow min-h-0 flex flex-col"> 
          <ScrollArea className="flex-grow min-h-0"> 
            <ScenarioDisplay
              scenarioHTML={currentScenario.scenarioText}
              isLoading={isLoading}
            />
          </ScrollArea>
        </div>
        <div className="flex-grow min-h-0 flex flex-col"> 
          <ScrollArea className="flex-grow min-h-0"> 
            <JournalDisplay journal={journal || []} />
          </ScrollArea>
        </div>
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
