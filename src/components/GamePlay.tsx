
"use client";

import React from 'react';
import type { StoryChoice } from '@/lib/types';
import ScenarioDisplay from './ScenarioDisplay';
import { Loader2 } from 'lucide-react';
import ChoiceSelectionDisplay from './ChoiceSelectionDisplay';
import GameSidebar from './GameSidebar';
import { useGame } from '@/contexts/GameContext';
import CombatUI from './CombatUI';
import { useIsMobile } from '@/hooks/use-mobile';

const GamePlay: React.FC = () => {
  const { 
    gameState, 
    isLoading, 
    handleChoiceSelected,
    isCombatActive,
    combatEnemies,
    handleCombatEnd,
    setIsCombatActive 
  } = useGame();
  
  const { player, currentScenario } = gameState;
  const isMobile = useIsMobile();

  if (!player || !currentScenario) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl">Chargement des données du jeu...</p>
      </div>
    );
  }

  // Combat UI takes over the entire screen if active
  if (isCombatActive && combatEnemies.length > 0) {
    return (
      <CombatUI 
        player={player}
        enemies={combatEnemies}
        isOpen={isCombatActive}
        onClose={() => setIsCombatActive(false)} // Or handle flee
        onCombatEnd={handleCombatEnd}
      />
    )
  }

  const availableChoices = currentScenario.choices || [];

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <div className="flex-grow flex flex-col p-4 md:p-6 space-y-6">
        <ScenarioDisplay scenarioHTML={currentScenario.scenarioText} isLoading={isLoading} />
        
        <ChoiceSelectionDisplay
            choices={availableChoices}
            onSelectChoice={handleChoiceSelected}
            isLoading={isLoading}
            aiRecommendation={currentScenario.aiRecommendation || null}
          />
      </div>

      {!isMobile && <GameSidebar />}
      {isMobile && (
        <div className="md:hidden sticky bottom-0 z-10">
          <GameSidebar />
        </div>
      )}
    </div>
  );
};

export default GamePlay;
