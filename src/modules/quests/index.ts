/**
 * @fileOverview Entry point for the Quest module.
 */
import type { CascadeModule, ModuleInstance, ModuleResult } from '@/core/cascade/types';
import type { GameState } from '@/lib/types';

class QuestModule implements ModuleInstance {
  async execute(state: GameState, payload: any): Promise<ModuleResult> {
    // This module's logic is primarily driven by events handled in the main reducer for now.
    // The cascade engine could call this for complex quest logic in the future.
    console.log('[QuestModule] Executing with payload:', payload);
    return { success: true, events: [] };
  }
}

export const questModule: CascadeModule = {
  name: 'quest',
  dependencies: ['player'], // Quests are tied to the player
  load: async () => new QuestModule(),
};
