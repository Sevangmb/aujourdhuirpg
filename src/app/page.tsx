
"use client";

import React, { useState, useEffect, useCallback } from 'react';

// Types and Game Logic
import type { GameState, Player } from '@/lib/types';
import { 
  loadGameStateFromLocal, 
  saveGameState, 
  clearGameState as clearGameStateFromLocal, 
  getInitialScenario,
  hydratePlayer
} from '@/lib/game-logic';
import { 
  defaultAvatarUrl,
  initialPlayerStats,
  initialSkills,
  initialTraitsMentalStates,
  initialProgression,
  initialAlignment,
  initialInventory,
  initialPlayerMoney,
  initialPlayerLocation,
  initialQuestLog,
  initialEncounteredPNJs,
  initialDecisionLog,
  initialClues,
  initialDocuments,
  initialInvestigationNotes
} from '@/data/initial-game-data';
import { loadGameStateFromFirestore, deletePlayerStateFromFirestore } from '@/services/firestore-service';

// Authentication
import { useAuth } from '@/contexts/AuthContext'; 

// UI Components
import LoadingState from '@/components/LoadingState';
import { useToast } from "@/hooks/use-toast";
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarSeparator, MenubarTrigger } from "@/components/ui/menubar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';

// Player Info Components for Dialogs
import PlayerSheet from '@/components/PlayerSheet';
import InventoryDisplay from '@/components/InventoryDisplay';
import QuestJournalDisplay from '@/components/QuestJournalDisplay';
import EvidenceLogDisplay from '@/components/EvidenceLogDisplay';

// Custom Components
import CharacterCreationForm from '@/components/CharacterCreationForm';
import GamePlay from '@/components/GamePlay';
import AuthDisplay from '@/components/AuthDisplay';
import LeftSidebar from '@/components/LeftSidebar';


function HomePageContent() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoadingState, setIsLoadingState] = useState(true);
  const {
    user,
    loadingAuth,
    signUpWithEmailPassword,
    signInWithEmailPassword,
    signInAnonymously,
    signOutUser,
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
      questLog: [...initialQuestLog],
      encounteredPNJs: [...initialEncounteredPNJs],
      decisionLog: [...initialDecisionLog],
      clues: [...initialClues],
      documents: [...initialDocuments],
      investigationNotes: initialInvestigationNotes,
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

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        alert(`Erreur lors du passage en plein écran: ${err.message} (${err.name})`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const isGameActive = gameState && gameState.player && gameState.currentScenario;

  return (
    <div className="flex flex-col h-screen max-h-screen bg-background text-foreground">
      <Menubar className="w-full rounded-none border-b shrink-0">
        <MenubarMenu>
          <MenubarTrigger>Fichier</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={handleRestart}>
              Nouvelle Partie
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={() => window.close()}>Quitter</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        {/* "Edition" menu with "Paramètres" dialog removed for cleanup */}
        <MenubarMenu>
          <MenubarTrigger>Affichage</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={toggleFullScreen}>Plein écran</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        {gameState?.player && ( // Only show "Joueur" menu if player exists
          <MenubarMenu>
            <MenubarTrigger>Joueur</MenubarTrigger>
            <MenubarContent>
              <Dialog>
                <DialogTrigger asChild>
                  <MenubarItem onSelect={(e) => e.preventDefault()}>Fiche Personnage</MenubarItem>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle>Fiche Personnage</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="max-h-[70vh] p-2">
                    {gameState?.player ? <PlayerSheet player={gameState.player} /> : <p>Aucune donnée de personnage.</p>}
                  </ScrollArea>
                </DialogContent>
              </Dialog>
              <Dialog>
                <DialogTrigger asChild>
                  <MenubarItem onSelect={(e) => e.preventDefault()}>Inventaire</MenubarItem>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-2xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle>Inventaire</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="max-h-[70vh] p-1">
                    {gameState?.player ? <InventoryDisplay inventory={gameState.player.inventory} /> : <p>Inventaire non disponible.</p>}
                  </ScrollArea>
                </DialogContent>
              </Dialog>
              <Dialog>
                <DialogTrigger asChild>
                  <MenubarItem onSelect={(e) => e.preventDefault()}>Journal de Quêtes</MenubarItem>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle>Journal de Quêtes</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="max-h-[70vh] p-1">
                    {gameState?.player ? <QuestJournalDisplay player={gameState.player} /> : <p>Journal de quêtes non disponible.</p>}
                  </ScrollArea>
                </DialogContent>
              </Dialog>
              <Dialog>
                <DialogTrigger asChild>
                  <MenubarItem onSelect={(e) => e.preventDefault()}>Dossier d'Enquête</MenubarItem>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle>Dossier d'Enquête</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="max-h-[70vh] p-1">
                    {gameState?.player ? <EvidenceLogDisplay player={gameState.player} /> : <p>Dossier d'enquête non disponible.</p>}
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            </MenubarContent>
          </MenubarMenu>
        )}
      </Menubar>

      <div className="flex flex-1 overflow-hidden"> {/* Horizontal layout for sidebar and main content */}
        {/* Left Sidebar - Shown on desktop if user is authenticated and player exists */}
        {user && gameState?.player && (
          <aside className="w-72 md:w-80 h-full overflow-y-auto bg-card border-r border-border p-1 hidden md:block shrink-0">
            <LeftSidebar
              player={gameState.player}
              isLoading={loadingAuth || isLoadingState}
            />
          </aside>
        )}

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-y-auto">
          {loadingAuth || isLoadingState ? (
            <div className="flex-grow flex items-center justify-center">
              <LoadingState loadingAuth={loadingAuth} isLoadingState={isLoadingState} />
            </div>
          ) : !user ? (
            <div className="flex-grow flex items-center justify-center p-4">
              <AuthDisplay
                user={null}
                loadingAuth={loadingAuth}
                signUp={signUpWithEmailPassword}
                signIn={signInWithEmailPassword}
                signInAnon={signInAnonymously}
                signOut={signOutUser}
              />
            </div>
          ) : isGameActive ? (
            <GamePlay
              initialGameState={gameState!}
              onRestart={handleRestart}
              setGameState={setGameState}
            />
          ) : (
            <div className="flex-grow flex items-center justify-center p-4">
              <CharacterCreationForm onCharacterCreate={handleCharacterCreate} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function HomePage() {
  return <HomePageContent />;
}
