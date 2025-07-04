
"use client";

import React from 'react';
import type { StoryChoice } from '@/lib/types';
import ScenarioDisplay from './ScenarioDisplay';
import { Loader2 } from 'lucide-react';
import ChoiceSelectionDisplay from './ChoiceSelectionDisplay';
import { useGame } from '@/contexts/GameContext';
import CombatUI from './CombatUI';

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
    <div className="flex-grow flex flex-col p-4 md:p-6 space-y-6 max-w-4xl mx-auto w-full">
      <ScenarioDisplay scenarioHTML={currentScenario.scenarioText} isLoading={isLoading} />
      
      <ChoiceSelectionDisplay
          choices={availableChoices}
          onSelectChoice={handleChoiceSelected}
          isLoading={isLoading}
          aiRecommendation={currentScenario.aiRecommendation || null}
        />
    </div>
  );
};

export default GamePlay;
