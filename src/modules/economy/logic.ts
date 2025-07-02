
/**
 * @fileOverview Contains the core business logic for the Economy module.
 */

import type { GameState, Player, Quest, AdvancedSkillSystem } from '@/lib/types';
import type { Transaction, TransactionCategory } from './types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Handles a change in the player's money and logs the transaction.
 * @param state The current game state.
 * @param amount The amount of money to add (positive) or remove (negative).
 * @param description A description of the transaction.
 * @returns The updated game state.
 */
export function handleMoneyChange(state: GameState, amount: number, description: string): GameState {
    if (!state.player) {
        console.warn("handleMoneyChange called without a player in state.");
        return state;
    }

    const player = state.player;
    const nowISO = new Date().toISOString();
    const newBalance = player.money + amount;
    
    // Determine a default category. This could be improved later.
    let category: TransactionCategory = amount > 0 ? 'other_income' : 'other_expense';
    if(description.toLowerCase().includes('achat')) category = 'shopping';
    if(description.toLowerCase().includes('transport')) category = 'transport';
    if(description.toLowerCase().includes('récompense')) category = 'quest_reward';
    if(description.toLowerCase().includes('butin')) category = 'found_money';


    const newTransaction: Transaction = {
        id: uuidv4(),
        amount: amount,
        description: description,
        timestamp: nowISO,
        type: amount > 0 ? 'income' : 'expense',
        category: category,
        locationName: player.currentLocation.name,
    };

    const newPlayer = {
        ...player,
        money: newBalance,
        transactionLog: [...(player.transactionLog || []), newTransaction],
    };

    return { ...state, player: newPlayer };
}


/**
 * Calculates a fair monetary reward for a job quest based on the player's skill level.
 * @param playerSkills The player's complete skill object.
 * @param quest The quest object, which should include a 'requiredSkill' hint.
 * @returns A number representing the calculated monetary reward.
 */
export function calculateJobReward(playerSkills: AdvancedSkillSystem, quest: Pick<Quest, 'requiredSkill'>): number {
    const requiredSkillPath = quest.requiredSkill;
    let skillLevel = 5; // Default base level if no skill specified or found

    if (requiredSkillPath) {
        const pathParts = requiredSkillPath.split('.');
        if (pathParts.length === 2) {
            const [category, skillName] = pathParts as [keyof AdvancedSkillSystem, string];
            const skillCategory = playerSkills[category];
            if (skillCategory && (skillCategory as any)[skillName]) {
                skillLevel = (skillCategory as any)[skillName].level;
            }
        }
    }

    // Tiered reward logic, now encapsulated in game logic
    if (skillLevel >= 50) return Math.floor(Math.random() * 91) + 60; // 60-150€
    if (skillLevel >= 25) return Math.floor(Math.random() * 31) + 30; // 30-60€
    if (skillLevel >= 10) return Math.floor(Math.random() * 16) + 15; // 15-30€
    return Math.floor(Math.random() * 11) + 5; // 5-15€
}
