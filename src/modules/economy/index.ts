/**
 * @fileOverview Entry point for the Economy module.
 * It defines the module for the cascade system.
 */
import type { CascadeModule, ModuleInstance, ModuleResult } from '@/core/cascade/types';
import type { GameState } from '@/lib/types';
import { handleMoneyChange } from './logic';

class EconomyModule implements ModuleInstance {
  async execute(state: GameState, payload: { action: 'transact', amount: number, description: string }): Promise<ModuleResult> {
    if (!state.player) {
      return { success: false, errors: [{ module: 'economy', message: 'Player not found in state' }] };
    }

    // This is a simplified example of how the cascade engine would use the module.
    // The core logic is in logic.ts and is applied via the gameReducer for now.
    if (payload.action === 'transact') {
      const event = {
        type: 'MONEY_CHANGED',
        amount: payload.amount,
        finalBalance: 0, // Placeholder
        description: payload.description,
      };
      return { success: true, events: [event] };
    }
    
    return { success: true, events: [] };
  }
}

export const economyModule: CascadeModule = {
  name: 'economy',
  dependencies: ['player'], // Economy depends on the player's state
  load: async () => new EconomyModule(),
};
