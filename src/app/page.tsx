
"use client";

import React, { useState, useEffect } from 'react';
import CharacterCreationForm from '@/components/CharacterCreationForm';
import GamePlay from '@/components/GamePlay';
import AuthDisplay from '@/components/AuthDisplay';
import WelcomeMessage from '@/components/WelcomeMessage';
import type { GameState, Player } from '@/lib/types';
import { 
  loadGameState, 
  saveGameState, 
  clearGameState, 
  getInitialScenario, 
  initialPlayerLocation,
  initialSkills,
  initialTraitsMentalStates,
  initialProgression,
  initialAlignment,
  initialInventory, // Import initial inventory
  defaultAvatarUrl
} from '@/lib/game-logic';
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
      // Ensure player object is fully populated, especially for older save states
      if (loadedState.player) {
        loadedState.player = {
          ...{ // Provide all default values first
            gender: "Préfère ne pas préciser",
            age: 25,
            avatarUrl: defaultAvatarUrl,
            origin: "Inconnue",
            skills: { ...initialSkills },
            traitsMentalStates: [...initialTraitsMentalStates],
            progression: { ...initialProgression },
            alignment: { ...initialAlignment },
            inventory: [ ...initialInventory ], // Ensure inventory is initialized
            currentLocation: initialPlayerLocation,
          },
          ...loadedState.player, // Then override with saved player data
        };
         if (!loadedState.player.currentLocation) { // Final check for location
           loadedState.player.currentLocation = initialPlayerLocation;
         }
         // Ensure inventory exists, even if it's an empty array
         if (!Array.isArray(loadedState.player.inventory)) {
           loadedState.player.inventory = [ ...initialInventory ];
         }
      }
      setGameState(loadedState);
    } else {
      setGameState({ player: null, currentScenario: null });
    }
    setIsLoadingState(false);
  }, []);

  const handleCharacterCreate = (playerData: Omit<Player, 'currentLocation'>) => {
    const playerWithLocation: Player = {
      ...playerData, // This now includes all new fields from CharacterCreationForm
      currentLocation: initialPlayerLocation,
      inventory: playerData.inventory || [ ...initialInventory ], // Ensure inventory is set
    };
    const firstScenario = getInitialScenario(playerWithLocation);
    const newGameState: GameState = {
      player: playerWithLocation,
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

        {user ? ( 
          gameState && gameState.player && gameState.currentScenario ? (
            <GamePlay initialGameState={gameState} onRestart={handleRestart} />
          ) : (
            <CharacterCreationForm onCharacterCreate={handleCharacterCreate} />
          )
        ) : (
          <WelcomeMessage />
        )}
      </div>
    </main>
  );
}
