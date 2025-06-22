
'use server';
/**
 * @fileOverview Service for fetching nearby points of interest (POIs) using the Overpass API (OpenStreetMap data).
 */
import { z } from 'genkit'; // For type consistency if we use Zod types internally or for params

// Internal schema for data returned by this service. This is the raw-ish data from Overpass.
const OverpassPoiSchemaInternal = z.object({
  name: z.string().optional().describe('The name of the POI.'),
  type: z.string().describe('The primary type/category of the POI (e.g., restaurant, museum, shop).'),
  subtype: z.string().optional().describe('A more specific subtype if available (e.g., italian_restaurant, art_museum, supermarket).'),
  tags: z.record(z.string()).optional().describe('Raw OSM tags associated with the POI.'),
  lat: z.number().optional().describe('Latitude of the POI if available.'),
  lon: z.number().optional().describe('Longitude of the POI if available.'),
});
type OverpassPoiInternal = z.infer<typeof OverpassPoiSchemaInternal>;


// Schema for the input parameters of the service function.
const GetNearbyPoisInputSchemaInternal = z.object({
  latitude: z.number().describe("The player's current latitude."),
  longitude: z.number().describe("The player's current longitude."),
  radius: z.number().min(50).max(5000).optional().default(500).describe('Search radius in meters (default 500m). Max 5000m.'),
  poiType: z.string().optional().describe('Optional: Type of POI to search for (e.g., "restaurant", "hotel", "museum", "shop", "tourism", "amenity"). Can be a general category or a specific OpenStreetMap tag value.'),
  limit: z.number().min(1).max(15).optional().default(7).describe('Maximum number of POIs to return (default 7, max 15).'),
});
export type GetNearbyPoisServiceInput = z.infer<typeof GetNearbyPoisInputSchemaInternal>;


// Type for the output of the service function.
export type GetNearbyPoisServiceOutput = {
  pois: OverpassPoiInternal[];
  message?: string;
};


const USER_AGENT_OVERPASS = 'AujourdhuiRPG/0.1 (Firebase Studio App; https://firebase.google.com/docs/studio; for Overpass API)';
const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

const poiTypeToOverpassQuery = (poiType?: string): string => {
  if (!poiType) {
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
    case 'restaurant': case 'food':
      return `(node(around:{{radius}},{{latitude}},{{longitude}})["amenity"="restaurant"]; way(around:{{radius}},{{latitude}},{{longitude}})["amenity"="restaurant"];);`;
    case 'hotel': case 'accommodation':
      return `(node(around:{{radius}},{{latitude}},{{longitude}})["tourism"="hotel"]; way(around:{{radius}},{{latitude}},{{longitude}})["tourism"="hotel"];);`;
    case 'shop': case 'store':
      return `(node(around:{{radius}},{{latitude}},{{longitude}})["shop"]; way(around:{{radius}},{{latitude}},{{longitude}})["shop"];);`;
    case 'tourism': case 'tourist_attraction':
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

export async function fetchNearbyPoisFromOSM(
  { latitude, longitude, radius = 500, poiType, limit = 7 }: GetNearbyPoisServiceInput
): Promise<GetNearbyPoisServiceOutput> {
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
      const errorMessage = `Failed to fetch POIs from Overpass API: ${response.status} ${response.statusText}. Details: ${errorText.substring(0, 200)}`;
      console.error(`Overpass API error (osm-service):`, errorMessage);
      return { pois: [], message: errorMessage };
    }

    const data = await response.json();
    const pois: OverpassPoiInternal[] = [];

    if (data.elements && data.elements.length > 0) {
      for (const element of data.elements) {
        if (element.tags) {
          const name = element.tags.name || element.tags['name:fr'] || element.tags['name:en'];
          let type = 'unknown';
          let subtype = '';
          
          if(element.tags.amenity) { type = 'amenity'; subtype = element.tags.amenity; }
          else if(element.tags.shop) { type = 'shop'; subtype = element.tags.shop; }
          else if(element.tags.tourism) { type = 'tourism'; subtype = element.tags.tourism; }
          else if(element.tags.historic) { type = 'historic'; subtype = element.tags.historic; }
          
          if (element.tags.cuisine) { subtype = element.tags.cuisine + (subtype ? ` ${subtype}` : ''); }

          if (name || (type !== 'unknown')) {
            pois.push({
              name: name,
              type: type,
              subtype: subtype,
              tags: element.tags,
              lat: element.lat ?? element.center?.lat,
              lon: element.lon ?? element.center?.lon,
            });
          }
        }
      }
    }

    if (pois.length === 0) {
      return { pois: [], message: `No POIs of type "${poiType || 'any'}" found within ${radius}m.` };
    }
    
    const finalPois = pois.sort((a, b) => {
      if (a.name && !b.name) return -1;
      if (!a.name && b.name) return 1;
      return 0;
    }).slice(0, limit);

    return { pois: finalPois };
  } catch (error: any) {
    console.error('Error in fetchNearbyPoisFromOSM (osm-service):', error);
    return { pois: [], message: `An unexpected error occurred in osm-service: ${error.message}` };
  }
}
