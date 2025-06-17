
"use client";

import React from 'react';
import type { User } from 'firebase/auth';
import type { GameState, Player } from '@/lib/types';
import type { WeatherData } from '@/app/actions/get-current-weather';

import LoadingState from '@/components/LoadingState';
import AuthDisplay from '@/components/AuthDisplay';
import CharacterCreationForm from '@/components/CharacterCreationForm';
import GamePlay from '@/components/GamePlay';

interface AuthFunctions {
  user: User | null;
  loadingAuth: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInAnon: () => Promise<void>;
  signOut: () => Promise<void>;
}

interface GameScreenProps {
  user: User | null;
  loadingAuth: boolean;
  isLoadingState: boolean;
  gameState: GameState | null;
  isGameActive: boolean;
  authFunctions: AuthFunctions;
  onCharacterCreate: (playerData: Omit<Player, 'currentLocation' | 'uid' | 'stats' | 'skills' | 'traitsMentalStates' | 'progression' | 'alignment' | 'inventory' | 'avatarUrl' | 'questLog' | 'encounteredPNJs' | 'decisionLog' | 'clues' | 'documents' | 'investigationNotes' | 'money' | 'toneSettings'>) => void;
  onRestartGame: () => void;
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>;
  // Props for context widgets on desktop
  weatherData: WeatherData | null;
  weatherLoading: boolean;
  weatherError: string | null;
  locationImageUrl: string | null;
  locationImageLoading: boolean;
  locationImageError: string | null;
}

const GameScreen: React.FC<GameScreenProps> = ({
  user,
  loadingAuth,
  isLoadingState,
  gameState,
  isGameActive,
  authFunctions,
  onCharacterCreate,
  onRestartGame,
  setGameState,
  weatherData,
  weatherLoading,
  weatherError,
  locationImageUrl,
  locationImageLoading,
  locationImageError,
}) => {
  return (
    <main className="flex-1 flex flex-col overflow-y-auto bg-background">
      {loadingAuth || isLoadingState ? (
        <div className="flex-grow flex items-center justify-center">
          <LoadingState loadingAuth={loadingAuth} isLoadingState={isLoadingState} />
        </div>
      ) : !user ? (
        <div className="flex-grow flex items-center justify-center p-4">
          <AuthDisplay
            user={authFunctions.user}
            loadingAuth={authFunctions.loadingAuth}
            signUp={authFunctions.signUp}
            signIn={authFunctions.signIn}
            signInAnon={authFunctions.signInAnon}
            signOut={authFunctions.signOut}
          />
        </div>
      ) : isGameActive && gameState ? (
        <GamePlay
          initialGameState={gameState}
          onRestart={onRestartGame}
          onStateUpdate={setGameState}
          // Pass context data for desktop widgets
          weatherData={weatherData}
          weatherLoading={weatherLoading}
          weatherError={weatherError}
          locationImageUrl={locationImageUrl}
          locationImageLoading={locationImageLoading}
          locationImageError={locationImageError}
        />
      ) : (
        <div className="flex-grow flex items-center justify-center p-4">
          <CharacterCreationForm onCharacterCreate={onCharacterCreate} />
        </div>
      )}
    </main>
  );
};

export default GameScreen;
