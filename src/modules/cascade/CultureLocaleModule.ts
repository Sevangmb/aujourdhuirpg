import type { EnrichmentModule, EnrichedContext, ModuleEnrichmentResult, ModuleDependency } from '@/core/cascade/types';
import { fetchWikipediaSummary } from '@/data-sources/culture/wikipedia-api';

export class CultureLocaleModule implements EnrichmentModule {
  readonly id = 'culture_locale';
  readonly dependencies: ModuleDependency[] = []; // No dependencies for this module

  async enrich(context: EnrichedContext): Promise<ModuleEnrichmentResult> {
    const startTime = Date.now();
    const locationName = context.player.currentLocation.name;

    const wikiData = await fetchWikipediaSummary(locationName);

    // Sanitize the summary to prevent JSON parsing errors from complex whitespace or special characters.
    const sanitizedSummary = (wikiData?.summary || 'Aucune information culturelle trouvée.')
        .replace(/[^\x00-\x7F]/g, "") // Remove non-ASCII characters
        .replace(/\s+/g, ' ') // Collapse whitespace
        .trim();

    const culturalData = {
      summary: sanitizedSummary,
      pageUrl: wikiData?.pageUrl,
    };

    return {
      moduleId: this.id,
      data: culturalData,
      enrichmentLevel: 'basic',
      dependenciesUsed: [],
      executionTime: Date.now() - startTime,
    };
  }
}
