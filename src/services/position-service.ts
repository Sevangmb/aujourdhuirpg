'use server';

import type { Position, Zone } from '../lib/types/game-types';
import { fetchWikipediaSummary } from './wikipedia-service';
import { fetchNearbyPoisFromOSM } from './osm-service';

// Stub function for image generation, to be implemented later
async function generateLocationImage(placeName: string): Promise<string> {
  console.log(`generateLocationImage called for: ${placeName}`);
  // Simulate image generation delay and return a placeholder
  await new Promise(resolve => setTimeout(resolve, 500));
  return `https://via.placeholder.com/600x400.png?text=${encodeURIComponent(placeName)}`;
}

export async function getPositionData(
  latitude: number,
  longitude: number,
  placeName: string
): Promise<Position> {
  let summaryText: string | undefined;
  let imageUrl: string | undefined;
  let zoneData: Zone | undefined;

  try {
    const wikipediaData = await fetchWikipediaSummary(placeName, latitude, longitude);
    if (wikipediaData) {
      summaryText = wikipediaData.summary;
      imageUrl = wikipediaData.imageUrl;
    }
  } catch (error) {
    console.warn(`Failed to fetch Wikipedia summary for ${placeName}:`, error);
    // Non-critical, proceed without Wikipedia data
  }

  try {
    // TODO: Decide how to integrate OSM POI data into the Position object.
    // For now, we fetch it but don't directly use it in the returned Position,
    // but it could inform zone creation or other details.
    const pois = await fetchNearbyPoisFromOSM(latitude, longitude);
    if (pois && pois.length > 0) {
      // Example: use the first POI's tags to define a zone, if applicable
      // This is a placeholder logic for zone determination
      const mainPoi = pois[0];
      if (mainPoi.tags?.name) {
        zoneData = {
          name: mainPoi.tags.name,
          description: mainPoi.tags.description || mainPoi.tags.amenity || mainPoi.tags.shop || mainPoi.tags.tourism,
        };
      } else if (pois.length > 1 && pois[1].tags?.name) {
        // Fallback to a nearby POI if the closest one lacks a name
         zoneData = {
          name: pois[1].tags.name,
          description: pois[1].tags.description || pois[1].tags.amenity || pois[1].tags.shop || pois[1].tags.tourism,
        };
      }
    }
  } catch (error) {
    console.warn(`Failed to fetch POIs from OSM for ${latitude},${longitude}:`, error);
    // Non-critical, proceed without POI data
  }

  if (!imageUrl && placeName) {
    try {
      imageUrl = await generateLocationImage(placeName);
    } catch (error) {
      console.warn(`Failed to generate image for ${placeName}:`, error);
      // Non-critical, proceed without a generated image
    }
  }

  return {
    latitude,
    longitude,
    name: placeName,
    summary: summaryText,
    imageUrl,
    zone: zoneData, // Assign determined zone data, if any
  };
}
