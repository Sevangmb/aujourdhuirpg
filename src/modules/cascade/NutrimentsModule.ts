import type { EnrichmentModule, EnrichedContext, ModuleEnrichmentResult, ModuleDependency } from '@/core/cascade/types';
import type { AdvancedPhysiologySystem } from '@/lib/types';

export class NutrimentsModule implements EnrichmentModule {
  readonly id = 'nutriments';
  readonly dependencies: ModuleDependency[] = [];

  async enrich(context: EnrichedContext): Promise<ModuleEnrichmentResult> {
    const startTime = Date.now();
    
    const physiology = context.player.physiology as AdvancedPhysiologySystem;
    const hunger = physiology.basic_needs.hunger.level;
    const thirst = physiology.basic_needs.thirst.level;

    let playerNeeds = 'Vos besoins nutritionnels semblent équilibrés.';
    const recommendations: string[] = [];

    if (hunger < 40) {
      playerNeeds = 'Votre corps réclame un repas substantiel pour refaire le plein d\'énergie.';
      recommendations.push('Chercher un repas riche en protéines et en glucides.');
    } else if (hunger < 70) {
      playerNeeds = 'Une petite faim se fait sentir. Un en-cas serait une bonne idée.';
      recommendations.push('Consommer un fruit ou une barre énergétique.');
    }

    if (thirst < 50) {
      playerNeeds += ' Vous êtes également déshydraté(e).';
      recommendations.push('Boire de l\'eau est une priorité.');
    }
    
    const data = {
      playerNeedsSummary: playerNeeds,
      recommendations,
      currentHunger: hunger,
      currentThirst: thirst,
    };

    return {
      moduleId: this.id,
      data: data,
      enrichmentLevel: 'basic',
      dependenciesUsed: context.dependencyResults || {},
      executionTime: Date.now() - startTime,
    };
  }
}
