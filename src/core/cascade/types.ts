/**
 * @fileOverview Defines the core types for the modular cascade architecture.
 * This establishes the contract for all modules and the engine.
 */

import type { Player, StoryChoice, GameEvent } from '@/lib/types';

/** The context passed to each enrichment module. */
export type EnrichedContext = {
    player: Player;
    action: {
        type: StoryChoice['type'];
        payload: StoryChoice;
    };
    // The results of modules that this module depends on.
    dependencyResults?: {
        [moduleId: string]: ModuleEnrichmentResult;
    };
};

/** The result of a single enrichment module's execution. */
export interface ModuleEnrichmentResult {
    moduleId: string;
    data: any; // The enriched data produced by the module.
    enrichmentLevel: 'basic' | 'detailed' | 'comprehensive';
    dependenciesUsed: { [moduleId: string]: ModuleEnrichmentResult };
    executionTime: number; // in ms
}

/** Defines a dependency for a module. */
export interface ModuleDependency {
    moduleId: string;
    required: boolean;
    enrichmentLevel: 'basic' | 'detailed' | 'comprehensive'; // The level of data needed from the dependency.
}

/** The interface that all enrichment modules must implement. */
export interface EnrichmentModule {
    readonly id: string;
    readonly dependencies: ModuleDependency[];
    enrich(context: EnrichedContext): Promise<ModuleEnrichmentResult>;
}

/** The final, aggregated result of a full cascade execution. */
export interface CascadeResult {
    results: Map<string, ModuleEnrichmentResult>;
    executionChain: string[];
}
