import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth'; // Assuming User type from firebase/auth

import { type GenerateScenarioInput, generateScenario } from '@/ai/flows/generate-scenario';
// Corrected import path for game logic types
import { aiService } from '@/services/aiService';
import type { GameState, Player, ToneSettings, Position, GeoIntelligence } from '@/lib/types';
import { getInitialScenario, prepareAIInput } from '@/lib/game-logic';
import { saveGameState, type SaveGameResult, hydratePlayer } from '@/lib/game-state-persistence';
import { defaultAvatarUrl, initialPlayerLocation, UNKNOWN_STARTING_PLACE_NAME, initialToneSettings } from '@/data/initial-game-data';
import { loadGameStateFromFirestore, deletePlayerStateFromFirestore } from '@/services/firestore-service'; // Corrected import path
import { useToast } from '@/hooks/use-toast';
import ToneSettingsDialog from '@/components/ToneSettingsDialog';
import AppMenubar from '@/components/AppMenubar';
import GameScreen from '@/components/GameScreen';
// Corrected path for getCurrentWeather based on ls output
import { type WeatherData, getCurrentWeather } from '@/app/actions/get-current-weather';
// Corrected paths for AI flows to match original page.tsx
import { generateLocationImage as generateLocationImageService } from '@/ai/flows/generate-location-image-flow';
import { generateGeoIntelligence } from '@/ai/flows/generate-geo-intelligence-flow'; // Import new flow
import { loadGameStateFromLocal, clearGameState } from '@/services/localStorageService';
import { fetchWikipediaSummary } from '@/services/wikipedia-service';


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
  const [isCreatingCharacter, setIsCreatingCharacter] = useState(false);
  const [geoIntelligenceData, setGeoIntelligenceData] = useState<GeoIntelligence | null>(null);
  const [geoIntelligenceLoading, setGeoIntelligenceLoading] = useState(false);
  const [geoIntelligenceError, setGeoIntelligenceError] = useState<string | null>(null);

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
      const location = gameState.player.currentLocation;
      fetchWeatherForLocation(location);
      fetchLocationImage(location.name);
      fetchGeoIntelligence(location);
    } else {
      setWeatherData(null);
      setWeatherError(null);
      setLocationImageUrl(null);
      setLocationImageError(null);
      setGeoIntelligenceData(null);
      setGeoIntelligenceError(null);
    }
  }, [gameState?.player?.currentLocation]);

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

  const fetchLocationImage = useCallback(async (placeName: string) => {
    if (!placeName || placeName === UNKNOWN_STARTING_PLACE_NAME || !gameState?.player) {
      setLocationImageUrl(null);
      setLocationImageError(null);
      return;
    }
    setLocationImageLoading(true);
    setLocationImageError(null);
    console.log(`Fetching image for ${placeName} in era ${gameState.player.era}`);
    try {
      const result = await generateLocationImageService({ placeName, era: gameState.player.era });
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
  }, [gameState]);

  const fetchGeoIntelligence = useCallback(async (location: Position) => {
    if (!location || !location.name || location.name === UNKNOWN_STARTING_PLACE_NAME) {
      setGeoIntelligenceData(null);
      setGeoIntelligenceError(null);
      return;
    }
    setGeoIntelligenceLoading(true);
    setGeoIntelligenceError(null);
    console.log(`Fetching geo-intelligence for ${location.name}`);
    try {
      const result = await generateGeoIntelligence({
        placeName: location.name,
        latitude: location.latitude,
        longitude: location.longitude,
      });
      if (result) {
        setGeoIntelligenceData(result);
      } else {
        setGeoIntelligenceError("L'IA n'a pas pu analyser ce lieu.");
        setGeoIntelligenceData(null);
      }
    } catch (error) {
      const errorMessage = (error as Error).message || "Une erreur inattendue est survenue lors de l'analyse du lieu.";
      console.error("Failed to fetch geo-intelligence:", error);
      setGeoIntelligenceError(errorMessage);
      setGeoIntelligenceData(null);
    } finally {
      setGeoIntelligenceLoading(false);
    }
  }, []);


  const handleCharacterCreate = useCallback(async (playerData: {
      name: string;
      gender: string;
      age: number;
      origin: string;
      background: string;
      era: string;
      startingLocation: string;
      avatarUrl: string; // Avatar URL is now passed in
    }) => {
    if (!user) {
      toast({ title: "Error", description: "User not authenticated.", variant: "destructive" });
      return;
    }
    
    setIsCreatingCharacter(true);

    try {
      const locationData = await fetchWikipediaSummary(playerData.startingLocation);

      if (!locationData || typeof locationData.latitude !== 'number' || typeof locationData.longitude !== 'number') {
        toast({
          title: "Lieu de départ introuvable",
          description: `Impossible de trouver les coordonnées pour "${playerData.startingLocation}". Veuillez essayer un nom plus précis.`,
          variant: "destructive",
        });
        setIsCreatingCharacter(false);
        return;
      }

      const hydratedPlayer = hydratePlayer({
          ...playerData,
          uid: user.uid,
          avatarUrl: playerData.avatarUrl,
          startingLocationName: playerData.startingLocation,
      });

      hydratedPlayer.currentLocation = {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          name: locationData.title, // Use the official title from Wikipedia for consistency
          summary: locationData.summary,
          imageUrl: locationData.imageUrl,
      };

      const tempStateForPrologue = {
        currentScenario: { scenarioText: "<p>Création du monde en cours...</p>" },
        player: hydratedPlayer,
        gameTimeInMinutes: 0,
        journal: [],
        nearbyPois: null,
        toneSettings: hydratedPlayer.toneSettings,
      };

      setGameState(tempStateForPrologue);
      setIsCharacterCreationMode(false);
      
      console.log("Character created, generating prologue with AI. Player location:", hydratedPlayer.currentLocation);
      
      const aiInput = prepareAIInput(tempStateForPrologue, "[COMMENCER L'AVENTURE]");
      if (!aiInput) throw new Error("Could not prepare AI input for prologue.");

      const prologueResult = await generateScenario(aiInput);
      
      // After prologue, set location image from the fetched data if available
      setLocationImageUrl(hydratedPlayer.currentLocation.imageUrl || null);
      
      setGameState(prevState => prevState ? { ...prevState, currentScenario: { scenarioText: prologueResult.scenarioText } } : null);
    
    } catch (error) {
      console.error("Error during character creation or prologue generation:", error);
      toast({
        title: "Erreur de création",
        description: "Impossible de commencer l'aventure. Veuillez réessayer.",
        variant: "destructive",
      });
      // Optionally reset to character creation screen
      setIsCharacterCreationMode(true);
    } finally {
      setIsCreatingCharacter(false);
    }
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
        geoIntelligenceData={geoIntelligenceData}
        geoIntelligenceLoading={geoIntelligenceLoading}
        geoIntelligenceError={geoIntelligenceError}
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
      <div className="flex-grow overflow-auto">
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
          isCreatingCharacter={isCreatingCharacter}
        />
      </div>
    </div>
  );
};

export default AuthenticatedAppView;
