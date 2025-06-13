
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { GameState, Player, Scenario, PlayerStats } from '@/lib/types';
import StatDisplay from './StatDisplay';
import ScenarioDisplay from './ScenarioDisplay';
import { Button } from '@/components/ui/button';
// Updated import for generateScenario to use simplified types for debugging
import { generateScenario, type SimplifiedInput, type SimplifiedOutput } from '@/ai/flows/generate-scenario';
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

    // --- TEMPORARY: Send simplified input for debugging ---
    const inputForAI: SimplifiedInput = {
      debugPrompt: `Player chose: ${choiceText}. Current scenario context: ${currentScenario.scenarioText.substring(0, 100)}...`,
    };
    // --- END TEMPORARY ---

    /* --- ORIGINAL INPUT (commented out for debugging) ---
    const inputForAI: GenerateScenarioInput = {
      playerName: player.name,
      playerBackground: player.background,
      playerStats: player.stats,
      playerChoice: choiceText,
      currentScenario: currentScenario.scenarioText,
    };
    */

    try {
      // Temporarily expect SimplifiedOutput
      const output: SimplifiedOutput = await generateScenario(inputForAI);
      
      // Since we are using simplified output, we can't update stats or scenario text in the same way.
      // We'll just display the AI's response for now.
      const nextScenario: Scenario = {
        scenarioText: `<p><strong>Debug AI Response:</strong></p><p>${output.responseText}</p><p><em>(Original scenario update logic is temporarily bypassed. Make a choice to continue debugging.)</em></p><div><button data-choice-text="Debug Choice 1">Debug Choice 1</button><button data-choice-text="Debug Choice 2">Debug Choice 2</button></div>`,
      };

      // We won't update player stats with the simplified output for now.
      // const updatedStats = applyStatChanges(player.stats, output.scenarioStatsUpdate);
      // const updatedPlayer: Player = { ...player, stats: updatedStats };
      // setPlayer(updatedPlayer);

      setCurrentScenario(nextScenario);
      
      const newGameState: GameState = { player, currentScenario: nextScenario }; // Player stats are not updated in this debug state
      saveGameState(newGameState);

      toast({
        title: "Debug Progression...",
        description: "AI response received (simplified flow).",
      });

    } catch (error) {
      console.error("Erreur lors de la génération du scénario (simplified flow):", error);
      toast({
        variant: "destructive",
        title: "Erreur de Connexion (Debug)",
        description: `Impossible de générer le prochain scénario. Erreur: ${error instanceof Error ? error.message : String(error)}`,
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
