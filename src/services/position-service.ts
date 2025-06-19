'use server';

import type { Position, Zone } from '../lib/types/game-types';
import { fetchWikipediaSummary } from './wikipedia-service';
import { fetchNearbyPoisFromOSM, type GetNearbyPoisServiceOutput } from './osm-service'; // Import GetNearbyPoisServiceOutput for pois type
import { z } from 'zod'; // Import z from zod

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
  let highlights: string[] = [];

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
    // For now, we fetch it. The goal is to better integrate its data.
    const osmPoisResponse = await fetchNearbyPoisFromOSM({ latitude, longitude, radius: 500, limit: 10 });
    const pois = osmPoisResponse.pois; // Assuming the actual POIs are in a .pois property

    if (pois && pois.length > 0) {
      // Populate poiHighlights
      const distinctPoiNames: Set<string> = new Set();
      for (const poi of pois) {
        if (poi.name && poi.name.trim() !== "") {
          distinctPoiNames.add(poi.name.trim());
          if (distinctPoiNames.size >= 3) break; // Collect up to 3 highlights
        }
      }
      highlights = Array.from(distinctPoiNames);

      // Refined zone determination logic
      // Attempt to find a more meaningful zone from the POIs
      let foundZone = false;
      const typeCounts: Record<string, number> = {};
      let primaryZonePoi: OverpassPoiInternal | null = null;

      for (const poi of pois.slice(0, 5)) { // Analyze top 5 POIs for zone
        const poiType = poi.type || poi.tags?.amenity || poi.tags?.leisure || poi.tags?.shop || poi.tags?.landuse;
        if (poiType) {
          typeCounts[poiType] = (typeCounts[poiType] || 0) + 1;
        }

        // Prioritize certain types for zone naming
        if (!primaryZonePoi && poi.name) {
            if (poi.tags?.leisure === 'park' || poi.tags?.natural === 'wood' || poi.tags?.landuse === 'forest') {
                 primaryZonePoi = poi;
            } else if (poi.tags?.landuse && !['residential', 'commercial', 'industrial'].includes(poi.tags.landuse)) {
                primaryZonePoi = poi; // e.g. landuse=cemetery, landuse=farmland
            } else if (poi.tags?.historic) {
                primaryZonePoi = poi;
            }
        }
      }

      if (primaryZonePoi) {
        zoneData = {
          name: primaryZonePoi.name,
          description: primaryZonePoi.tags?.description || primaryZonePoi.type || primaryZonePoi.tags?.leisure || primaryZonePoi.tags?.historic,
        };
        foundZone = true;
      } else {
        // If no highly specific zone POI, look for a dominant type or a named POI
        let dominantType: string | null = null;
        let maxCount = 0;
        for (const type in typeCounts) {
          if (typeCounts[type] > maxCount) {
            dominantType = type;
            maxCount = typeCounts[type];
          }
        }

        if (dominantType && maxCount > 1) { // Requires at least two of the same type to define a zone
          let zoneName = dominantType.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') + " Area";
          // Try to find a named POI of this type for a more specific zone name
          const representativePoi = pois.find(p => p.name && (p.type === dominantType || p.tags?.amenity === dominantType || p.tags?.leisure === dominantType || p.tags?.shop === dominantType || p.tags?.landuse === dominantType));
          if (representativePoi) {
            zoneData = { name: representativePoi.name, description: `Area with multiple ${dominantType}s` };
          } else {
            zoneData = { name: zoneName, description: `General ${dominantType} area` };
          }
          foundZone = true;
        }
      }

      // Fallback to the original logic if no better zone found yet
      if (!foundZone) {
        const firstNamedPoiWithTags = pois.find(p => p.name && p.tags);
        if (firstNamedPoiWithTags) {
          zoneData = {
            name: firstNamedPoiWithTags.name!, // name is checked by find
            description: firstNamedPoiWithTags.tags!.description || firstNamedPoiWithTags.type || firstNamedPoiWithTags.tags!.amenity || firstNamedPoiWithTags.tags!.shop || firstNamedPoiWithTags.tags!.tourism,
          };
        }
      }
    }
  } catch (error) {
    console.warn(`Failed to fetch or process POIs from OSM for ${latitude},${longitude}:`, error);
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
    zone: zoneData,
    poiHighlights: highlights.length > 0 ? highlights : undefined, // Add highlights, or undefined if empty
  };
}
