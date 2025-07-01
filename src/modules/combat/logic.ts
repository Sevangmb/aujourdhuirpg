
/**
 * @fileOverview Contains the core business logic for the Combat module.
 */

import type { GameState, Player, GameEvent } from '@/lib/types';
import type { Enemy } from './types';
import { performSkillCheck } from '@/lib/skill-check';

export function calculateDamage(attackerStats: Player['stats'], weaponDamage: number, defenderStats: Enemy): number {
    const attackPower = (attackerStats.Force.value / 5) + (attackerStats.Dexterite.value / 10) + weaponDamage;
    const defensePower = defenderStats.defense / 2;
    const damage = attackPower - defensePower;
    // Add some randomness
    const randomFactor = (Math.random() - 0.5) * (damage * 0.2); // +/- 10%
    const finalDamage = Math.round(damage + randomFactor);
    return Math.max(1, finalDamage);
}

export function processCombatTurn(player: Player, enemy: Enemy, choice: any): { events: GameEvent[] } {
    const events: GameEvent[] = [];

    if (choice.combatActionType === 'attack') {
        const weapon = player.inventory.find(i => i.type === 'tool' && i.combatStats?.damage) || { name: "Poings", combatStats: { damage: 1 } };
        const playerDamage = calculateDamage(player.stats, weapon.combatStats!.damage!, enemy);
        const newEnemyHealth = enemy.health - playerDamage;
        
        events.push({
            type: 'COMBAT_ACTION',
            attacker: player.name,
            target: 'enemy',
            damage: playerDamage,
            newHealth: newEnemyHealth,
            action: `attaque avec ${weapon.name || 'ses poings'}`,
        });

        if (newEnemyHealth <= 0) {
            events.push({ type: 'COMBAT_ENDED', winner: 'player' });
            // Loot & XP
            events.push({ type: 'XP_GAINED', amount: enemy.attack + enemy.defense }); 
            if (Math.random() < 0.5) { // 50% chance to drop money
                const moneyDropped = Math.floor(Math.random() * (enemy.attack * 2)) + 5;
                events.push({ type: 'MONEY_CHANGED', amount: moneyDropped, finalBalance: player.money + moneyDropped, description: `Butin sur ${enemy.name}` });
            }
            return { events };
        }

        const enemyDamage = Math.max(1, enemy.attack - (player.stats.Constitution.value / 5));
        const newPlayerHealth = player.stats.Sante.value - enemyDamage;

        events.push({
            type: 'COMBAT_ACTION',
            attacker: enemy.name,
            target: 'player',
            damage: enemyDamage,
            newHealth: newPlayerHealth,
            action: 'riposte',
        });
        
        if (newPlayerHealth <= 0) {
            events.push({ type: 'COMBAT_ENDED', winner: 'enemy' });
        }
    } else if (choice.combatActionType === 'flee') {
        const skillCheckResult = performSkillCheck(player.skills, player.stats, 'physiques.esquive', 60, player.inventory, 0, player.physiology, player.momentum);
        events.push(skillCheckResult as any); // cast for now
        if (skillCheckResult.success) {
            events.push({ type: 'COMBAT_ENDED', winner: 'player' }); // Player escaped
        } else {
             const enemyDamage = Math.max(1, enemy.attack - (player.stats.Constitution.value / 10)); // Attack of opportunity
             const newPlayerHealth = player.stats.Sante.value - enemyDamage;
             events.push({ type: 'COMBAT_ACTION', attacker: enemy.name, target: 'player', damage: enemyDamage, newHealth: newPlayerHealth, action: 'attaque dans le dos' });
             if (newPlayerHealth <= 0) {
                 events.push({ type: 'COMBAT_ENDED', winner: 'enemy' });
             }
        }
    } else if (choice.id.startsWith('combat_use_item_')) {
        const instanceId = choice.id.replace('combat_use_item_', '');
        const item = player.inventory.find(i => i.instanceId === instanceId);
        if (item && item.effects?.Sante) {
            events.push({ type: 'ITEM_REMOVED', itemId: item.id, itemName: item.name, quantity: 1 });
            const newHealth = Math.min(player.stats.Sante.max!, player.stats.Sante.value + (item.effects.Sante as any));
            events.push({ type: 'PLAYER_STAT_CHANGE', stat: 'Sante', change: (item.effects.Sante as any), finalValue: newHealth });
        }
    }


    return { events };
}

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

export function handleCombatStarted(state: GameState, enemy: Enemy): GameState {
    return { ...state, currentEnemy: enemy };
}

export function handleCombatEnded(state: GameState): GameState {
    return { ...state, currentEnemy: null };
}
