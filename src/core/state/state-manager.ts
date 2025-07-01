/**
 * @fileOverview A centralized state manager for the game.
 * This will act as the single source of truth, accessible by all modules.
 */
import type { GameState } from '@/lib/types';
import type { GameAction } from '@/lib/game-logic'; // We might create a new action type later
import { gameReducer } from '@/lib/game-logic';
import { eventBus } from '../events/event-bus';

class StateManager {
  private currentState: GameState;

  constructor(initialState: GameState) {
    this.currentState = initialState;
    console.log('[StateManager] Initialized with state.');
  }

  /**
   * Returns a deep copy of the current game state.
   */
  getState(): GameState {
    // Return a deep copy to prevent direct mutation
    return JSON.parse(JSON.stringify(this.currentState));
  }

  /**
   * Dispatches an action to update the state via the reducer.
   * @param action The action to dispatch.
   */
  dispatch(action: GameAction): void {
    console.log('[StateManager] Dispatching action:', action.type);
    
    const previousState = this.getState();
    this.currentState = gameReducer(this.currentState, action);

    // Notify listeners about the state change
    eventBus.dispatch('state:changed', {
      newState: this.currentState,
      oldState: previousState,
      action: action,
    });
  }
}

// NOTE: This is a placeholder for how it might be instantiated.
// The actual instance will be managed in the GameContext or a similar top-level provider.
export { StateManager };
