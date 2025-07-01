/**
 * @fileOverview Entry point for the Player module.
 * It defines the module for the cascade system.
 */
import type { CascadeModule, ModuleInstance, ModuleResult } from '@/core/cascade/types';
import type { GameState } from '@/lib/types';
import { addXp } from './logic';

class PlayerModule implements ModuleInstance {
  async execute(state: GameState, payload: { xpToAdd: number }): Promise<ModuleResult> {
    if (!state.player) {
      return { success: false, message: 'Player not found in state' };
    }

    if (payload?.xpToAdd) {
      const { newProgression, events } = addXp(state.player.progression, payload.xpToAdd);
      // The event will be applied by the state manager
      return { success: true, events };
    }
    
    return { success: true, events: [] };
  }
}

export const playerModule: CascadeModule = {
  name: 'player',
  dependencies: [], // Player module is often a root or has no cascade dependencies
  load: async () => new PlayerModule(),
};
