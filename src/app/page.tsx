
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
        const firestoreState = await loadGameStateFromFirestore(user.uid);
        if (firestoreState) {
          loadedState = firestoreState; // Assumes firestoreState is already well-formed by loadGameStateFromFirestore
          toast({ title: "Progression chargée", description: "Votre partie a été restaurée depuis le cloud." });
        } else {
           // No data in Firestore, try local as a fallback for potential migration scenario
          const localState = loadGameStateFromLocal();
          if (localState && localState.player) {
            // If local state exists, associate it with current user and save to Firestore
            localState.player.uid = user.uid; // Ensure UID is set before saving
            await saveGameState(localState); // This will now save to Firestore + Local
            loadedState = localState;
            toast({ title: "Progression locale migrée", description: "Votre partie locale a été sauvegardée dans le cloud." });
          }
        }
      } catch (error) {
        console.error("Error loading from Firestore, falling back to local:", error);
        toast({ variant: "destructive", title: "Erreur de chargement Cloud", description: "Impossible de charger depuis le cloud. Tentative de chargement local." });
        // Fall through to load from local storage if firestore load fails
      }
    }
    
    // If not loaded from Firestore (or user is anonymous/not logged in, or Firestore load failed and no local state was migrated)
    if (!loadedState) {
      loadedState = loadGameStateFromLocal(); // loadGameStateFromLocal now ensures a well-formed player object or returns null
    }
    
    if (loadedState && loadedState.player) {
      // Ensure player UID is consistent if user is logged in
      if (user && !user.isAnonymous && user.uid && loadedState.player.uid !== user.uid) {
        console.warn("Player UID mismatch between loaded state and current user. Updating state with current user's UID.");
        loadedState.player.uid = user.uid;
        // Optionally re-save if UID was mismatched, to correct it in storage
        // await saveGameState(loadedState); 
      }
      setGameState(loadedState);
    } else {
      // No game state found anywhere, or loading failed completely
      setGameState({ player: null, currentScenario: null });
    }
    setIsLoadingState(false);
  }, [user, toast]); // Removed loadGameStateFromLocal from dependencies as it's stable

  useEffect(() => {
    if (!loadingAuth) { // Only perform load once auth state is resolved
      performInitialLoad();
    }
  }, [loadingAuth, performInitialLoad]);

  const handleCharacterCreate = async (playerDataFromForm: Omit<Player, 'currentLocation' | 'uid' | 'stats' | 'skills' | 'traitsMentalStates' | 'progression' | 'alignment' | 'inventory' | 'avatarUrl' >) => {
    // These initial values are now primarily set by hydratePlayer or if player object is totally new.
    // CharacterCreationForm provides the core identity.
    const playerDetails: Player = {
      ...playerDataFromForm, // name, gender, age, origin, background from form
      avatarUrl: defaultAvatarUrl, 
      stats: { ...initialPlayerStats },
      skills: { ...initialSkills },
      traitsMentalStates: [...initialTraitsMentalStates],
      progression: { ...initialProgression },
      alignment: { ...initialAlignment },
      inventory: [ ...initialInventory ],
      uid: user && !user.isAnonymous ? user.uid : undefined,
      currentLocation: { ...initialPlayerLocation }, // Location is always initial at creation
    };

    const firstScenario = getInitialScenario(playerDetails);
    const newGameState: GameState = {
      player: playerDetails,
      currentScenario: firstScenario,
    };
    setGameState(newGameState);
    await saveGameState(newGameState); 
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
    // No need to call performInitialLoad here, it will set up a fresh state.
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
