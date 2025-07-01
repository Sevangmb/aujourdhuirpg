
"use client";

import React, { createContext, useContext, useReducer, useEffect, useState, useCallback, useRef } from 'react';
import type { User } from 'firebase/auth';
import type { GameState, GameAction, Position, GeoIntelligence, StoryChoice, GameEvent, Quest, PNJ, IntelligentItem, EnrichedObject, EnhancedPOI } from '@/lib/types';
import type { AdaptedContact, HistoricalContact } from '@/modules/historical/types';
import type { Enemy } from '@/modules/combat/types';
import type { WeatherData } from '@/app/actions/get-current-weather';
import { gameReducer, prepareAIInput } from '@/lib/game-logic';
import { saveGameState } from '@/lib/game-state-persistence';
import { useToast } from '@/hooks/use-toast';

import { getCurrentWeather } from '@/app/actions/get-current-weather';
import { generateLocationImage as generateLocationImageService } from '@/ai/flows/generate-location-image-flow';
import { generateGeoIntelligence } from '@/ai/flows/generate-geo-intelligence-flow';
import { findAndAdaptHistoricalContactsForLocation } from '@/modules/historical/service';
import { generateTravelEvent } from '@/ai/flows/generate-travel-event-flow';
import { generateScenario, type GenerateScenarioOutput } from '@/ai/flows/generate-scenario';
import { getDistanceInKm } from '@/lib/utils/geo-utils';
import { v4 as uuidv4 } from 'uuid';

import { HistoricalEncounterModal } from '@/components/HistoricalEncounterModal';
import { TravelModal } from '@/components/TravelModal';
import { objectCascadeManager } from '@/core/objects/object-cascade-manager';
import { fetchTopHeadlines } from '@/data-sources/news/news-api';
import { NewsQuestGenerator } from '@/modules/news/news-quest-generator';
import { fetchNearbyPoisFromOSM } from '@/data-sources/establishments/overpass-api';


// Helper types for managing async data
type AsyncData<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

interface GameContextData {
  weather: AsyncData<WeatherData>;
  locationImage: { url: string | null; loading: boolean; error: string | null };
  geoIntelligence: AsyncData<GeoIntelligence>;
  pois: AsyncData<EnhancedPOI[]>;
}

interface GameContextType {
  gameState: GameState & { contextualData: GameContextData };
  dispatch: React.Dispatch<GameAction>;
  isGameActive: boolean;
  isLoading: boolean;
  user: User;

  handleManualSave: () => void;
  handleExitToSelection: () => void;
  handleSignOut: () => void;
  handleInitiateTravel: (destination: Position) => void;
  handleExamineItem: (instanceId: string) => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const initialContextualData: GameContextData = {
    weather: { data: null, loading: false, error: null },
    locationImage: { url: null, loading: false, error: null },
    geoIntelligence: { data: null, loading: false, error: null },
    pois: { data: null, loading: false, error: null },
}

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
  const [contextualData, setContextualData] = useState<GameContextData>(initialContextualData);
  
  // --- MODAL AND INTERACTION STATE ---
  const [encounter, setEncounter] = useState<AdaptedContact | null>(null);
  const [travelDestination, setTravelDestination] = useState<Position | null>(null);
  const [isLoading, setIsLoading] = useState(false); // Generic loading state for async context actions

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

    setContextualData(s => ({ ...s, weather: { ...s.weather, loading: true } }));
    getCurrentWeather(location.latitude, location.longitude).then(data => {
      if ('error' in data) setContextualData(s => ({ ...s, weather: { data: null, loading: false, error: data.error }}));
      else setContextualData(s => ({ ...s, weather: { data, loading: false, error: null }}));
    });

    setContextualData(s => ({ ...s, locationImage: { ...s.locationImage, loading: true } }));
    generateLocationImageService({ placeName: location.name, era }).then(result => {
      setContextualData(s => ({ ...s, locationImage: { url: result.imageUrl, loading: false, error: result.error || null }}));
    });

    setContextualData(s => ({ ...s, geoIntelligence: { ...s.geoIntelligence, loading: true } }));
    generateGeoIntelligence({ placeName: location.name, latitude: location.latitude, longitude: location.longitude }).then(result => {
        if (result) setContextualData(s => ({ ...s, geoIntelligence: { data: result, loading: false, error: null } }));
        else setContextualData(s => ({ ...s, geoIntelligence: { data: null, loading: false, error: "L'IA n'a pas pu analyser ce lieu." } }));
    }).catch(e => setContextualData(s => ({ ...s, geoIntelligence: { data: null, loading: false, error: (e as Error).message } })));

    setContextualData(s => ({...s, pois: {...s.pois, loading: true}}));
    fetchNearbyPoisFromOSM({
        latitude: location.latitude,
        longitude: location.longitude,
        radius: 500,
        limit: 15,
    }).then(data => {
        setContextualData(s => ({ ...s, pois: { data, loading: false, error: null }}));
        dispatch({ type: 'SET_NEARBY_POIS', payload: data });
    }).catch(e => setContextualData(s => ({ ...s, pois: { data: null, loading: false, error: (e as Error).message } })));

    if (Math.random() > 0.15) return;
    findAndAdaptHistoricalContactsForLocation(location.name, era).then(potentialContacts => {
        const knownContactNames = new Set(gameState.player?.historicalContacts?.map(c => c.historical.name));
        const newContacts = potentialContacts.filter(c => !knownContactNames.has(c.historical.name));
        if (newContacts.length > 0) {
            setEncounter(newContacts[Math.floor(Math.random() * newContacts.length)]);
        }
    });

  }, [gameState.player?.currentLocation.name, gameState.player?.era]);
  
  // --- NEWS QUEST GENERATION LOGIC ---
  const lastCheckedDay = useRef(0);
  const generateAndAddNewQuests = useCallback(async () => {
    if (!gameState?.player) return;

    try {
        const newsData = await fetchTopHeadlines({ country: 'fr', category: 'general', pageSize: 10 });
        if (newsData.status !== 'ok' || newsData.articles.length === 0) return;

        const generator = new NewsQuestGenerator();
        const questPromises = newsData.articles.map(article => generator.generateQuestFromNews(article));
        const potentialQuests = (await Promise.all(questPromises)).filter((q): q is Omit<Quest, 'id' | 'dateAdded'> => q !== null);

        if (potentialQuests.length > 0) {
            const existingQuestTitles = new Set(gameState.player.questLog.map(q => q.title));
            const newQuests = potentialQuests.filter(q => !existingQuestTitles.has(q.title));

            if (newQuests.length > 0) {
                 const events: GameEvent[] = newQuests.map(quest => ({
                    type: 'QUEST_ADDED',
                    quest: quest
                }));

                events.push({
                    type: 'JOURNAL_ENTRY_ADDED',
                    payload: {
                        type: 'event',
                        text: `En lisant les nouvelles du matin, plusieurs pistes intéressantes ont attiré votre attention. (Nouvelles quêtes disponibles dans votre journal)`
                    }
                });

                dispatch({ type: 'APPLY_GAME_EVENTS', payload: events });
                toast({ title: "Nouvelles Pistes", description: "De nouvelles quêtes basées sur l'actualité ont été ajoutées à votre journal." });
            }
        }
    } catch (error) {
        console.error("Error generating news quests:", error);
    }
  }, [gameState?.player, toast]);

  useEffect(() => {
    if (!gameState?.player) return;
    const currentDay = Math.floor(gameState.gameTimeInMinutes / 1440);
    if (currentDay > lastCheckedDay.current) {
        lastCheckedDay.current = currentDay;
        generateAndAddNewQuests();
    }
  }, [gameState?.gameTimeInMinutes, gameState?.player, generateAndAddNewQuests]);

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
    setIsLoading(true);
    setTravelDestination(null);
  
    try {
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
      if (gameState.player.stats.Energie.value < energy) {
          toast({ variant: "destructive", title: "Trop fatigué" }); return;
      }
      
      const travelNarrative = (await generateTravelEvent({
        travelMode: mode, origin, destination: travelDestination,
        gameTimeInMinutes: gameState.gameTimeInMinutes,
        playerStats: gameState.player.stats,
        playerSkills: gameState.player.skills,
      })).narrative;
  
      const travelEvents: GameEvent[] = [
          { type: 'PLAYER_TRAVELS', from: origin.name, destination: travelDestination, mode, duration: time },
          { type: 'PLAYER_STAT_CHANGE', stat: 'Energie', change: -energy, finalValue: gameState.player.stats.Energie.value - energy },
          { type: 'JOURNAL_ENTRY_ADDED', payload: { type: 'location_change', text: `Voyage vers ${travelDestination.name} en ${mode}.` } },
      ];
      if (cost > 0) {
          travelEvents.push({ type: 'MONEY_CHANGED', amount: -cost, finalBalance: gameState.player.money - cost, description: `Transport en ${mode} vers ${travelDestination.name}` });
      }
      if (travelNarrative) {
          travelEvents.push({ type: 'TRAVEL_EVENT', narrative: travelNarrative });
      }
      
      const stateAfterTravel = gameReducer(gameState, { type: 'APPLY_GAME_EVENTS', payload: travelEvents });
      
      const arrivalChoice = { text: `[Arrivée à ${travelDestination.name}]` } as StoryChoice;
      const aiInput = prepareAIInput(stateAfterTravel, arrivalChoice, travelEvents);
      if (!aiInput) throw new Error("Could not prepare AI input for arrival.");
  
      const arrivalScenario = await generateScenario(aiInput);
      
      dispatch({ type: 'APPLY_GAME_EVENTS', payload: travelEvents });
      dispatch({ type: 'SET_CURRENT_SCENARIO', payload: arrivalScenario });
  
    } catch (error) {
        let errorMessage = "Le voyage a été interrompu par une erreur inattendue.";
        if (error instanceof Error) { errorMessage += ` Détail: ${error.message}`; }
        toast({ variant: "destructive", title: "Erreur de Voyage", description: errorMessage });
    } finally {
        setIsLoading(false);
    }
  };
  
  
  const handleApproachContact = (contactToApproach: AdaptedContact) => {
    if (!gameState?.player) return;
    
    const events: GameEvent[] = [];

    const pnjData: Omit<PNJ, 'id' | 'firstEncountered' | 'lastSeen'> = {
      name: contactToApproach.modern.name,
      description: contactToApproach.modern.profession,
      relationStatus: 'neutral',
      importance: 'minor',
      dispositionScore: 50,
      interactionHistory: [contactToApproach.modern.greeting],
      notes: [],
      trustLevel: 50,
    };
    events.push({ type: 'PNJ_ENCOUNTERED', pnj: pnjData });

    const historicalContactData: HistoricalContact = {
        id: uuidv4(),
        historical: contactToApproach.historical,
        modern: contactToApproach.modern,
        metAt: { 
            placeName: gameState.player.currentLocation.name, 
            coordinates: { lat: gameState.player.currentLocation.latitude, lng: gameState.player.currentLocation.longitude }, 
            date: new Date().toISOString() 
        },
        relationship: { trustLevel: 50, interactionCount: 1, lastInteraction: new Date().toISOString() },
        knowledge: contactToApproach.knowledge,
    };
    events.push({ type: 'HISTORICAL_CONTACT_ADDED', payload: historicalContactData });
    
    events.push({ type: 'JOURNAL_ENTRY_ADDED', payload: { type: 'npc_interaction', text: `Rencontre avec ${contactToApproach.modern.name}.` }});
    
    dispatch({ type: 'APPLY_GAME_EVENTS', payload: events });

    toast({ title: "Nouvelle rencontre !", description: `${contactToApproach.modern.name} ajouté(e) à vos contacts.` });
    setEncounter(null);
  };

  const handleIgnoreContact = () => {
    toast({ title: "Occasion manquée...", duration: 4000 });
    setEncounter(null);
  };
  
  const handleExamineItem = async (instanceId: string) => {
    if (!gameState.player) return;

    const itemToExamine = gameState.player.inventory.find(i => i.instanceId === instanceId);
    if (!itemToExamine) {
        toast({ variant: 'destructive', title: 'Erreur', description: "L'objet n'a pas été trouvé dans votre inventaire." });
        return;
    }

    try {
        setIsLoading(true);
        toast({ title: 'Analyse en cours...', description: `Examen de ${itemToExamine.name}...` });

        const enrichedObject = await objectCascadeManager.enrichObject(
            itemToExamine,
            { player: gameState.player }
        );

        dispatch({
            type: 'UPDATE_INVENTORY_ITEM',
            payload: { instanceId, enrichedObject }
        });

        toast({ title: 'Analyse terminée !', description: `${itemToExamine.name} a révélé ses secrets.` });

    } catch (error) {
        console.error("Error during object enrichment:", error);
        toast({ variant: 'destructive', title: "Erreur d'analyse", description: `Impossible d'examiner l'objet.` });
    } finally {
        setIsLoading(false);
    }
  };


  const value: GameContextType = {
    gameState: { ...gameState, contextualData },
    dispatch,
    isGameActive: !!gameState?.player,
    isLoading,
    user,
    handleManualSave: () => handleSaveGame('manual'),
    handleExitToSelection: onExitToSelection,
    handleSignOut: onSignOut,
    handleInitiateTravel,
    handleExamineItem,
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
          playerEnergy={gameState.player.stats.Energie.value}
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
