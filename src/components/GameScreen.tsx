"use client";

import React from 'react';
import { useGame } from '@/contexts/GameContext';
import GamePlay from '@/components/GamePlay';
import AppMenubar from '@/components/AppMenubar';
import { Loader2 } from 'lucide-react';

const GameScreen: React.FC = () => {
  const { isGameActive } = useGame();

  if (isGameActive) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <AppMenubar />
        <div className="flex-grow overflow-hidden">
          <GamePlay />
        </div>
      </div>
    );
  }
  
  return (
    <main className="flex-grow flex flex-col items-center justify-center p-4 md:p-8 bg-background h-full">
      <Loader2 className="h-16 w-16 animate-spin text-primary" />
      <p className="mt-4 text-xl font-headline">
        Chargement de votre aventure...
      </p>
    </main>
  );
};

export default GameScreen;
