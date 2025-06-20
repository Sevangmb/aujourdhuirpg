import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth'; // Assuming User type from firebase/auth

// Corrected import path for game logic types
import type { GameState, Player, ToneSettings, Position } from '@/lib/types';
import { loadGameStateFromLocal, saveGameState, SaveGameResult, clearGameStateFromLocal, getInitialScenario, hydratePlayer } from '@/lib/game-logic/game-state';
import { defaultAvatarUrl, initialPlayerStats, initialPlayerPosition, initialPlayerLocation, UNKNOWN_STARTING_PLACE_NAME } from '@/lib/game-logic/initial-game-data';
import { loadGameStateFromFirestore, deletePlayerStateFromFirestore } from '@/lib/firestore';
import { useToast } from '@/components/ui/use-toast';
import ToneSettingsDialog from '@/components/ToneSettingsDialog';
import AppMenubar from '@/components/AppMenubar';
import GameScreen from '@/components/GameScreen';
// Corrected path for getCurrentWeather based on ls output
import { WeatherData, getCurrentWeather } from '@/app/actions/get-current-weather';
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
        const initialPlayer = hydratePlayer(initialPlayerStats, defaultAvatarUrl, initialPlayerPosition, initialPlayerLocation);
        const initialScenario = getInitialScenario(initialPlayer, initialPlayerPosition, initialPlayerLocation);
        setGameState({
          currentScenario: initialScenario,
          player: initialPlayer,
          gameTime: new Date().toISOString(),
          toneSettings: {
            narrationStyle: "detailed",
            verbosity: "medium",
            languageDensity: "medium"
          },
          currentPosition: initialPlayerPosition,
          currentLocationName: initialPlayerLocation.name || UNKNOWN_STARTING_PLACE_NAME,
        });
        setIsCharacterCreationMode(true);
      }
    }
    setIsLoadingState(false);
  }, [user]);


  // useEffect for fetchWeatherForLocation
  useEffect(() => {
    if (gameState?.currentLocationName && gameState.currentLocationName !== UNKNOWN_STARTING_PLACE_NAME) {
      fetchWeatherForLocation(gameState.currentLocationName);
    } else {
      setWeatherData(null); // Clear weather data if location is unknown
    }
  }, [gameState?.currentLocationName]);

  const fetchWeatherForLocation = useCallback(async (locationName: string) => {
    if (!locationName || locationName === UNKNOWN_STARTING_PLACE_NAME) {
      setWeatherData(null);
      setWeatherError(null);
      return;
    }
    setWeatherLoading(true);
    setWeatherError(null);
    console.log(`Fetching weather for ${locationName}`);
    try {
      const data = await getCurrentWeather(locationName);
      setWeatherData(data);
      console.log("Weather data received:", data);
    } catch (error) {
      console.error("Failed to fetch weather data:", error);
      setWeatherError((error as Error).message || "Failed to fetch weather. Please ensure the API key is configured correctly.");
      setWeatherData(null);
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  // useEffect for fetchLocationImage
  useEffect(() => {
    if (gameState?.currentLocationName && gameState.currentLocationName !== UNKNOWN_STARTING_PLACE_NAME) {
      fetchLocationImage(gameState.currentLocationName, gameState.currentScenario.description);
    } else {
      setLocationImageUrl(null); // Clear image if location is unknown
    }
  }, [gameState?.currentLocationName, gameState?.currentScenario.description]);

  const fetchLocationImage = useCallback(async (locationName: string, locationDescription: string) => {
    if (!locationName || locationName === UNKNOWN_STARTING_PLACE_NAME) {
      setLocationImageUrl(null);
      setLocationImageError(null);
      return;
    }
    setLocationImageLoading(true);
    setLocationImageError(null);
    console.log(`Fetching image for ${locationName}`);
    try {
      // TODO: Consider adding weather data to the prompt if available
      const imageUrl = await generateLocationImage({ locationName, locationDescription });
      setLocationImageUrl(imageUrl);
      console.log("Location image URL:", imageUrl);
    } catch (error) {
      console.error("Failed to generate location image:", error);
      setLocationImageError((error as Error).message || "Failed to generate location image.");
      setLocationImageUrl(null);
    } finally {
      setLocationImageLoading(false);
    }
  }, []);


  const handleCharacterCreate = useCallback(async (playerData: Player, startSituation?: string) => {
    if (!user) {
      toast({ title: "Error", description: "User not authenticated.", variant: "destructive" });
      return;
    }
    setIsGeneratingAvatar(true);
    let avatarUrl = defaultAvatarUrl;
    try {
      if (playerData.description) { // Generate avatar only if description is provided
        avatarUrl = await generatePlayerAvatar(playerData.description);
      }
    } catch (error) {
      console.error("Avatar generation failed:", error);
      toast({
        title: "Avatar Generation Failed",
        description: (error as Error).message || "Could not generate avatar. Using default.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAvatar(false);
    }

    const hydratedPlayer = hydratePlayer(playerData, avatarUrl, initialPlayerPosition, initialPlayerLocation);
    const initialScenario = getInitialScenario(hydratedPlayer, initialPlayerPosition, initialPlayerLocation, startSituation);

    setGameState({
      currentScenario: initialScenario,
      player: hydratedPlayer,
      gameTime: new Date().toISOString(),
      toneSettings: gameState?.toneSettings || { // Preserve existing tone settings or use default
        narrationStyle: "detailed",
        verbosity: "medium",
        languageDensity: "medium"
      },
      currentPosition: initialPlayerPosition,
      currentLocationName: initialPlayerLocation.name || UNKNOWN_STARTING_PLACE_NAME,
    });
    setIsCharacterCreationMode(false); // Exit character creation mode
    setLocationImageUrl(null); // Reset location image for new game
    setWeatherData(null); // Reset weather for new game
    console.log("Character created, new game state set.");
  }, [user, toast, gameState?.toneSettings]);


  const handleRestartGame = useCallback(async () => {
    if (!user) {
      toast({ title: "Error", description: "User not authenticated for restart.", variant: "destructive" });
      return;
    }
    console.log("Restarting game for user:", user.uid);
    setIsLoadingState(true);
    await deletePlayerStateFromFirestore(user.uid); // Clear cloud save
    clearGameStateFromLocal(); // Clear local save
    const initialScenario = getInitialScenario(initialPlayerStats, initialPlayerPosition, initialPlayerLocation);
    setGameState({
      currentScenario: initialScenario,
      player: hydratePlayer(initialPlayerStats, defaultAvatarUrl, initialPlayerPosition, initialPlayerLocation),
      gameTime: new Date().toISOString(),
      toneSettings: { // Reset to default tone settings on restart
        narrationStyle: "detailed",
        verbosity: "medium",
        languageDensity: "medium"
      },
      currentPosition: initialPlayerPosition,
      currentLocationName: initialPlayerLocation.name || UNKNOWN_STARTING_PLACE_NAME,
    });
    setIsCharacterCreationMode(true); // Enter character creation mode
    setLocationImageUrl(null);
    setWeatherData(null);
    setIsLoadingState(false);
    toast({ title: "Game Restarted", description: "Create a new character to begin your adventure." });
  }, [user, toast]);

  const handleSaveGame = useCallback(async () => {
    if (!gameState || !user) {
      toast({ title: "Error", description: "No game state to save or user not authenticated.", variant: "destructive" });
      return;
    }
    console.log("Saving game state for user:", user.uid);
    const result = await saveGameState(gameState, user.uid);
    if (result.success) {
      toast({ title: "Game Saved", description: result.message });
    } else {
      toast({ title: "Save Failed", description: result.message, variant: "destructive" });
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
    if (gameState) {
      const updatedGameState = { ...gameState, toneSettings: newSettings };
      setGameState(updatedGameState);
      // Optionally, save to local storage or backend if these settings should persist independently
      toast({ title: "Tone Settings Saved", description: "The narration style has been updated." });
    }
    setIsToneSettingsDialogOpen(false);
  };


  if (isLoadingState && !isCharacterCreationMode) { // Show adventure loading only if not heading to char creation immediately
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground">
        <p>Loading your adventure...</p>
        {/* You might want to add a spinner here */}
      </div>
    );
  }

  // Calculate isGameActive based on the new isCharacterCreationMode state
  const isGameActive = !isCharacterCreationMode && !!(gameState && gameState.player && gameState.currentScenario);

  // Props for AppMenubar based on original page.tsx structure
  // Ensure initialPlayerLocation and UNKNOWN_STARTING_PLACE_NAME are available if used here
  // For simplicity, if gameState or player is null, these will be null/default.
  const currentMapLocation = gameState?.player?.currentLocation ?
    { name: gameState.currentLocationName || UNKNOWN_STARTING_PLACE_NAME, ...gameState.player.currentLocation } :
    initialPlayerLocation;
  const nearbyPoisForMap = gameState?.nearbyPois || null;
  const playerJournal = gameState?.journal || []; // Assuming journal is part of GameState

  return (
    <>
      <AppMenubar
        user={user} // Pass the user prop from AuthenticatedAppViewProps
        isGameActive={isGameActive} // Pass calculated isGameActive
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
        onNewGame={() => setIsCharacterCreationMode(true)}
        onRestartGame={handleRestartGame}
        onSaveGame={handleSaveGame}
        onSignOut={signOutUser}
        onToggleFullScreen={handleToggleFullScreen}
        onOpenToneSettings={() => setIsToneSettingsDialogOpen(true)}
        isSaveDisabled={!isGameActive || isLoadingState || !gameState}
        isRestartDisabled={isLoadingState}
      />
      <ToneSettingsDialog
        isOpen={isToneSettingsDialogOpen}
        onOpenChange={setIsToneSettingsDialogOpen}
        currentSettings={gameState?.toneSettings || { narrationStyle: "detailed", verbosity: "medium", languageDensity: "medium" }}
        onSave={handleSaveToneSettings}
      />
      <GameScreen
        user={user} // Pass the user object
        loadingAuth={false} // Auth is complete when in AuthenticatedAppView
        authFunctions={{
          // Dummy functions to satisfy AuthFunctions type, not used when user is present
          user: null, loadingAuth: false,
          signUp: async () => {}, signIn: async () => {},
          signInAnon: async () => {}, signOut: async () => {}
        }}
        isLoadingState={isLoadingState} // Game data loading state
        gameState={gameState}
        isGameActive={isGameActive} // Pass the calculated isGameActive
        onCharacterCreate={handleCharacterCreate}
        onRestartGame={handleRestartGame} // Pass onRestartGame
        setGameState={setGameState}
        weatherData={weatherData}
        weatherLoading={weatherLoading}
        weatherError={weatherError}
        locationImageUrl={locationImageUrl}
        locationImageLoading={locationImageLoading}
        locationImageError={locationImageError}
        isGeneratingAvatar={isGeneratingAvatar}
        // userId={user?.uid} // GameScreen itself doesn't use userId directly. Actions within GamePlay/etc. would typically get UID from user object or context.
      />
    </>
  );
};

export default AuthenticatedAppView;
