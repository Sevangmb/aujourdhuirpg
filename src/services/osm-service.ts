
'use server';
/**
 * @fileOverview Service for fetching and enriching nearby points of interest (POIs) from the Overpass API (OpenStreetMap data).
 */
import type { EnhancedPOI, EstablishmentType, POIService } from '@/lib/types/poi-types';
import { OSM_ESTABLISHMENT_MAPPING } from '@/lib/types/poi-types';
import { ESTABLISHMENT_SERVICES } from '@/data/establishment-services';

export interface GetEnhancedPoisServiceInput {
  latitude: number;
  longitude: number;
  radius?: number;
  limit?: number;
}

const USER_AGENT_OVERPASS = 'AujourdhuiRPG/0.1 (Firebase Studio App; https://firebase.google.com/docs/studio; for Overpass API)';
const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

// --- Private Helper Functions ---

function classifyEstablishment(tags: any): { type: EstablishmentType; subCategory: string } {
    if (!tags) return { type: 'unknown', subCategory: 'unknown' };
    for (const [osmTag, classification] of Object.entries(OSM_ESTABLISHMENT_MAPPING)) {
      const [key, value] = osmTag.split('=');
      if (tags[key] === value) {
        return classification;
      }
    }
    return { type: 'unknown', subCategory: 'unknown' };
}

function generateServicesForEstablishment(subCategory: string): POIService[] {
    return ESTABLISHMENT_SERVICES[subCategory] || [];
}

function generateDefaultName(establishment: { type: EstablishmentType; subCategory: string }): string {
    return `Un(e) ${establishment.subCategory.replace(/_/g, ' ')}`;
}

function generateSummary(establishment: { type: EstablishmentType; subCategory: string }, tags: any): string {
  if (tags?.description) return tags.description;
  const name = tags?.name || generateDefaultName(establishment);
  return `C'est un établissement de type ${establishment.type}: ${name}.`;
}

function estimateTransactionTime(establishment: { type: EstablishmentType; subCategory: string }): number {
    switch (establishment.type) {
        case 'food_beverage': return 10;
        case 'retail': return 15;
        case 'services': return 20;
        case 'entertainment': return 60;
        default: return 5;
    }
}

function buildOverpassQuery(lat: number, lon: number, radius: number): string {
    const tagsToQuery = Object.keys(OSM_ESTABLISHMENT_MAPPING).map(tag => {
        const [key, value] = tag.split('=');
        return `nwr["${key}"="${value}"](around:${radius},${lat},${lon});`;
    }).join('\n');

    return `
      [out:json][timeout:30];
      (
        ${tagsToQuery}
      );
      out body center;
    `;
}

// --- Main Service Function ---

export async function fetchNearbyPoisFromOSM(
  { latitude, longitude, radius = 500, limit = 15 }: GetEnhancedPoisServiceInput
): Promise<EnhancedPOI[]> {
    const query = buildOverpassQuery(latitude, longitude, radius);

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
          console.error(`Overpass API error (osm-service): ${response.status} ${response.statusText}. Details: ${errorText.substring(0, 200)}`);
          return [];
        }

        const data = await response.json();
        const pois: EnhancedPOI[] = [];

        if (data.elements && data.elements.length > 0) {
            for (const element of data.elements) {
                if (element.tags) {
                    const establishment = classifyEstablishment(element.tags);
                    if (establishment.type === 'unknown') continue;

                    const services = generateServicesForEstablishment(establishment.subCategory);
                    const name = element.tags.name || element.tags['name:fr'] || element.tags['name:en'] || generateDefaultName(establishment);

                    const poi: EnhancedPOI = {
                        osmId: element.id.toString(),
                        latitude: element.lat ?? element.center?.lat,
                        longitude: element.lon ?? element.center?.lon,
                        name: name,
                        summary: generateSummary(establishment, element.tags),
                        establishmentType: establishment.type,
                        subCategory: establishment.subCategory,
                        services: services,
                        averageTransactionTime: estimateTransactionTime(establishment),
                        openingHours: element.tags.opening_hours,
                        contactInfo: { phone: element.tags.phone, website: element.tags.website },
                        zone: { name: establishment.subCategory },
                        tags: element.tags
                    };
                    
                    if (poi.latitude && poi.longitude) {
                       pois.push(poi);
                    }
                }
            }
        }
        
        // Sort and limit results
        return pois
            .sort((a, b) => {
                if (a.name && !b.name) return -1;
                if (!a.name && b.name) return 1;
                return 0;
            })
            .slice(0, limit);

    } catch (error) {
        console.error('Error in fetchNearbyPoisFromOSM (osm-service):', error);
        return [];
    }
}
