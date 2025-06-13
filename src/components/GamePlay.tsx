
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

interface GamePlayProps {
  initialGameState: GameState;
  onRestart: () => void;
}

const GamePlay: React.FC<GamePlayProps> = ({ initialGameState, onRestart }) => {
  const [player, setPlayer] = useState<Player | null>(initialGameState.player);
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(initialGameState.currentScenario);
  const [previousStats, setPreviousStats] = useState<PlayerStats | undefined>(initialGameState.player?.stats);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (player && !currentScenario) {
      // This case should ideally not be hit if initialGameState always provides a scenario
      // But as a fallback, generate the initial scenario.
      const firstScenario = getInitialScenario(player);
      setCurrentScenario(firstScenario);
      const newGameState: GameState = { player, currentScenario: firstScenario };
      saveGameState(newGameState);
    }
  }, [player, currentScenario]);
  

  const handleChoice = useCallback(async (choiceText: string) => {
    if (!player || !currentScenario) return;

    setIsLoading(true);
    setPreviousStats(player.stats);

    const inputForAI: GenerateScenarioInput = {
      playerName: player.name,
      playerBackground: player.background,
      playerStats: player.stats,
      playerChoice: choiceText,
      currentScenario: currentScenario.scenarioText, // Pass the HTML of the current scenario
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
      // Optionally, offer to retry or revert to a safe state
      // For now, we just stop loading
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
