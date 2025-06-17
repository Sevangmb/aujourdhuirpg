
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
import { useToast } from "@/hooks/use-toast";
import ToneSettingsDialog from '@/components/ToneSettingsDialog';
import AppMenubar from '@/components/AppMenubar';
import GameScreen from '@/components/GameScreen';


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
        ...initialPlayerLocation, 
        placeName: playerDataFromForm.startingCity || initialPlayerLocation.placeName, 
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

  const handleRestartGame = async () => {
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

  const isGameActive = !!(gameState && gameState.player && gameState.currentScenario);

  const handleSaveGame = async () => {
    if (isGameActive && gameState) {
      try {
        await saveGameState(gameState);
        toast({
          title: "Partie Sauvegardée",
          description: "Votre progression a été sauvegardée.",
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

  const handleToggleFullScreen = () => {
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

  const authScreenProps = {
    user: user, // Pass null explicitly if user is null
    loadingAuth: loadingAuth,
    signUp: signUpWithEmailPassword,
    signIn: signInWithEmailPassword,
    signInAnon: signInAnonymously,
    signOut: signOutUser, // This signOut is for the AuthDisplay context, might differ from Menubar's
  };


  return (
    <div className="flex flex-col h-screen max-h-screen bg-background text-foreground">
      <AppMenubar
        user={user}
        isGameActive={isGameActive}
        player={gameState?.player || null}
        onRestartGame={handleRestartGame}
        onSaveGame={handleSaveGame}
        onToggleFullScreen={handleToggleFullScreen}
        onOpenToneSettings={() => setIsToneSettingsDialogOpen(true)}
        onSignOut={signOutUser}
      />

      {gameState?.player && (
        <ToneSettingsDialog
          isOpen={isToneSettingsDialogOpen}
          onOpenChange={setIsToneSettingsDialogOpen}
          currentSettings={gameState.player.toneSettings || initialToneSettings}
          onSave={handleSaveToneSettings}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <GameScreen
            user={user}
            loadingAuth={loadingAuth}
            isLoadingState={isLoadingState}
            gameState={gameState}
            isGameActive={isGameActive}
            authFunctions={authScreenProps} // Pass the grouped auth functions
            onCharacterCreate={handleCharacterCreate}
            onRestartGame={handleRestartGame} // For GamePlay's onRestart
            setGameState={setGameState} // For GamePlay
        />
      </div>
    </div>
  );
}

export default function HomePage() {
  return <HomePageContent />;
}
