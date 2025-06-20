import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth'; // Assuming User type from firebase/auth

// Corrected import path for game logic types
import type { GameState, Player, ToneSettings, Position } from '@/lib/types';
import { loadGameStateFromLocal, saveGameState, type SaveGameResult, clearGameState, getInitialScenario, hydratePlayer } from '@/lib/game-logic';
import { defaultAvatarUrl, initialPlayerStats, initialPlayerPosition, initialPlayerLocation, UNKNOWN_STARTING_PLACE_NAME, initialToneSettings } from '@/data/initial-game-data';
import { loadGameStateFromFirestore, deletePlayerStateFromFirestore } from '@/services/firestore-service'; // Corrected import path
import { useToast } from '@/hooks/use-toast';
import ToneSettingsDialog from '@/components/ToneSettingsDialog';
import AppMenubar from '@/components/AppMenubar';
import GameScreen from '@/components/GameScreen';
// Corrected path for getCurrentWeather based on ls output
import { type WeatherData, getCurrentWeather } from '@/app/actions/get-current-weather';
// Corrected paths for AI flows to match original page.tsx
import { generateLocationImage } from '@/ai/flows/generate-location-image-flow';
import { generatePlayerAvatar } from '@/ai/flows/generate-player-avatar-flow';

interface AuthenticatedAppViewProps {
  user: User | null; // Allow null for initial state before user is fully loaded
  signOutUser: () => Promise<void>;
}

const AuthenticatedAppView: React.FC<AuthenticatedAppViewProps> = ({ user, signOutUser }) => {
  // State variables
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoadingState, setIsLoadingState] = useState(true); // For game data loading
  const [isCharacterCreationMode, setIsCharacterCreationMode] = useState(false);
  const [isToneSettingsDialogOpen, setIsToneSettingsDialogOpen] = useState(false);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [locationImageUrl, setLocationImageUrl] = useState<string | null>(null);
  const [locationImageLoading, setLocationImageLoading] = useState(false);
  const [locationImageError, setLocationImageError] = useState<string | null>(null);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);

  const { toast } = useToast();

  // Functions will be moved here

  // useEffect for performInitialLoad
  useEffect(() => {
    performInitialLoad();
  }, [user]); // Depends on user prop

  const performInitialLoad = useCallback(async () => {
    if (!user) {
      setGameState(null);
      setIsLoadingState(false);
      return;
    }
    setIsLoadingState(true);
    console.log("AuthenticatedAppView: Performing initial load for user:", user.uid);
    let loadedState = await loadGameStateFromFirestore(user.uid);
    if (loadedState && loadedState.player) { // Check if player exists to consider it a valid loaded state
      console.log("AuthenticatedAppView: Game state loaded from Firestore:", loadedState);
      setGameState(loadedState);
      setIsCharacterCreationMode(false);
    } else {
      loadedState = loadGameStateFromLocal();
      if (loadedState && loadedState.player) { // Check if player exists
        console.log("AuthenticatedAppView: Game state loaded from local storage:", loadedState);
        setGameState(loadedState);
        setIsCharacterCreationMode(false);
      } else {
        console.log("AuthenticatedAppView: No saved game state found or invalid state, initializing new game shell for character creation.");
        const initialPlayer = hydratePlayer({uid: user.uid}); // Pass UID for hydration
        const initialScenario = getInitialScenario(initialPlayer);
        setGameState({
          currentScenario: initialScenario,
          player: initialPlayer,
          gameTimeInMinutes: 0,
          journal: [],
          nearbyPois: null,
          toneSettings: initialPlayer.toneSettings,
        });
        setIsCharacterCreationMode(true);
      }
    }
    setIsLoadingState(false);
  }, [user]);


  // useEffect for fetchWeatherForLocation
  useEffect(() => {
    if (gameState?.player?.currentLocation && gameState.player.currentLocation.name !== UNKNOWN_STARTING_PLACE_NAME) {
      fetchWeatherForLocation(gameState.player.currentLocation);
    } else {
      setWeatherData(null); // Clear weather data if location is unknown or not set
      setWeatherError(null);
    }
  }, [gameState?.player?.currentLocation]); // Dependency on the player's current location object

  const fetchWeatherForLocation = useCallback(async (location: Position) => {
    if (!location || !location.name || location.name === UNKNOWN_STARTING_PLACE_NAME || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
        setWeatherData(null);
        setWeatherError(null);
        return;
    }
    setWeatherLoading(true);
    setWeatherError(null);
    console.log(`Fetching weather for ${location.name} at ${location.latitude}, ${location.longitude}`);
    try {
      // getCurrentWeather from actions now expects lat/lon, not name
      const data = await getCurrentWeather(location.latitude, location.longitude);
      if ('error' in data) {
        setWeatherData(null);
        setWeatherError(data.error);
        console.error("Failed to fetch weather data:", data.error);
      } else {
        setWeatherData(data);
        console.log("Weather data received:", data);
      }
    } catch (error) {
      console.error("Failed to fetch weather data (catch block):", error);
      setWeatherError((error as Error).message || "Failed to fetch weather. Please ensure the API key is configured correctly.");
      setWeatherData(null);
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  // useEffect for fetchLocationImage
  useEffect(() => {
    if (gameState?.player?.currentLocation && gameState.player.currentLocation.name !== UNKNOWN_STARTING_PLACE_NAME) {
      fetchLocationImage(gameState.player.currentLocation.name); // Pass only name
    } else {
      setLocationImageUrl(null); // Clear image if location is unknown
      setLocationImageError(null);
    }
  }, [gameState?.player?.currentLocation?.name]); // Depend on location name for image

  const fetchLocationImage = useCallback(async (placeName: string) => {
    if (!placeName || placeName === UNKNOWN_STARTING_PLACE_NAME) {
      setLocationImageUrl(null);
      setLocationImageError(null);
      return;
    }
    setLocationImageLoading(true);
    setLocationImageError(null);
    console.log(`Fetching image for ${placeName}`);
    try {
      const result = await generateLocationImage({ placeName }); // Pass input object
      if (result.error) {
        setLocationImageError(result.error);
        setLocationImageUrl(null);
      } else {
        setLocationImageUrl(result.imageUrl);
      }
      console.log("Location image result:", result);
    } catch (error) {
      console.error("Failed to generate location image:", error);
      setLocationImageError((error as Error).message || "Failed to generate location image.");
      setLocationImageUrl(null);
    } finally {
      setLocationImageLoading(false);
    }
  }, []);


  const handleCharacterCreate = useCallback(async (playerBaseDetails: Omit<Player, 'currentLocation' | 'uid' | 'stats' | 'skills' | 'traitsMentalStates' | 'progression' | 'alignment' | 'inventory' | 'avatarUrl' | 'questLog' | 'encounteredPNJs' | 'decisionLog' | 'clues' | 'documents' | 'investigationNotes' | 'money' | 'toneSettings'>) => {
    if (!user) {
      toast({ title: "Error", description: "User not authenticated.", variant: "destructive" });
      return;
    }
    setIsGeneratingAvatar(true);
    let avatarUrl = defaultAvatarUrl;
    try {
        const avatarInput = {
            name: playerBaseDetails.name,
            gender: playerBaseDetails.gender,
            age: playerBaseDetails.age,
            origin: playerBaseDetails.origin,
            playerBackground: playerBaseDetails.background
        };
        const avatarResult = await generatePlayerAvatar(avatarInput);
        if (avatarResult.imageUrl) {
            avatarUrl = avatarResult.imageUrl;
        } else if (avatarResult.error) {
            console.error("Avatar generation failed:", avatarResult.error);
            toast({
                title: "Avatar Generation Failed",
                description: avatarResult.error || "Could not generate avatar. Using default.",
                variant: "destructive",
            });
        }
    } catch (error) {
      console.error("Avatar generation failed (catch):", error);
      toast({
        title: "Avatar Generation Failed",
        description: (error as Error).message || "Could not generate avatar. Using default.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAvatar(false);
    }

    const hydratedPlayer = hydratePlayer({
        ...playerBaseDetails,
        uid: user.uid,
        avatarUrl: avatarUrl,
    });

    hydratedPlayer.currentLocation = {
        latitude: Math.random() * 180 - 90,
        longitude: Math.random() * 360 - 180,
        name: UNKNOWN_STARTING_PLACE_NAME,
    };

    const initialScenario = getInitialScenario(hydratedPlayer);

    setGameState({
      currentScenario: initialScenario,
      player: hydratedPlayer,
      gameTimeInMinutes: 0,
      journal: [],
      nearbyPois: null,
      toneSettings: hydratedPlayer.toneSettings,
    });
    setIsCharacterCreationMode(false);
    setLocationImageUrl(null);
    setWeatherData(null);
    console.log("Character created, new game state set. Player location:", hydratedPlayer.currentLocation);
  }, [user, toast]);


  const handleRestartGame = useCallback(async () => {
    if (!user) {
      toast({ title: "Error", description: "User not authenticated for restart.", variant: "destructive" });
      return;
    }
    console.log("Restarting game for user:", user.uid);
    setIsLoadingState(true);
    await deletePlayerStateFromFirestore(user.uid);
    clearGameState();
    
    const newPlayerBase = hydratePlayer({ uid: user.uid });
    newPlayerBase.currentLocation = {
        latitude: Math.random() * 180 - 90,
        longitude: Math.random() * 360 - 180,
        name: UNKNOWN_STARTING_PLACE_NAME,
    };
    const initialScenario = getInitialScenario(newPlayerBase);

    setGameState({
      currentScenario: initialScenario,
      player: newPlayerBase,
      gameTimeInMinutes: 0,
      journal: [],
      nearbyPois: null,
      toneSettings: newPlayerBase.toneSettings,
    });
    setIsCharacterCreationMode(true);
    setLocationImageUrl(null);
    setWeatherData(null);
    setIsLoadingState(false);
    toast({ title: "Game Restarted", description: "Create a new character to begin your adventure." });
  }, [user, toast]);

  const handleSaveGame = useCallback(async () => {
    if (!gameState || !user || !gameState.player) {
      toast({ title: "Error", description: "No game state to save or user not authenticated.", variant: "destructive" });
      return;
    }
    const stateToSave: GameState = {
      ...gameState,
      player: {
        ...gameState.player,
        uid: user.uid,
      },
    };

    console.log("Saving game state for user:", user.uid, stateToSave);
    const result = await saveGameState(stateToSave);
    if (result.localSaveSuccess || result.cloudSaveSuccess) {
      toast({ title: "Game Saved", description: `Local: ${result.localSaveSuccess ? 'Oui' : 'Non'}. Cloud: ${result.cloudSaveSuccess === null ? 'N/A' : (result.cloudSaveSuccess ? 'Oui' : 'Non')}.` });
    } else {
      toast({ title: "Save Failed", description: "Could not save locally or to cloud.", variant: "destructive" });
    }
  }, [gameState, user, toast]);

  const handleToggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const handleSaveToneSettings = (newSettings: ToneSettings) => {
    if (gameState && gameState.player) {
      const updatedPlayer = { ...gameState.player, toneSettings: newSettings };
      const updatedGameState = { ...gameState, player: updatedPlayer, toneSettings: newSettings }; // Also update top-level toneSettings
      setGameState(updatedGameState);
      toast({ title: "Tone Settings Saved", description: "The narration style has been updated." });
    }
    setIsToneSettingsDialogOpen(false);
  };


  if (isLoadingState && !isCharacterCreationMode) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground">
        <p>Chargement de votre aventure...</p>
      </div>
    );
  }

  const isGameActive = !isCharacterCreationMode && !!(gameState && gameState.player && gameState.currentScenario);

  const currentMapLocation = gameState?.player?.currentLocation || initialPlayerLocation;
  const nearbyPoisForMap = gameState?.nearbyPois || null;
  const playerJournal = gameState?.journal || [];

  return (
    <div className="flex flex-col h-screen">
      <AppMenubar
        user={user}
        isGameActive={isGameActive}
        player={gameState?.player || null}
        journal={playerJournal}
        currentLocation={currentMapLocation}
        nearbyPois={nearbyPoisForMap}
        weatherData={weatherData}
        weatherLoading={weatherLoading}
        weatherError={weatherError}
        locationImageUrl={locationImageUrl}
        locationImageLoading={locationImageLoading}
        locationImageError={locationImageError}
        onRestartGame={handleRestartGame}
        onSaveGame={handleSaveGame}
        onSignOut={signOutUser}
        onToggleFullScreen={handleToggleFullScreen}
        onOpenToneSettings={() => setIsToneSettingsDialogOpen(true)}
      />
      <ToneSettingsDialog
        isOpen={isToneSettingsDialogOpen}
        onOpenChange={setIsToneSettingsDialogOpen}
        currentSettings={gameState?.toneSettings || initialToneSettings}
        onSave={handleSaveToneSettings}
      />
      <GameScreen
        user={user}
        gameState={gameState}
        isGameActive={isGameActive}
        onCharacterCreate={handleCharacterCreate}
        onRestartGame={handleRestartGame}
        setGameState={setGameState}
        weatherData={weatherData}
        weatherLoading={weatherLoading}
        weatherError={weatherError}
        locationImageUrl={locationImageUrl}
        locationImageLoading={locationImageLoading}
        locationImageError={locationImageError}
        isGeneratingAvatar={isGeneratingAvatar}
      />
    </div>
  );
};

export default AuthenticatedAppView;
