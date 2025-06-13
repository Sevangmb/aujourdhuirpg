
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { GameState, Player, Scenario, PlayerStats } from '@/lib/types';
import StatDisplay from './StatDisplay';
import ScenarioDisplay from './ScenarioDisplay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Import Input
import { generateScenario, type GenerateScenarioInput, type GenerateScenarioOutput } from '@/ai/flows/generate-scenario';
import { applyStatChanges, saveGameState, getInitialScenario } from '@/lib/game-logic';
import { useToast } from "@/hooks/use-toast";
import { Loader2, RotateCcw, Send } from 'lucide-react'; // Added Send icon
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentWeather, type WeatherData } from '@/app/actions/get-current-weather';
import MapDisplay from './MapDisplay';
import * as LucideIcons from 'lucide-react';


interface GamePlayProps {
  initialGameState: GameState;
  onRestart: () => void;
}

const WeatherDisplay: React.FC<{ weatherData: WeatherData | null; isLoading: boolean; error: string | null }> = ({ weatherData, isLoading, error }) => {
  if (isLoading) {
    return (
      <div className="flex items-center text-sm text-muted-foreground p-3 bg-card rounded-lg shadow-md mb-4 border border-border">
        <LucideIcons.Loader2 className="h-4 w-4 animate-spin mr-2" />
        Chargement de la météo...
      </div>
    );
  }
  if (error) {
    const displayError = error.length > 70 ? error.substring(0, 70) + "..." : error;
    return (
      <div className="flex items-center text-sm text-destructive p-3 bg-destructive/10 border border-destructive/30 rounded-lg shadow-md mb-4">
        <LucideIcons.AlertTriangle className="h-4 w-4 mr-2 text-destructive" />
        Météo indisponible: {displayError}
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
          Météo à Paris
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
  const [playerInput, setPlayerInput] = useState(''); // State for the player's text input
  const { toast } = useToast();

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  const parisLatitude = 48.8566;
  const parisLongitude = 2.3522;

  useEffect(() => {
    if (player && !currentScenario) {
      const firstScenario = getInitialScenario(player);
      setCurrentScenario(firstScenario);
      const newGameState: GameState = { player, currentScenario: firstScenario };
      saveGameState(newGameState);
    }
  }, [player, currentScenario]);
  
  useEffect(() => {
    const fetchWeather = async () => {
      setWeatherLoading(true);
      setWeatherError(null);
      try {
        const result = await getCurrentWeather(parisLatitude, parisLongitude);
        if ('error' in result) {
          setWeatherError(result.error);
        } else {
          setWeather(result);
        }
      } catch (e: any) {
        const errorMessage = e.message || "Une erreur inconnue est survenue lors de la récupération de la météo.";
        setWeatherError(errorMessage);
      } finally {
        setWeatherLoading(false);
      }
    };
    if (player) { 
       fetchWeather();
    }
  }, [player]);

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

    setIsLoading(true);
    setPreviousStats(player.stats);

    const inputForAI: GenerateScenarioInput = {
      playerName: player.name,
      playerBackground: player.background,
      playerStats: player.stats,
      playerChoice: actionText.trim(), // Use the text from input
      currentScenario: currentScenario.scenarioText,
    };

    try {
      const output: GenerateScenarioOutput = await generateScenario(inputForAI);
      
      const updatedStats = applyStatChanges(player.stats, output.scenarioStatsUpdate);
      const updatedPlayer: Player = { ...player, stats: updatedStats };
      setPlayer(updatedPlayer);

      const nextScenario: Scenario = {
        scenarioText: output.scenarioText,
      };
      setCurrentScenario(nextScenario);
      
      const newGameState: GameState = { player: updatedPlayer, currentScenario: nextScenario };
      saveGameState(newGameState);

      setPlayerInput(''); // Clear input field after submission
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

  return (
    <div className="flex flex-col h-full p-4 md:p-8 space-y-6">
      <div className="md:sticky md:top-4 md:z-10 grid gap-4">
         <WeatherDisplay weatherData={weather} isLoading={weatherLoading} error={weatherError} />
         <MapDisplay latitude={parisLatitude} longitude={parisLongitude} placeName="Paris, France" />
         <StatDisplay stats={player.stats} previousStats={previousStats} />
      </div>
     
      <div className="flex-grow flex">
        <ScenarioDisplay 
          scenarioHTML={currentScenario.scenarioText} 
          isLoading={isLoading} // Pass isLoading to show spinner in scenario display if needed
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
