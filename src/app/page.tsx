
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import CharacterCreationForm from '@/components/CharacterCreationForm';
import GamePlay from '@/components/GamePlay';
import AuthDisplay from '@/components/AuthDisplay';
import WelcomeMessage from '@/components/WelcomeMessage';
import type { GameState, Player } from '@/lib/types';
import { 
  loadGameStateFromLocal, 
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
  initialPlayerStats,
  hydratePlayer, // Import hydratePlayer
  initialPlayerMoney // Import initial player money
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
        if (firestoreState && firestoreState.player) { // Ensure player exists
          const hydratedPlayerFromFirestore = hydratePlayer(firestoreState.player);
          loadedState = {
            ...firestoreState,
            player: hydratedPlayerFromFirestore,
          };
          toast({ title: "Progression chargée", description: "Votre partie a été restaurée depuis le cloud." });
        } else {
          const localState = loadGameStateFromLocal();
          if (localState && localState.player) {
            const playerToSave = { ...localState.player, uid: user.uid }; // Ensure UID is set
            const hydratedPlayerForCloud = hydratePlayer(playerToSave); // Hydrate before saving
            const stateToSave: GameState = { ...localState, player: hydratedPlayerForCloud };
            
            await saveGameState(stateToSave); 
            loadedState = stateToSave; // Use the hydrated state
            toast({ title: "Progression locale migrée", description: "Votre partie locale a été sauvegardée dans le cloud." });
          }
        }
      } catch (error) {
        console.error("Error loading from Firestore, falling back to local:", error);
        toast({ variant: "destructive", title: "Erreur de chargement Cloud", description: "Impossible de charger depuis le cloud. Tentative de chargement local." });
      }
    }
    
    if (!loadedState) {
      loadedState = loadGameStateFromLocal(); 
      // loadGameStateFromLocal already calls hydratePlayer internally
    }
    
    if (loadedState && loadedState.player) {
      if (user && !user.isAnonymous && user.uid && loadedState.player.uid !== user.uid) {
        console.warn("Player UID mismatch between loaded state and current user. Updating state with current user's UID.");
        // Re-hydrate if UID changes to ensure consistency
        const playerWithCorrectUID = hydratePlayer({ ...loadedState.player, uid: user.uid });
        loadedState = { ...loadedState, player: playerWithCorrectUID };
      }
      setGameState(loadedState);
    } else {
      setGameState({ player: null, currentScenario: null }); // Ensure it's a valid initial state if nothing loads
    }
    setIsLoadingState(false);
  }, [user, toast]); 

  useEffect(() => {
    if (!loadingAuth) { 
      performInitialLoad();
    }
  }, [loadingAuth, performInitialLoad]);

  const handleCharacterCreate = async (playerDataFromForm: Omit<Player, 'currentLocation' | 'uid' | 'stats' | 'skills' | 'traitsMentalStates' | 'progression' | 'alignment' | 'inventory' | 'avatarUrl' | 'questLog' | 'encounteredPNJs' | 'decisionLog' | 'money' >) => {
    const playerBaseDetails: Partial<Player> = { // Use Partial<Player> to build up
      ...playerDataFromForm, 
      avatarUrl: defaultAvatarUrl, 
      stats: { ...initialPlayerStats },
      skills: { ...initialSkills },
      traitsMentalStates: [...initialTraitsMentalStates],
      progression: { ...initialProgression },
      alignment: { ...initialAlignment },
      inventory: [ ...initialInventory ],
      money: initialPlayerMoney, // Set initial money
      uid: user && !user.isAnonymous ? user.uid : undefined,
      currentLocation: { ...initialPlayerLocation },
      // New fields will be added by hydratePlayer
    };

    const hydratedPlayer = hydratePlayer(playerBaseDetails); // Hydrate to ensure all fields are present

    const firstScenario = getInitialScenario(hydratedPlayer);
    const newGameState: GameState = {
      player: hydratedPlayer,
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
    clearGameStateFromLocal(); 
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
