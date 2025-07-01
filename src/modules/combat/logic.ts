
/**
 * @fileOverview Contains the core business logic for the Combat module.
 */

import type { Player, DegreeOfSuccess } from '@/lib/types';
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
    
    // Defense reduces damage, but not to zero
    const mitigatedDamage = Math.max(1, totalAttackPower - (defenderDefense / 2));
    
    // Apply critical success/failure modifiers
    let finalDamage = mitigatedDamage;
    if (successDegree === 'critical_success') {
        finalDamage *= 1.5;
    }
    
    // Add randomness (+/- 15%)
    const randomFactor = (Math.random() * 0.3) - 0.15; // from -0.15 to +0.15
    finalDamage *= (1 + randomFactor);
    
    return Math.round(Math.max(1, finalDamage));
}

// Note: The main combat turn processing logic is in lib/game-logic.ts 
// to avoid circular dependencies with the event system and skill checks.
