import type { EnrichmentModule, EnrichedContext, ModuleEnrichmentResult, ModuleDependency } from '@/core/cascade/types';
import { searchBooks, type BookSearchResult } from '@/services/google-books-service';

export class LivreModule implements EnrichmentModule {
  readonly id = 'livre';
  readonly dependencies: ModuleDependency[] = [];

  private extractSearchQuery(text: string): string | null {
    const keywords = ['lire sur', 'chercher un livre sur', 'rechercher des informations sur', 'trouver un livre sur', 'rechercher'];
    const lowerText = text.toLowerCase();
    
    for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
            // Take the part after the keyword
            return text.substring(lowerText.indexOf(keyword) + keyword.length).trim().replace(/"/g, '');
        }
    }

    return null;
  }

  async enrich(context: EnrichedContext): Promise<ModuleEnrichmentResult> {
    const startTime = Date.now();
    const actionText = context.action.payload.text || '';
    
    const searchQuery = this.extractSearchQuery(actionText);
    let bookResults: BookSearchResult[] = [];
    let message = "Aucune recherche de livre pertinente pour cette action.";

    if (searchQuery) {
      try {
        bookResults = await searchBooks(searchQuery, 3);
        message = `Recherche de livres pour "${searchQuery}" terminée.`;
      } catch (error) {
        console.error("Error calling searchBooks from LivreModule:", error);
        message = "Erreur lors de la recherche de livres.";
      }
    }

    const data = {
      searchQuery,
      foundBooks: bookResults,
      message,
    };

    return {
      moduleId: this.id,
      data,
      enrichmentLevel: 'detailed',
      dependenciesUsed: context.dependencyResults || {},
      executionTime: Date.now() - startTime,
    };
  }
}
