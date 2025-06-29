
'use server';

import { searchWikipedia, fetchPersonDetails, type WikipediaPersonDetails } from './wikipedia-service';
import { adaptToModernEra } from './historical-adapter-service';
import type { HistoricalContact, HistoricalPersonality, ModernIdentity } from '@/lib/types';

// Simple in-memory cache for this serverless function's lifecycle
const locationCache = new Map<string, any[]>();

/**
 * Finds historical personalities related to a specific location, using a cache to avoid repeated lookups.
 * @param placeName The name of the location (e.g., "Montmartre").
 * @returns A promise that resolves to an array of fully adapted modern historical contacts.
 */
export async function findAndAdaptHistoricalContactsForLocation(
  placeName: string
): Promise<( { historical: HistoricalPersonality, modern: ModernIdentity } )[]> {

  const cacheKey = `contacts_${placeName.toLowerCase().replace(/\s+/g, '_')}`;
  if (locationCache.has(cacheKey)) {
    console.log(`Cache hit for historical contacts at: ${placeName}`);
    return locationCache.get(cacheKey)!;
  }

  console.log(`Cache miss. Searching Wikipedia for historical contacts at: ${placeName}`);
  
  // 1. Search for potential historical figures related to the location.
  // This query is a simple example and can be refined for better results.
  const searchResults = await searchWikipedia(`personnalités liées à ${placeName}`, 5);

  const adaptedContacts: ({ historical: HistoricalPersonality, modern: ModernIdentity })[] = [];

  // 2. For each result, fetch detailed information.
  for (const personName of searchResults) {
    const details = await fetchPersonDetails(personName);

    if (details && details.birthYear) { // Ensure we have at least a birth year to work with
      // 3. Adapt the historical figure into a modern contact.
      const historicalPersonality: HistoricalPersonality = {
        name: details.name,
        birth: { year: details.birthYear, place: details.birthPlace },
        death: { year: details.deathYear, place: details.deathPlace },
        occupation: details.occupation,
        extract: details.extract,
        wikipediaUrl: details.url,
        thumbnail: details.thumbnail,
      };

      const modernIdentity = adaptToModernEra(historicalPersonality);
      
      adaptedContacts.push({
          historical: historicalPersonality,
          modern: modernIdentity
      });
    }
  }

  // Cache the results before returning
  locationCache.set(cacheKey, adaptedContacts);
  // Set a timeout to clear the cache entry after 24 hours
  setTimeout(() => locationCache.delete(cacheKey), 24 * 60 * 60 * 1000);

  return adaptedContacts;
}
