/**
 * @fileOverview Contains the core business logic for the Economy module.
 */

import type { GameState } from '@/lib/types';
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
