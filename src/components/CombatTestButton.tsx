"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Sword } from 'lucide-react';
import { useCombat } from '@/hooks/useCombat';
import SimpleCombatUI from './SimpleCombatUI';
import { useGame } from '@/contexts/GameContext';

/**
 * Composant de test pour le système de combat
 * À intégrer temporairement dans le jeu pour tester
 */
const CombatTestButton: React.FC = () => {
  const { gameState } = useGame();
  const {
    combatState,
    startCombat,
    executePlayerAction,
    endCombat,
    createTestEnemy
  } = useCombat();

  const handleStartTestCombat = () => {
    const testEnemy = createTestEnemy();
    startCombat(testEnemy);
  };

  const player = gameState.player;

  if (!player) {
    return null;
  }

  return (
    <>
      {/* Bouton pour déclencher un combat de test */}
      {!combatState.isActive && (
        <Button
          onClick={handleStartTestCombat}
          variant="destructive"
          className="flex items-center gap-2"
        >
          <Sword className="w-4 h-4" />
          Test Combat
        </Button>
      )}

      {/* Interface de combat */}
      {combatState.isActive && combatState.enemy && (
        <SimpleCombatUI
          player={player}
          enemy={combatState.enemy}
          availableActions={combatState.availableActions}
          onActionSelected={executePlayerAction}
          combatLog={combatState.combatLog}
          isPlayerTurn={combatState.isPlayerTurn}
        />
      )}

      {/* Bouton pour fermer le combat terminé */}
      {!combatState.isActive && combatState.combatLog.length > 0 && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-lg p-6 max-w-md w-full text-center border border-slate-700">
            <h3 className="text-xl font-bold text-white mb-4">Combat Terminé</h3>
            <div className="text-slate-300 mb-4">
              {combatState.combatLog.slice(-1)[0]}
            </div>
            <Button onClick={endCombat} variant="default">
              Continuer
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default CombatTestButton;
