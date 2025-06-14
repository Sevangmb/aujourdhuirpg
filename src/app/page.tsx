
"use client";

import React, { useState, useEffect, useCallback } from 'react';

// Types and Game Logic
import type { GameState, Player } from '@/lib/types';
import { 
  loadGameStateFromLocal, 
  saveGameState, 
  clearGameState as clearGameStateFromLocal, 
  initialPlayerLocation,
 getInitialScenario, initialSkills,
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

// Authentication
import { useAuth } from '@/contexts/AuthContext'; 

// UI Components
import CharacterCreationForm from '@/components/CharacterCreationForm';
import GamePlay from '@/components/GamePlay'; // Corrected import
import WelcomeMessage from '@/components/WelcomeMessage'; // Corrected import
import LoadingState from '@/components/LoadingState';

// Shadcn UI Components
import { useToast } from "@/hooks/use-toast";
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarSeparator, MenubarTrigger } from "@/components/ui/menubar";
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar'; 
import LeftSidebar from '@/components/LeftSidebar';
import RightSidebar from '@/components/RightSidebar';
import InventoryDisplay from '@/components/InventoryDisplay';
import QuestJournalDisplay from '@/components/QuestJournalDisplay';
import EvidenceLogDisplay from '@/components/EvidenceLogDisplay';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// Removed CharacterCreationSection and GamePlaySection as they are not separate files
// WelcomeSection is replaced by WelcomeMessage

function HomePageContent() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoadingState, setIsLoadingState] = useState(true);
  const {
    user,
    loadingAuth,
  } = useAuth(); 
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
            const playerToSave = { ...localState.player, uid: user.uid }; // Ensure UID is set for cloud save
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
      const hydratedPlayer = hydratePlayer(loadedState.player);
      let finalLoadedState = { ...loadedState, player: hydratedPlayer };

      if (user && !user.isAnonymous && user.uid && finalLoadedState.player.uid !== user.uid) {
        console.warn("Player UID mismatch between loaded state and current user. Updating state with current user's UID.");
        const playerWithCorrectUID = hydratePlayer({ ...finalLoadedState.player, uid: user.uid });
        finalLoadedState = { ...finalLoadedState, player: playerWithCorrectUID };
      }
      setGameState(finalLoadedState);
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
      questLog: [],
      encounteredPNJs: [],
      decisionLog: [],
      clues: [],
      documents: [],
      investigationNotes: "",
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
    return <LoadingState loadingAuth={loadingAuth} isLoadingState={isLoadingState} />;
  } 

  return (
    <>
      <SidebarProvider>
        <div className="flex flex-col md:flex-row h-screen max-h-screen overflow-hidden">
          <Sidebar side="left" collapsible="icon" className="md:w-1/4 lg:w-1/5 xl:w-[320px] border-r">
            <LeftSidebar player={gameState?.player || null} onRestart={handleRestart} isLoading={isLoadingState || loadingAuth} />
          </Sidebar>

          <SidebarInset className="flex-1 overflow-hidden"> {/* Central content area */}
            <Menubar className="w-full rounded-none border-b border-t-0 border-l-0 border-r-0">
              <MenubarMenu>
                <MenubarTrigger>File</MenubarTrigger>
                <MenubarContent>
                  <MenubarItem onClick={handleRestart}>
                    New Game
                  </MenubarItem>
                  <MenubarSeparator />
                  <MenubarItem>Quit</MenubarItem>
                </MenubarContent>
              </MenubarMenu>
              <MenubarMenu>
                <MenubarTrigger>Edit</MenubarTrigger>
                <MenubarContent>
                  <MenubarItem>Settings</MenubarItem>
                </MenubarContent>
              </MenubarMenu>
              <MenubarMenu>
                <MenubarTrigger>View</MenubarTrigger>
                <MenubarContent>
                  {/* <MenubarItem onClick={() => document.documentElement.requestFullscreen()}>Fullscreen</MenubarItem> */}
                </MenubarContent>
              </MenubarMenu>
              <MenubarMenu>
                <MenubarTrigger>Player</MenubarTrigger>
                <MenubarContent>
                  <Dialog>
                    <DialogTrigger asChild>
                      <MenubarItem onSelect={(e) => e.preventDefault()}>Character Sheet</MenubarItem>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Character Sheet</DialogTitle>
                      </DialogHeader>
                      <LeftSidebar player={gameState?.player || null} isLoading={isLoadingState} onRestart={handleRestart} />
                    </DialogContent>
                  </Dialog>
                  <Dialog>
                    <DialogTrigger asChild>
                      <MenubarItem onSelect={(e) => e.preventDefault()}>Inventory</MenubarItem>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Inventory</DialogTitle>
                      </DialogHeader>
                      <InventoryDisplay inventory={gameState?.player?.inventory || []} />
                    </DialogContent>
                  </Dialog>
                  <Dialog>
                    <DialogTrigger asChild>
                      <MenubarItem onSelect={(e) => e.preventDefault()}>Quest Log</MenubarItem>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Quest Log</DialogTitle>
                      </DialogHeader>
                      <QuestJournalDisplay player={gameState?.player || null} />
                    </DialogContent>
                  </Dialog>
                  <Dialog>
                    <DialogTrigger asChild>
                      <MenubarItem onSelect={(e) => e.preventDefault()}>Evidence Log</MenubarItem>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Evidence Log</DialogTitle>
                      </DialogHeader>
                      <EvidenceLogDisplay player={gameState?.player || null} />
                    </DialogContent>
                  </Dialog>
                </MenubarContent>
              </MenubarMenu>
            </Menubar>

            <div className="flex-grow flex flex-col h-[calc(100vh-theme(spacing.10))] max-h-[calc(100vh-theme(spacing.10))] overflow-hidden">
              {!user ? (
                <div className="flex-grow flex items-center justify-center">
                  <WelcomeMessage /> {/* Corrected usage */}
                </div>
              ) : gameState && gameState.player && gameState.currentScenario ? (
                <GamePlay // Corrected usage
                  initialGameState={gameState}
                  onRestart={handleRestart}
                  setGameState={setGameState}
                />
              ) : (
                <div className="flex-grow flex items-center justify-center p-4">
                  <CharacterCreationForm onCharacterCreate={handleCharacterCreate} />
                  {/* <CharacterCreationSection onCharacterCreate={handleCharacterCreate} /> */}
                </div>
              )}
            </div>
          </SidebarInset>

          <Sidebar side="right" collapsible="icon" className="md:w-1/4 lg:w-1/5 xl:w-[350px] border-l">
            <RightSidebar player={gameState?.player || null} />
          </Sidebar>
        </div>
      </SidebarProvider>
    </>
  );
}


export default function HomePage() {
  return <HomePageContent />;
}

