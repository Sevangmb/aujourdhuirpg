
"use client";

import React, { useState, useEffect } from 'react';
import CharacterCreationForm from '@/components/CharacterCreationForm';
import GamePlay from '@/components/GamePlay';
import AuthDisplay from '@/components/AuthDisplay'; // Nouveau composant
import type { GameState, Player } from '@/lib/types';
import { loadGameState, saveGameState, clearGameState, getInitialScenario } from '@/lib/game-logic';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext'; 

export default function HomePage() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoadingState, setIsLoadingState] = useState(true);
  const { 
    user, 
    loadingAuth, 
    signUpWithEmailPassword, 
    signInWithEmailPassword, 
    signInAnonymously, 
    signOutUser 
  } = useAuth();

  useEffect(() => {
    const loadedState = loadGameState();
    if (loadedState) {
      setGameState(loadedState);
    } else {
      setGameState({ player: null, currentScenario: null });
    }
    setIsLoadingState(false);
  }, []);

  const handleCharacterCreate = (playerData: Player) => {
    const firstScenario = getInitialScenario(playerData);
    const newGameState: GameState = {
      player: {
        ...playerData,
        // uid: user?.uid // Potentiellement lier à l'utilisateur authentifié plus tard
      },
      currentScenario: firstScenario,
    };
    setGameState(newGameState);
    saveGameState(newGameState);
  };

  const handleRestart = () => {
    clearGameState();
    setGameState({ player: null, currentScenario: null });
  };
  
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
        <AuthDisplay
          user={user}
          loadingAuth={loadingAuth}
          signUp={signUpWithEmailPassword}
          signIn={signInWithEmailPassword}
          signInAnon={signInAnonymously}
          signOut={signOutUser}
        />

        {gameState && gameState.player && gameState.currentScenario ? (
          <GamePlay initialGameState={gameState} onRestart={handleRestart} />
        ) : (
          // S'assurer que l'utilisateur est "identifié" (même anonymement) avant de permettre la création de personnage
          // ou gérer un état où l'authentification est requise avant la création.
          // Pour l'instant, on affiche la création si pas de jeu en cours,
          // la logique de `AuthDisplay` gère si l'utilisateur peut interagir ou doit se connecter.
          <CharacterCreationForm onCharacterCreate={handleCharacterCreate} />
        )}
      </div>
    </main>
  );
}
