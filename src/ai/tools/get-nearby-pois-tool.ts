
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
import type { EnhancedPOI } from '@/lib/types';


const GetNearbyPoisInputSchema = z.object({
  latitude: z.number().describe("The player's current latitude."),
  longitude: z.number().describe("The player's current longitude."),
  radius: z.number().min(50).max(5000).optional().default(500).describe('Search radius in meters (default 500m). Max 5000m.'),
  limit: z.number().min(1).max(15).optional().default(7).describe('Maximum number of POIs to return (default 7, max 15).'),
});
export type GetNearbyPoisInput = z.infer<typeof GetNearbyPoisInputSchema>;

const EnhancedPoiToolOutputSchema = z.object({
  name: z.string().optional(),
  establishmentType: z.string().describe('The general category of the establishment (e.g., food_beverage, retail).'),
  subCategory: z.string().describe('A more specific category (e.g., restaurant, bookstore).'),
  summary: z.string().optional().describe('A brief description of the POI.'),
});

const GetNearbyPoisOutputSchema = z.object({
  pois: z.array(EnhancedPoiToolOutputSchema).describe('A list of nearby POIs found.'),
  message: z.string().optional().describe('A summary message, e.g., if no POIs were found.'),
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
    const enhancedPois: EnhancedPOI[] = await fetchNearbyPoisFromOSM(input);
    
    if (enhancedPois.length === 0) {
        return { pois: [], message: 'No points of interest found at this location.' };
    }
    
    const toolPois = enhancedPois.map(poi => ({
        name: poi.name,
        establishmentType: poi.establishmentType,
        subCategory: poi.subCategory,
        summary: poi.summary
    }));
    
    return { pois: toolPois };
  }
);
