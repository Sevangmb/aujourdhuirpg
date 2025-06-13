
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { GameState, Player, Scenario, PlayerStats } from '@/lib/types';
import StatDisplay from './StatDisplay';
import ScenarioDisplay from './ScenarioDisplay';
import { Button } from '@/components/ui/button';
import { generateScenario, type GenerateScenarioInput, type GenerateScenarioOutput } from '@/ai/flows/generate-scenario';
import { applyStatChanges, saveGameState, getInitialScenario } from '@/lib/game-logic';
import { useToast } from "@/hooks/use-toast";
import { Loader2, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentWeather, type WeatherData } from '@/app/actions/get-current-weather';
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
  const { toast } = useToast();

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);

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
      const lat = 48.85; // Paris
      const lon = 2.35;
      try {
        const result = await getCurrentWeather(lat, lon);
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
  }, [player]); // Removed toast from dependencies as it's not used in this effect

  const handleChoice = useCallback(async (choiceText: string) => {
    if (!player || !currentScenario) return;

    setIsLoading(true);
    setPreviousStats(player.stats);

    const inputForAI: GenerateScenarioInput = {
      playerName: player.name,
      playerBackground: player.background,
      playerStats: player.stats,
      playerChoice: choiceText,
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

      toast({
        title: "Le récit continue...",
        description: "Votre choix a façonné la suite des événements.",
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
      <div className="md:sticky md:top-4 md:z-10">
         <WeatherDisplay weatherData={weather} isLoading={weatherLoading} error={weatherError} />
         <StatDisplay stats={player.stats} previousStats={previousStats} />
      </div>
     
      <div className="flex-grow flex">
        <ScenarioDisplay 
          scenarioHTML={currentScenario.scenarioText} 
          onChoiceMade={handleChoice}
          isLoading={isLoading}
        />
      </div>
      
      <div className="flex justify-center mt-auto pt-4">
        <Button onClick={onRestart} variant="outline" className="shadow-md">
          <RotateCcw className="mr-2 h-4 w-4" />
          Recommencer la partie
        </Button>
      </div>
    </div>
  );
};

export default GamePlay;
