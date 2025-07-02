
/**
 * @fileOverview Contains the core business logic for the Combat module.
 */

import type { GameState, GameEvent, Player, DegreeOfSuccess, StoryChoice } from '@/lib/types';
import type { Enemy } from './types';
import { performSkillCheck } from '@/lib/skill-check';


/**
 * Calculates the damage dealt in an attack, considering stats and success degree.
 * @param attackerStats The stats of the attacker.
 * @param weaponDamage The base damage of the weapon used.
 * @param defenderDefense The defense value of the defender.
 * @param successDegree The degree of success of the attack roll.
 * @returns The final calculated damage.
 */
export function calculateDamage(
    attackerStats: { Force: { value: number }, Dexterite: { value: number } }, 
    weaponDamage: number, 
    defenderDefense: number, 
    successDegree: DegreeOfSuccess
): number {
    const baseAttack = (attackerStats.Force.value / 5) + (attackerStats.Dexterite.value / 10);
    const totalAttackPower = baseAttack + weaponDamage;
    
    const mitigatedDamage = Math.max(1, totalAttackPower - (defenderDefense / 2));
    
    let finalDamage = mitigatedDamage;
    if (successDegree === 'critical_success') {
        finalDamage *= 1.5;
    }
    
    const randomFactor = (Math.random() * 0.3) - 0.15; // +/- 15% damage variance
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
        currentEnemy: { ...enemy, health: enemy.maxHealth },
    };
    
    return gameReducer(newState, { type: 'APPLY_GAME_EVENTS', payload: [journalEntry] });
}

export function handleCombatEnded(state: GameState): GameState {
    const journalEntry: GameEvent = { 
        type: 'JOURNAL_ENTRY_ADDED', 
        payload: { type: 'event', text: `Le combat est terminé.` } 
    };
    const newState = { ...state, currentEnemy: null };
    return gameReducer(newState, { type: 'APPLY_GAME_EVENTS', payload: [journalEntry] });
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

// A local, minimal reducer to apply journal entries within this module's logic
function gameReducer(state: GameState, action: { type: 'APPLY_GAME_EVENTS'; payload: GameEvent[] }): GameState {
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

export function processCombatTurn(player: Player, enemy: Enemy, choice: StoryChoice): { events: GameEvent[] } {
    const events: GameEvent[] = [];
    
    // Player's Turn
    if (choice.combatActionType === 'attack') {
        const weapon = player.inventory.find(i => i.type === 'weapon' && i.combatStats?.damage) || { name: 'Poings', combatStats: { damage: 2 }};
        const skillCheckResult = performSkillCheck(player.skills, player.stats, 'physiques.arme_blanche', enemy.defense, player.inventory, 0, player.physiology, player.momentum);
        events.push({ ...skillCheckResult, type: 'SKILL_CHECK_RESULT' });

        if (skillCheckResult.success) {
            const damageDealt = calculateDamage(player.stats, weapon.combatStats?.damage || 2, enemy.defense, skillCheckResult.degreeOfSuccess);
            const newEnemyHealth = Math.max(0, enemy.health - damageDealt);
            events.push({ type: 'COMBAT_ACTION', attacker: player.name, target: 'enemy', damage: damageDealt, newHealth: newEnemyHealth, action: `attaque ${enemy.name} avec ${weapon.name}` });
            
            if (newEnemyHealth <= 0) {
                events.push({ type: 'COMBAT_ENDED', winner: 'player' });
                events.push({ type: 'XP_GAINED', amount: 50 });
                events.push({ type: 'MONEY_CHANGED', amount: 10, description: `Butin sur ${enemy.name}` });
                return { events };
            }
        } else {
            events.push({ type: 'TEXT_EVENT', text: "Votre attaque manque sa cible !" });
        }
    } else if (choice.combatActionType === 'flee') {
        const skillCheckResult = performSkillCheck(player.skills, player.stats, 'physiques.esquive', 40, [], 0, player.physiology, player.momentum);
        events.push({ ...skillCheckResult, type: 'SKILL_CHECK_RESULT' });
        if (skillCheckResult.success) {
            events.push({ type: 'COMBAT_ENDED', winner: 'player' });
            events.push({ type: 'TEXT_EVENT', text: "Vous réussissez à vous enfuir !" });
            return { events };
        } else {
            events.push({ type: 'TEXT_EVENT', text: "Votre tentative de fuite échoue !" });
        }
    }
    
    // Enemy's Turn (if not defeated/escaped)
    const enemyDamage = calculateDamage({ Force: { value: enemy.stats.Force }, Dexterite: { value: enemy.stats.Dexterite } }, enemy.attack, player.stats.Constitution.value, 'success');
    const newPlayerHealth = Math.max(0, player.stats.Sante.value - enemyDamage);
    events.push({ type: 'COMBAT_ACTION', attacker: enemy.name, target: 'player', damage: enemyDamage, newHealth: newPlayerHealth, action: `attaque ${player.name}` });

    if (newPlayerHealth <= 0) {
        events.push({ type: 'COMBAT_ENDED', winner: 'enemy' });
        events.push({ type: 'TEXT_EVENT', text: "Vous avez été vaincu..." });
    }

    return { events };
}
