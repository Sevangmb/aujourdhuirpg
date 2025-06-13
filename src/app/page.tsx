
"use client";

import React, { useState, useEffect } from 'react';
import CharacterCreationForm from '@/components/CharacterCreationForm';
import GamePlay from '@/components/GamePlay';
import type { GameState, Player } from '@/lib/types';
import { loadGameState, saveGameState, clearGameState, getInitialScenario } from '@/lib/game-logic';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth

export default function HomePage() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoadingState, setIsLoadingState] = useState(true);
  const { user, loadingAuth, signInWithGoogle, signOutUser } = useAuth(); // Use auth context

  useEffect(() => {
    const loadedState = loadGameState();
    if (loadedState) {
      setGameState(loadedState);
    } else {
      setGameState({ player: null, currentScenario: null });
    }
    setIsLoadingState(false);
  }, []);

  const handleCharacterCreate = (player: Player) => {
    const firstScenario = getInitialScenario(player);
    const newGameState: GameState = {
      player: {
        ...player,
        // Potentially link Firebase user ID here if needed later
        // uid: user?.uid 
      },
      currentScenario: firstScenario,
    };
    setGameState(newGameState);
    saveGameState(newGameState);
  };

  const handleRestart = () => {
    clearGameState();
    setGameState({ player: null, currentScenario: null });
    // Optionally sign out the user on game restart, or handle separately
    // if (user) signOutUser(); 
  };
  
  // Display a loading message for auth or game state loading
  if (loadingAuth || isLoadingState) {
    return (
      <main className="flex-grow flex flex-col items-center justify-center p-4 md:p-8 bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-xl font-headline">
          {loadingAuth ? "Vérification de l'authentification..." : "Chargement de votre aventure..."}
        </p>
      </main>
    );
  }

  return (
    <main className="flex-grow flex flex-col items-center p-4 md:p-8 bg-background">
      <div className="w-full max-w-4xl">
        <div className="mb-6 p-4 border border-border rounded-lg shadow-md bg-card text-card-foreground">
          {user ? (
            <div className="flex items-center justify-between">
              <p>Bienvenue, <span className="font-semibold">{user.displayName || user.email}</span> !</p>
              <Button onClick={signOutUser} variant="outline">Déconnexion</Button>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2">
              <p>Connectez-vous pour sauvegarder votre progression (bientôt !).</p>
              <Button onClick={signInWithGoogle} variant="default" size="lg">
                <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path></svg>
                Connexion avec Google
              </Button>
            </div>
          )}
        </div>

        {gameState && gameState.player && gameState.currentScenario ? (
          <GamePlay initialGameState={gameState} onRestart={handleRestart} />
        ) : (
          <CharacterCreationForm onCharacterCreate={handleCharacterCreate} />
        )}
      </div>
    </main>
  );
}
