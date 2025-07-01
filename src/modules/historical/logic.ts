/**
 * @fileOverview Contains the core business logic for the Historical module.
 */

import type { GameState, HistoricalContact } from '@/modules/historical/types';

/**
 * Handles adding a new historical contact to the player's state.
 * @param state The current game state.
 * @param contact The historical contact to add.
 * @returns The updated game state.
 */
export function handleAddHistoricalContact(state: GameState, contact: HistoricalContact): GameState {
    if (!state.player) {
        console.warn("handleAddHistoricalContact called without a player in state.");
        return state;
    }
    const newPlayerState = {
        ...state.player,
        historicalContacts: [...(state.player.historicalContacts || []), contact]
    };
    return { ...state, player: newPlayerState };
}
