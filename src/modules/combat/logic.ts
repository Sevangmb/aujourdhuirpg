/**
 * @fileOverview Contains the core business logic for the Combat module.
 */

import type { GameState } from '@/lib/types';
import type { Enemy } from './types';

// This function doesn't exist yet, but it's a good example of what would go here.
export function calculateDamage(attackerStats: any, defenderStats: any): number {
    // Basic damage calculation
    const baseDamage = attackerStats.attack * (1 - defenderStats.defense / 100);
    return Math.max(1, Math.round(baseDamage));
}

// Logic to handle the COMBAT_ACTION event, previously in the main reducer
export function handleCombatAction(state: GameState, target: 'player' | 'enemy', newHealth: number): GameState {
    if (target === 'player' && state.player) {
        const newSante = { ...state.player.stats.Sante, value: newHealth };
        const newPlayer = { ...state.player, stats: { ...state.player.stats, Sante: newSante } };
        return { ...state, player: newPlayer };
    } else if (target === 'enemy' && state.currentEnemy) {
        const newEnemy = { ...state.currentEnemy, health: newHealth };
        return { ...state, currentEnemy: newEnemy };
    }
    return state;
}

// Logic to handle COMBAT_STARTED
export function handleCombatStarted(state: GameState, enemy: Enemy): GameState {
    return { ...state, currentEnemy: enemy };
}

// Logic to handle COMBAT_ENDED
export function handleCombatEnded(state: GameState): GameState {
    return { ...state, currentEnemy: null };
}
