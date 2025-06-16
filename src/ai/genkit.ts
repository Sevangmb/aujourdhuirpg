
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import next from '@genkit-ai/next'; // Changed to default import

export const ai = genkit({
  plugins: [
    googleAI(),
    next(), // Usage remains the same
  ],
  // model: 'googleai/gemini-2.0-flash', // Removed as per Genkit v1.x guidance
});
