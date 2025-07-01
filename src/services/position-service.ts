
'use server';

import type { Position, Zone, GameEra } from '../lib/types';
import { fetchWikipediaSummary } from './wikipedia-service';
import { fetchNearbyPoisFromOSM, type GetNearbyPoisServiceOutput } from './osm-service'; // Import GetNearbyPoisServiceOutput for pois type
import { z } from 'zod'; // Import z from zod
import { generateLocationImage as generateLocationImageFlow } from '@/ai/flows/generate-location-image-flow';


// Copied from osm-service.ts due to 'use server' export constraints
const OverpassPoiSchemaInternal = z.object({
  name: z.string().optional().describe('The name of the POI.'),
  type: z.string().describe('The primary type/category of the POI (e.g., restaurant, museum, shop).'),
  subtype: z.string().optional().describe('A more specific subtype if available (e.g., italian_restaurant, art_museum, supermarket).'),
  tags: z.record(z.string()).optional().describe('Raw OSM tags associated with the POI.'),
  lat: z.number().optional().describe('Latitude of the POI if available.'),
  lon: z.number().optional().describe('Longitude of the POI if available.'),
});
type OverpassPoiInternal = z.infer<typeof OverpassPoiSchemaInternal>;


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
    const osmPoisResponse = await fetchNearbyPoisFromOSM({ latitude, longitude, radius: 500, limit: 10 });
    const pois = osmPoisResponse.pois;

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
          name: firstNamedPoiWithTags.name!,
          description: firstNamedPoiWithTags.tags!.description || firstNamedPoiWithTags.type || firstNamedPoiWithTags.tags!.amenity || firstNamedPoiWithTags.tags!.shop || firstNamedPoiWithTags.tags!.tourism,
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
