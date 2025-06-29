
'use server';

import { fetchWikipediaSummary } from '../../services/wikipedia-service';

/**
 * Searches for locations using Wikipedia and returns suggestions.
 * @param query The search query.
 * @returns A promise that resolves to an array of suggested locations in the format [{ value: string, label: string }].
 */
export async function searchLocations(query: string): Promise<{ value: string; label: string }[]> {
  if (!query) {
    return [];
  }

  try {
    const result = await fetchWikipediaSummary(query);

    if (result && result.title) {
      // Basic check: return the title as a suggestion
      return [{ value: result.title, label: result.title }];
    } else {
      // No result found or an error occurred within the service
      return [];
    }
  } catch (error) {
    console.error("Error in searchLocations server action:", error);
    return [];
  }
}
