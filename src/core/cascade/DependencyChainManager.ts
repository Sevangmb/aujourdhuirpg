/**
 * @fileOverview Le cœur de l'architecture en cascade. Ce gestionnaire enregistre les modules,
 * résout leurs dépendances, et exécute la chaîne d'enrichissement dans le bon ordre.
 */

import type { 
  EnrichmentModule, 
  EnrichedContext, 
  ModuleDependency, 
  ModuleEnrichmentResult, 
  CascadeResult 
} from './types';

export class DependencyChainManager {
  private modules = new Map<string, EnrichmentModule>();
  private dependencyGraph = new Map<string, ModuleDependency[]>();

  /**
   * Enregistre un nouveau module d'enrichissement dans le gestionnaire.
   * @param module L'instance du module à enregistrer.
   */
  public registerModule(module: EnrichmentModule): void {
    if (this.modules.has(module.id)) {
      console.warn(`Module [${module.id}] is already registered. Overwriting.`);
    }
    this.modules.set(module.id, module);
    this.dependencyGraph.set(module.id, module.dependencies);
  }

  /**
   * Résout la chaîne de dépendances et exécute chaque module dans l'ordre,
   * en enrichissant le contexte à chaque étape.
   * @param context Le contexte initial.
   * @param rootModuleId L'ID du module racine à partir duquel démarrer la cascade.
   * @returns Une promesse qui se résout avec les résultats complets de la cascade.
   */
  public async enrichWithCascade(context: EnrichedContext, rootModuleId: string): Promise<CascadeResult> {
    const startTime = Date.now();
    
    // 1. Résoudre la chaîne complète de dépendances (ordre topologique)
    const executionChain = this.resolveExecutionChain(rootModuleId);
    
    // 2. Exécuter chaque module dans l'ordre, en injectant les résultats des précédents
    const enrichmentResults = new Map<string, ModuleEnrichmentResult>();
    
    for (const moduleId of executionChain) {
      const module = this.modules.get(moduleId);
      if (!module) {
        throw new Error(`Dependency Error: Module [${moduleId}] is required but not registered.`);
      }

      const contextForModule = this.injectDependencyResults(context, moduleId, enrichmentResults);
      const moduleStartTime = Date.now();
      const result = await module.enrich(contextForModule);
      // Ensure executionTime is part of the result
      if(!result.executionTime) {
        result.executionTime = Date.now() - moduleStartTime;
      }
      enrichmentResults.set(moduleId, result);
    }
    
    console.log(`Cascade for [${rootModuleId}] executed in ${Date.now() - startTime}ms. Chain: ${executionChain.join(' -> ')}`);

    return { 
      results: enrichmentResults, 
      executionChain: executionChain 
    };
  }
  
  /**
   * Résout l'ordre d'exécution des modules via un tri topologique (DFS).
   * @param rootModuleId L'ID du module de départ.
   * @returns Un tableau d'IDs de modules dans l'ordre d'exécution.
   */
  private resolveExecutionChain(rootModuleId: string): string[] {
    const sortedChain: string[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const visit = (moduleId: string) => {
      if (!this.modules.has(moduleId)) {
        throw new Error(`Dependency Error: Module [${moduleId}] is listed as a dependency but is not registered.`);
      }
      if (recursionStack.has(moduleId)) {
        throw new Error(`Circular Dependency Detected: Module [${moduleId}] is part of a dependency cycle.`);
      }
      if (visited.has(moduleId)) {
        return;
      }

      visited.add(moduleId);
      recursionStack.add(moduleId);

      const dependencies = this.dependencyGraph.get(moduleId) || [];
      for (const dep of dependencies) {
        visit(dep.moduleId);
      }
      
      recursionStack.delete(moduleId);
      sortedChain.push(moduleId);
    };

    visit(rootModuleId);
    return sortedChain;
  }
  
  /**
   * Crée une copie du contexte et y injecte les résultats des dépendances requises pour un module.
   * @param baseContext Le contexte de base.
   * @param moduleId L'ID du module qui va être exécuté.
   * @param allResults La map de tous les résultats déjà calculés.
   * @returns Un nouveau contexte enrichi avec les résultats des dépendances.
   */
  private injectDependencyResults(baseContext: EnrichedContext, moduleId: string, allResults: Map<string, ModuleEnrichmentResult>): EnrichedContext {
    const contextForModule = { ...baseContext, dependencyResults: {} };
    const dependencies = this.dependencyGraph.get(moduleId) || [];

    for (const dep of dependencies) {
      const result = allResults.get(dep.moduleId);
      if (dep.required && !result) {
        throw new Error(`Dependency Injection Error: Required dependency [${dep.moduleId}] result not available for module [${moduleId}].`);
      }
      if (result) {
        if (!contextForModule.dependencyResults) {
          contextForModule.dependencyResults = {};
        }
        contextForModule.dependencyResults[dep.moduleId] = result;
      }
    }

    return contextForModule;
  }
}
