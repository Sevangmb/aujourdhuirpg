
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import CharacterCreationForm from '@/components/CharacterCreationForm';
import GamePlay from '@/components/GamePlay';
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
  hydratePlayer,
  initialPlayerMoney
} from '@/lib/game-logic';
import { loadGameStateFromFirestore, deletePlayerStateFromFirestore } from '@/services/firestore-service';
import { Loader2 } from 'lucide-react';
import { useAuth, AuthProvider } from '@/contexts/AuthContext'; // AuthProvider needed here if page is the root for auth context
import { useToast } from "@/hooks/use-toast";

// Sidebar components
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import LeftSidebar from '@/components/LeftSidebar';
import RightSidebar from '@/components/RightSidebar';


function HomePageContent() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoadingState, setIsLoadingState] = useState(true);
  const {
    user,
    loadingAuth,
  } = useAuth(); // AuthDisplay is now in LeftSidebar, which will get context from AuthProvider in RootLayout
  const { toast } = useToast();

  const performInitialLoad = useCallback(async () => {
    setIsLoadingState(true);
    let loadedState: GameState | null = null;

    if (user && !user.isAnonymous && user.uid) {
      try {
        const firestoreState = await loadGameStateFromFirestore(user.uid);
        if (firestoreState && firestoreState.player) {
          const hydratedPlayerFromFirestore = hydratePlayer(firestoreState.player);
          loadedState = {
            ...firestoreState,
            player: hydratedPlayerFromFirestore,
          };
          toast({ title: "Progression chargée", description: "Votre partie a été restaurée depuis le cloud." });
        } else {
          const localState = loadGameStateFromLocal();
          if (localState && localState.player) {
            const playerToSave = { ...localState.player, uid: user.uid };
            const hydratedPlayerForCloud = hydratePlayer(playerToSave);
            const stateToSave: GameState = { ...localState, player: hydratedPlayerForCloud };
            
            await saveGameState(stateToSave); 
            loadedState = stateToSave;
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
    }
    
    if (loadedState && loadedState.player) {
      if (user && !user.isAnonymous && user.uid && loadedState.player.uid !== user.uid) {
        console.warn("Player UID mismatch between loaded state and current user. Updating state with current user's UID.");
        const playerWithCorrectUID = hydratePlayer({ ...loadedState.player, uid: user.uid });
        loadedState = { ...loadedState, player: playerWithCorrectUID };
      }
      setGameState(loadedState);
    } else {
      setGameState({ player: null, currentScenario: null });
    }
    setIsLoadingState(false);
  }, [user, toast]); 

  useEffect(() => {
    if (!loadingAuth) { 
      performInitialLoad();
    }
  }, [loadingAuth, performInitialLoad]);

  const handleCharacterCreate = async (playerDataFromForm: Omit<Player, 'currentLocation' | 'uid' | 'stats' | 'skills' | 'traitsMentalStates' | 'progression' | 'alignment' | 'inventory' | 'avatarUrl' | 'questLog' | 'encounteredPNJs' | 'decisionLog' | 'clues' | 'documents' | 'investigationNotes' | 'money' >) => {
    const playerBaseDetails: Partial<Player> = {
      ...playerDataFromForm, 
      avatarUrl: defaultAvatarUrl, 
      stats: { ...initialPlayerStats },
      skills: { ...initialSkills },
      traitsMentalStates: [...initialTraitsMentalStates],
      progression: { ...initialProgression },
      alignment: { ...initialAlignment },
      inventory: [ ...initialInventory ],
      money: initialPlayerMoney,
      uid: user && !user.isAnonymous ? user.uid : undefined,
      currentLocation: { ...initialPlayerLocation },
    };

    const hydratedPlayer = hydratePlayer(playerBaseDetails);

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
      <main className="flex-grow flex flex-col items-center justify-center p-4 md:p-8 bg-background h-screen">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-xl font-headline">
          {loadingAuth ? "Vérification de l'authentification..." : "Chargement de votre aventure..."}
        </p>
      </main>
    );
  }

  return (
      <SidebarProvider defaultOpen={true}>
        <Sidebar side="left" variant="sidebar" collapsible="icon" className="w-[350px] md:w-[400px] lg:w-[450px]">
          <LeftSidebar 
            player={gameState?.player || null}
            onRestart={handleRestart}
            isLoading={isLoadingState} // or a more specific loading for AI actions
          />
        </Sidebar>
        <SidebarInset>
          <div className="flex flex-col h-screen max-h-screen overflow-hidden">
            {!user ? (
              <div className="flex-grow flex items-center justify-center">
                 <WelcomeMessage />
              </div>
            ) : gameState && gameState.player && gameState.currentScenario ? (
              <GamePlay 
                initialGameState={gameState} 
                onRestart={handleRestart} 
                setGameState={setGameState} // Pass setGameState to allow GamePlay to update player directly
              />
            ) : (
              <div className="flex-grow flex items-center justify-center p-4">
                 <CharacterCreationForm onCharacterCreate={handleCharacterCreate} />
              </div>
            )}
          </div>
        </SidebarInset>
        <Sidebar side="right" variant="sidebar" collapsible="icon" className="w-[350px] md:w-[400px] lg:w-[450px]">
           <RightSidebar player={gameState?.player || null} />
        </Sidebar>
      </SidebarProvider>
  );
}


// Wrap HomePageContent with AuthProvider if it's not already in RootLayout
// For this structure, AuthProvider is in RootLayout, so HomePageContent doesn't need to re-wrap.
export default function HomePage() {
  return <HomePageContent />;
}
