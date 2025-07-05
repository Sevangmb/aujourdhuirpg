
import React, { useState, useEffect, useCallback } from 'react';
import type { User } from 'firebase/auth';

import type { GameState, CharacterSummary, Player } from '@/lib/types';
import { hydratePlayer } from '@/lib/game-state-persistence';
import { listCharacters, loadSpecificSave, createNewCharacter, deleteCharacter } from '@/services/firestore-service';
import { useToast } from '@/hooks/use-toast';
import { clearGameState as clearLocalGameState } from '@/services/localStorageService';
import { getPositionData } from '@/app/actions/get-position-data';
import GameScreen from '@/components/GameScreen';
import { CharacterSelectionScreen } from '@/components/CharacterSelectionScreen';
import LoadingState from './LoadingState';
import type { FullCharacterFormData } from './CharacterCreationForm';
import { GameProvider } from '@/contexts/GameContext';
import { montmartreInitialChoices } from '@/data/choices';
import { enrichAIChoicesWithLogic } from '@/lib/game-logic';


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
      // Construct the GameState object correctly, without redundant top-level properties
      const finalGameState: GameState = { 
        ...loadedState, 
        player: hydratedPlayer 
      };
      
      setInitialGameState(finalGameState);
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

      const createPrologue = (player: Player): string => {
        // This function now takes the player object and interpolates its values into the prologue text.
        // It's a deterministic way to generate the intro, avoiding AI hallucinations for the first scene.
        const template = `
<p>L’année est <strong>${player.era}</strong>. Un brouillard épais, à la fois doux et menaçant, enveloppe les rues pavées de Montmartre. Vous, <strong>${player.name}</strong>, ${player.age} ans, avec le passé chargé de <em>"${player.background}"</em>, vous trouvez assis(e) à une terrasse du Lapin Agile, un verre de vin rouge à la main. Le parfum du café et du tabac se mêle à la douce mélancolie du soir. Vos traits reflètent votre état d'esprit actuel : <strong>${player.traitsMentalStates.join(', ')}</strong>.</p>
<p>Autour de vous, la vie parisienne palpite : des artistes en pleine discussion animée, des couples amoureux chuchotant des secrets, et le léger tintamarre des voitures anciennes qui passent. Mais il y a quelque chose d'étrange dans l’air, une tension palpable qui transperce la douce atmosphère. Vous sentez un regard sur vous, perçant, presque hostile. Vous vous tournez, mais il n’y a personne.</p>
<p>Soudain, un homme au visage buriné, vêtu d’un long manteau sombre, s’approche de votre table. Il vous fixe avec des yeux perçants et vous glisse un papier plié dans la main.</p>
<p><strong>Homme mystérieux :</strong> « Ceci vous concerne. Soyez prudent... »</p>
        `.trim();
    
        return template;
      };
      
      const prologueText = createPrologue(hydratedPlayer);

      // Enrich predefined choices with current player context
      const initialChoices = enrichAIChoicesWithLogic(montmartreInitialChoices, hydratedPlayer);

      const finalGameState: GameState = {
        player: hydratedPlayer,
        currentScenario: { 
          scenarioText: prologueText, 
          choices: initialChoices
        },
        gameTimeInMinutes: 0,
        journal: [],
        nearbyPois: null,
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
