
/**
 * @fileOverview Contains the core business logic for the Combat module.
 */

import type { GameState, GameEvent, Player, DegreeOfSuccess, StoryChoice } from '@/lib/types';
import type { Enemy } from './types';

/**
 * Calculates the damage dealt in an attack, considering stats and success degree.
 * @param attackerStats The stats of the attacker.
 * @param weaponDamage The base damage of the weapon used.
 * @param defenderDefense The defense value of the defender.
 * @param successDegree The degree of success of the attack roll.
 * @returns The final calculated damage.
 */
export function calculateDamage(attackerStats: Player['stats'], weaponDamage: number, defenderDefense: number, successDegree: DegreeOfSuccess): number {
    const baseAttack = (attackerStats.Force.value / 5) + (attackerStats.Dexterite.value / 10);
    const totalAttackPower = baseAttack + weaponDamage;
    
    const mitigatedDamage = Math.max(1, totalAttackPower - (defenderDefense / 2));
    
    let finalDamage = mitigatedDamage;
    if (successDegree === 'critical_success') {
        finalDamage *= 1.5;
    }
    
    const randomFactor = (Math.random() * 0.3) - 0.15;
    finalDamage *= (1 + randomFactor);
    
    return Math.round(Math.max(1, finalDamage));
}

export function handleCombatStarted(state: GameState, enemy: Enemy): GameState {
    const journalEntry: GameEvent = { 
        type: 'JOURNAL_ENTRY_ADDED', 
        payload: { type: 'event', text: `Combat engagé avec ${enemy.name} !` } 
    };
    
    const newState = {
        ...state,
        currentEnemy: enemy,
    };
    // Directly apply the journal entry via the reducer logic to avoid complex state management here
    const tempStateWithJournal = gameReducer(newState, { type: 'APPLY_GAME_EVENTS', payload: [journalEntry] });
    return tempStateWithJournal;
}

export function handleCombatEnded(state: GameState): GameState {
    return { ...state, currentEnemy: null };
}

export function handleCombatAction(state: GameState, target: 'player' | 'enemy', newHealth: number): GameState {
    if (target === 'player' && state.player) {
        const newSante = { ...state.player.stats.Sante, value: newHealth };
        const newPlayer = { ...state.player, stats: { ...state.player.stats, Sante: newSante } };
        return { ...state, player: newPlayer };
    } else if (target === 'enemy' && state.currentEnemy) {
        return { ...state, currentEnemy: { ...state.currentEnemy, health: newHealth } };
    }
    return state;
}

function gameReducer(state: GameState, action: { type: 'APPLY_GAME_EVENTS'; payload: GameEvent[] }): GameState {
  // A minimal reducer to apply journal entries locally, as the full reducer is in game-logic.ts
  if (!state.player) return state;
  let newState = { ...state };
  for (const event of action.payload) {
    if (event.type === 'JOURNAL_ENTRY_ADDED') {
      newState = {
        ...newState,
        journal: [...(newState.journal || []), { ...event.payload, id: 'temp', timestamp: newState.gameTimeInMinutes, location: newState.player?.currentLocation }]
      };
    }
  }
  return newState;
}

export function summarizeCombatEvents(events: GameEvent[], playerName: string, enemyName: string): string {
    const summaryLines: string[] = [];

    for (const event of events) {
        if (event.type === 'COMBAT_ACTION') {
            const attacker = event.attacker === playerName ? 'Vous' : event.attacker;
            const target = event.target === 'player' ? 'vous' : enemyName;
            summaryLines.push(`${attacker} ${event.action.replace(playerName, 'vous').replace(enemyName, 'l\'ennemi')} et infligez ${event.damage} points de dégâts à ${target}.`);
        } else if (event.type === 'TEXT_EVENT') {
            summaryLines.push(event.text);
        } else if (event.type === 'SKILL_CHECK_RESULT' && !event.success) {
            summaryLines.push(`Votre tentative de ${event.skill.split('.')[1].replace(/_/g, ' ')} a échoué !`);
        }
    }
    
    return summaryLines.join('\n');
}

export function processCombatTurn(player: Player, enemy: Enemy, choice: StoryChoice): { events: GameEvent[] } {
    const events: GameEvent[] = [];
    
    // Player action
    if (choice.combatActionType === 'attack') {
        const weapon = player.inventory.find(i => i.combatStats?.damage) || { name: 'Poings', combatStats: { damage: 2 }};
        const damageDealt = 5; // Simplified
        events.push({ type: 'COMBAT_ACTION', attacker: player.name, target: 'enemy', damage: damageDealt, newHealth: enemy.health - damageDealt, action: `attaque ${enemy.name} avec ${weapon.name}` });
    }
    // ... other combat actions
    
    // Enemy action (simplified)
    const damageTaken = 3; // Simplified
    events.push({ type: 'COMBAT_ACTION', attacker: enemy.name, target: 'player', damage: damageTaken, newHealth: player.stats.Sante.value - damageTaken, action: `attaque ${player.name}` });

    return { events };
}
