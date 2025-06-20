
"use client";

import React, { useState, useEffect, useCallback } from 'react';

// Types and Game Logic
import type { GameState, Player, ToneSettings, Position } from '@/lib/types';
import {
  loadGameStateFromLocal,
  saveGameState,
  type SaveGameResult,
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
  initialQuestLog,
  initialEncounteredPNJs,
  initialDecisionLog,
  initialClues,
  initialDocuments,
  initialInvestigationNotes,
  initialToneSettings,
  UNKNOWN_STARTING_PLACE_NAME,
  initialPlayerLocation
} from '@/data/initial-game-data';
import { loadGameStateFromFirestore, deletePlayerStateFromFirestore } from '@/services/firestore-service';

// Authentication
import { useAuth } from '@/contexts/AuthContext';

// UI Components
import { useToast } from "@/hooks/use-toast";
import ToneSettingsDialog from '@/components/ToneSettingsDialog';
import AppMenubar from '@/components/AppMenubar';
import GameScreen from '@/components/GameScreen';
import AuthScreen from '@/components/AuthScreen'; // Import the new AuthScreen
import LoadingState from '@/components/LoadingState'; // Import LoadingState
import type { WeatherData } from '@/app/actions/get-current-weather';
import { getCurrentWeather } from '@/app/actions/get-current-weather';
import { generateLocationImage } from '@/ai/flows/generate-location-image-flow';
import { generatePlayerAvatar } from '@/ai/flows/generate-player-avatar-flow';


function HomePageContent() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoadingState, setIsLoadingState] = useState(true); // For game state loading
  const [isToneSettingsDialogOpen, setIsToneSettingsDialogOpen] = useState(false);
  const {
    user,
    loadingAuth, // Firebase auth loading
    signUpWithEmailPassword,
    signInWithEmailPassword,
    signInAnonymously,
    signOutUser,
  } = useAuth();
  const { toast } = useToast();

  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  const [locationImageUrl, setLocationImageUrl] = useState<string | null>(null);
  const [locationImageLoading, setLocationImageLoading] = useState(false);
  const [locationImageError, setLocationImageError] = useState<string | null>(null);
  
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);


  const currentMapLocation = gameState?.player?.currentLocation || initialPlayerLocation;
  const nearbyPoisForMap = gameState?.nearbyPois || null;

  useEffect(() => {
    const fetchWeatherForLocation = async (loc: Position) => {
      if (!loc || typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') {
        setWeatherLoading(false);
        setWeatherError("Localisation invalide pour la météo.");
        setWeatherData(null);
        return;
      }
      setWeatherLoading(true);
      setWeatherError(null);
      try {
        const result = await getCurrentWeather(loc.latitude, loc.longitude);
        if ('error' in result) {
          setWeatherError(result.error);
          setWeatherData(null);
        } else {
          setWeatherData(result);
        }
      } catch (e: any) {
        const errorMessage = e.message || "Une erreur inconnue est survenue lors de la récupération de la météo.";
        setWeatherError(errorMessage);
        setWeatherData(null);
      } finally {
        setWeatherLoading(false);
      }
    };
    if (gameState?.player?.currentLocation) {
      fetchWeatherForLocation(gameState.player.currentLocation);
    }
  }, [gameState?.player?.currentLocation?.latitude, gameState?.player?.currentLocation?.longitude]);

  useEffect(() => {
    const fetchLocationImage = async () => {
      const placeNameForImage = gameState?.player?.currentLocation?.name;
      if (placeNameForImage && placeNameForImage !== UNKNOWN_STARTING_PLACE_NAME) {
        setLocationImageLoading(true);
        setLocationImageUrl(null);
        setLocationImageError(null);
        try {
          const result = await generateLocationImage({ placeName: placeNameForImage });
          if (result.imageUrl && result.imageUrl.startsWith('data:image')) {
            setLocationImageUrl(result.imageUrl);
          } else {
            const errorMsg = result.error || "L'IA n'a pas pu générer une image pour ce lieu.";
            setLocationImageError(errorMsg);
            console.warn("Location Image Generation Warning:", errorMsg, "Input placeName:", placeNameForImage);
          }
        } catch (e: any) {
          const errorMsg = e.message || "Erreur inconnue lors de la génération de l'image du lieu.";
          setLocationImageError(errorMsg);
          console.error("Location Image Generation Error:", e, "Input placeName:", placeNameForImage);
        } finally {
          setLocationImageLoading(false);
        }
      } else {
        setLocationImageUrl(null);
        setLocationImageLoading(false);
        setLocationImageError(null); 
      }
    };

    fetchLocationImage();
  }, [gameState?.player?.currentLocation?.name]);


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

            const saveResult = await saveGameState(stateToSave);
            loadedState = stateToSave;

            if (saveResult.localSaveSuccess && saveResult.cloudSaveSuccess) {
              toast({ title: "Progression locale migrée", description: "Votre partie locale a été synchronisée avec le cloud." });
            } else if (saveResult.localSaveSuccess && !saveResult.cloudSaveSuccess) {
              toast({ variant: "destructive", title: "Migration Partielle", description: "Progression locale sauvegardée, mais échec de la synchronisation cloud." });
            } else {
              toast({ variant: "destructive", title: "Erreur de Migration", description: "Impossible de sauvegarder la progression locale pour la migration." });
            }
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
      setGameState({ player: null, currentScenario: null, nearbyPois: null, gameTimeInMinutes: 0, journal: [] });
    }
    setIsLoadingState(false);
  }, [user, toast]);

  useEffect(() => {
    if (!loadingAuth) { // Only perform initial load once auth state is resolved
      performInitialLoad();
    }
  }, [loadingAuth, performInitialLoad]);

  const handleCharacterCreate = async (playerDataFromForm: Omit<Player, 'currentLocation' | 'uid' | 'stats' | 'skills' | 'traitsMentalStates' | 'progression' | 'alignment' | 'inventory' | 'avatarUrl' | 'questLog' | 'encounteredPNJs' | 'decisionLog' | 'clues' | 'documents' | 'investigationNotes' | 'money' | 'toneSettings'>) => {
    setIsGeneratingAvatar(true);
    let avatarUrlToUse = defaultAvatarUrl;

    try {
      const avatarResult = await generatePlayerAvatar({
        name: playerDataFromForm.name,
        gender: playerDataFromForm.gender,
        age: playerDataFromForm.age,
        origin: playerDataFromForm.origin,
        playerBackground: playerDataFromForm.background,
      });

      if (avatarResult.imageUrl && avatarResult.imageUrl.startsWith('data:image')) {
        avatarUrlToUse = avatarResult.imageUrl;
        toast({ title: "Avatar Généré!", description: "Votre portrait unique a été créé." });
      } else {
        console.warn("Avatar generation failed or returned invalid data:", avatarResult.error);
        toast({ variant: "destructive", title: "Échec de l'Avatar", description: avatarResult.error || "Impossible de générer un avatar personnalisé. Utilisation d'un avatar par défaut." });
      }
    } catch (error: any) {
      console.error("Error calling generatePlayerAvatar flow:", error);
      toast({ variant: "destructive", title: "Erreur d'Avatar", description: "Une erreur est survenue lors de la génération de l'avatar. Utilisation d'un avatar par défaut." });
    } finally {
      setIsGeneratingAvatar(false);
    }

    const randomLatitude = Math.random() * 180 - 90;
    const randomLongitude = Math.random() * 360 - 180;
    const randomLocation: Position = {
      latitude: parseFloat(randomLatitude.toFixed(4)),
      longitude: parseFloat(randomLongitude.toFixed(4)),
      name: UNKNOWN_STARTING_PLACE_NAME,
    };

    const playerBaseDetails: Partial<Player> = {
      ...playerDataFromForm,
      avatarUrl: avatarUrlToUse,
      stats: { ...initialPlayerStats },
      skills: { ...initialSkills },
      traitsMentalStates: [...initialTraitsMentalStates],
      progression: { ...initialProgression },
      alignment: { ...initialAlignment },
      inventory: [ ...initialInventory ],
      money: initialPlayerMoney,
      uid: user && !user.isAnonymous ? user.uid : undefined,
      currentLocation: randomLocation,
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
      nearbyPois: null,
      gameTimeInMinutes: 0,
      journal: [],
    };
    setGameState(newGameState);
    await saveGameState(newGameState);
    toast({ title: "Personnage créé !", description: `Votre aventure commence dans un lieu mystérieux... L'IA va vous en dire plus.`});
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
    setGameState({ player: null, currentScenario: null, nearbyPois: null, gameTimeInMinutes: 0, journal: [] });
    toast({ title: "Partie Redémarrée", description: "Créez un nouveau personnage pour commencer une nouvelle aventure." });
  };

  const isGameActive = !!(gameState && gameState.player && gameState.currentScenario);

  const handleSaveGame = async () => {
    if (isGameActive && gameState) {
      try {
        const saveResult: SaveGameResult = await saveGameState(gameState);

        if (saveResult.localSaveSuccess && saveResult.cloudSaveSuccess === true) {
          toast({
            title: "Partie Sauvegardée",
            description: "Votre progression a été sauvegardée localement et dans le cloud.",
          });
        } else if (saveResult.localSaveSuccess && saveResult.cloudSaveSuccess === false) {
          toast({
            variant: "destructive", 
            title: "Sauvegarde Partielle",
            description: "Progression sauvegardée localement, mais échec de la synchronisation cloud.",
          });
        } else if (saveResult.localSaveSuccess && saveResult.cloudSaveSuccess === null) {
          toast({
            title: "Partie Sauvegardée",
            description: "Votre progression a été sauvegardée localement (utilisateur anonyme).",
          });
        } else if (!saveResult.localSaveSuccess) {
          toast({
            variant: "destructive",
            title: "Erreur de Sauvegarde Locale",
            description: "Impossible de sauvegarder la partie localement.",
          });
        }
      } catch (error) {
        console.error("Erreur inattendue lors de la sauvegarde manuelle:", error);
        toast({
          variant: "destructive",
          title: "Erreur Inconnue de Sauvegarde",
          description: "Une erreur inattendue est survenue lors de la tentative de sauvegarde.",
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

  return (
    <div className="flex flex-col h-screen max-h-screen bg-background text-foreground">
      <AppMenubar
        user={user}
        isGameActive={isGameActive}
        player={gameState?.player || null}
        journal={gameState?.journal || []}
        onRestartGame={handleRestartGame}
        onSaveGame={handleSaveGame}
        onToggleFullScreen={handleToggleFullScreen}
        onOpenToneSettings={() => setIsToneSettingsDialogOpen(true)}
        onSignOut={signOutUser}
        currentLocation={currentMapLocation}
        nearbyPois={nearbyPoisForMap}
        weatherData={weatherData}
        weatherLoading={weatherLoading}
        weatherError={weatherError}
        locationImageUrl={locationImageUrl}
        locationImageLoading={locationImageLoading}
        locationImageError={locationImageError}
      />

      {gameState?.player && (
        <ToneSettingsDialog
          isOpen={isToneSettingsDialogOpen}
          onOpenChange={setIsToneSettingsDialogOpen}
          currentSettings={gameState.player.toneSettings || initialToneSettings}
          onSave={handleSaveToneSettings}
        />
      )}

      <div className="flex-1 flex flex-row overflow-hidden">
        {loadingAuth || isLoadingState ? (
          <div className="flex-grow flex items-center justify-center">
            <LoadingState loadingAuth={loadingAuth} isLoadingState={isLoadingState} />
          </div>
        ) : !user ? (
          <div className="flex-grow flex items-center justify-center p-4">
            <AuthScreen
              loadingAuth={false} // loadingAuth is false at this point
              signUp={signUpWithEmailPassword}
              signIn={signInWithEmailPassword}
              signInAnon={signInAnonymously}
            />
          </div>
        ) : (
          <GameScreen
              user={user} // user is guaranteed to be non-null here
              gameState={gameState}
              isGameActive={isGameActive}
              onCharacterCreate={handleCharacterCreate}
              onRestartGame={handleRestartGame} // Although GameScreen doesn't directly use this, it might pass to GamePlay if needed
              setGameState={setGameState}
              weatherData={weatherData}
              weatherLoading={weatherLoading}
              weatherError={weatherError}
              locationImageUrl={locationImageUrl}
              locationImageLoading={locationImageLoading}
              locationImageError={locationImageError}
              isGeneratingAvatar={isGeneratingAvatar}
          />
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  return <HomePageContent />;
}
