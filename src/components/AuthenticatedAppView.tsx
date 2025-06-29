
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User } from 'firebase/auth'; // Assuming User type from firebase/auth

import { type GenerateScenarioInput, generateScenario } from '@/ai/flows/generate-scenario';
import { aiService } from '@/services/aiService';
import type { GameState, Player, ToneSettings, Position, GeoIntelligence, CharacterSummary, JournalEntry, HistoricalContact, GameEra } from '@/lib/types';
import { getInitialScenario, prepareAIInput, fetchPoisForCurrentLocation, gameReducer, GameAction } from '@/lib/game-logic';
import { saveGameState, type SaveGameResult, hydratePlayer } from '@/lib/game-state-persistence';
import { initialPlayerLocation, UNKNOWN_STARTING_PLACE_NAME, initialToneSettings } from '@/data/initial-game-data';
import { listCharacters, loadSpecificSave, createNewCharacter, deleteCharacter } from '@/services/firestore-service';
import { useToast } from '@/hooks/use-toast';
import ToneSettingsDialog from '@/components/ToneSettingsDialog';
import AppMenubar from '@/components/AppMenubar';
import { type WeatherData, getCurrentWeather } from '@/app/actions/get-current-weather';
import { generateLocationImage as generateLocationImageService } from '@/ai/flows/generate-location-image-flow';
import { generateGeoIntelligence } from '@/ai/flows/generate-geo-intelligence-flow';
import { clearGameState as clearLocalGameState } from '@/services/localStorageService';
import { getPositionData } from '@/services/position-service';
import GameScreen from '@/components/GameScreen';
import { CharacterSelectionScreen } from '@/components/CharacterSelectionScreen';
import LoadingState from './LoadingState';
import { findAndAdaptHistoricalContactsForLocation, type AdaptedContact } from '@/services/historical-contact-service';
import { HistoricalEncounterModal } from './HistoricalEncounterModal';
import { v4 as uuidv4 } from 'uuid';
import type { FullCharacterFormData } from './CharacterCreationForm';
import { TravelModal } from './TravelModal';
import { getDistanceInKm } from '@/lib/utils/geo-utils';
import { generateTravelEvent } from '@/ai/flows/generate-travel-event-flow';


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
  const [encounter, setEncounter] = useState<AdaptedContact | null>(null);
  const [travelDestination, setTravelDestination] = useState<Position | null>(null);


  const { toast } = useToast();
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousGameStateRef = useRef<GameState | null>(null);

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

  const handleGameAction = useCallback((action: GameAction) => {
    setGameState(prevState => {
      if (!prevState) return null;
      return gameReducer(prevState, action);
    });
  }, []);

  useEffect(() => {
    fetchCharacterList();
  }, [user, fetchCharacterList]);

  const triggerHistoricalEncounter = useCallback(async (placeName: string, playerEra: GameEra) => {
    if (Math.random() > 0.15) { // 15% chance
        console.log("Historical encounter check failed (random chance).");
        return;
    }

    try {
        const potentialContacts = await findAndAdaptHistoricalContactsForLocation(placeName, playerEra);
        if (potentialContacts && potentialContacts.length > 0) {
            const knownContactHistoricalNames = new Set(gameState?.player?.historicalContacts?.map(c => c.historical.name));
            const newPotentialContacts = potentialContacts.filter(p => !knownContactHistoricalNames.has(p.historical.name));

            if (newPotentialContacts.length > 0) {
                const randomContact = newPotentialContacts[Math.floor(Math.random() * newPotentialContacts.length)];
                console.log(`Historical encounter triggered for: ${randomContact.historical.name}`);
                setEncounter(randomContact);
            }
        }
    } catch (error) {
        console.error("Error triggering historical encounter:", error);
    }
  }, [gameState?.player?.historicalContacts]);

  // Combined data fetching hook
  useEffect(() => {
    const fetchContextualData = async (location: Position, era: GameEra) => {
        fetchWeatherForLocation(location);
        fetchLocationImage(location.name, era);
        fetchGeoIntelligence(location);
        fetchPoisForLocation(location);
        triggerHistoricalEncounter(location.name, era);
    };

    if (appMode === 'playing' && gameState?.player?.currentLocation && gameState.player.currentLocation.name !== UNKNOWN_STARTING_PLACE_NAME) {
      fetchContextualData(gameState.player.currentLocation, gameState.player.era);
    } else {
      // Clear data when not in playing mode or location is unknown
      setWeatherData(null);
      setLocationImageUrl(null);
      setGeoIntelligenceData(null);
      setGameState(prevState => prevState ? { ...prevState, nearbyPois: null } : null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appMode, gameState?.player?.currentLocation?.name, gameState?.player?.era]);
  
  const handleSaveGame = useCallback(async (saveType: 'manual' | 'auto' | 'checkpoint') => {
    if (!gameState || !user || !gameState.player || !selectedCharacterId) {
      if (saveType !== 'auto') toast({ title: "Erreur", description: "Aucun état de jeu à sauvegarder.", variant: "destructive" });
      return;
    }
    const result = await saveGameState(user.uid, selectedCharacterId, gameState, saveType);
    if (saveType === 'manual') {
        if (result.cloudSaveSuccess) toast({ title: "Partie Sauvegardée" });
        else if (result.cloudSaveSuccess === false) toast({ title: "Échec de la sauvegarde Cloud", variant: "destructive" });
        else if(result.localSaveSuccess) toast({ title: "Partie Sauvegardée (localement)" });
    }
  }, [gameState, user, selectedCharacterId, toast]);

  // Debounced Autosave Effect (saves after a period of inactivity)
  useEffect(() => {
    if (appMode !== 'playing' || !gameState) return;

    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);

    autosaveTimeoutRef.current = setTimeout(() => {
      handleSaveGame('auto');
    }, 5000); // 5 seconds after the last game state change

    return () => {
      if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    };
  }, [gameState, appMode, handleSaveGame]);

  // Checkpoint creation on main quest completion
  useEffect(() => {
    const previousPlayer = previousGameStateRef.current?.player;
    const currentPlayer = gameState?.player;

    if (previousPlayer && currentPlayer && Array.isArray(currentPlayer.questLog) && Array.isArray(previousPlayer.questLog)) {
        const completedMainQuests = currentPlayer.questLog.filter(currentQuest => {
            const prevQuest = previousPlayer.questLog.find(pq => pq.id === currentQuest.id);
            return prevQuest && 
                   prevQuest.status !== 'completed' && 
                   currentQuest.status === 'completed' && 
                   currentQuest.type === 'main';
        });

        if (completedMainQuests.length > 0) {
            const firstCompletedQuest = completedMainQuests[0];
            console.log(`Main quest completed: ${firstCompletedQuest.title}. Creating checkpoint...`);
            handleSaveGame('checkpoint');
            toast({ title: "Point de contrôle atteint", description: `"${firstCompletedQuest.title}" terminé. Progression sauvegardée.` });
        }
    }

    // Update the ref for the next render AFTER comparison
    previousGameStateRef.current = gameState;
  }, [gameState, handleSaveGame, toast]);

  // Fail-safe Autosave on Page Exit/Hide
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && appMode === 'playing' && gameState) {
        // Use a synchronous save if possible, or a last-ditch async save.
        // For this implementation, we'll just call the existing async save function.
        // Modern browsers often allow small async operations to complete.
        handleSaveGame('auto');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [appMode, gameState, handleSaveGame]);

  const fetchPoisForLocation = useCallback(async (location: Position) => {
    if (!location || !location.name || location.name === UNKNOWN_STARTING_PLACE_NAME) {
      setGameState(prevState => prevState ? { ...prevState, nearbyPois: null } : null);
      return;
    }
    try {
      const pois = await fetchPoisForCurrentLocation(location);
      handleGameAction({ type: 'SET_NEARBY_POIS', payload: pois });
    } catch (error) {
      console.error("Failed to fetch POIs:", error);
      toast({ variant: "destructive", title: "Erreur de réseau", description: "Impossible de charger les lieux d'intérêt proches." });
    }
  }, [toast, handleGameAction]);

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

  const handleSelectCharacterAndSave = useCallback(async (characterId: string, saveId: string) => {
    setAppMode('loading');
    const loadedState = await loadSpecificSave(user.uid, characterId, saveId);
    if (loadedState) {
      const hydratedPlayer = hydratePlayer(loadedState.player);
      setGameState({ ...loadedState, player: hydratedPlayer });
      setSelectedCharacterId(characterId);
      setAppMode('playing');
    } else {
      toast({ title: "Erreur de chargement", description: "Impossible de charger cette sauvegarde.", variant: "destructive" });
      fetchCharacterList(); // Refresh list in case of error
    }
  }, [user.uid, toast, fetchCharacterList]);

  const handleCharacterCreate = useCallback(async (playerData: FullCharacterFormData) => {
    setAppMode('loading');
    try {
      const locationData = await getPositionData(playerData.startingLocation);

      let hydratedPlayer = hydratePlayer({
          ...playerData, uid: user.uid, isAnonymous: user.isAnonymous,
      });
      hydratedPlayer.currentLocation = {
          latitude: locationData.latitude!,
          longitude: locationData.longitude!,
          name: locationData.name,
      };
       hydratedPlayer.startingLocationName = locationData.name;

      const tempStateForPrologue: GameState = {
        currentScenario: { scenarioText: "<p>Création du monde en cours...</p>" },
        player: hydratedPlayer, gameTimeInMinutes: 0, journal: [], nearbyPois: null, toneSettings: hydratedPlayer.toneSettings,
      };
      
      const aiInput = prepareAIInput(tempStateForPrologue, "[COMMENCER L'AVENTURE]");
      if (!aiInput) throw new Error("Could not prepare AI input for prologue.");

      const prologueResult = await generateScenario(aiInput);
      
      const finalGameState: GameState = {
        ...tempStateForPrologue,
        currentScenario: { scenarioText: prologueResult.scenarioText, suggestedActions: prologueResult.suggestedActions }
      };

      const newCharacterId = await createNewCharacter(user.uid, finalGameState);
      if (!newCharacterId) throw new Error("Failed to create character in Firestore.");

      setSelectedCharacterId(newCharacterId);
      setGameState(finalGameState);
      setAppMode('playing');

      toast({ title: "Personnage créé !", description: `${playerData.name} est prêt(e) pour l'aventure.` });

    } catch (error) {
      console.error("Error during character creation:", error);
      toast({ title: "Erreur de création", description: (error as Error).message || "Impossible de commencer l'aventure.", variant: "destructive" });
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
  
  const handleApproachContact = (contactToApproach: AdaptedContact) => {
    if (!gameState || !gameState.player) return;

    const newContact: HistoricalContact = {
        id: uuidv4(),
        historical: contactToApproach.historical,
        modern: contactToApproach.modern,
        metAt: {
            placeName: gameState.player.currentLocation.name,
            coordinates: {
                lat: gameState.player.currentLocation.latitude,
                lng: gameState.player.currentLocation.longitude
            },
            date: new Date().toISOString()
        },
        relationship: {
            trustLevel: 50, // Initial trust
            interactionCount: 1,
            lastInteraction: new Date().toISOString(),
        },
        knowledge: contactToApproach.knowledge,
    };

    const newJournalEntry: Omit<JournalEntry, 'id' | 'timestamp'> = {
        type: 'npc_interaction',
        text: `Vous avez abordé ${newContact.modern.name}, qui a un lien avec ${newContact.historical.name}.`,
        location: gameState.player.currentLocation,
    };

    handleGameAction({ type: 'ADD_HISTORICAL_CONTACT', payload: newContact });
    handleGameAction({ type: 'ADD_JOURNAL_ENTRY', payload: newJournalEntry });


    toast({
        title: "Nouvelle rencontre !",
        description: `${newContact.modern.name} a été ajouté à votre carnet de contacts.`,
    });

    setEncounter(null); // Close the modal
  };

  const handleIgnoreContact = () => {
      toast({
          title: "Occasion manquée...",
          description: "Vous décidez de ne pas aborder la personne. Qui sait ce que vous avez raté ?",
          duration: 4000
      });
      setEncounter(null); // Close the modal
  };

  const handleInitiateTravel = (destination: Position) => {
    if (!gameState?.player) return;
    if (destination.latitude === gameState.player.currentLocation.latitude && destination.longitude === gameState.player.currentLocation.longitude) {
        toast({ title: "Déjà sur place", description: "Vous êtes déjà à cette destination." });
        return;
    }
    setTravelDestination(destination);
  };

  const handleConfirmTravel = async (mode: 'walk' | 'metro' | 'taxi') => {
    if (!travelDestination || !gameState || !gameState.player) return;

    const origin = gameState.player.currentLocation;
    const distance = getDistanceInKm(origin.latitude, origin.longitude, travelDestination.latitude, travelDestination.longitude);
    
    let time = 0, cost = 0, energy = 0;
    if (mode === 'walk') {
        time = Math.round(distance * 12);
        energy = Math.round(distance * 5) + 1;
    } else if (mode === 'metro') {
        time = Math.round(distance * 4 + 10);
        cost = 1.90;
        energy = Math.round(distance * 1) + 1;
    } else { // taxi
        time = Math.round(distance * 2 + 5);
        cost = parseFloat((5 + distance * 1.5).toFixed(2));
        energy = Math.round(distance * 0.5);
    }

    if (gameState.player.money < cost) {
        toast({ variant: "destructive", title: "Fonds insuffisants", description: "Vous n'avez pas assez d'argent pour ce trajet." });
        return;
    }
    if (gameState.player.stats.Energie < energy) {
        toast({ variant: "destructive", title: "Trop fatigué", description: "Vous n'avez pas assez d'énergie pour ce trajet." });
        return;
    }
    
    setTravelDestination(null); // Close modal immediately

    const travelEventInput: GenerateScenarioInput = prepareAIInput(gameState, `Voyage vers ${travelDestination.name} en ${mode}`)!;
    const travelNarrative = (await generateTravelEvent({
      ...travelEventInput,
      travelMode: mode,
      origin: origin,
      destination: travelDestination,
      gameTimeInMinutes: gameState.gameTimeInMinutes,
    })).narrative;

    handleGameAction({
      type: 'EXECUTE_TRAVEL',
      payload: { destination: travelDestination, travelNarrative, time, cost, energy }
    });
  };

  if (appMode === 'loading') {
    return <LoadingState loadingAuth={false} isLoadingState={true} />;
  }
  
  if (appMode === 'selecting_character') {
    return (
      <CharacterSelectionScreen 
        characters={characterList}
        onSelectCharacterAndSave={handleSelectCharacterAndSave}
        onCreateNew={() => setAppMode('creating_character')}
        onDeleteCharacter={handleDeleteCharacter}
        isDeleting={isDeletingCharacter}
        user={user}
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
        gameTimeInMinutes={gameState?.gameTimeInMinutes || null}
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
        onPoiClick={handleInitiateTravel}
      />
      <ToneSettingsDialog
        isOpen={isToneSettingsDialogOpen}
        onOpenChange={setIsToneSettingsDialogOpen}
        currentSettings={gameState?.toneSettings || initialToneSettings}
        onSave={handleSaveToneSettings}
      />
       <HistoricalEncounterModal 
            encounter={encounter}
            onApproach={handleApproachContact}
            onIgnore={handleIgnoreContact}
        />
       {travelDestination && gameState?.player && (
          <TravelModal
            isOpen={!!travelDestination}
            onClose={() => setTravelDestination(null)}
            origin={gameState.player.currentLocation}
            destination={travelDestination}
            onConfirmTravel={handleConfirmTravel}
            playerMoney={gameState.player.money}
            playerEnergy={gameState.player.stats.Energie}
          />
        )}
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
          onPoiClick={handleInitiateTravel}
          handleGameAction={handleGameAction}
        />
      </div>
    </div>
  );
};

export default AuthenticatedAppView;
