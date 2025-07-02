/**
 * @fileOverview React Hook for Combat State Management
 * Manages combat state, actions, and UI interactions
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Player } from '@/lib/types';
import type { 
  Enemy, 
  CombatState, 
  CombatAction, 
  CombatResult,
  CombatLogEntry 
} from '@/modules/combat/enhanced-types';
import { CombatManager } from '@/modules/combat/enhanced-logic';
import { COMBAT_ACTIONS } from '@/modules/combat/actions';

interface CombatHookState {
  isLoading: boolean;
  error: string | null;
  combatManager: CombatManager | null;
  animating: boolean;
  selectedAction: CombatAction | null;
  confirmingAction: boolean;
}

interface CombatHookReturn {
  // State
  combatState: CombatState | null;
  isLoading: boolean;
  error: string | null;
  animating: boolean;
  selectedAction: CombatAction | null;
  confirmingAction: boolean;
  
  // Actions
  startCombat: (player: Player, enemies: Enemy[]) => void;
  executeAction: (action: CombatAction, targetIndex?: number) => Promise<void>;
  selectAction: (action: CombatAction | null) => void;
  confirmAction: () => Promise<void>;
  cancelAction: () => void;
  endCombat: (outcome: 'victory' | 'defeat' | 'flee') => CombatResult | null;
  
  // Utilities
  getAvailableActions: () => CombatAction[];
  getPlayerStats: () => any;
  getEnemyStats: (index: number) => any;
  canPerformAction: (action: CombatAction) => boolean;
  getActionSuccessProbability: (action: CombatAction, targetIndex?: number) => number;
}

export function useCombat(): CombatHookReturn {
  const [state, setState] = useState<CombatHookState>({
    isLoading: false,
    error: null,
    combatManager: null,
    animating: false,
    selectedAction: null,
    confirmingAction: false
  });

  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentPlayerRef = useRef<Player | null>(null);

  // === COMBAT INITIALIZATION ===

  const startCombat = useCallback((player: Player, enemies: Enemy[]) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const manager = new CombatManager(player, enemies);
      currentPlayerRef.current = player;
      
      setState(prev => ({
        ...prev,
        combatManager: manager,
        isLoading: false,
        selectedAction: null,
        confirmingAction: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Erreur lors de l\'initialisation du combat',
        isLoading: false
      }));
    }
  }, []);

  // === ACTION MANAGEMENT ===

  const selectAction = useCallback((action: CombatAction | null) => {
    setState(prev => ({
      ...prev,
      selectedAction: action,
      confirmingAction: false
    }));
  }, []);

  const confirmAction = useCallback(async () => {
    if (!state.selectedAction || !state.combatManager || !currentPlayerRef.current) {
      return;
    }

    setState(prev => ({ ...prev, confirmingAction: true }));
    
    try {
      await executeAction(state.selectedAction);
    } finally {
      setState(prev => ({
        ...prev,
        confirmingAction: false,
        selectedAction: null
      }));
    }
  }, [state.selectedAction, state.combatManager]);

  const cancelAction = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedAction: null,
      confirmingAction: false
    }));
  }, []);

  const executeAction = useCallback(async (action: CombatAction, targetIndex: number = 0): Promise<void> => {
    if (!state.combatManager || !currentPlayerRef.current || state.animating) {
      return;
    }

    try {
      setState(prev => ({ ...prev, animating: true, error: null }));

      const combatState = state.combatManager.getCombatState();
      const target = combatState.enemies[targetIndex];

      // Process player action
      const playerEvents = state.combatManager.processPlayerAction(action, currentPlayerRef.current, target);
      
      // Add animation delay for visual feedback
      await new Promise(resolve => {
        animationTimeoutRef.current = setTimeout(resolve, 800);
      });

      // Check if combat ended after player action
      if (!state.combatManager.isCombatActive()) {
        setState(prev => ({ ...prev, animating: false }));
        return;
      }

      // Switch to enemy turn
      state.combatManager.switchTurn();

      // Process enemy turns
      for (const enemy of combatState.enemies) {
        if (enemy.currentStats.health > 0) {
          const enemyEvents = state.combatManager.processEnemyTurn(enemy, currentPlayerRef.current);
          
          // Add delay between enemy actions
          await new Promise(resolve => {
            animationTimeoutRef.current = setTimeout(resolve, 600);
          });

          // Check if player died
          const playerStats = state.combatManager.getCombatState().player.stats;
          if (playerStats.health <= 0) {
            break;
          }
        }
      }

      // Switch back to player turn
      state.combatManager.switchTurn();

      // Process status effects for all participants
      const currentState = state.combatManager.getCombatState();
      state.combatManager.processStatusEffects(null, true); // Player status effects
      
      for (const enemy of currentState.enemies) {
        if (enemy.currentStats.health > 0) {
          state.combatManager.processStatusEffects(enemy, false);
        }
      }

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Erreur lors de l\'exécution de l\'action'
      }));
    } finally {
      setState(prev => ({ ...prev, animating: false }));
    }
  }, [state.combatManager, state.animating]);

  // === COMBAT ENDING ===

  const endCombat = useCallback((outcome: 'victory' | 'defeat' | 'flee'): CombatResult | null => {
    if (!state.combatManager) return null;

    const result = state.combatManager.endCombat(outcome);
    
    setState(prev => ({
      ...prev,
      combatManager: null,
      selectedAction: null,
      confirmingAction: false,
      animating: false
    }));

    currentPlayerRef.current = null;
    
    return result;
  }, [state.combatManager]);

  // === UTILITY FUNCTIONS ===

  const getAvailableActions = useCallback((): CombatAction[] => {
    if (!state.combatManager || !currentPlayerRef.current) return [];

    const combatState = state.combatManager.getCombatState();
    return combatState.player.availableActions;
  }, [state.combatManager]);

  const getPlayerStats = useCallback(() => {
    if (!state.combatManager) return null;
    
    const combatState = state.combatManager.getCombatState();
    return combatState.player.stats;
  }, [state.combatManager]);

  const getEnemyStats = useCallback((index: number) => {
    if (!state.combatManager) return null;
    
    const combatState = state.combatManager.getCombatState();
    return combatState.enemies[index]?.currentStats || null;
  }, [state.combatManager]);

  const canPerformAction = useCallback((action: CombatAction): boolean => {
    if (!state.combatManager || state.animating) return false;
    
    const combatState = state.combatManager.getCombatState();
    const playerStats = combatState.player.stats;
    
    // Check stamina requirement
    if (action.requirements.stamina && playerStats.stamina < action.requirements.stamina) {
      return false;
    }

    // Check status effect restrictions
    const disabledActions = playerStats.statusEffects
      .flatMap(effect => effect.effects.actions?.disabled || []);
    
    if (disabledActions.includes(action.type)) {
      return false;
    }

    // Check position requirements
    if (action.requirements.position && 
        !action.requirements.position.includes(playerStats.position)) {
      return false;
    }

    return true;
  }, [state.combatManager, state.animating]);

  const getActionSuccessProbability = useCallback((action: CombatAction, targetIndex: number = 0): number => {
    if (!state.combatManager || !currentPlayerRef.current) return 0;

    const combatState = state.combatManager.getCombatState();
    const target = combatState.enemies[targetIndex];
    
    if (!target) return 0;

    // Simplified probability calculation
    let baseChance = 60;
    
    // Adjust for player stats
    if (action.success_modifiers.stat_bonus) {
      Object.entries(action.success_modifiers.stat_bonus).forEach(([stat, modifier]) => {
        const statValue = currentPlayerRef.current!.stats[stat as keyof typeof currentPlayerRef.current.stats]?.value || 0;
        baseChance += statValue * modifier;
      });
    }

    // Adjust for target defense
    baseChance -= target.baseStats.Dexterite / 3;

    // Adjust for status effects
    if (target.currentStats.statusEffects.some(effect => effect.id === 'analyzed')) {
      baseChance += 15;
    }
    
    if (combatState.player.stats.statusEffects.some(effect => effect.id === 'focused')) {
      baseChance += 10;
    }

    return Math.max(10, Math.min(95, Math.round(baseChance)));
  }, [state.combatManager]);

  // === CLEANUP ===

  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  // === RETURN INTERFACE ===

  return {
    // State
    combatState: state.combatManager ? state.combatManager.getCombatState() : null,
    isLoading: state.isLoading,
    error: state.error,
    animating: state.animating,
    selectedAction: state.selectedAction,
    confirmingAction: state.confirmingAction,
    
    // Actions
    startCombat,
    executeAction,
    selectAction,
    confirmAction,
    cancelAction,
    endCombat,
    
    // Utilities
    getAvailableActions,
    getPlayerStats,
    getEnemyStats,
    canPerformAction,
    getActionSuccessProbability
  };
}

// === HELPER HOOKS ===

/**
 * Hook for managing combat animations and visual effects
 */
export function useCombatAnimations() {
  const [currentAnimation, setCurrentAnimation] = useState<string | null>(null);
  const [damageNumbers, setDamageNumbers] = useState<Array<{
    id: string;
    value: number;
    type: 'damage' | 'healing' | 'miss';
    position: { x: number; y: number };
    timestamp: number;
  }>>([]);

  const triggerAnimation = useCallback((animationType: string, duration: number = 1000) => {
    setCurrentAnimation(animationType);
    setTimeout(() => setCurrentAnimation(null), duration);
  }, []);

  const showDamageNumber = useCallback((
    value: number, 
    type: 'damage' | 'healing' | 'miss',
    position: { x: number; y: number }
  ) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newDamageNumber = {
      id,
      value,
      type,
      position,
      timestamp: Date.now()
    };

    setDamageNumbers(prev => [...prev, newDamageNumber]);

    // Remove after animation
    setTimeout(() => {
      setDamageNumbers(prev => prev.filter(num => num.id !== id));
    }, 2000);
  }, []);

  const clearDamageNumbers = useCallback(() => {
    setDamageNumbers([]);
  }, []);

  return {
    currentAnimation,
    damageNumbers,
    triggerAnimation,
    showDamageNumber,
    clearDamageNumbers
  };
}

/**
 * Hook for combat sound effects
 */
export function useCombatSounds() {
  const playSound = useCallback((soundType: 'attack' | 'hit' | 'miss' | 'heal' | 'victory' | 'defeat') => {
    // Placeholder for sound implementation
    // In a real game, you would use Web Audio API or Howler.js
    console.log(`Playing combat sound: ${soundType}`);
  }, []);

  return { playSound };
}

export default useCombat;