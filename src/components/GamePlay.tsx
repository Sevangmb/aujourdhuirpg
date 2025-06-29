
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { GameState, GameNotification, Quest, PNJ, JournalEntry, Transaction } from '@/lib/types';
import { gameReducer, GameAction, calculateDeterministicEffects, prepareAIInput } from '@/lib/game-logic';
import ScenarioDisplay from './ScenarioDisplay';
import { generateScenario, type GenerateScenarioInput, type GenerateScenarioOutput } from '@/ai/flows/generate-scenario';
import { getInitialScenario } from '@/lib/game-logic';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';
import type { WeatherData } from '@/app/actions/get-current-weather';
import MapDisplay from './MapDisplay';
import WeatherDisplay from './WeatherDisplay';
import LocationImageDisplay from './LocationImageDisplay';
import PlayerInputForm from './PlayerInputForm';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { UNKNOWN_STARTING_PLACE_NAME } from '@/data/initial-game-data';
import { getMasterItemById } from '@/data/items';
import { Skeleton } from './ui/skeleton';


interface GamePlayProps {
  initialGameState: GameState;
  onStateUpdate: (newState: GameState | ((prevState: GameState | null) => GameState | null)) => void;
  weatherData: WeatherData | null;
  weatherLoading: boolean;
  weatherError: string | null;
  locationImageUrl: string | null;
  locationImageLoading: boolean;
  locationImageError: string | null;
}

const GamePlay: React.FC<GamePlayProps> = ({
  initialGameState,
  onStateUpdate,
  weatherData,
  weatherLoading,
  weatherError,
  locationImageUrl,
  locationImageLoading,
  locationImageError,
}) => {

  const [playerInput, setPlayerInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedActions, setSuggestedActions] = useState<string[]>([]);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (initialGameState.player && !initialGameState.currentScenario) {
      const firstScenario = getInitialScenario(initialGameState.player);
      onStateUpdate(gameReducer(initialGameState, { type: 'SET_CURRENT_SCENARIO', payload: firstScenario }));
    }
  }, [initialGameState, onStateUpdate]);

  const handleGameAction = useCallback((action: GameAction) => {
    onStateUpdate(prevState => {
      if (!prevState) return null;
      const newState = gameReducer(prevState, action);
      // Save is handled by the main view's autosave effect
      return newState;
    });
  }, [onStateUpdate]);
  

  const handlePlayerActionSubmit = useCallback(async (actionText: string) => {
    const { player, currentScenario, gameTimeInMinutes } = initialGameState;
    if (!player || !currentScenario || !actionText.trim()) {
      if (!actionText.trim()) toast({ variant: "destructive", title: "Action vide", description: "Veuillez entrer une action." });
      return;
    }
    setIsLoading(true);
    setSuggestedActions([]);

    try {
      const { updatedPlayer, notifications: deterministicNotifications, eventsForAI } = await calculateDeterministicEffects(player, actionText);
      deterministicNotifications.forEach(notification => toast({ title: notification.title, description: notification.description, duration: 3000 }));

      const tempGameStateForAI: GameState = {
          ...initialGameState,
          player: updatedPlayer,
          currentScenario: currentScenario,
      };

      const inputForAI = prepareAIInput(tempGameStateForAI, actionText, eventsForAI);
      if (!inputForAI) throw new Error("Failed to prepare AI input.");

      const aiOutput: GenerateScenarioOutput = await generateScenario(inputForAI);

      setSuggestedActions(aiOutput.suggestedActions || []);

      // Collect all state updates and notifications from AI output
      const aiActions: GameAction[] = [];
      const aiNotifications: GameNotification[] = [];

      if (aiOutput.newQuests) {
        aiOutput.newQuests.forEach(quest => {
          aiActions.push({ type: 'ADD_QUEST', payload: quest as Omit<Quest, 'dateAdded'> });
          aiActions.push({ type: 'ADD_JOURNAL_ENTRY', payload: { type: 'quest_update', text: `Nouvelle quête commencée : "${quest.title}".` } });
          aiNotifications.push({ type: 'quest_added', title: 'Nouvelle Quête', description: `Vous avez commencé la quête : "${quest.title}".` });
        });
      }
      if (aiOutput.updatedQuests) {
        aiOutput.updatedQuests.forEach(update => {
          aiActions.push({ type: 'UPDATE_QUEST', payload: update });
          aiActions.push({ type: 'ADD_JOURNAL_ENTRY', payload: { type: 'quest_update', text: `La quête "${update.questId}" a progressé.` } });
          aiNotifications.push({ type: 'quest_updated', title: 'Quête Mise à Jour', description: `La quête "${update.questId}" a progressé.` });
        });
      }
      if (aiOutput.newPNJs) {
          aiOutput.newPNJs.forEach(pnj => {
            aiActions.push({ type: 'ADD_PNJ', payload: pnj as Omit<PNJ, 'firstEncountered' | 'lastSeen' | 'interactionHistory'> });
            aiActions.push({ type: 'ADD_JOURNAL_ENTRY', payload: { type: 'npc_interaction', text: `Vous avez rencontré ${pnj.name}.` } });
            aiNotifications.push({ type: 'pnj_encountered', title: 'Nouvelle Rencontre', description: `Vous avez rencontré ${pnj.name}.` });
          });
      }
      if (aiOutput.itemsToAddToInventory) {
        aiOutput.itemsToAddToInventory.forEach(item => {
          const masterItem = getMasterItemById(item.itemId);
          const itemName = masterItem?.name || item.itemId;
          aiActions.push({ type: 'ADD_ITEM_TO_INVENTORY', payload: item });
          aiActions.push({ type: 'ADD_JOURNAL_ENTRY', payload: { type: 'event', text: `Objet obtenu : ${itemName} (x${item.quantity}).` } });
          aiNotifications.push({ type: 'item_added', title: 'Objet Obtenu', description: `Vous avez obtenu : ${itemName} (x${item.quantity}).` });
        });
      }
      if (aiOutput.newTransactions) {
        aiOutput.newTransactions.forEach(transaction => {
          aiActions.push({ type: 'ADD_TRANSACTION', payload: transaction });
          aiActions.push({ type: 'ADD_JOURNAL_ENTRY', payload: { type: 'event', text: `${transaction.description}: ${transaction.amount > 0 ? '+' : ''}${transaction.amount}€.` } });
          aiNotifications.push({ type: 'money_changed', title: 'Transaction Financière', description: `${transaction.description}: ${transaction.amount > 0 ? '+' : ''}${transaction.amount}€.` });
        });
      }
      if (aiOutput.xpGained) {
        aiActions.push({ type: 'ADD_XP', payload: aiOutput.xpGained });
        aiActions.push({ type: 'ADD_JOURNAL_ENTRY', payload: { type: 'event', text: `Vous avez gagné ${aiOutput.xpGained} XP.` } });
        aiNotifications.push({ type: 'xp_gained', title: 'Expérience Gagnée', description: `Vous avez gagné ${aiOutput.xpGained} XP.` });
      }
      if (aiOutput.newClues) {
        aiOutput.newClues.forEach(clue => {
          aiActions.push({ type: 'ADD_CLUE', payload: clue as any });
          aiActions.push({ type: 'ADD_JOURNAL_ENTRY', payload: { type: 'event', text: `Nouvel indice découvert : "${clue.title}".` } });
          aiNotifications.push({ type: 'clue_added', title: 'Nouvel Indice', description: `Indice ajouté : "${clue.title}".` });
        });
      }
       if (aiOutput.newDocuments) {
        aiOutput.newDocuments.forEach(doc => {
          aiActions.push({ type: 'ADD_DOCUMENT', payload: doc as any });
          aiActions.push({ type: 'ADD_JOURNAL_ENTRY', payload: { type: 'event', text: `Nouveau document obtenu : "${doc.title}".` } });
          aiNotifications.push({ type: 'document_added', title: 'Nouveau Document', description: `Document obtenu : "${doc.title}".` });
        });
      }
      if (aiOutput.updatedInvestigationNotes) {
        aiActions.push({ type: 'UPDATE_INVESTIGATION_NOTES', payload: aiOutput.updatedInvestigationNotes });
        aiNotifications.push({ type: 'investigation_notes_updated', title: 'Synthèse Mise à Jour', description: 'Vos notes d\'enquête ont été mises à jour.' });
      }


      // Update the state in one atomic operation
      onStateUpdate(prevState => {
        if (!prevState) return null;

        // Start with the state after deterministic effects
        const intermediateState: GameState = { ...prevState, player: updatedPlayer };

        // Apply new scenario text and log the player's action
        const stateWithScenarioAndJournal = gameReducer(
          gameReducer(intermediateState, {
            type: 'SET_CURRENT_SCENARIO',
            payload: { scenarioText: aiOutput.scenarioText },
          }),
          {
            type: 'ADD_JOURNAL_ENTRY',
            payload: {
              type: 'player_action',
              text: actionText,
              location: updatedPlayer.currentLocation,
            },
          }
        );

        // Apply new location if any
        let stateWithLocation = stateWithScenarioAndJournal;
        if (aiOutput.newLocationDetails && stateWithLocation.player) {
          stateWithLocation.player = {
            ...stateWithLocation.player,
            currentLocation: {
              ...stateWithLocation.player.currentLocation,
              ...aiOutput.newLocationDetails,
            },
          };
        }

        // Reduce all AI-driven actions onto the new state
        return aiActions.reduce(gameReducer, stateWithLocation);
      });

      // Show all notifications AFTER the state update has been dispatched
      aiNotifications.forEach(notification => toast({ title: notification.title, description: notification.description, duration: 3000 }));
      
      setPlayerInput('');

    } catch (error) {
      let errorMessage = "Impossible de générer le prochain scénario.";
      if (error instanceof Error) { errorMessage += ` Détail: ${error.message}`; }
      toast({ variant: "destructive", title: "Erreur de Connexion avec l'IA", description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  }, [initialGameState, onStateUpdate, toast]);

  const { player, currentScenario, nearbyPois } = initialGameState;

  if (!player || !currentScenario) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl">Chargement des données du jeu...</p>
      </div>
    );
  }

  const displayLocation = player.currentLocation;

  return (
    <div className="flex flex-col p-2 md:p-4 space-y-2 md:space-y-4 h-full">
      {!isMobile && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 shrink-0">
          <WeatherDisplay weatherData={weatherData} isLoading={weatherLoading} error={weatherError} placeName={displayLocation.name} gameTimeInMinutes={initialGameState.gameTimeInMinutes} />
          <MapDisplay
            currentLocation={displayLocation}
            nearbyPois={nearbyPois || []}
          />
          <LocationImageDisplay
            imageUrl={locationImageUrl}
            placeName={displayLocation.name || UNKNOWN_STARTING_PLACE_NAME}
            isLoading={locationImageLoading}
            error={locationImageError}
          />
        </div>
      )}
      <ScrollArea className="flex-grow rounded-md border shadow-inner bg-muted/20">
        <div className="p-3">
          <ScenarioDisplay scenarioHTML={currentScenario.scenarioText} isLoading={isLoading} />
        </div>
      </ScrollArea>
      <div className="shrink-0">
        <PlayerInputForm
          playerInput={playerInput}
          onPlayerInputChange={setPlayerInput}
          onSubmit={handlePlayerActionSubmit}
          isLoading={isLoading}
          suggestions={suggestedActions}
        />
      </div>
    </div>
  );
};

export default GamePlay;
