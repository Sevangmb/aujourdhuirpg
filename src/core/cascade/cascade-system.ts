
import type { StoryChoice, GameState } from '@/lib/types';
import type { CascadeResult, EnrichedContext, ModuleEnrichmentResult } from './types';
import { cascadeManager } from './cascade-manager';

/**
 * Determines which root module(s) to trigger for the cascade based on the player's action and location.
 * This mapping is central to the cascade system's ability to react to different actions.
 * @param choice The player's selected StoryChoice.
 * @param state The current GameState.
 * @returns An array of root module IDs to execute.
 */
function determineRelevantModules(choice: StoryChoice, state: GameState): string[] {
  const choiceText = choice.text.toLowerCase();
  const choiceType = choice.type;
  const modules = new Set<string>();

  // Use location type from the player's current location, which now should be the POI subCategory
  const locationType = state.player?.currentLocation.zone?.name;

  // 1. Keyword-based triggers from choice text (high priority)
  if (choiceText.includes('livre') || choiceText.includes('bibliothèque') || choiceText.includes('rechercher') || choiceText.includes('lire')) {
    modules.add('livre');
  }
  if (choiceType === 'job' || choiceText.includes('manger') || choiceText.includes('cuisiner') || choiceText.includes('restaurant')) {
    modules.add('cuisine');
  }
  if (choiceText.includes('enquêter') || choiceText.includes('chercher des indices')) {
      modules.add('culture_locale');
  }

  // 2. Location-based triggers (adds context based on where the player is)
  if (locationType === 'librairie' || locationType === 'bibliotheque') {
    modules.add('livre');
  }
  if (locationType === 'restaurant' || locationType === 'cafe' || locationType === 'boulangerie' || locationType === 'fast_food') {
    modules.add('cuisine');
  }

  // 3. General triggers (always add context for broad actions)
  if(modules.size === 0 && (choiceType === 'exploration' || choiceType === 'observation' || choiceType === 'social')) {
      modules.add('culture_locale');
  }

  return Array.from(modules);
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
    const rootModulesToRun = determineRelevantModules(action, state);
    if (rootModulesToRun.length === 0) {
        return null;
    }

    const baseContext = buildBaseContext(state, action);
    
    try {
        const cascadePromises = rootModulesToRun.map(rootModuleId => 
            cascadeManager.enrichWithCascade(baseContext, rootModuleId)
        );
        
        const allResults = await Promise.all(cascadePromises);

        // Merge the results from all parallel cascades into one
        const mergedResults: Map<string, ModuleEnrichmentResult> = new Map();
        const mergedExecutionChains = new Set<string>();

        for (const result of allResults) {
            result.results.forEach((value, key) => {
                mergedResults.set(key, value);
            });
            result.executionChain.forEach(moduleId => {
                mergedExecutionChains.add(moduleId);
            });
        }
        
        const finalResult: CascadeResult = {
            results: mergedResults,
            executionChain: Array.from(mergedExecutionChains), // Note: this doesn't preserve inter-cascade order, but that's ok.
        };

        return finalResult;

    } catch (error) {
        console.error(`Error during parallel cascade execution:`, error);
        return null;
    }
}
