
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { GameState, Player, PlayerStats, LocationData, Scenario } from '@/lib/types';
// StatDisplay, PlayerSheet, InventoryDisplay, QuestJournalDisplay will be moved to sidebars
// EvidenceLogDisplay will be created for the right sidebar
import ScenarioDisplay from './ScenarioDisplay';
import { generateScenario, type GenerateScenarioInput, type GenerateScenarioOutput } from '@/ai/flows/generate-scenario';
import { saveGameState, getInitialScenario, initialPlayerLocation } from '@/lib/game-logic';
import { processAndApplyAIScenarioOutput } from '@/lib/ai-game-effects';
import { useToast } from "@/hooks/use-toast";
import { Loader2, Star, Euro, Search as SearchIcon } from 'lucide-react'; 
import { getCurrentWeather, type WeatherData } from '@/app/actions/get-current-weather';
import MapDisplay from './MapDisplay';
import WeatherDisplay from './WeatherDisplay';
import PlayerInputForm from './PlayerInputForm';

interface GamePlayProps {
  initialGameState: GameState;
  onRestart: () => void; // Kept for potential direct restart, though button moved to LeftSidebar
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>; // To update player state from here
}

const GamePlay: React.FC<GamePlayProps> = ({ initialGameState, onRestart, setGameState }) => {
  // Player state is now primarily managed in page.tsx and passed down or through sidebars.
  // GamePlay will focus on scenario progression and AI interaction.
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

  useEffect(() => {
    // Sync internal player state if initialGameState.player changes from parent (page.tsx)
    if (initialGameState.player !== player) {
      setPlayerInternal(initialGameState.player);
      if(initialGameState.player?.stats) setPreviousStats(initialGameState.player.stats);
      if(initialGameState.player?.currentLocation) setCurrentLocationForUI(initialGameState.player.currentLocation);
    }
    if (initialGameState.currentScenario !== currentScenario) {
      setCurrentScenario(initialGameState.currentScenario);
    }
  }, [initialGameState.player, initialGameState.currentScenario, player, currentScenario]);


  useEffect(() => {
    if (player && player.currentLocation && !currentScenario) {
      const firstScenario = getInitialScenario(player);
      setCurrentScenario(firstScenario);
    } else if (player && !player.currentLocation) {
        console.warn("Player object missing currentLocation, re-initializing scenario with default location.");
        const playerWithDefaultLocation = { ...player, currentLocation: initialPlayerLocation };
        setPlayerInternal(playerWithDefaultLocation); // Update local copy
        setGameState(prevState => prevState ? {...prevState, player: playerWithDefaultLocation} : {player: playerWithDefaultLocation, currentScenario: null}); // Update parent
        setCurrentLocationForUI(initialPlayerLocation);
        const firstScenario = getInitialScenario(playerWithDefaultLocation);
        setCurrentScenario(firstScenario);
        saveGameState({ player: playerWithDefaultLocation, currentScenario: firstScenario });
    }
  }, [player, currentScenario, setGameState]);

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


    const simplifiedInventory = player.inventory?.map(item => ({ name: item.name, quantity: item.quantity })) || [];
    const playerProgressionForAI = player.progression ? {
      level: player.progression.level,
      xp: player.progression.xp,
      xpToNextLevel: player.progression.xpToNextLevel,
      perks: player.progression.perks || [],
    } : undefined;

    const activeQuestsSummary = (player.questLog || [])
        .filter(q => q.status === 'active')
        .map(q => ({
            id: q.id,
            title: q.title,
            description: q.description.substring(0,150) + "...",
            type: q.type,
            moneyReward: q.moneyReward,
            currentObjectivesDescriptions: (q.objectives || []).filter(obj => !obj.isCompleted).map(obj => obj.description)
        }));

    const encounteredPNJsSummary = (player.encounteredPNJs || []).map(p => ({
        name: p.name,
        relationStatus: p.relationStatus, // Corrected, was p.relation
    }));
    
    const currentCluesSummary = (player.clues || []).map(c => ({ title: c.title, type: c.type }));
    const currentDocumentsSummary = (player.documents || []).map(d => ({ title: d.title, type: d.type }));


    const inputForAI: GenerateScenarioInput = {
      playerName: player.name,
      playerGender: player.gender,
      playerAge: player.age,
      playerOrigin: player.origin,
      playerBackground: player.background,
      playerStats: player.stats,
      playerSkills: player.skills,
      playerTraitsMentalStates: player.traitsMentalStates || [],
      playerProgression: playerProgressionForAI!, // Asserting not undefined based on Player type
      playerAlignment: player.alignment,
      playerInventory: simplifiedInventory,
      playerMoney: player.money,
      playerChoice: actionText.trim(),
      currentScenario: currentScenario.scenarioText,
      playerLocation: player.currentLocation,
      activeQuests: activeQuestsSummary,
      encounteredPNJsSummary: encounteredPNJsSummary,
      currentCluesSummary: currentCluesSummary,
      currentDocumentsSummary: currentDocumentsSummary,
      currentInvestigationNotes: player.investigationNotes,
    };

    try {
      const aiOutput: GenerateScenarioOutput = await generateScenario(inputForAI);

      const { updatedPlayer, notifications } = processAndApplyAIScenarioOutput(player, aiOutput);
      
      setPlayerInternal(updatedPlayer); // Update local player state
      setGameState(prevState => prevState ? {...prevState, player: updatedPlayer, currentScenario: { scenarioText: aiOutput.scenarioText }} : { player: updatedPlayer, currentScenario: { scenarioText: aiOutput.scenarioText }}); // Update parent's GameState

      notifications.forEach(notification => {
        let toastAction;
        if (notification.type === 'xp_gained' || notification.type === 'leveled_up') {
          toastAction = <Star className="text-yellow-400" />;
        } else if (['item_added', 'quest_added', 'clue_added', 'document_added'].includes(notification.type)) {
            toastAction = <Star className="text-green-400" /> // Changed from Zap to Star for consistency
        } else if (notification.type === 'money_changed') {
            toastAction = <Euro className="text-accent" />;
        } else if (notification.type === 'investigation_notes_updated') {
            toastAction = <SearchIcon className="text-blue-400" />;
        }
        toast({
          title: notification.title,
          description: notification.description,
          action: toastAction,
          duration: ['leveled_up', 'quest_added', 'money_changed', 'clue_added', 'document_added', 'investigation_notes_updated'].includes(notification.type) ? 5000: 3000,
        });
      });


      const nextScenario: Scenario = {
        scenarioText: aiOutput.scenarioText,
      };
      setCurrentScenario(nextScenario); // Update local scenario

      // Save game state (parent already does this implicitly when its state changes, but explicit might be good)
      // await saveGameState({ player: updatedPlayer, currentScenario: nextScenario });

      setPlayerInput('');

    } catch (error) {
      console.error("Erreur lors de la génération du scénario:", error);
      let errorMessage = "Impossible de générer le prochain scénario.";
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
    <div className="flex flex-col h-full max-h-screen p-4 md:p-6 space-y-4 overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
         <WeatherDisplay weatherData={weather} isLoading={weatherLoading} error={weatherError} placeName={displayLocation.placeName} />
         <MapDisplay latitude={displayLocation.latitude} longitude={displayLocation.longitude} placeName={displayLocation.placeName} />
      </div>

      {/* Sheet Triggers are removed as their content is now in sidebars */}

      <div className="flex-grow flex flex-col min-h-0"> {/* Ensure this can shrink and scroll */}
        <ScrollArea className="flex-grow"> {/* Scroll area for scenario */}
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
      
      {/* Restart button is now in LeftSidebar */}
    </div>
  );
};

export default GamePlay;

