
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import CharacterCreationForm from '@/components/CharacterCreationForm';
import GamePlay from '@/components/GamePlay';
import AuthDisplay from '@/components/AuthDisplay';
import WelcomeMessage from '@/components/WelcomeMessage';
import type { GameState, Player } from '@/lib/types';
import { 
  loadGameState as loadGameStateFromLocal, 
  saveGameState, 
  clearGameState as clearGameStateFromLocal, 
  getInitialScenario, 
  initialPlayerLocation,
  initialSkills,
  initialTraitsMentalStates,
  initialProgression,
  initialAlignment,
  initialInventory, 
  defaultAvatarUrl,
  initialPlayerStats
} from '@/lib/game-logic';
import { loadGameStateFromFirestore, deletePlayerStateFromFirestore } from '@/services/firestore-service';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from "@/hooks/use-toast";


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
  const { toast } = useToast();

  const performInitialLoad = useCallback(async () => {
    setIsLoadingState(true);
    let loadedState: GameState | null = null;

    if (user && !user.isAnonymous && user.uid) {
      try {
        loadedState = await loadGameStateFromFirestore(user.uid);
        if (loadedState) {
          toast({ title: "Progression chargée", description: "Votre partie a été restaurée depuis le cloud." });
        } else {
           // No data in Firestore, try local as a fallback for migration scenario
          const localState = loadGameStateFromLocal();
          if (localState && localState.player) {
            // If local state exists, associate it with current user and save to Firestore
            localState.player.uid = user.uid;
            await saveGameState(localState); // This will now save to Firestore + Local
            loadedState = localState;
            toast({ title: "Progression locale migrée", description: "Votre partie locale a été sauvegardée dans le cloud." });
          }
        }
      } catch (error) {
        console.error("Error loading from Firestore, falling back to local:", error);
        toast({ variant: "destructive", title: "Erreur de chargement Cloud", description: "Impossible de charger depuis le cloud. Tentative de chargement local." });
        // Fall through to load from local storage
      }
    }
    
    // If not loaded from Firestore (or user is anonymous/not logged in, or Firestore load failed)
    if (!loadedState) {
      loadedState = loadGameStateFromLocal();
    }
    
    if (loadedState && loadedState.player) {
      // Ensure player object is fully populated, especially for older save states or states from different sources
      const basePlayer: Player = {
        uid: user?.uid || loadedState.player.uid, // Prioritize current user's UID
        name: '', // Will be overridden
        gender: "Préfère ne pas préciser",
        age: 25,
        avatarUrl: defaultAvatarUrl,
        origin: "Inconnue",
        stats: { ...initialPlayerStats },
        skills: { ...initialSkills },
        traitsMentalStates: [...initialTraitsMentalStates],
        progression: { ...initialProgression },
        alignment: { ...initialAlignment },
        inventory: [ ...initialInventory ],
        currentLocation: { ...initialPlayerLocation },
        background: '' // Will be overridden
      };

      loadedState.player = {
        ...basePlayer,
        ...loadedState.player,
      };

      // Specific checks for nested objects that might be missing
      if (!loadedState.player.currentLocation) loadedState.player.currentLocation = { ...initialPlayerLocation };
      if (!loadedState.player.stats) loadedState.player.stats = { ...initialPlayerStats };
      if (!loadedState.player.skills) loadedState.player.skills = { ...initialSkills };
      if (!loadedState.player.traitsMentalStates) loadedState.player.traitsMentalStates = [...initialTraitsMentalStates];
      if (!loadedState.player.progression) loadedState.player.progression = { ...initialProgression };
      if (typeof loadedState.player.progression.xpToNextLevel === 'undefined') {
        loadedState.player.progression.xpToNextLevel = initialProgression.xpToNextLevel; // Recalculate if missing
      }
      if (!loadedState.player.alignment) loadedState.player.alignment = { ...initialAlignment };
      if (!Array.isArray(loadedState.player.inventory) || loadedState.player.inventory.length === 0) {
        loadedState.player.inventory = [ ...initialInventory ];
      }
      setGameState(loadedState);
    } else {
      setGameState({ player: null, currentScenario: null });
    }
    setIsLoadingState(false);
  }, [user, toast]);

  useEffect(() => {
    if (!loadingAuth) { // Only perform load once auth state is resolved
      performInitialLoad();
    }
  }, [loadingAuth, performInitialLoad]);

  const handleCharacterCreate = async (playerDataFromForm: Omit<Player, 'currentLocation' | 'uid' | 'stats' | 'skills' | 'traitsMentalStates' | 'progression' | 'alignment' | 'inventory' | 'avatarUrl' >) => {
    const playerDetails: Omit<Player, 'currentLocation'> = {
      ...playerDataFromForm, // name, gender, age, origin, background from form
      avatarUrl: defaultAvatarUrl, 
      stats: { ...initialPlayerStats },
      skills: { ...initialSkills },
      traitsMentalStates: [...initialTraitsMentalStates],
      progression: { ...initialProgression },
      alignment: { ...initialAlignment },
      inventory: [ ...initialInventory ],
      uid: user && !user.isAnonymous ? user.uid : undefined, // Assign UID if user is authenticated
    };

    const playerWithLocation: Player = {
      ...playerDetails,
      currentLocation: initialPlayerLocation,
    };

    const firstScenario = getInitialScenario(playerWithLocation);
    const newGameState: GameState = {
      player: playerWithLocation,
      currentScenario: firstScenario,
    };
    setGameState(newGameState);
    await saveGameState(newGameState); // saveGameState will handle Firestore if UID is present
    toast({ title: "Personnage créé !", description: "Votre aventure commence maintenant."});
  };

  const handleRestart = async () => {
    if (user && !user.isAnonymous && user.uid) {
      try {
        await deletePlayerStateFromFirestore(user.uid);
        toast({ title: "Progression en ligne supprimée", description: "Votre sauvegarde dans le cloud a été effacée."});
      } catch (error) {
        console.error("Failed to delete Firestore state on restart:", error);
        toast({ variant: "destructive", title: "Erreur de suppression Cloud", description: "Impossible de supprimer la sauvegarde en ligne." });
      }
    }
    clearGameStateFromLocal(); // Always clear local state
    setGameState({ player: null, currentScenario: null });
    toast({ title: "Partie Redémarrée", description: "Créez un nouveau personnage pour commencer une nouvelle aventure." });
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
