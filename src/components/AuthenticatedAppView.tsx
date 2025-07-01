
import React, { useState, useEffect, useCallback } from 'react';
import type { User } from 'firebase/auth';

import type { GameState, CharacterSummary } from '@/lib/types';
import { hydratePlayer } from '@/lib/game-state-persistence';
import { listCharacters, loadSpecificSave, createNewCharacter, deleteCharacter } from '@/services/firestore-service';
import { useToast } from '@/hooks/use-toast';
import { clearGameState as clearLocalGameState } from '@/services/localStorageService';
import { getPositionData } from '@/services/position-service';
import GameScreen from '@/components/GameScreen';
import { CharacterSelectionScreen } from '@/components/CharacterSelectionScreen';
import LoadingState from './LoadingState';
import type { FullCharacterFormData } from './CharacterCreationForm';
import { generateScenario } from '@/ai/flows/generate-scenario';
import { prepareAIInput } from '@/lib/game-logic';
import { GameProvider } from '@/contexts/GameContext';


interface AuthenticatedAppViewProps {
  user: User;
  signOutUser: () => Promise<void>;
}

type AppMode = 'loading' | 'character_management' | 'playing';

const AuthenticatedAppView: React.FC<AuthenticatedAppViewProps> = ({ user, signOutUser }) => {
  const [appMode, setAppMode] = useState<AppMode>('loading');
  const [characterList, setCharacterList] = useState<CharacterSummary[]>([]);
  const [isDeletingCharacter, setIsDeletingCharacter] = useState<string | null>(null);

  // This state holds the loaded game state before passing it to the provider
  const [initialGameState, setInitialGameState] = useState<GameState | null>(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);

  const { toast } = useToast();

  const fetchCharacterList = useCallback(async () => {
    if (!user) return;
    setAppMode('loading');
    const characters = await listCharacters(user.uid);
    setCharacterList(characters);
    setAppMode('character_management');
  }, [user]);

  useEffect(() => {
    fetchCharacterList();
  }, [user, fetchCharacterList]);

  const handleSelectCharacterAndSave = useCallback(async (characterId: string, saveId: string) => {
    setAppMode('loading');
    const loadedState = await loadSpecificSave(user.uid, characterId, saveId);
    if (loadedState) {
      const hydratedPlayer = hydratePlayer(loadedState.player);
      setInitialGameState({ ...loadedState, player: hydratedPlayer });
      setSelectedCharacterId(characterId);
      setAppMode('playing');
    } else {
      toast({ title: "Erreur de chargement", description: "Impossible de charger cette sauvegarde.", variant: "destructive" });
      fetchCharacterList();
    }
  }, [user.uid, toast, fetchCharacterList]);

  const handleCharacterCreate = useCallback(async (playerData: FullCharacterFormData) => {
    setAppMode('loading');
    try {
      const locationData = await getPositionData(playerData.startingLocation, playerData.era);

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
        currentScenario: { scenarioText: "<p>Création du monde en cours...</p>", choices: [] },
        player: hydratedPlayer, gameTimeInMinutes: 0, journal: [], nearbyPois: null, toneSettings: hydratedPlayer.toneSettings,
      };
      
      const aiInput = prepareAIInput(tempStateForPrologue, { text: "[COMMENCER L'AVENTURE]" });
      if (!aiInput) throw new Error("Could not prepare AI input for prologue.");

      const prologueResult = await generateScenario(aiInput);
      
      const finalGameState: GameState = {
        ...tempStateForPrologue,
        currentScenario: { scenarioText: prologueResult.scenarioText, choices: prologueResult.choices }
      };

      const newCharacterId = await createNewCharacter(user.uid, finalGameState);
      if (!newCharacterId) throw new Error("Failed to create character in Firestore.");

      setSelectedCharacterId(newCharacterId);
      setInitialGameState(finalGameState);
      setAppMode('playing');

      toast({ title: "Personnage créé !", description: `${playerData.name} est prêt(e) pour l'aventure.` });

    } catch (error) {
      console.error("Error during character creation:", error);
      toast({ title: "Erreur de création", description: (error as Error).message || "Impossible de commencer l'aventure.", variant: "destructive" });
      setAppMode('character_management'); // Return to management screen on error
    }
  }, [user, toast]);

  const handleDeleteCharacter = useCallback(async (characterId: string) => {
    setIsDeletingCharacter(characterId);
    try {
      await deleteCharacter(user.uid, characterId);
      toast({ title: "Personnage supprimé" });
      if (selectedCharacterId === characterId) {
        setSelectedCharacterId(null);
        setInitialGameState(null);
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
    setInitialGameState(null);
    setSelectedCharacterId(null);
    clearLocalGameState();
    fetchCharacterList();
  };

  if (appMode === 'loading') {
    return <LoadingState loadingAuth={false} isLoadingState={true} />;
  }
  
  if (appMode === 'character_management') {
    return (
      <CharacterSelectionScreen 
        characters={characterList}
        onSelectCharacterAndSave={handleSelectCharacterAndSave}
        onCharacterCreate={handleCharacterCreate}
        onDeleteCharacter={handleDeleteCharacter}
        isDeleting={isDeletingCharacter}
        user={user}
      />
    );
  }

  if (appMode === 'playing' && initialGameState && selectedCharacterId) {
    return (
      <GameProvider 
        initialGameState={initialGameState}
        user={user}
        characterId={selectedCharacterId}
        onExitToSelection={handleExitToSelection}
        onSignOut={signOutUser}
      >
        <GameScreen />
      </GameProvider>
    );
  }

  // Fallback case
  return <LoadingState loadingAuth={false} isLoadingState={true} />;
};

export default AuthenticatedAppView;
