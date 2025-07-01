import type { EnrichmentModule, EnrichedContext, ModuleEnrichmentResult, ModuleDependency } from '@/core/cascade/types';
import type { IntelligentItem } from '@/lib/types';

const COMMON_MARKET_INGREDIENTS = ['Farine', 'Oeuf', 'Lait', 'Sucre', 'Beurre', 'Poulet', 'Tomate', 'Oignon', 'Pomme de terre', 'Fromage'];

export class IngredientsModule implements EnrichmentModule {
  readonly id = 'ingredients';
  readonly dependencies: ModuleDependency[] = [];

  async enrich(context: EnrichedContext): Promise<ModuleEnrichmentResult> {
    const startTime = Date.now();
    
    const playerInventory: IntelligentItem[] = context.player.inventory || [];
    
    const playerIngredients = playerInventory
      .filter(item => item.type === 'consumable')
      .map(item => item.name);

    // In a real scenario, this would check local markets via OSM, player inventory, etc.
    const data = {
      playerIngredients: Array.from(new Set(playerIngredients)),
      localMarketIngredients: COMMON_MARKET_INGREDIENTS,
      message: "Analyse des ingrédients disponibles dans l'inventaire et sur le marché local."
    };

    return {
      moduleId: this.id,
      data: data,
      enrichmentLevel: 'detailed',
      dependenciesUsed: context.dependencyResults || {},
      executionTime: Date.now() - startTime,
    };
  }
}
