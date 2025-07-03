
"use client";

import React, { createContext, useContext, useReducer, useEffect, useState, useCallback, useRef } from 'react';
import type { User } from 'firebase/auth';
import type { GameState, GameAction, Position, GeoIntelligence, StoryChoice, GameEvent, Quest, PNJ, IntelligentItem, EnrichedObject, EnhancedPOI, Clue, GameDocument, CombatResult, Enemy, EnemyTemplate } from '@/lib/types';
import type { AdaptedContact } from '@/modules/historical/types';
import type { WeatherData } from '@/app/actions/get-current-weather';
import { gameReducer, enrichAIChoicesWithLogic } from '@/lib/game-logic';
import { saveGameState } from '@/lib/game-state-persistence';
import { useToast } from '@/hooks/use-toast';

import { getCurrentWeather } from '@/app/actions/get-current-weather';
import { generateLocationImage as generateLocationImageService } from '@/ai/flows/generate-location-image-flow';
import { generateGeoIntelligence } from '@/ai/flows/generate-geo-intelligence-flow';
import { findAndAdaptHistoricalContactsForLocation } from '@/modules/historical/service';
import { generateScenario } from '@/ai/flows/generate-scenario';
import { v4 as uuidv4 } from 'uuid';

import { HistoricalEncounterModal } from '@/components/HistoricalEncounterModal';
import { TravelModal } from '@/components/TravelModal';
import { objectCascadeManager } from '@/core/objects/object-cascade-manager';
import { fetchTopHeadlines } from '@/data-sources/news/news-api';
import { NewsQuestGenerator } from '@/modules/news/news-quest-generator';
import { fetchNearbyPoisFromOSM } from '@/data-sources/establishments/overpass-api';
import { CascadeOrchestrator } from '@/core/cascade/cascade-orchestrator';

// Helper types for managing async data
type AsyncData<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

export interface GameContextData {
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
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  user: User;

  // Combat State & Handlers
  isCombatActive: boolean;
  combatEnemies: Enemy[];
  setIsCombatActive: React.Dispatch<React.SetStateAction<boolean>>;
  handleCombatEnd: (result: CombatResult) => void;

  handleManualSave: () => void;
  handleExitToSelection: () => void;
  handleSignOut: () => void;
  handleInitiateTravel: (destination: Position) => void;
  handleUpdateInvestigationNotes: (newSummary: string) => void;
  handleExamineItem: (instanceId: string) => Promise<void>;
  handleChoiceSelected: (choice: StoryChoice) => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const initialContextualData: GameContextData = {
    weather: { data: null, loading: false, error: null },
    locationImage: { url: null, loading: false, error: null },
    geoIntelligence: { data: null, loading: false, error: null },
    pois: { data: null, loading: false, error: null },
}

// Singleton instance of the orchestrator
const orchestrator = new CascadeOrchestrator();

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
  const [isCombatActive, setIsCombatActive] = useState(false);
  const [combatEnemies, setCombatEnemies] = useState<Enemy[]>([]);

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
    generateLocationImageService({ placeName: location.name, era: era }).then(result => {
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

    if (Math.random() > 0.85) { // Reduced chance to avoid being too spammy
        findAndAdaptHistoricalContactsForLocation(location.name, era).then(potentialContacts => {
            const knownContactNames = new Set(gameState.player?.historicalContacts?.map(c => c.historical.name));
            const newContacts = potentialContacts.filter(c => !knownContactNames.has(c.historical.name));
            if (newContacts.length > 0) {
                setEncounter(newContacts[Math.floor(Math.random() * newContacts.length)]);
            }
        });
    }

  }, [gameState.player?.currentLocation.name, gameState.player?.era]);
  
  // --- NEWS QUEST GENERATION LOGIC ---
  const lastCheckedDay = useRef(Math.floor((gameState?.gameTimeInMinutes || 0) / 1440));
  const generateAndAddNewQuests = useCallback(async () => {
    if (!gameState?.player) return;

    try {
        const newsData = await fetchTopHeadlines({ country: 'fr', category: 'general', pageSize: 10 });
        if (newsData.status !== 'ok' || !newsData.articles || newsData.articles.length === 0) return;

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
                        text: `En lisant les nouvelles du matin, plusieurs pistes intéressantes ont attiré votre attention.`
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

  const handleChoiceSelected = useCallback(async (choice: StoryChoice) => {
    if (isLoading || !gameState || !gameState.player) return;
    setIsLoading(true);
  
    try {
      // The orchestrator now handles all deterministic logic and context prep
      const { gameLogicResult, aiContext } = await orchestrator.processPlayerAction(gameState, contextualData, choice);
  
      // The context then calls the primary AI flow
      const aiOutput = await generateScenario(aiContext);
      
      // Convert AI proposals into game events
      const aiGeneratedEvents = orchestrator.aiContextPreparer.convertAIOutputToEvents(aiOutput);
  
      // Combine all events and apply them to get the state as the AI *should* see it for choice enrichment
      const allEvents = [...gameLogicResult.gameEvents, ...aiGeneratedEvents];
      const finalStateForTurn = gameReducer(gameState, { type: 'APPLY_GAME_EVENTS', payload: allEvents });

      // Enrich AI choices with calculated logic (success chance, etc.) based on the final state of the turn
      const enrichedAIChoices = enrichAIChoicesWithLogic(aiOutput.choices || [], finalStateForTurn.player!);

      // Dispatch final events and the new scenario from the AI to update the UI
      dispatch({ type: 'APPLY_GAME_EVENTS', payload: allEvents });
      dispatch({ 
        type: 'SET_CURRENT_SCENARIO', 
        payload: { 
          scenarioText: aiOutput.scenarioText, 
          choices: enrichedAIChoices, 
          aiRecommendation: aiOutput.aiRecommendation 
        }
      });
      
      // Handle combat start if the AI triggered it
      if (aiOutput.startCombat && aiOutput.startCombat.length > 0) {
        const enemiesToFight: Enemy[] = aiOutput.startCombat.map((template: EnemyTemplate) => ({
            ...template,
            instanceId: uuidv4(),
            currentStats: {
                health: Math.floor(template.baseStats.Constitution * 1.5),
                maxHealth: Math.floor(template.baseStats.Constitution * 1.5),
                stamina: 100,
                maxStamina: 100,
                armor: template.naturalArmor.defense,
                position: 'melee',
                stance: 'aggressive',
                statusEffects: [],
            },
            ai_state: {
                lastAction: null,
                target_priority: 'player',
                turns_since_special: 0
            }
        }));
        setCombatEnemies(enemiesToFight);
        setIsCombatActive(true);
      }
      
    } catch (error) {
      let errorMessage = "Impossible de générer le prochain scénario.";
      if (error instanceof Error) { errorMessage += ` Détail: ${error.message}`; }
      console.error("Error in handleChoiceSelected:", error);
      toast({ variant: "destructive", title: "Erreur de Connexion avec l'IA", description: errorMessage });
    } finally {
        setIsLoading(false);
    }
  }, [gameState, contextualData, toast, isLoading]);

  // --- ACTION HANDLERS ---
  const handleInitiateTravel = (destination: Position) => {
    if (!gameState?.player) return;
    if (destination.latitude === gameState.player.currentLocation.latitude && destination.longitude === gameState.player.currentLocation.longitude) {
        toast({ title: "Déjà sur place", description: "Vous êtes déjà à cette destination." });
        return;
    }
    setTravelDestination(destination);
  };
  
  const handleConfirmTravel = (mode: 'walk' | 'metro' | 'taxi') => {
    if (!travelDestination || !gameState || !gameState.player) return;
    
    const travelChoice: StoryChoice = {
        id: `travel_${travelDestination.name.replace(/\s+/g, '_')}`,
        text: `Voyager vers ${travelDestination.name} en ${mode}.`,
        description: `Choisir de se rendre à ${travelDestination.name}.`,
        type: 'action',
        iconName: 'Compass',
        mood: 'adventurous',
        energyCost: 0, 
        timeCost: 0,   
        consequences: ['Changement de lieu'],
        travelChoiceInfo: {
            destination: travelDestination,
            mode: mode
        }
    };

    setTravelDestination(null);
    handleChoiceSelected(travelChoice);
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

    const historicalContactData = {
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
    toast({ title: "Occasion manquée...", duration: 2000 });
    setEncounter(null);
  };
  
  const handleExamineItem = async (instanceId: string) => {
      setIsLoading(true);
      try {
        const itemToExamine = gameState.player?.inventory.find(i => i.instanceId === instanceId);
        if (!itemToExamine || !gameState.player) throw new Error("Item not found or player state missing.");
        
        toast({ title: 'Analyse en cours...', description: `Examen de ${itemToExamine.name}...`});

        const enrichedObject = await objectCascadeManager.enrichObject(
            itemToExamine,
            { player: gameState.player }
        );

        dispatch({
            type: 'UPDATE_INVENTORY_ITEM',
            payload: { instanceId, enrichedObject }
        });
        toast({ title: 'Analyse terminée !', description: `${itemToExamine.name} a révélé de nouveaux détails.` });

    } catch (error) {
        console.error("Error during object enrichment in context:", error);
        toast({ variant: 'destructive', title: "Erreur d'analyse", description: `Impossible d'examiner l'objet.` });
    } finally {
        setIsLoading(false);
    }
  };

  const handleUpdateInvestigationNotes = (newSummary: string) => {
    dispatch({ type: 'UPDATE_PLAYER_DATA', payload: { investigationNotes: newSummary } });
  };
  
  const handleCombatEnd = (result: CombatResult) => {
    const events: GameEvent[] = [];
    if (result.outcome === 'victory') {
        events.push({ type: 'XP_GAINED', amount: result.rewards.xp });
        events.push({ type: 'MONEY_CHANGED', amount: result.rewards.money, description: "Butin de combat" });
        result.rewards.items.forEach(itemId => {
            const masterItem = getMasterItemById(itemId);
            events.push({ type: 'ITEM_ADDED', itemId: itemId, itemName: masterItem?.name || itemId, quantity: 1 });
        });
        events.push({ type: 'JOURNAL_ENTRY_ADDED', payload: { type: 'event', text: 'Vous avez remporté la victoire !' }});
    } else if (result.outcome === 'defeat') {
        events.push({ type: 'TEXT_EVENT', text: "Vous avez été vaincu..." });
    } else if (result.outcome === 'flee') {
         events.push({ type: 'TEXT_EVENT', text: "Vous avez réussi à fuir." });
    }
    dispatch({ type: 'APPLY_GAME_EVENTS', payload: events });
    setIsCombatActive(false);
    setCombatEnemies([]);
  };


  const value: GameContextType = {
    gameState: { ...gameState, contextualData },
    dispatch,
    isGameActive: !!gameState?.player,
    isLoading,
    setIsLoading,
    user,
    isCombatActive,
    combatEnemies,
    setIsCombatActive,
    handleCombatEnd,
    handleManualSave: () => handleSaveGame('manual'),
    handleExitToSelection: onExitToSelection,
    handleSignOut: onSignOut,
    handleInitiateTravel,
    handleUpdateInvestigationNotes,
    handleExamineItem,
    handleChoiceSelected,
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
          player={gameState.player}
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
