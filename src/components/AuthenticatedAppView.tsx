
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User } from 'firebase/auth'; // Assuming User type from firebase/auth

import { type GenerateScenarioInput, generateScenario } from '@/ai/flows/generate-scenario';
import { aiService } from '@/services/aiService';
import type { GameState, Player, ToneSettings, Position, GeoIntelligence, CharacterSummary } from '@/lib/types';
import { getInitialScenario, prepareAIInput, fetchPoisForCurrentLocation } from '@/lib/game-logic';
import { saveGameState, type SaveGameResult, hydratePlayer } from '@/lib/game-state-persistence';
import { defaultAvatarUrl, initialPlayerLocation, UNKNOWN_STARTING_PLACE_NAME, initialToneSettings } from '@/data/initial-game-data';
import { listCharacters, loadCharacter, createNewCharacter, saveCharacter, deleteCharacter } from '@/services/firestore-service';
import { useToast } from '@/hooks/use-toast';
import ToneSettingsDialog from '@/components/ToneSettingsDialog';
import AppMenubar from '@/components/AppMenubar';
import { type WeatherData, getCurrentWeather } from '@/app/actions/get-current-weather';
import { generateLocationImage as generateLocationImageService } from '@/ai/flows/generate-location-image-flow';
import { generateGeoIntelligence } from '@/ai/flows/generate-geo-intelligence-flow';
import { clearGameState as clearLocalGameState } from '@/services/localStorageService';
import { fetchWikipediaSummary } from '@/services/wikipedia-service';
import GameScreen from '@/components/GameScreen';
import { CharacterSelectionScreen } from '@/components/CharacterSelectionScreen';
import LoadingState from './LoadingState';

interface AuthenticatedAppViewProps {
  user: User;
  signOutUser: () => Promise<void>;
}

type AppMode = 'loading' | 'selecting_character' | 'creating_character' | 'playing';

const AuthenticatedAppView: React.FC<AuthenticatedAppViewProps> = ({ user, signOutUser }) => {
  const [appMode, setAppMode] = useState<AppMode>('loading');
  const [characterList, setCharacterList] = useState<CharacterSummary[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [isDeletingCharacter, setIsDeletingCharacter] = useState<string | null>(null);

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isToneSettingsDialogOpen, setIsToneSettingsDialogOpen] = useState(false);
  
  // Contextual Data State
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [locationImageUrl, setLocationImageUrl] = useState<string | null>(null);
  const [locationImageLoading, setLocationImageLoading] = useState(false);
  const [locationImageError, setLocationImageError] = useState<string | null>(null);
  const [geoIntelligenceData, setGeoIntelligenceData] = useState<GeoIntelligence | null>(null);
  const [geoIntelligenceLoading, setGeoIntelligenceLoading] = useState(false);
  const [geoIntelligenceError, setGeoIntelligenceError] = useState<string | null>(null);

  const { toast } = useToast();
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchCharacterList = useCallback(async () => {
    if (!user) return;
    setAppMode('loading');
    const characters = await listCharacters(user.uid);
    setCharacterList(characters);
    if (characters.length === 0) {
      setAppMode('creating_character');
    } else {
      setAppMode('selecting_character');
    }
  }, [user]);

  useEffect(() => {
    fetchCharacterList();
  }, [user, fetchCharacterList]);

  // Combined data fetching hook
  useEffect(() => {
    const fetchContextualData = async (location: Position) => {
        fetchWeatherForLocation(location);
        fetchLocationImage(location.name, gameState?.player?.era);
        fetchGeoIntelligence(location);
        fetchPoisForLocation(location);
    };

    if (appMode === 'playing' && gameState?.player?.currentLocation && gameState.player.currentLocation.name !== UNKNOWN_STARTING_PLACE_NAME) {
      fetchContextualData(gameState.player.currentLocation);
    } else {
      // Clear data when not in playing mode or location is unknown
      setWeatherData(null);
      setLocationImageUrl(null);
      setGeoIntelligenceData(null);
      setGameState(prevState => prevState ? { ...prevState, nearbyPois: null } : null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appMode, gameState?.player?.currentLocation, gameState?.player?.era]);
  
  // Debounced Autosave Effect
  useEffect(() => {
    if (appMode !== 'playing' || !gameState) return;

    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);

    autosaveTimeoutRef.current = setTimeout(() => {
      handleSaveGame('auto'); // Use 'auto' saveType
    }, 5000);

    return () => {
      if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, appMode]);

  const fetchPoisForLocation = useCallback(async (location: Position) => {
    if (!location || !location.name || location.name === UNKNOWN_STARTING_PLACE_NAME) {
      setGameState(prevState => prevState ? { ...prevState, nearbyPois: null } : null);
      return;
    }
    try {
      const pois = await fetchPoisForCurrentLocation(location);
      setGameState(prevState => prevState ? { ...prevState, nearbyPois: pois } : null);
    } catch (error) {
      console.error("Failed to fetch POIs:", error);
      toast({ variant: "destructive", title: "Erreur de réseau", description: "Impossible de charger les lieux d'intérêt proches." });
    }
  }, [toast]);

  const fetchWeatherForLocation = useCallback(async (location: Position) => {
    setWeatherLoading(true);
    setWeatherError(null);
    try {
      const data = await getCurrentWeather(location.latitude, location.longitude);
      if ('error' in data) setWeatherError(data.error);
      else setWeatherData(data);
    } catch (error) {
      setWeatherError((error as Error).message || "Erreur inconnue.");
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  const fetchLocationImage = useCallback(async (placeName: string, era?: string) => {
    setLocationImageLoading(true);
    setLocationImageError(null);
    try {
      const result = await generateLocationImageService({ placeName, era: era || 'Époque Contemporaine' });
      if (result.error) setLocationImageError(result.error);
      else setLocationImageUrl(result.imageUrl);
    } catch (error) {
      setLocationImageError((error as Error).message || "Erreur inconnue.");
    } finally {
      setLocationImageLoading(false);
    }
  }, []);

  const fetchGeoIntelligence = useCallback(async (location: Position) => {
    setGeoIntelligenceLoading(true);
    setGeoIntelligenceError(null);
    try {
      const result = await generateGeoIntelligence({
        placeName: location.name,
        latitude: location.latitude,
        longitude: location.longitude,
      });
      if (result) setGeoIntelligenceData(result);
      else setGeoIntelligenceError("L'IA n'a pas pu analyser ce lieu.");
    } catch (error) {
      setGeoIntelligenceError((error as Error).message || "Erreur inattendue.");
    } finally {
      setGeoIntelligenceLoading(false);
    }
  }, []);

  const handleSelectCharacter = useCallback(async (characterId: string) => {
    setAppMode('loading');
    const loadedState = await loadCharacter(user.uid, characterId);
    if (loadedState) {
      const hydratedPlayer = hydratePlayer(loadedState.player);
      setGameState({ ...loadedState, player: hydratedPlayer });
      setSelectedCharacterId(characterId);
      setAppMode('playing');
    } else {
      toast({ title: "Erreur de chargement", description: "Impossible de charger ce personnage.", variant: "destructive" });
      fetchCharacterList(); // Refresh list in case of error
    }
  }, [user.uid, toast, fetchCharacterList]);

  const handleCharacterCreate = useCallback(async (playerData: {
      name: string; gender: string; age: number; origin: string; background: string; era: string; startingLocation: string; avatarUrl: string;
    }) => {
    setAppMode('loading');
    try {
      const locationData = await fetchWikipediaSummary(playerData.startingLocation);
      if (!locationData || typeof locationData.latitude !== 'number') {
        toast({ title: "Lieu de départ introuvable", variant: "destructive", description: "Veuillez choisir un lieu plus connu ou vérifier l'orthographe." });
        setAppMode('creating_character');
        return;
      }

      let hydratedPlayer = hydratePlayer({
          ...playerData, uid: user.uid, isAnonymous: user.isAnonymous,
      });
      hydratedPlayer.currentLocation = {
          latitude: locationData.latitude, longitude: locationData.longitude, name: locationData.title,
      };
       hydratedPlayer.startingLocationName = locationData.title;

      const tempStateForPrologue: GameState = {
        currentScenario: { scenarioText: "<p>Création du monde en cours...</p>" },
        player: hydratedPlayer, gameTimeInMinutes: 0, journal: [], nearbyPois: null, toneSettings: hydratedPlayer.toneSettings,
      };
      
      const aiInput = prepareAIInput(tempStateForPrologue, "[COMMENCER L'AVENTURE]");
      if (!aiInput) throw new Error("Could not prepare AI input for prologue.");

      const prologueResult = await generateScenario(aiInput);
      
      const finalGameState: GameState = {
        ...tempStateForPrologue,
        currentScenario: { scenarioText: prologueResult.scenarioText }
      };

      // This now creates a character document and an initial save file
      const newCharacterId = await createNewCharacter(user.uid, finalGameState);
      setSelectedCharacterId(newCharacterId); // Set the new character as active

      toast({ title: "Personnage créé !", description: `${playerData.name} est prêt(e) pour l'aventure.` });
      setAppMode('playing'); // Manually switch to playing mode with the new character
      setGameState(finalGameState);

    } catch (error) {
      console.error("Error during character creation:", error);
      toast({ title: "Erreur de création", description: "Impossible de commencer l'aventure.", variant: "destructive" });
      setAppMode('creating_character');
    }
  }, [user, toast]);

  const handleDeleteCharacter = useCallback(async (characterId: string) => {
    setIsDeletingCharacter(characterId);
    try {
      await deleteCharacter(user.uid, characterId);
      toast({ title: "Personnage supprimé" });
      if (selectedCharacterId === characterId) {
        setSelectedCharacterId(null);
        setGameState(null);
        clearLocalGameState();
      }
      fetchCharacterList();
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer le personnage.", variant: "destructive" });
    } finally {
      setIsDeletingCharacter(null);
    }
  }, [user.uid, toast, fetchCharacterList, selectedCharacterId]);

  const handleExitToSelection = () => {
    if (appMode === 'playing') {
      handleSaveGame('auto'); // Save before exiting
    }
    setGameState(null);
    setSelectedCharacterId(null);
    clearLocalGameState();
    fetchCharacterList(); // This will fetch the list and set the mode to 'selecting_character' or 'creating_character'
  };

  const handleSaveGame = useCallback(async (saveType: 'manual' | 'auto') => {
    if (!gameState || !user || !gameState.player || !selectedCharacterId) {
      if (saveType === 'manual') toast({ title: "Erreur", description: "Aucun état de jeu à sauvegarder.", variant: "destructive" });
      return;
    }
    const result = await saveGameState(user.uid, selectedCharacterId, gameState, saveType);
    if (saveType === 'manual') {
        if (result.cloudSaveSuccess) toast({ title: "Partie Sauvegardée" });
        else if (result.cloudSaveSuccess === false) toast({ title: "Échec de la sauvegarde Cloud", variant: "destructive" });
        else if(result.localSaveSuccess) toast({ title: "Partie Sauvegardée (localement)" }); // For anonymous users
    }
  }, [gameState, user, selectedCharacterId, toast]);

  const handleToggleFullScreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else if (document.exitFullscreen) document.exitFullscreen();
  };

  const handleSaveToneSettings = (newSettings: ToneSettings) => {
    if (gameState && gameState.player) {
      const updatedPlayer = { ...gameState.player, toneSettings: newSettings };
      setGameState({ ...gameState, player: updatedPlayer, toneSettings: newSettings });
      toast({ title: "Tonalité Sauvegardée" });
    }
    setIsToneSettingsDialogOpen(false);
  };
  
  if (appMode === 'loading') {
    return <LoadingState loadingAuth={false} isLoadingState={true} />;
  }
  
  if (appMode === 'selecting_character') {
    return (
      <CharacterSelectionScreen 
        characters={characterList}
        onSelectCharacter={handleSelectCharacter}
        onCreateNew={() => setAppMode('creating_character')}
        onDeleteCharacter={handleDeleteCharacter}
        isDeleting={isDeletingCharacter}
      />
    );
  }

  const isGameActive = appMode === 'playing' && !!gameState?.player;

  return (
    <div className="flex flex-col h-screen bg-background">
      <AppMenubar
        user={user}
        isGameActive={isGameActive}
        player={gameState?.player || null}
        journal={gameState?.journal || []}
        onRestartGame={handleExitToSelection}
        onSaveGame={() => handleSaveGame('manual')}
        onSignOut={signOutUser}
        onToggleFullScreen={handleToggleFullScreen}
        onOpenToneSettings={() => setIsToneSettingsDialogOpen(true)}
        currentLocation={gameState?.player?.currentLocation || null}
        nearbyPois={gameState?.nearbyPois || null}
        weatherData={weatherData}
        weatherLoading={weatherLoading}
        weatherError={weatherError}
        locationImageUrl={locationImageUrl}
        locationImageLoading={locationImageLoading}
        locationImageError={locationImageError}
        geoIntelligenceData={geoIntelligenceData}
        geoIntelligenceLoading={geoIntelligenceLoading}
        geoIntelligenceError={geoIntelligenceError}
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
          setGameState={setGameState}
          weatherData={weatherData}
          weatherLoading={weatherLoading}
          weatherError={weatherError}
          locationImageUrl={locationImageUrl}
          locationImageLoading={locationImageLoading}
          locationImageError={locationImageError}
          isCreatingCharacter={appMode === 'creating_character'}
        />
      </div>
    </div>
  );
};

export default AuthenticatedAppView;
