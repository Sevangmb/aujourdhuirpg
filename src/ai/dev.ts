
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-scenario.ts';
import '@/ai/flows/generate-scenario-schemas.ts'; // Ensure schemas are part of the build context if needed by Genkit CLI
import '@/ai/flows/schemas/finance-schemas.ts'; // Import new finance schemas
import '@/ai/flows/schemas/item-schemas.ts'; // Import new item schemas
import '@/ai/flows/generate-location-image-flow.ts';
import '@/ai/flows/generate-player-avatar-flow.ts';
import '@/ai/flows/schemas/generate-player-avatar-schemas.ts'; // Added new schema file
import '@/ai/flows/generate-geo-intelligence-flow.ts'; // Import new geo-intelligence flow
import '@/ai/flows/schemas/generate-geo-intelligence-schemas.ts'; // Import new geo-intelligence schemas
import '@/ai/flows/generate-save-summary-flow.ts';
import '@/ai/flows/schemas/generate-save-summary-schemas.ts';
import '@/ai/flows/generate-travel-event-flow.ts';
import '@/ai/flows/schemas/generate-travel-event-schemas.ts';
import '@/modules/historical/flows/generate-historical-contact-flow';
import '@/ai/flows/schemas/generate-historical-contact-schemas.ts';
import '@/ai/tools/get-weather-tool.ts';
import '@/ai/tools/get-wikipedia-info-tool.ts';
import '@/ai/tools/get-nearby-pois-tool.ts';
import '@/ai/tools/get-news-tool.ts';
import '@/ai/tools/get-recipes-tool.ts';
    
