
"use client";

import React from 'react';
import type { User } from 'firebase/auth';
import type { GameState, Player } from '@/lib/types';
import type { WeatherData } from '@/app/actions/get-current-weather';

// Removed LoadingState import as HomePageContent handles the primary loading states
import CharacterCreationForm from '@/components/CharacterCreationForm';
import GamePlay from '@/components/GamePlay';

interface GameScreenProps {
  user: User; // User is now guaranteed to be non-null when this component is rendered
  gameState: GameState | null;
  isGameActive: boolean;
  onCharacterCreate: (playerData: Omit<Player, 'currentLocation' | 'uid' | 'stats' | 'skills' | 'traitsMentalStates' | 'progression' | 'alignment' | 'inventory' | 'avatarUrl' | 'questLog' | 'encounteredPNJs' | 'decisionLog' | 'clues' | 'documents' | 'investigationNotes' | 'money' | 'toneSettings'>) => void;
  onRestartGame: () => void; // Kept for potential future use or pass-through
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>;
  weatherData: WeatherData | null;
  weatherLoading: boolean;
  weatherError: string | null;
  locationImageUrl: string | null;
  locationImageLoading: boolean;
  locationImageError: string | null;
  isGeneratingAvatar: boolean;
}

const GameScreen: React.FC<GameScreenProps> = ({
  // user, // user prop is received but not directly used for conditional rendering here anymore
  gameState,
  isGameActive,
  onCharacterCreate,
  onRestartGame,
  setGameState,
  weatherData,
  weatherLoading,
  weatherError,
  locationImageUrl,
  locationImageLoading,
  locationImageError,
  isGeneratingAvatar,
}) => {
  // Primary loading states (auth and initial game data) are handled by HomePageContent.
  // GameScreen now assumes that if it's rendered, the user is authenticated,
  // and initial game data loading attempt has completed.

  // If game is active and player exists, show GamePlay
  if (isGameActive && gameState && gameState.player) {
    return (
      <GamePlay
        initialGameState={gameState}
        onRestart={onRestartGame} // Pass down if GamePlay needs it
        onStateUpdate={setGameState}
        weatherData={weatherData}
        weatherLoading={weatherLoading}
        weatherError={weatherError}
        locationImageUrl={locationImageUrl}
        locationImageLoading={locationImageLoading}
        locationImageError={locationImageError}
      />
    );
  }

  // Otherwise, user is authenticated but game is not active (e.g., new user, or after restart)
  // -> Show CharacterCreationForm
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-4 overflow-y-auto bg-background">
        <CharacterCreationForm 
            onCharacterCreate={onCharacterCreate} 
            isGeneratingAvatar={isGeneratingAvatar}
        />
    </main>
  );
};

export default GameScreen;
