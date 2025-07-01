
import type { StoryChoice, GameState } from '@/lib/types';
import type { CascadeResult, EnrichedContext } from './types';
import { cascadeManager } from './cascade-manager';

/**
 * Determines which root module(s) to trigger for the cascade based on the player's choice.
 * This mapping is central to the cascade system's ability to react to different actions.
 * @param choice The player's selected StoryChoice.
 * @returns An array of root module IDs to execute.
 */
function determineRelevantModules(choice: StoryChoice): string[] {
  const choiceText = choice.text.toLowerCase();
  const choiceType = choice.type;

  // Specific keyword triggers
  if (choiceText.includes('livre') || choiceText.includes('bibliothèque') || choiceText.includes('rechercher') || choiceText.includes('lire')) {
    return ['livre'];
  }
  if (choiceType === 'job' || choiceText.includes('manger') || choiceText.includes('cuisiner') || choiceText.includes('restaurant')) {
    return ['cuisine'];
  }
  if (choiceText.includes('enquêter') || choiceText.includes('chercher des indices')) {
      return ['culture_locale']; // Could be a future 'investigation' module
  }

  // General triggers based on action type
  switch (choiceType) {
    case 'social':
      // Could trigger a future 'social_dynamics' module
      return ['culture_locale']; 
    case 'exploration':
      return ['culture_locale'];
    case 'observation':
       return ['culture_locale'];
    default:
      // Default to a general analysis for other actions
      return ['culture_locale'];
  }
}

/**
 * Builds the initial context for the cascade from the current game state and action.
 * @param state The current GameState.
 * @param action The player's chosen action.
 * @returns The base EnrichedContext.
 */
function buildBaseContext(state: GameState, action: StoryChoice): EnrichedContext {
    if (!state.player) {
        throw new Error("Cannot build cascade context without a player in the game state.");
    }
    return {
        player: state.player,
        action: {
            type: action.type,
            payload: action,
        },
    };
}


/**
 * The main function of the cascade system. It orchestrates the enrichment process for a given action.
 * @param state The game state *after* the action's deterministic effects have been calculated.
 * @param action The player's chosen action.
 * @returns A promise that resolves to the combined results of the cascade, or null if no modules were triggered.
 */
export async function runCascadeForAction(state: GameState, action: StoryChoice): Promise<CascadeResult | null> {
    const modulesToRun = determineRelevantModules(action);
    if (modulesToRun.length === 0) {
        return null;
    }

    const baseContext = buildBaseContext(state, action);
    
    // For now, we run the first relevant module. This can be expanded to run multiple in parallel and merge results.
    const rootModuleId = modulesToRun[0];

    try {
        const cascadeResult = await cascadeManager.enrichWithCascade(baseContext, rootModuleId);
        return cascadeResult;
    } catch (error) {
        console.error(`Error during cascade execution for root module "${rootModuleId}":`, error);
        // In a production environment, you might want to return a partial result or specific error object.
        // For now, we return null to allow the game to continue without enriched context.
        return null;
    }
}
