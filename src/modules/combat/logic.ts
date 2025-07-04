
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
    
    // The reducer will handle adding the event to the journal
    return newState;
}

export function handleCombatEnded(state: GameState): GameState {
    const journalEntry: GameEvent = { 
        type: 'JOURNAL_ENTRY_ADDED', 
        payload: { type: 'event', text: `Le combat est terminé.` } 
    };
    const newState = { ...state, currentEnemy: null };
     // The reducer will handle adding the event to the journal
    return newState;
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

export function processCombatTurn(player: Player, enemy: Enemy, choice: StoryChoice): { events: GameEvent[] } {
    const events: GameEvent[] = [];
    
    let playerTurnTaken = false;

    // Player's Turn
    if (choice.combatActionType === 'attack') {
        playerTurnTaken = true;
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
        playerTurnTaken = true;
        const skillCheckResult = performSkillCheck(player.skills, player.stats, 'physiques.esquive', 40, [], 0, player.physiology, player.momentum);
        events.push({ ...skillCheckResult, type: 'SKILL_CHECK_RESULT' });
        if (skillCheckResult.success) {
            events.push({ type: 'COMBAT_ENDED', winner: 'player' });
            events.push({ type: 'TEXT_EVENT', text: "Vous réussissez à vous enfuir !" });
            return { events };
        } else {
            events.push({ type: 'TEXT_EVENT', text: "Votre tentative de fuite échoue !" });
        }
    } else if (choice.combatActionType === 'use_item') {
        playerTurnTaken = true;
        const item = player.inventory.find(i => i.instanceId === choice.itemReference);
        if (item && item.type === 'consumable' && item.effects?.Sante) {
            events.push({ type: 'ITEM_USED', instanceId: item.instanceId, itemName: item.name, description: `Utilise ${item.name} pour se soigner en combat.` });
            // The ITEM_USED event will be processed by the reducer to apply effects
        } else {
             events.push({ type: 'TEXT_EVENT', text: "Vous ne pouvez pas utiliser cet objet en combat." });
             playerTurnTaken = false; // The turn was not successfully used
        }
    }
    
    // Enemy's Turn (if player acted and combat is not over)
    if (playerTurnTaken) {
        // A simplified representation of the enemy's skill system for the check
        const enemySkills = { physiques: { arme_blanche: { level: enemy.attack, xp: 0, xpToNext: 100 } } };
        // A simplified representation of the enemy's stats for the check
        const enemyPlayerStats = { Dexterite: { value: enemy.stats.Dexterite }, Force: { value: enemy.stats.Force } };

        const skillCheckResult = performSkillCheck(enemySkills as any, enemyPlayerStats as any, 'physiques.arme_blanche', player.stats.Discretion.value, [], 0, {basic_needs: {hunger:{level:100, satisfaction_quality: 100, cultural_craving: '', dietary_preferences: [], food_memories:[]}, thirst:{level:100, hydration_quality: 100, climate_adjustment: 0, beverage_tolerance: [], cultural_beverage_preference: ''}}}, {momentum_bonus:0, desperation_bonus: 0, consecutive_failures: 0, consecutive_successes: 0} as any);

        if (skillCheckResult.success) {
            const enemyDamage = calculateDamage({ Force: { value: enemy.stats.Force }, Dexterite: { value: enemy.stats.Dexterite } }, enemy.attack, player.stats.Constitution.value, skillCheckResult.degreeOfSuccess);
            const newPlayerHealth = Math.max(0, player.stats.Sante.value - enemyDamage);
            events.push({ type: 'COMBAT_ACTION', attacker: enemy.name, target: 'player', damage: enemyDamage, newHealth: newPlayerHealth, action: `attaque ${player.name}` });

            if (newPlayerHealth <= 0) {
                events.push({ type: 'COMBAT_ENDED', winner: 'enemy' });
                events.push({ type: 'TEXT_EVENT', text: "Vous avez été vaincu..." });
            }
        } else {
             events.push({ type: 'TEXT_EVENT', text: `L'attaque de ${enemy.name} vous manque.` });
        }
    }

    return { events };
}
