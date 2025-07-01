import type { EnrichmentModule, EnrichedContext, ModuleEnrichmentResult, ModuleDependency } from '@/core/cascade/types';
import { fetchRecipesByArea } from '@/data-sources/food/themealdb-api';
import type { EnrichedRecipe } from '@/lib/types';

// A simple map for demonstration purposes. This would be more sophisticated.
const areaToCuisineMap: { [key: string]: string } = {
  'paris': 'French',
  'marseille': 'French',
  'lyon': 'French',
  'tokyo': 'Japanese',
  'new york': 'American',
  'rome': 'Italian',
  'london': 'British',
  'edinburgh': 'British',
};

function getCuisineFromLocation(locationName: string): string {
    const lowerLocation = locationName.toLowerCase();
    for (const key in areaToCuisineMap) {
        if (lowerLocation.includes(key)) {
            return areaToCuisineMap[key];
        }
    }
    return 'French'; // Default cuisine
}

export class RecettesModule implements EnrichmentModule {
  readonly id = 'recettes';
  readonly dependencies: ModuleDependency[] = [
    { moduleId: 'culture_locale', required: false, enrichmentLevel: 'basic' },
    // { moduleId: 'ingredients', required: true, enrichmentLevel: 'detailed' }, // Future dependency
  ];

  async enrich(context: EnrichedContext): Promise<ModuleEnrichmentResult> {
    const startTime = Date.now();
    const locationName = context.player.currentLocation.name;
    const cuisine = getCuisineFromLocation(locationName);

    const recipes: EnrichedRecipe[] = await fetchRecipesByArea(cuisine, 5);

    const data = {
        cuisine,
        recipes,
        message: recipes.length > 0 ? `Found ${recipes.length} recipes for ${cuisine} cuisine.` : `No recipes found for ${cuisine} cuisine.`
    };
    
    return {
      moduleId: this.id,
      data: data,
      enrichmentLevel: 'comprehensive',
      dependenciesUsed: context.dependencyResults || {},
      executionTime: Date.now() - startTime,
    };
  }
}
