
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-scenario.ts';
import '@/ai/tools/get-weather-tool.ts';
import '@/ai/tools/get-wikipedia-info-tool.ts'; // Add this line
