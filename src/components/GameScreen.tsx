
"use client";

import React from 'react';
import { useGame } from '@/contexts/GameContext';
import GamePlay from '@/components/GamePlay';

const GameScreen: React.FC = () => {
  const { isGameActive } = useGame();

  if (isGameActive) {
    return <GamePlay />;
  }
  
  // The CharacterCreationForm is now handled by CharacterSelectionScreen
  // This component becomes simpler, mainly rendering the active game.
  // A loading or error state could be added here if needed.
  return (
      <main className="flex-1 flex flex-col items-center justify-center p-4 overflow-y-auto bg-background">
          <p>Chargement du jeu...</p>
      </main>
  );
};

export default GameScreen;
