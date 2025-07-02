
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-scenario.ts';
import '@/ai/flows/generate-location-image-flow.ts';
import '@/ai/flows/generate-player-avatar-flow.ts';
import '@/ai/flows/generate-geo-intelligence-flow.ts';
import '@/ai/flows/generate-save-summary-flow.ts';
import '@/ai/flows/generate-investigation-summary-flow.ts';
import '@/ai/flows/generate-travel-event-flow.ts';
import '@/modules/historical/flows/generate-historical-contact-flow';
import '@/ai/tools/get-weather-tool.ts';
import '@/ai/tools/get-wikipedia-info-tool.ts';
import '@/ai/tools/get-nearby-pois-tool.ts';
import '@/ai/tools/get-news-tool.ts';
import '@/ai/tools/get-recipes-tool.ts';
import '@/ai/tools/get-book-details-tool.ts';
    
