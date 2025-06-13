
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { GameState, Player, Scenario, PlayerStats, LocationData } from '@/lib/types';
import StatDisplay from './StatDisplay';
import ScenarioDisplay from './ScenarioDisplay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { generateScenario, type GenerateScenarioInput, type GenerateScenarioOutput } from '@/ai/flows/generate-scenario';
import { applyStatChanges, saveGameState, getInitialScenario, initialPlayerLocation } from '@/lib/game-logic';
import { useToast } from "@/hooks/use-toast";
import { Loader2, RotateCcw, Send, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentWeather, type WeatherData } from '@/app/actions/get-current-weather';
import MapDisplay from './MapDisplay';
import * as LucideIcons from 'lucide-react';


interface GamePlayProps {
  initialGameState: GameState;
  onRestart: () => void;
}

const WeatherDisplay: React.FC<{ weatherData: WeatherData | null; isLoading: boolean; error: string | null; placeName: string; }> = ({ weatherData, isLoading, error, placeName }) => {
  if (isLoading) {
    return (
      <div className="flex items-center text-sm text-muted-foreground p-3 bg-card rounded-lg shadow-md mb-4 border border-border">
        <LucideIcons.Loader2 className="h-4 w-4 animate-spin mr-2" />
        Chargement de la météo à {placeName}...
      </div>
    );
  }
  if (error) {
    const displayError = error.length > 70 ? error.substring(0, 70) + "..." : error;
    return (
      <div className="flex items-center text-sm text-destructive p-3 bg-destructive/10 border border-destructive/30 rounded-lg shadow-md mb-4">
        <LucideIcons.AlertTriangle className="h-4 w-4 mr-2 text-destructive" />
        Météo ({placeName}) indisponible: {displayError}
      </div>
    );
  }
  if (!weatherData) {
    return null;
  }

  const IconComponent = (LucideIcons as any)[weatherData.iconName] || LucideIcons.HelpCircle;

  return (
    <Card className="mb-4 shadow-md border border-border">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-lg font-headline flex items-center text-primary/90">
          <IconComponent className="w-5 h-5 mr-2" />
          Météo à {placeName}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm px-4 pb-3 text-foreground/90">
        {weatherData.temperature}°C, {weatherData.description}
      </CardContent>
    </Card>
  );
};


const GamePlay: React.FC<GamePlayProps> = ({ initialGameState, onRestart }) => {
  const [player, setPlayer] = useState<Player | null>(initialGameState.player);
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
    if (player && player.currentLocation && !currentScenario) {
      const firstScenario = getInitialScenario(player);
      setCurrentScenario(firstScenario);
      saveGameState({ player, currentScenario: firstScenario });
    } else if (player && !player.currentLocation) {
        // This is a fallback, should ideally not happen if initialization is correct
        console.warn("Player object missing currentLocation, re-initializing scenario with default location.");
        const playerWithDefaultLocation = { ...player, currentLocation: initialPlayerLocation };
        setPlayer(playerWithDefaultLocation); // Update player state
        setCurrentLocationForUI(initialPlayerLocation); // Update UI location state
        const firstScenario = getInitialScenario(playerWithDefaultLocation);
        setCurrentScenario(firstScenario);
        saveGameState({ player: playerWithDefaultLocation, currentScenario: firstScenario });
    }
  }, [player, currentScenario]);

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

    // Use player.currentLocation for fetching weather if player exists, otherwise fallback to currentLocationForUI
    const locationToFetch = player?.currentLocation || currentLocationForUI;
    if (locationToFetch) {
       fetchWeatherForLocation(locationToFetch);
    }
  }, [player, currentLocationForUI]);

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

    // Defensive check for player.currentLocation
    if (!player.currentLocation) {
      console.error("Critical Error: player.currentLocation is undefined before AI call.", player);
      toast({
          variant: "destructive",
          title: "Erreur Critique du Jeu",
          description: "La localisation du joueur est manquante. Essayez de redémarrer le jeu.",
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setPreviousStats(player.stats);

    const inputForAI: GenerateScenarioInput = {
      playerName: player.name,
      playerBackground: player.background,
      playerStats: player.stats,
      playerChoice: actionText.trim(),
      currentScenario: currentScenario.scenarioText,
      playerLocation: player.currentLocation, // player.currentLocation is now validated
    };

    try {
      const output: GenerateScenarioOutput = await generateScenario(inputForAI);

      const updatedStats = applyStatChanges(player.stats, output.scenarioStatsUpdate);
      // Ensure player is not null before spreading, though already guarded
      let updatedPlayer = { ...(player as Player), stats: updatedStats };


      if (output.newLocationDetails && output.newLocationDetails.latitude && output.newLocationDetails.longitude && output.newLocationDetails.placeName) {
        const newLoc: LocationData = {
          latitude: output.newLocationDetails.latitude,
          longitude: output.newLocationDetails.longitude,
          placeName: output.newLocationDetails.placeName,
        };
        updatedPlayer.currentLocation = newLoc;
        setCurrentLocationForUI(newLoc); 
         toast({
          title: "Déplacement !",
          description: `Vous êtes maintenant à ${newLoc.placeName}. ${output.newLocationDetails.reasonForMove || ''}`,
        });
      }
      setPlayer(updatedPlayer);


      const nextScenario: Scenario = {
        scenarioText: output.scenarioText,
      };
      setCurrentScenario(nextScenario);

      const newGameState: GameState = { player: updatedPlayer, currentScenario: nextScenario };
      saveGameState(newGameState);

      setPlayerInput('');
      toast({
        title: "Votre action a été prise en compte...",
        description: "Le récit continue.",
      });

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
  }, [player, currentScenario, toast]);

  const handleSubmitForm = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handlePlayerActionSubmit(playerInput);
  };

  if (!player || !currentScenario) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl">Chargement du jeu...</p>
        <Button onClick={onRestart} variant="outline" className="mt-4">
          <RotateCcw className="mr-2 h-4 w-4" /> Recommencer
        </Button>
      </div>
    );
  }
  
  // Ensure currentLocationForUI reflects the player's actual current location for display
  // This helps if player state updates but UI state for location lags.
  const displayLocation = player.currentLocation || currentLocationForUI;

  return (
    <div className="flex flex-col h-full p-4 md:p-8 space-y-6">
      <div className="md:sticky md:top-4 md:z-10 grid gap-4">
         <WeatherDisplay weatherData={weather} isLoading={weatherLoading} error={weatherError} placeName={displayLocation.placeName} />
         <MapDisplay latitude={displayLocation.latitude} longitude={displayLocation.longitude} placeName={displayLocation.placeName} />
         <StatDisplay stats={player.stats} previousStats={previousStats} />
      </div>

      <div className="flex-grow flex">
        <ScenarioDisplay
          scenarioHTML={currentScenario.scenarioText}
          isLoading={isLoading}
        />
      </div>

      <form onSubmit={handleSubmitForm} className="mt-4 flex gap-2 items-center">
        <Input
          type="text"
          value={playerInput}
          onChange={(e) => setPlayerInput(e.target.value)}
          placeholder="Que faites-vous ensuite ?"
          className="flex-grow"
          disabled={isLoading}
        />
        <Button type="submit" disabled={isLoading} className="bg-primary hover:bg-primary/90">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Envoyer
        </Button>
      </form>

      <div className="flex justify-center mt-auto pt-4">
        <Button onClick={onRestart} variant="outline" className="shadow-md" disabled={isLoading}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Recommencer la partie
        </Button>
      </div>
    </div>
  );
};

export default GamePlay;

