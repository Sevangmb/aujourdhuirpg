
"use client";

import React, { useState, useEffect, useCallback } from 'react';

// Types and Game Logic
import type { GameState, Player, ToneSettings } from '@/lib/types';
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
  initialInvestigationNotes,
  initialToneSettings
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
import { SlidersHorizontal, Save, User as UserIcon, Briefcase, BookOpen, Search, LogOut } from 'lucide-react';
// Tabs and Card are no longer directly used for the right panel layout in page.tsx
import { Button } from '@/components/ui/button';


// Player Info Components
import PlayerSheet from '@/components/PlayerSheet';
import InventoryDisplay from '@/components/InventoryDisplay';
import QuestJournalDisplay from '@/components/QuestJournalDisplay';
import EvidenceLogDisplay from '@/components/EvidenceLogDisplay';
import ToneSettingsDialog from '@/components/ToneSettingsDialog';

// Custom Components
import CharacterCreationForm from '@/components/CharacterCreationForm';
import GamePlay from '@/components/GamePlay';
import AuthDisplay from '@/components/AuthDisplay';
// LeftSidebar is no longer used directly in the layout
// import LeftSidebar from '@/components/LeftSidebar';


function HomePageContent() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoadingState, setIsLoadingState] = useState(true);
  const [isToneSettingsDialogOpen, setIsToneSettingsDialogOpen] = useState(false);
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

  const handleCharacterCreate = async (playerDataFromForm: Omit<Player, 'currentLocation' | 'uid' | 'stats' | 'skills' | 'traitsMentalStates' | 'progression' | 'alignment' | 'inventory' | 'avatarUrl' | 'questLog' | 'encounteredPNJs' | 'decisionLog' | 'clues' | 'documents' | 'investigationNotes' | 'money' | 'toneSettings'> & { startingCity: string }) => {
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
      currentLocation: {
        ...initialPlayerLocation, // Keep default lat/lon
        placeName: playerDataFromForm.startingCity || initialPlayerLocation.placeName, // Use user's city name
       },
      toneSettings: { ...initialToneSettings },
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
    toast({ title: "Personnage créé !", description: `Votre aventure commence à ${hydratedPlayer.currentLocation.placeName}.`});
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

  const isGameActive = gameState && gameState.player && gameState.currentScenario;

  const handleSaveGame = async () => {
    if (isGameActive && gameState) {
      try {
        await saveGameState(gameState);
        toast({
          title: "Partie Sauvegardée",
          description: "Votre progression a été sauvegardée.",
          action: <Save className="text-green-500" />
        });
      } catch (error) {
        console.error("Erreur lors de la sauvegarde manuelle:", error);
        toast({
          variant: "destructive",
          title: "Erreur de Sauvegarde",
          description: "Impossible de sauvegarder la partie.",
        });
      }
    } else {
      toast({
        variant: "destructive",
        title: "Sauvegarde impossible",
        description: "Aucune partie active à sauvegarder.",
      });
    }
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

  const handleSaveToneSettings = async (newSettings: ToneSettings) => {
    if (gameState && gameState.player) {
      const updatedPlayer = { ...gameState.player, toneSettings: newSettings };
      const newGameState = { ...gameState, player: updatedPlayer };
      setGameState(newGameState);
      await saveGameState(newGameState);
      toast({ title: "Paramètres de Tonalité Sauvegardés", description: "Le style narratif sera ajusté." });
    }
  };


  return (
    <div className="flex flex-col h-screen max-h-screen bg-background text-foreground">
      <Menubar className="w-full rounded-none border-b shrink-0">
        <MenubarMenu>
          <MenubarTrigger>Fichier</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={handleRestart}>
              Nouvelle Partie
            </MenubarItem>
            <MenubarItem onClick={handleSaveGame} disabled={!isGameActive}>
              <Save className="mr-2 h-4 w-4" /> Sauvegarder la Partie
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={() => window.close()}>Quitter</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Affichage</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={toggleFullScreen}>Plein écran</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        {gameState?.player && (
          <MenubarMenu>
            <MenubarTrigger>Paramètres</MenubarTrigger>
            <MenubarContent>
              <MenubarItem onSelect={(e) => { e.preventDefault(); setIsToneSettingsDialogOpen(true); }}>
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Tonalité Narrative
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        )}
        {gameState?.player && (
          <MenubarMenu>
            <MenubarTrigger>Joueur</MenubarTrigger>
            <MenubarContent>
              <Dialog>
                <DialogTrigger asChild>
                  <MenubarItem onSelect={(e) => e.preventDefault()}><UserIcon className="mr-2 h-4 w-4" />Fiche Personnage</MenubarItem>
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
                  {/* Removed md:hidden to make it always visible in menu */}
                  <MenubarItem onSelect={(e) => e.preventDefault()}><Briefcase className="mr-2 h-4 w-4" />Inventaire</MenubarItem>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-2xl max-h-[80vh]">
                  <DialogHeader><DialogTitle>Inventaire</DialogTitle></DialogHeader>
                  <ScrollArea className="max-h-[70vh] p-1">
                    {gameState?.player ? <InventoryDisplay inventory={gameState.player.inventory} /> : <p>Inventaire non disponible.</p>}
                  </ScrollArea>
                </DialogContent>
              </Dialog>
              <Dialog>
                <DialogTrigger asChild>
                  {/* Removed md:hidden */}
                  <MenubarItem onSelect={(e) => e.preventDefault()}><BookOpen className="mr-2 h-4 w-4" />Journal de Quêtes</MenubarItem>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl max-h-[80vh]">
                  <DialogHeader><DialogTitle>Journal de Quêtes</DialogTitle></DialogHeader>
                  <ScrollArea className="max-h-[70vh] p-1">
                    {gameState?.player ? <QuestJournalDisplay player={gameState.player} /> : <p>Journal de quêtes non disponible.</p>}
                  </ScrollArea>
                </DialogContent>
              </Dialog>
              <Dialog>
                <DialogTrigger asChild>
                  {/* Removed md:hidden */}
                  <MenubarItem onSelect={(e) => e.preventDefault()}><Search className="mr-2 h-4 w-4" />Dossier d'Enquête</MenubarItem>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl max-h-[80vh]">
                  <DialogHeader><DialogTitle>Dossier d'Enquête</DialogTitle></DialogHeader>
                  <ScrollArea className="max-h-[70vh] p-1">
                    {gameState?.player ? <EvidenceLogDisplay player={gameState.player} /> : <p>Dossier d'enquête non disponible.</p>}
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            </MenubarContent>
          </MenubarMenu>
        )}
        <div className="ml-auto flex items-center pr-2">
          {user && (
            <div className="text-xs text-muted-foreground mr-2">
              {user.isAnonymous ? "Anonyme" : user.email}
            </div>
          )}
          {user && (
            <Button variant="ghost" size="sm" onClick={signOutUser} className="text-xs h-8">
              <LogOut className="mr-1 h-3 w-3" /> Déconnexion
            </Button>
          )}
        </div>
      </Menubar>

      {gameState?.player && (
        <ToneSettingsDialog
          isOpen={isToneSettingsDialogOpen}
          onOpenChange={setIsToneSettingsDialogOpen}
          currentSettings={gameState.player.toneSettings || initialToneSettings}
          onSave={handleSaveToneSettings}
        />
      )}

      {/* This div used to hold sidebars and main content. Now it just holds main content. */}
      <div className="flex-1 flex flex-col overflow-hidden"> {/* Changed: Removed 'flex' to simplify as it's no longer a 3-column layout parent */}
        {/* Left Sidebar removed from here */}

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
                signOut={() => {}}
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

        {/* Right Information Panel removed from here */}
      </div>
    </div>
  );
}

export default function HomePage() {
  return <HomePageContent />;
}
