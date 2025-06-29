
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-scenario.ts';
import '@/ai/flows/generate-scenario-schemas.ts'; // Ensure schemas are part of the build context if needed by Genkit CLI
import '@/ai/flows/generate-location-image-flow.ts';
import '@/ai/flows/generate-player-avatar-flow.ts';
import '@/ai/flows/schemas/generate-player-avatar-schemas.ts'; // Added new schema file
import '@/ai/flows/generate-geo-intelligence-flow.ts'; // Import new geo-intelligence flow
import '@/ai/flows/schemas/generate-geo-intelligence-schemas.ts'; // Import new geo-intelligence schemas
import '@/ai/tools/get-weather-tool.ts';
import '@/ai/tools/get-wikipedia-info-tool.ts';
import '@/ai/tools/get-nearby-pois-tool.ts';
import '@/ai/tools/get-news-tool.ts';
