
'use server';

import { searchWikipedia, fetchPersonDetails } from './wikipedia-service';
import { adaptHistoricalFigure } from './historical-adapter-service';
import type { HistoricalPersonality, ModernIdentity, ContactKnowledge, GameEra } from '@/lib/types';
import { generateHistoricalContact } from '@/ai/flows/generate-historical-contact-flow';

// Simple in-memory cache for this serverless function's lifecycle
const locationCache = new Map<string, any[]>();

export type AdaptedContact = { 
    historical: HistoricalPersonality; 
    modern: ModernIdentity; 
    knowledge: ContactKnowledge; 
};

/**
 * Finds historical personalities related to a specific location, adapts them, enriches them with AI,
 * and uses a cache to avoid repeated lookups.
 * @param placeName The name of the location (e.g., "Montmartre").
 * @param playerEra The era the player is in.
 * @returns A promise that resolves to an array of fully adapted and enriched historical contacts.
 */
export async function findAndAdaptHistoricalContactsForLocation(
  placeName: string,
  playerEra: GameEra
): Promise<AdaptedContact[]> {

  const cacheKey = `contacts_enriched_${placeName.toLowerCase().replace(/\s+/g, '_')}_${playerEra}`;
  if (locationCache.has(cacheKey)) {
    console.log(`Cache hit for enriched historical contacts at: ${placeName} for era ${playerEra}`);
    return locationCache.get(cacheKey)!;
  }

  console.log(`Cache miss. Searching and enriching historical contacts for: ${placeName} in era ${playerEra}`);
  
  const searchResults = await searchWikipedia(`personnalités liées à ${placeName}`, 5);

  const adaptedContacts: AdaptedContact[] = [];

  for (const personName of searchResults) {
    const details = await fetchPersonDetails(personName);

    if (details && details.birthYear) {
      const historicalPersonality: HistoricalPersonality = {
        name: details.name,
        birth: { year: details.birthYear, place: details.birthPlace },
        death: { year: details.deathYear, place: details.deathPlace },
        occupation: details.occupation,
        extract: details.extract,
        wikipediaUrl: details.url,
        thumbnail: details.thumbnail,
      };

      const modernIdentity = adaptHistoricalFigure(historicalPersonality, playerEra);

      // --- AI ENRICHMENT STEP ---
      const knowledge = await generateHistoricalContact({
          historical: historicalPersonality,
          modern: modernIdentity,
          location: placeName,
          playerEra: playerEra,
      });
      
      adaptedContacts.push({
          historical: historicalPersonality,
          modern: modernIdentity,
          knowledge: knowledge,
      });
    }
  }

  locationCache.set(cacheKey, adaptedContacts);
  setTimeout(() => locationCache.delete(cacheKey), 24 * 60 * 60 * 1000);

  return adaptedContacts;
}
