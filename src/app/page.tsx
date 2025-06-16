
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

// Custom Components extracted from page.tsx
import CharacterCreationSection from '@/components/sections/CharacterCreationSection';
import GamePlaySection from '@/components/sections/GamePlaySection';
import WelcomeSection from '@/components/sections/WelcomeSection';


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

  if (loadingAuth || isLoadingState) {
    return <LoadingState loadingAuth={loadingAuth} isLoadingState={isLoadingState} />;
  } 

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden">
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
        <MenubarMenu>
          <MenubarTrigger>Édition</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>Paramètres</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Affichage</MenubarTrigger>
          <MenubarContent>
            {/* <MenubarItem onClick={() => document.documentElement.requestFullscreen()}>Plein écran</MenubarItem> */}
          </MenubarContent>
        </MenubarMenu>
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
                   <InventoryDisplay inventory={gameState?.player?.inventory || []} />
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
      </Menubar>

      <main className="flex-grow flex flex-col overflow-y-auto p-4 md:p-6">
        {!user ? (
          <WelcomeSection />
        ) : gameState && gameState.player && gameState.currentScenario ? (
          <GamePlaySection
            initialGameState={gameState}
            onRestart={handleRestart}
            setGameState={setGameState}
          />
        ) : (
          <CharacterCreationSection onCharacterCreate={handleCharacterCreate} />
        )}
      </main>
    </div>
  );
}

export default function HomePage() {
  return <HomePageContent />;
}
