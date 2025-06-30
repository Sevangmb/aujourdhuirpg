
/**
 * @fileOverview Ce fichier définit les interfaces et les types de base pour le système d'architecture modulaire en cascade.
 * Il établit le contrat que tous les modules d'enrichissement et le gestionnaire de dépendances doivent respecter.
 */

import type { Player, StoryChoice } from '@/lib/types';

/**
 * A simplified action representation for the cascade context.
 */
export interface GameActionForCascade {
  type: string; // e.g., 'job', 'exploration'
  payload: StoryChoice | any;
}


/**
 * Le contexte enrichi qui est passé et enrichi par chaque module de la cascade.
 */
export interface EnrichedContext {
  player: Player; 
  action: GameActionForCascade; 
  
  // Les résultats des dépendances sont injectés ici par le DependencyChainManager
  dependencyResults?: {
    [moduleId: string]: ModuleEnrichmentResult;
  };
  
  // D'autres contextes peuvent être ajoutés par les modules
  [key: string]: any; 
}

/**
 * Représente la dépendance d'un module envers un autre.
 */
export interface ModuleDependency {
  moduleId: string;
  required: boolean;
  enrichmentLevel: 'basic' | 'detailed' | 'comprehensive';
}

/**
 * Le contrat que chaque module d'enrichissement doit implémenter.
 */
export interface EnrichmentModule {
  readonly id: string;
  readonly dependencies: ModuleDependency[];
  enrich(context: EnrichedContext): Promise<ModuleEnrichmentResult>;
}

/**
 * Le résultat produit par un seul module d'enrichissement.
 */
export interface ModuleEnrichmentResult {
  moduleId: string;
  data: any; // Les données spécifiques produites par le module
  enrichmentLevel: 'basic' | 'detailed' | 'comprehensive';
  dependenciesUsed: { [moduleId: string]: ModuleEnrichmentResult }; // Une copie des dépendances utilisées
  executionTime: number; // Temps d'exécution en ms
}

/**
 * Le résultat final de l'exécution d'une cascade complète pour un module racine.
 */
export interface CascadeResult {
  results: Map<string, ModuleEnrichmentResult>;
  executionChain: string[];
}
