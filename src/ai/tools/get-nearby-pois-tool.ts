
'use server';
/**
 * @fileOverview A Genkit tool to fetch nearby points of interest (POIs) using the Overpass API (OpenStreetMap data).
 *
 * - getNearbyPoisTool - The tool definition.
 * - GetNearbyPoisInput - Input type for the tool.
 * - GetNearbyPoisOutput - Output type for the tool.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const OverpassPoiSchema = z.object({
  name: z.string().optional().describe('The name of the POI.'),
  type: z.string().describe('The primary type/category of the POI (e.g., restaurant, museum, shop).'),
  subtype: z.string().optional().describe('A more specific subtype if available (e.g., italian_restaurant, art_museum, supermarket).'),
  tags: z.record(z.string()).optional().describe('Raw OSM tags associated with the POI.'),
});
export type OverpassPoi = z.infer<typeof OverpassPoiSchema>;

const GetNearbyPoisInputSchema = z.object({
  latitude: z.number().describe("The player's current latitude."),
  longitude: z.number().describe("The player's current longitude."),
  radius: z.number().min(50).max(5000).optional().default(500).describe('Search radius in meters (default 500m). Max 5000m.'),
  // poiType can be a general category like 'amenity', 'shop', 'tourism', 'historic'
  // or a more specific OSM tag value like 'restaurant', 'supermarket', 'museum'
  poiType: z.string().optional().describe('Optional: Type of POI to search for (e.g., "restaurant", "hotel", "museum", "shop", "tourism", "amenity"). Can be a general category or a specific OpenStreetMap tag value.'),
  limit: z.number().min(1).max(15).optional().default(7).describe('Maximum number of POIs to return (default 7, max 15).'),
});
export type GetNearbyPoisInput = z.infer<typeof GetNearbyPoisInputSchema>;

const GetNearbyPoisOutputSchema = z.object({
  pois: z.array(OverpassPoiSchema).describe('A list of nearby POIs found.'),
  message: z.string().optional().describe('A summary message, e.g., if no POIs were found or an error occurred.'),
});
export type GetNearbyPoisOutput = z.infer<typeof GetNearbyPoisOutputSchema>;

const USER_AGENT_OVERPASS = 'AujourdhuiRPG/0.1 (Firebase Studio App; https://firebase.google.com/docs/studio; for Overpass API)';
const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

// Basic mapping from generic types to OSM tags/values
// This can be expanded significantly.
const poiTypeToOverpassQuery = (poiType?: string): string => {
  if (!poiType) {
    // Broad search for common amenities and shops if no type specified
    return `
      node(around:{{radius}},{{latitude}},{{longitude}})["amenity"];
      way(around:{{radius}},{{latitude}},{{longitude}})["amenity"];
      node(around:{{radius}},{{latitude}},{{longitude}})["shop"];
      way(around:{{radius}},{{latitude}},{{longitude}})["shop"];
      node(around:{{radius}},{{latitude}},{{longitude}})["tourism"];
      way(around:{{radius}},{{latitude}},{{longitude}})["tourism"];
    `;
  }
  const typeLower = poiType.toLowerCase();
  switch (typeLower) {
    case 'restaurant':
    case 'food':
      return `(node(around:{{radius}},{{latitude}},{{longitude}})["amenity"="restaurant"]; way(around:{{radius}},{{latitude}},{{longitude}})["amenity"="restaurant"];);`;
    case 'hotel':
    case 'accommodation':
      return `(node(around:{{radius}},{{latitude}},{{longitude}})["tourism"="hotel"]; way(around:{{radius}},{{latitude}},{{longitude}})["tourism"="hotel"];);`;
    case 'shop':
    case 'store':
      return `(node(around:{{radius}},{{latitude}},{{longitude}})["shop"]; way(around:{{radius}},{{latitude}},{{longitude}})["shop"];);`; // General shops
    case 'tourism':
    case 'tourist_attraction':
      return `(node(around:{{radius}},{{latitude}},{{longitude}})["tourism"]; way(around:{{radius}},{{latitude}},{{longitude}})["tourism"];);`;
    case 'museum':
      return `(node(around:{{radius}},{{latitude}},{{longitude}})["tourism"="museum"]; way(around:{{radius}},{{latitude}},{{longitude}})["tourism"="museum"];);`;
    case 'cafe':
      return `(node(around:{{radius}},{{latitude}},{{longitude}})["amenity"="cafe"]; way(around:{{radius}},{{latitude}},{{longitude}})["amenity"="cafe"];);`;
    case 'bar':
      return `(node(around:{{radius}},{{latitude}},{{longitude}})["amenity"="bar"]; way(around:{{radius}},{{latitude}},{{longitude}})["amenity"="bar"];);`;
    case 'pharmacy':
      return `(node(around:{{radius}},{{latitude}},{{longitude}})["amenity"="pharmacy"]; way(around:{{radius}},{{latitude}},{{longitude}})["amenity"="pharmacy"];);`;
    case 'bank':
      return `(node(around:{{radius}},{{latitude}},{{longitude}})["amenity"="bank"]; way(around:{{radius}},{{latitude}},{{longitude}})["amenity"="bank"];);`;
    case 'supermarket':
      return `(node(around:{{radius}},{{latitude}},{{longitude}})["shop"="supermarket"]; way(around:{{radius}},{{latitude}},{{longitude}})["shop"="supermarket"];);`;
    case 'bakery':
      return `(node(around:{{radius}},{{latitude}},{{longitude}})["shop"="bakery"]; way(around:{{radius}},{{latitude}},{{longitude}})["shop"="bakery"];);`;
    // Default to searching for the poiType as a value for common keys if not a mapped category
    default:
      return `(
        node(around:{{radius}},{{latitude}},{{longitude}})["amenity"="${typeLower}"];
        way(around:{{radius}},{{latitude}},{{longitude}})["amenity"="${typeLower}"];
        node(around:{{radius}},{{latitude}},{{longitude}})["shop"="${typeLower}"];
        way(around:{{radius}},{{latitude}},{{longitude}})["shop"="${typeLower}"];
        node(around:{{radius}},{{latitude}},{{longitude}})["tourism"="${typeLower}"];
        way(around:{{radius}},{{latitude}},{{longitude}})["tourism"="${typeLower}"];
      );`;
  }
};


export const getNearbyPoisTool = ai.defineTool(
  {
    name: 'getNearbyPoisTool',
    description:
      'Fetches a list of real-world Points of Interest (POIs) like shops, restaurants, hotels, or tourist attractions near given coordinates using OpenStreetMap data. Useful when the player wants to find local amenities or explore their surroundings.',
    inputSchema: GetNearbyPoisInputSchema,
    outputSchema: GetNearbyPoisOutputSchema,
  },
  async ({ latitude, longitude, radius = 500, poiType, limit = 7 }): Promise<GetNearbyPoisOutput> => {
    const specificPoiQueries = poiTypeToOverpassQuery(poiType)
      .replace(/{{latitude}}/g, String(latitude))
      .replace(/{{longitude}}/g, String(longitude))
      .replace(/{{radius}}/g, String(radius));

    const query = `
      [out:json][timeout:30];
      (
        ${specificPoiQueries}
      );
      out body center ${limit};
      >;
      out skel qt ${limit};
    `;

    try {
      const response = await fetch(OVERPASS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': USER_AGENT_OVERPASS,
        },
        body: `data=${encodeURIComponent(query)}`,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Overpass API error: ${response.status} ${response.statusText}`, errorText);
        return { pois: [], message: `Failed to fetch POIs from Overpass API: ${response.statusText}. The service might be temporarily unavailable or the query might be malformed.` };
      }

      const data = await response.json();
      const pois: OverpassPoi[] = [];

      if (data.elements && data.elements.length > 0) {
        for (const element of data.elements) {
          if (element.tags) {
            const name = element.tags.name || element.tags['name:fr'] || element.tags['name:en'];
            let type = element.tags.amenity || element.tags.shop || element.tags.tourism || element.tags.historic || 'unknown';
            let subtype = '';
            
            if(element.tags.amenity) { type = 'amenity'; subtype = element.tags.amenity; }
            else if(element.tags.shop) { type = 'shop'; subtype = element.tags.shop; }
            else if(element.tags.tourism) { type = 'tourism'; subtype = element.tags.tourism; }
            else if(element.tags.historic) { type = 'historic'; subtype = element.tags.historic; }
            else if (element.tags.cuisine) { subtype = element.tags.cuisine + (subtype ? ` ${subtype}` : ''); }


            // Only add if it has a name or is a recognized type (to avoid unnamed/uninteresting features)
            if (name || (type !== 'unknown')) {
              pois.push({
                name: name,
                type: type,
                subtype: subtype || undefined, // Ensure it's undefined if empty
                tags: element.tags,
              });
            }
          }
        }
      }

      if (pois.length === 0) {
        return { pois: [], message: `No POIs of type "${poiType || 'any'}" found within ${radius}m.` };
      }

      return { pois: pois.slice(0, limit) }; // Ensure limit is respected even if Overpass returns more
    } catch (error: any) {
      console.error('Error in getNearbyPoisTool:', error);
      return { pois: [], message: `An unexpected error occurred while fetching POIs: ${error.message}` };
    }
  }
);

    