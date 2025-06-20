
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import next from '@genkit-ai/next'; // Re-enabled this line

export const ai = genkit({
  plugins: [
    googleAI(),
    next(), // Re-enabled this line
  ],
  // model: 'googleai/gemini-2.0-flash', // Removed as per Genkit v1.x guidance
});
