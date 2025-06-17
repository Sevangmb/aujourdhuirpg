
"use client";

import React from 'react';
import type { User } from 'firebase/auth';
import type { GameState, Player } from '@/lib/types';

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
}) => {
  // GameScreen will now grow to fill the space next to the LeftSidebar
  return (
    <main className="flex-1 flex flex-col overflow-y-auto bg-background"> {/* Ensure it grows and handles its own scroll */}
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
        // GamePlay component is now the direct child, it should handle its own layout within this GameScreen area
        <GamePlay
          initialGameState={gameState}
          onRestart={onRestartGame}
          onStateUpdate={setGameState} // Changed prop name from setGameState to onStateUpdate
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
