"use client";

import React, { useState, useEffect } from 'react';
import CharacterCreationForm from '@/components/CharacterCreationForm';
import GamePlay from '@/components/GamePlay';
import type { GameState, Player } from '@/lib/types';
import { loadGameState, saveGameState, clearGameState, getInitialScenario } from '@/lib/game-logic';
import { Button } from '@/components/ui/button'; // For potential loading state button
import { Loader2 } from 'lucide-react'; // For loading icon

export default function HomePage() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoadingState, setIsLoadingState] = useState(true);

  useEffect(() => {
    const loadedState = loadGameState();
    if (loadedState) {
      setGameState(loadedState);
    } else {
      // Initialize with no player, prompting character creation
      setGameState({ player: null, currentScenario: null });
    }
    setIsLoadingState(false);
  }, []);

  const handleCharacterCreate = (player: Player) => {
    const firstScenario = getInitialScenario(player);
    const newGameState: GameState = {
      player,
      currentScenario: firstScenario,
    };
    setGameState(newGameState);
    saveGameState(newGameState);
  };

  const handleRestart = () => {
    clearGameState();
    setGameState({ player: null, currentScenario: null });
  };

  if (isLoadingState) {
    return (
      <main className="flex-grow flex flex-col items-center justify-center p-4 md:p-8 bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-xl font-headline">Chargement de votre aventure...</p>
      </main>
    );
  }

  return (
    <main className="flex-grow flex flex-col items-center justify-center p-4 md:p-8 bg-background">
      <div className="w-full max-w-4xl h-full flex flex-col">
        {gameState && gameState.player && gameState.currentScenario ? (
          <GamePlay initialGameState={gameState} onRestart={handleRestart} />
        ) : (
          <CharacterCreationForm onCharacterCreate={handleCharacterCreate} />
        )}
      </div>
    </main>
  );
}
