
import type { EnrichmentModule, EnrichedContext, ModuleEnrichmentResult, ModuleDependency } from '@/core/cascade/types';
import type { EnrichedRecipe } from '@/lib/types';

export class CuisineModule implements EnrichmentModule {
  readonly id = 'cuisine';
  readonly dependencies: ModuleDependency[] = [
    { moduleId: 'recettes', required: true, enrichmentLevel: 'comprehensive' },
    { moduleId: 'ingredients', required: true, enrichmentLevel: 'detailed' },
    { moduleId: 'nutriments', required: false, enrichmentLevel: 'basic' }
  ];

  private canCookRecipe(recipe: EnrichedRecipe, availableIngredients: string[]): { canCook: boolean, missing: string[] } {
    const availableLower = availableIngredients.map(i => i.toLowerCase());
    const missing: string[] = [];
    
    if (!recipe.ingredients) {
        return { canCook: false, missing: [] };
    }

    for (const recipeIngredient of recipe.ingredients) {
      const ingredientNameLower = recipeIngredient.name.toLowerCase();
      // A simple heuristic to check for ingredients. e.g. "Chicken" in inventory matches "Chicken Breast" in recipe.
      if (!availableLower.find(invIngredient => invIngredient.includes(ingredientNameLower) || ingredientNameLower.includes(invIngredient))) {
        missing.push(recipeIngredient.name);
      }
    }
    
    return { canCook: missing.length === 0, missing };
  }

  async enrich(context: EnrichedContext): Promise<ModuleEnrichmentResult> {
    const startTime = Date.now();
    
    const recettesData = context.dependencyResults?.recettes?.data;
    const ingredientsData = context.dependencyResults?.ingredients?.data;
    const nutrimentsData = context.dependencyResults?.nutriments?.data;
    
    const allRecipes: EnrichedRecipe[] = recettesData?.recipes || [];
    const playerIngredients: string[] = ingredientsData?.playerIngredients || [];
    
    const cookableRecipes = allRecipes
      .map(recipe => ({
        ...recipe,
        cookability: this.canCookRecipe(recipe, playerIngredients)
      }))
      .filter(r => r.cookability.canCook);

    const nearlyCookableRecipes = allRecipes
      .map(recipe => ({...recipe, cookability: this.canCookRecipe(recipe, playerIngredients)}))
      .filter(r => !r.cookability.canCook && r.cookability.missing.length > 0 && r.cookability.missing.length <= 2);

    const opportunities: string[] = [];
    if (cookableRecipes.length > 0) {
      opportunities.push(`Vous avez de quoi préparer: ${cookableRecipes.map(r => r.name).join(', ')}.`);
    }
    if (nearlyCookableRecipes.length > 0) {
      const firstNearly = nearlyCookableRecipes[0];
      opportunities.push(`Il ne vous manque que ${firstNearly.cookability.missing.join(' et ')} pour cuisiner: ${firstNearly.name}.`);
    }

    const cuisineEnrichment = {
      message: "Analyse culinaire complète basée sur vos compétences, votre inventaire et l'environnement local.",
      cookableRecipes: cookableRecipes, // Pass the full recipe objects
      nearlyCookableRecipes: nearlyCookableRecipes.map(r => ({ name: r.name, missing: r.cookability.missing })),
      nutritionalStatus: nutrimentsData?.playerNeedsSummary || 'Non évalué.',
      nutritionalRecommendations: nutrimentsData?.recommendations || [],
      cookingOpportunities: opportunities,
    };

    return {
      moduleId: this.id,
      data: cuisineEnrichment,
      enrichmentLevel: 'comprehensive',
      dependenciesUsed: Object.keys(context.dependencyResults || {}),
      executionTime: Date.now() - startTime,
    };
  }
}
