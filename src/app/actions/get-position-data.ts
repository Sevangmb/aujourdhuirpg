'use server';

import type { Position, Zone, GameEra } from '@/lib/types';
import { fetchWikipediaSummary } from '@/data-sources/culture/wikipedia-api';
import { fetchNearbyPoisFromOSM } from '@/data-sources/establishments/overpass-api';
import { generateLocationImage as generateLocationImageFlow } from '@/ai/flows/generate-location-image-flow';


export async function getPositionData(placeName: string, era: GameEra): Promise<Position> {
  const wikipediaData = await fetchWikipediaSummary(placeName);

  if (!wikipediaData || typeof wikipediaData.latitude !== 'number' || typeof wikipediaData.longitude !== 'number') {
    throw new Error(`Impossible de trouver les coordonnées pour "${placeName}". Veuillez essayer un nom de lieu plus précis ou différent.`);
  }

  const { latitude, longitude } = wikipediaData;
  let summaryText = wikipediaData.summary;
  let imageUrl = wikipediaData.imageUrl;

  let zoneData: Zone | undefined;
  let highlights: string[] = [];

  try {
    const pois = await fetchNearbyPoisFromOSM({ latitude, longitude, radius: 500, limit: 10 });
    

    if (pois && pois.length > 0) {
      const distinctPoiNames: Set<string> = new Set();
      for (const poi of pois) {
        if (poi.name && poi.name.trim() !== "") {
          distinctPoiNames.add(poi.name.trim());
          if (distinctPoiNames.size >= 3) break;
        }
      }
      highlights = Array.from(distinctPoiNames);

      const firstNamedPoiWithTags = pois.find(p => p.name && p.tags);
      if (firstNamedPoiWithTags) {
        zoneData = {
          name: firstNamedPoiWithTags.subCategory,
          description: firstNamedPoiWithTags.tags!.description || firstNamedPoiWithTags.establishmentType || firstNamedPoiWithTags.tags!.amenity || firstNamedPoiWithTags.tags!.shop || firstNamedPoiWithTags.tags!.tourism,
        };
      }
    }
  } catch (error) {
    console.warn(`Failed to fetch or process POIs from OSM for ${latitude},${longitude}:`, error);
  }

  if (!imageUrl && placeName) {
    try {
        const result = await generateLocationImageFlow({ placeName, era });
        imageUrl = result.imageUrl || undefined;
    } catch (error) {
        console.warn(`Failed to generate image for ${placeName} in era ${era}:`, error);
        imageUrl = undefined;
    }
  }

  return {
    latitude,
    longitude,
    name: wikipediaData.title, // Use the official title from Wikipedia
    summary: summaryText,
    imageUrl,
    zone: zoneData,
    poiHighlights: highlights.length > 0 ? highlights : undefined,
  };
}
