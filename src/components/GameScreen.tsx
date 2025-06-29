
"use client";

import React from 'react';
import type { User } from 'firebase/auth';
import type { GameState } from '@/lib/types';
import type { WeatherData } from '@/app/actions/get-current-weather';

import CharacterCreationForm from '@/components/CharacterCreationForm';
import GamePlay from '@/components/GamePlay';

interface GameScreenProps {
  user: User; // User is now guaranteed to be non-null when this component is rendered
  gameState: GameState | null;
  isGameActive: boolean;
  onCharacterCreate: (playerData: {
    name: string;
    gender: string;
    age: number;
    origin: string;
    background: string;
    era: string;
    startingLocation: string;
    avatarUrl: string;
  }) => void;
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>;
  weatherData: WeatherData | null;
  weatherLoading: boolean;
  weatherError: string | null;
  locationImageUrl: string | null;
  locationImageLoading: boolean;
  locationImageError: string | null;
  isCreatingCharacter: boolean;
}

const GameScreen: React.FC<GameScreenProps> = ({
  gameState,
  isGameActive,
  onCharacterCreate,
  setGameState,
  weatherData,
  weatherLoading,
  weatherError,
  locationImageUrl,
  locationImageLoading,
  locationImageError,
  isCreatingCharacter,
}) => {
  // Primary loading states (auth and initial game data) are handled by AuthenticatedAppView.
  // GameScreen now assumes that if it's rendered, the user is authenticated,
  // and initial game data loading attempt has completed.

  // If game is active and player exists, show GamePlay
  if (isGameActive && gameState && gameState.player) {
    return (
      <GamePlay
        initialGameState={gameState}
        onStateUpdate={setGameState as any} // Cast to any to handle complex state updates
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
            isSubmitting={isCreatingCharacter}
        />
    </main>
  );
};

export default GameScreen;
