"use client";

import React, { createContext, useContext, useReducer, useEffect, useState, useCallback, useRef } from 'react';
import type { User } from 'firebase/auth';
import type { GameState, GameAction, Position, GeoIntelligence, HistoricalContact, AdaptedContact, StoryChoice } from '@/lib/types';
import type { WeatherData } from '@/app/actions/get-current-weather';
import { gameReducer, fetchPoisForCurrentLocation } from '@/lib/game-logic';
import { saveGameState } from '@/lib/game-state-persistence';
import { useToast } from '@/hooks/use-toast';

import { getCurrentWeather } from '@/app/actions/get-current-weather';
import { generateLocationImage as generateLocationImageService } from '@/ai/flows/generate-location-image-flow';
import { generateGeoIntelligence } from '@/ai/flows/generate-geo-intelligence-flow';
import { findAndAdaptHistoricalContactsForLocation } from '@/services/historical-contact-service';
import { generateTravelEvent } from '@/ai/flows/generate-travel-event-flow';
import { getDistanceInKm } from '@/lib/utils/geo-utils';
import { v4 as uuidv4 } from 'uuid';

import { HistoricalEncounterModal } from '@/components/HistoricalEncounterModal';
import { TravelModal } from '@/components/TravelModal';

// Helper types for managing async data
type AsyncData<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

interface GameContextType {
  gameState: GameState;
  dispatch: React.Dispatch<GameAction>;
  isGameActive: boolean;
  user: User;
  
  contextualData: {
    weather: AsyncData<WeatherData>;
    locationImage: { url: string | null; loading: boolean; error: string | null };
    geoIntelligence: AsyncData<GeoIntelligence>;
    pois: AsyncData<Position[]>;
  };

  handleManualSave: () => void;
  handleExitToSelection: () => void;
  handleSignOut: () => void;
  handleInitiateTravel: (destination: Position) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{
  children: React.ReactNode;
  initialGameState: GameState;
  user: User;
  characterId: string;
  onExitToSelection: () => void;
  onSignOut: () => void;
}> = ({ children, initialGameState, user, characterId, onExitToSelection, onSignOut }) => {
  const [gameState, dispatch] = useReducer(gameReducer, initialGameState);
  const { toast } = useToast();
  
  // --- CONTEXTUAL DATA STATE ---
  const [weather, setWeather] = useState<AsyncData<WeatherData>>({ data: null, loading: false, error: null });
  const [locationImage, setLocationImage] = useState({ url: null, loading: false, error: null });
  const [geoIntelligence, setGeoIntelligence] = useState<AsyncData<GeoIntelligence>>({ data: null, loading: false, error: null });
  const [pois, setPois] = useState<AsyncData<Position[]>>({ data: null, loading: false, error: null });
  
  // --- MODAL AND INTERACTION STATE ---
  const [encounter, setEncounter] = useState<AdaptedContact | null>(null);
  const [travelDestination, setTravelDestination] = useState<Position | null>(null);

  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleSaveGame = useCallback(async (saveType: 'manual' | 'auto' | 'checkpoint') => {
    if (!gameState || !user || !gameState.player || !characterId) {
      if (saveType !== 'auto') toast({ title: "Erreur", description: "Aucun état de jeu à sauvegarder.", variant: "destructive" });
      return;
    }
    const result = await saveGameState(user.uid, characterId, gameState, saveType);
    if (saveType === 'manual') {
        if (result.cloudSaveSuccess) toast({ title: "Partie Sauvegardée" });
        else if (result.cloudSaveSuccess === false) toast({ title: "Échec de la sauvegarde Cloud", variant: "destructive" });
        else if(result.localSaveSuccess) toast({ title: "Partie Sauvegardée (localement)" });
    }
  }, [gameState, user, characterId, toast]);

  // --- SAVE LOGIC ---
  useEffect(() => {
    if (!gameState) return;
    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    autosaveTimeoutRef.current = setTimeout(() => { handleSaveGame('auto'); }, 5000);
    return () => { if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current); };
  }, [gameState, handleSaveGame]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && gameState) {
        handleSaveGame('auto');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [gameState, handleSaveGame]);
  
  // --- DATA FETCHING LOGIC ---
  useEffect(() => {
    const location = gameState.player?.currentLocation;
    const era = gameState.player?.era;
    if (!location || !era) return;

    // Weather
    setWeather(s => ({ ...s, loading: true }));
    getCurrentWeather(location.latitude, location.longitude).then(data => {
      if ('error' in data) setWeather({ data: null, loading: false, error: data.error });
      else setWeather({ data, loading: false, error: null });
    });

    // Location Image
    setLocationImage(s => ({ ...s, loading: true }));
    generateLocationImageService({ placeName: location.name, era }).then(result => {
      setLocationImage({ url: result.imageUrl, loading: false, error: result.error || null });
    });

    // Geo-intelligence
    setGeoIntelligence(s => ({ ...s, loading: true }));
    generateGeoIntelligence({ placeName: location.name, latitude: location.latitude, longitude: location.longitude }).then(result => {
        if (result) setGeoIntelligence({ data: result, loading: false, error: null });
        else setGeoIntelligence({ data: null, loading: false, error: "L'IA n'a pas pu analyser ce lieu."});
    }).catch(e => setGeoIntelligence({data: null, loading: false, error: (e as Error).message}));

    // POIs
    setPois(s => ({...s, loading: true}));
    fetchPoisForCurrentLocation(location).then(data => {
        setPois({ data, loading: false, error: null });
        dispatch({ type: 'SET_NEARBY_POIS', payload: data });
    }).catch(e => setPois({ data: null, loading: false, error: (e as Error).message }));

    // Historical Encounter
    if (Math.random() > 0.15) return;
    findAndAdaptHistoricalContactsForLocation(location.name, era).then(potentialContacts => {
        const knownContactNames = new Set(gameState.player?.historicalContacts?.map(c => c.historical.name));
        const newContacts = potentialContacts.filter(c => !knownContactNames.has(c.historical.name));
        if (newContacts.length > 0) {
            setEncounter(newContacts[Math.floor(Math.random() * newContacts.length)]);
        }
    });

  }, [gameState.player?.currentLocation.name, gameState.player?.era]);
  
  // --- ACTION HANDLERS ---
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
        toast({ variant: "destructive", title: "Fonds insuffisants" }); return;
    }
    if (gameState.player.stats.Energie < energy) {
        toast({ variant: "destructive", title: "Trop fatigué" }); return;
    }
    
    setTravelDestination(null);

    const travelNarrative = (await generateTravelEvent({
      travelMode: mode, origin, destination,
      gameTimeInMinutes: gameState.gameTimeInMinutes,
      playerStats: gameState.player.stats,
      playerSkills: gameState.player.skills,
    })).narrative;

    dispatch({ type: 'EXECUTE_TRAVEL', payload: { destination, travelNarrative, time, cost, energy } });
  };
  
  const handleApproachContact = (contactToApproach: AdaptedContact) => {
    if (!gameState?.player) return;
    const { player } = gameState;
    const newContact: HistoricalContact = {
        id: uuidv4(),
        historical: contactToApproach.historical,
        modern: contactToApproach.modern,
        metAt: {
            placeName: player.currentLocation.name,
            coordinates: { lat: player.currentLocation.latitude, lng: player.currentLocation.longitude },
            date: new Date().toISOString()
        },
        relationship: { trustLevel: 50, interactionCount: 1, lastInteraction: new Date().toISOString() },
        knowledge: contactToApproach.knowledge,
    };
    dispatch({ type: 'ADD_HISTORICAL_CONTACT', payload: newContact });
    dispatch({ type: 'ADD_JOURNAL_ENTRY', payload: { type: 'npc_interaction', text: `Rencontre avec ${newContact.modern.name}.` }});
    toast({ title: "Nouvelle rencontre !", description: `${newContact.modern.name} ajouté(e) à vos contacts.` });
    setEncounter(null);
  };

  const handleIgnoreContact = () => {
    toast({ title: "Occasion manquée...", duration: 4000 });
    setEncounter(null);
  };


  const value: GameContextType = {
    gameState,
    dispatch,
    isGameActive: !!gameState?.player,
    user,
    contextualData: { weather, locationImage, geoIntelligence, pois },
    handleManualSave: () => handleSaveGame('manual'),
    handleExitToSelection: onExitToSelection,
    handleSignOut: onSignOut,
    handleInitiateTravel,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
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
    </GameContext.Provider>
  );
};

export const useGame = (): GameContextType => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
