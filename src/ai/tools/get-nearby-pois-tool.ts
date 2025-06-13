
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
import { fetchNearbyPoisFromOSM } from '@/services/osm-service';
import type { GetNearbyPoisServiceInput, GetNearbyPoisServiceOutput } from '@/services/osm-service';


const OverpassPoiSchema = z.object({
  name: z.string().optional().describe('The name of the POI.'),
  type: z.string().describe('The primary type/category of the POI (e.g., restaurant, museum, shop).'),
  subtype: z.string().optional().describe('A more specific subtype if available (e.g., italian_restaurant, art_museum, supermarket).'),
  tags: z.record(z.string()).optional().describe('Raw OSM tags associated with the POI.'),
});
// No need to export OverpassPoi type if not used externally from this file

const GetNearbyPoisInputSchema = z.object({
  latitude: z.number().describe("The player's current latitude."),
  longitude: z.number().describe("The player's current longitude."),
  radius: z.number().min(50).max(5000).optional().default(500).describe('Search radius in meters (default 500m). Max 5000m.'),
  poiType: z.string().optional().describe('Optional: Type of POI to search for (e.g., "restaurant", "hotel", "museum", "shop", "tourism", "amenity"). Can be a general category or a specific OpenStreetMap tag value.'),
  limit: z.number().min(1).max(15).optional().default(7).describe('Maximum number of POIs to return (default 7, max 15).'),
});
export type GetNearbyPoisInput = z.infer<typeof GetNearbyPoisInputSchema>;

const GetNearbyPoisOutputSchema = z.object({
  pois: z.array(OverpassPoiSchema).describe('A list of nearby POIs found.'),
  message: z.string().optional().describe('A summary message, e.g., if no POIs were found or an error occurred.'),
});
export type GetNearbyPoisOutput = z.infer<typeof GetNearbyPoisOutputSchema>;

export const getNearbyPoisTool = ai.defineTool(
  {
    name: 'getNearbyPoisTool',
    description:
      'Fetches a list of real-world Points of Interest (POIs) like shops, restaurants, hotels, or tourist attractions near given coordinates using OpenStreetMap data. Useful when the player wants to find local amenities or explore their surroundings.',
    inputSchema: GetNearbyPoisInputSchema,
    outputSchema: GetNearbyPoisOutputSchema,
  },
  async (input: GetNearbyPoisInput): Promise<GetNearbyPoisOutput> => {
    // The input for the tool (GetNearbyPoisInput) is compatible with GetNearbyPoisServiceInput
    const serviceOutput: GetNearbyPoisServiceOutput = await fetchNearbyPoisFromOSM(input);
    
    // The output from the service (GetNearbyPoisServiceOutput) is compatible with GetNearbyPoisOutput
    return serviceOutput;
  }
);
