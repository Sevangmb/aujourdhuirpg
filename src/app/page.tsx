
"use client";

import React, { useState, useEffect } from 'react';
import CharacterCreationForm from '@/components/CharacterCreationForm';
import GamePlay from '@/components/GamePlay';
import AuthDisplay from '@/components/AuthDisplay';
import type { GameState, Player } from '@/lib/types';
import { loadGameState, saveGameState, clearGameState, getInitialScenario } from '@/lib/game-logic';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext'; 
import Image from 'next/image';

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

        {user ? ( // Si l'utilisateur est authentifié (email/pass OU anonyme)
          gameState && gameState.player && gameState.currentScenario ? (
            <GamePlay initialGameState={gameState} onRestart={handleRestart} />
          ) : (
            <CharacterCreationForm onCharacterCreate={handleCharacterCreate} />
          )
        ) : ( 
          // Si l'utilisateur n'est pas encore authentifié, afficher un message de bienvenue
          <div className="text-center p-8 mt-6 bg-card shadow-xl rounded-lg">
            <h1 className="text-3xl font-bold font-headline mb-4 text-primary">Aujourd'hui RPG</h1>
            <p className="text-lg text-muted-foreground mb-6">
              Bienvenue dans une aventure textuelle se déroulant à notre époque, en France.
            </p>
            <Image 
              src="https://placehold.co/600x400.png" 
              alt="Illustration du jeu RPG Aujourd'hui" 
              data-ai-hint="Paris street adventure" 
              className="rounded-lg shadow-md mx-auto mb-6"
              width={600}
              height={400}
            />
            <p className="text-foreground">
              Pour commencer, veuillez vous connecter, créer un compte, ou choisir de jouer anonymement en utilisant les options d'authentification ci-dessus.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
