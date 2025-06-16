
"use client";

import React from 'react';
import GamePlay from '@/components/GamePlay';
import type { GameState } from '@/lib/types';

interface GamePlaySectionProps {
  initialGameState: GameState;
  onRestart: () => void;
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>;
}

const GamePlaySection: React.FC<GamePlaySectionProps> = ({ initialGameState, onRestart, setGameState }) => {
  return (
    <GamePlay
      initialGameState={initialGameState}
      onRestart={onRestart}
      setGameState={setGameState}
    />
  );
};

export default GamePlaySection;
