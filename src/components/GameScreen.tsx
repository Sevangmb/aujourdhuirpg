
"use client";

import React from 'react';
import type { User } from 'firebase/auth';
import type { GameState, GameAction, Position } from '@/lib/types';
import type { WeatherData } from '@/app/actions/get-current-weather';

import CharacterCreationForm from '@/components/CharacterCreationForm';
import type { FullCharacterFormData } from '@/components/CharacterCreationForm';
import GamePlay from '@/components/GamePlay';

interface GameScreenProps {
  user: User; // User is now guaranteed to be non-null when this component is rendered
  gameState: GameState | null;
  isGameActive: boolean;
  onCharacterCreate: (playerData: FullCharacterFormData) => void;
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>;
  weatherData: WeatherData | null;
  weatherLoading: boolean;
  weatherError: string | null;
  locationImageUrl: string | null;
  locationImageLoading: boolean;
  locationImageError: string | null;
  isCreatingCharacter: boolean;
  onPoiClick?: (poi: Position) => void;
  handleGameAction: (action: GameAction) => void;
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
  onPoiClick,
  handleGameAction,
}) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleCreate = async (data: FullCharacterFormData) => {
    setIsSubmitting(true);
    try {
      await onCharacterCreate(data);
    } catch (error) {
      console.error("Character creation failed at GameScreen level:", error);
      setIsSubmitting(false);
    }
    // If successful, the parent component will unmount this one.
    // If it fails, the parent will set the mode back, remounting this component,
    // which will reset isSubmitting to false.
  };

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
        onPoiClick={onPoiClick}
        handleGameAction={handleGameAction}
      />
    );
  }

  // Otherwise, user is authenticated but game is not active (e.g., new user, or after restart)
  // -> Show CharacterCreationForm
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-4 overflow-y-auto bg-background">
        <CharacterCreationForm 
            onCharacterCreate={handleCreate} 
            isSubmitting={isSubmitting}
        />
    </main>
  );
};

export default GameScreen;
