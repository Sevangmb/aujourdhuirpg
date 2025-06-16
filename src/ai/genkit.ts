
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import next from '@genkit-ai/next'; // Default import

export const ai = genkit({
  plugins: [
    googleAI(),
    next(), // Call 'next' as a factory function
  ],
  // model: 'googleai/gemini-2.0-flash', // Removed as per Genkit v1.x guidance
});
