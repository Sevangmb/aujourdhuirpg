/**
 * @fileOverview Manages the cascade of modules to enrich a simple object into a detailed one.
 */

import type {
  BaseObject,
  EnrichedObject,
  ObjectEnrichmentModule,
  ObjectEnrichmentContext,
} from './object-types';

export class ObjectCascadeManager {
  private objectModules = new Map<string, ObjectEnrichmentModule>();

  /**
   * 🎯 MAIN FUNCTION - Transforms a simple object into an ultra-rich one.
   */
  async enrichObject(
    baseObject: BaseObject,
    context: ObjectEnrichmentContext
  ): Promise<EnrichedObject> {
    const startTime = Date.now();
    console.log(`🎒 Enriching object: ${baseObject.name}`);

    // 1. Determine which modules to use based on the object's type
    const relevantModules = this.determineRelevantModules(baseObject.type);
    console.log(`📋 Selected modules for type "${baseObject.type}": ${relevantModules.join(', ')}`);

    // 2. Execute all relevant modules in a predefined sequence
    let enrichedObject: EnrichedObject = { ...baseObject };
    const executionChain: string[] = [];

    for (const moduleId of relevantModules) {
      const module = this.objectModules.get(moduleId);
      if (module) {
        try {
            const result = await module.enrichObject(enrichedObject, context);
            enrichedObject = { ...enrichedObject, ...result.enrichmentData };
            executionChain.push(moduleId);
            console.log(`✅ ${moduleId} finished.`);
        } catch (error) {
            console.error(`❌ Error in module ${moduleId}:`, error);
        }
      } else {
        console.warn(`Module [${moduleId}] not found for object enrichment.`);
      }
    }

    // 3. Add enrichment metadata
    enrichedObject.enrichmentMetadata = {
      executionChain,
      enrichmentDepth: executionChain.length,
      enrichmentTime: Date.now() - startTime,
    };

    console.log(
      `🎉 Enrichment complete: ${
        Object.keys(enrichedObject).length
      } properties generated.`
    );
    return enrichedObject;
  }

  /**
   * Determines the sequence of modules to execute based on the object type.
   * The order of modules in the array matters for the cascade.
   */
  private determineRelevantModules(
    objectType: BaseObject['type']
  ): string[] {
    const moduleMap: Partial<Record<BaseObject['type'], string[]>> = {
      weapon: [
        'proprietes_armes',
        'valeur_economique',
        'enchantements',
        'historique_objet',
      ],
      armor: [
        'valeur_economique',
        'enchantements',
        'historique_objet',
      ],
       wearable: [ // For items like jackets
        'valeur_economique',
        'enchantements',
        'historique_objet',
      ],
      tool: [
        'valeur_economique',
        'historique_objet',
      ],
    };

    // For any other type, apply a generic set of modules
    const genericModules = ['valeur_economique', 'historique_objet'];

    return moduleMap[objectType] || genericModules;
  }

  /**
   * Registers an enrichment module into the manager.
   * @param module The module instance to register.
   */
  registerModule(module: ObjectEnrichmentModule): void {
    if (this.objectModules.has(module.id)) {
      console.warn(`📦 Module [${module.id}] is already registered. Overwriting.`);
    }
    this.objectModules.set(module.id, module);
    console.log(`📦 Module ${module.id} registered.`);
  }
}
