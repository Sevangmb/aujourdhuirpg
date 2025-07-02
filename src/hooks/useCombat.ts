/**
 * @fileOverview Hook React pour gérer l'état du combat
 * Lie l'interface utilisateur à la logique de combat
 */

import { useState, useCallback, useEffect } from 'react';
import type { Player } from '@/lib/types';
import type { Enemy, CombatAction } from '@/modules/combat/types';
import { 
  getAvailablePlayerActions, 
  processPlayerCombatAction, 
  processEnemyTurn 
} from '@/modules/combat/logic';
import { useGame } from '@/contexts/GameContext';

export interface CombatState {
  isActive: boolean;
  enemy: Enemy | null;
  combatLog: string[];
  isPlayerTurn: boolean;
  isProcessing: boolean;
  availableActions: CombatAction[];
}

export function useCombat() {
  const { gameState, dispatch } = useGame();
  const [combatState, setCombatState] = useState<CombatState>({
    isActive: false,
    enemy: null,
    combatLog: [],
    isPlayerTurn: true,
    isProcessing: false,
    availableActions: []
  });

  const player = gameState.player;

  /**
   * Démarrer un combat avec un ennemi
   */
  const startCombat = useCallback((enemy: Enemy) => {
    if (!player) return;

    // Créer l'ennemi avec sa santé complète
    const combatEnemy: Enemy = {
      ...enemy,
      health: enemy.maxHealth
    };

    const availableActions = getAvailablePlayerActions(player);

    setCombatState({
      isActive: true,
      enemy: combatEnemy,
      combatLog: [`Combat commencé contre ${enemy.name} !`],
      isPlayerTurn: true,
      isProcessing: false,
      availableActions
    });

    // Mettre à jour l'état global du jeu
    dispatch({ type: 'APPLY_GAME_EVENTS', payload: [
      { type: 'COMBAT_STARTED', enemy: combatEnemy }
    ]});

  }, [player, dispatch]);

  /**
   * Exécuter une action du joueur
   */
  const executePlayerAction = useCallback(async (actionId: string) => {
    if (!player || !combatState.enemy || !combatState.isPlayerTurn || combatState.isProcessing) {
      return;
    }

    setCombatState(prev => ({ ...prev, isProcessing: true }));

    try {
      // Traiter l'action du joueur
      const result = processPlayerCombatAction(gameState, actionId);
      
      // Appliquer les événements au jeu
      if (result.events.length > 0) {
        dispatch({ type: 'APPLY_GAME_EVENTS', payload: result.events });
      }

      // Mettre à jour le log
      let newLog = [...combatState.combatLog, `Vous: ${result.description}`];

      // Vérifier si le combat est terminé
      const combatEndEvent = result.events.find(e => e.type === 'COMBAT_ENDED');
      if (combatEndEvent) {
        const winner = (combatEndEvent as any).winner;
        if (winner === 'player') {
          newLog.push('🎉 Victoire ! Vous avez vaincu votre ennemi !');
        } else {
          newLog.push('💀 Défaite... Vous avez été vaincu.');
        }
        
        setCombatState(prev => ({
          ...prev,
          isActive: false,
          isPlayerTurn: false,
          isProcessing: false,
          combatLog: newLog
        }));
        return;
      }

      // Mettre à jour la santé de l'ennemi si nécessaire
      let updatedEnemy = combatState.enemy;
      const enemyDamageEvent = result.events.find(e => 
        e.type === 'COMBAT_ACTION' && (e as any).target === 'enemy'
      );
      
      if (enemyDamageEvent) {
        updatedEnemy = {
          ...combatState.enemy,
          health: (enemyDamageEvent as any).newHealth
        };
      }

      // Passer au tour de l'ennemi
      setCombatState(prev => ({
        ...prev,
        enemy: updatedEnemy,
        combatLog: newLog,
        isPlayerTurn: false,
        isProcessing: false
      }));

      // Tour de l'ennemi après un délai
      setTimeout(() => {
        executeEnemyTurn(updatedEnemy, newLog);
      }, 1000);

    } catch (error) {
      console.error('Erreur lors de l\'exécution de l\'action:', error);
      setCombatState(prev => ({
        ...prev,
        isProcessing: false,
        combatLog: [...prev.combatLog, 'Erreur lors de l\'action.']
      }));
    }
  }, [player, combatState, gameState, dispatch]);

  /**
   * Exécuter le tour de l'ennemi
   */
  const executeEnemyTurn = useCallback((enemy: Enemy, currentLog: string[]) => {
    if (!player) return;

    setCombatState(prev => ({ ...prev, isProcessing: true }));

    try {
      // Traiter l'action de l'ennemi
      const result = processEnemyTurn(gameState);
      
      // Appliquer les événements au jeu
      if (result.events.length > 0) {
        dispatch({ type: 'APPLY_GAME_EVENTS', payload: result.events });
      }

      // Mettre à jour le log
      let newLog = [...currentLog, result.description];

      // Vérifier si le combat est terminé
      const combatEndEvent = result.events.find(e => e.type === 'COMBAT_ENDED');
      if (combatEndEvent) {
        const winner = (combatEndEvent as any).winner;
        if (winner === 'enemy') {
          newLog.push('💀 Défaite... L\'ennemi vous a vaincu.');
        }
        
        setCombatState(prev => ({
          ...prev,
          isActive: false,
          isPlayerTurn: false,
          isProcessing: false,
          combatLog: newLog
        }));
        return;
      }

      // Mettre à jour les actions disponibles du joueur
      const availableActions = getAvailablePlayerActions(player);

      // Retour au tour du joueur
      setCombatState(prev => ({
        ...prev,
        combatLog: newLog,
        isPlayerTurn: true,
        isProcessing: false,
        availableActions
      }));

    } catch (error) {
      console.error('Erreur lors du tour ennemi:', error);
      setCombatState(prev => ({
        ...prev,
        isProcessing: false,
        isPlayerTurn: true,
        combatLog: [...currentLog, 'Erreur lors du tour ennemi.']
      }));
    }
  }, [player, gameState, dispatch]);

  /**
   * Terminer le combat
   */
  const endCombat = useCallback(() => {
    setCombatState({
      isActive: false,
      enemy: null,
      combatLog: [],
      isPlayerTurn: true,
      isProcessing: false,
      availableActions: []
    });

    // Nettoyer l'état global
    dispatch({ type: 'APPLY_GAME_EVENTS', payload: [
      { type: 'COMBAT_ENDED', winner: 'player' }
    ]});
  }, [dispatch]);

  /**
   * Créer un ennemi de test
   */
  const createTestEnemy = useCallback((): Enemy => {
    return {
      name: 'Voyou de rue',
      description: 'Un malfrat qui vous cherche des ennuis.',
      health: 50,
      maxHealth: 50,
      attack: 12,
      defense: 8,
      stats: {
        Force: 15,
        Dexterite: 12,
        Constitution: 14,
        Perception: 10
      }
    };
  }, []);

  return {
    combatState,
    startCombat,
    executePlayerAction,
    endCombat,
    createTestEnemy
  };
}
