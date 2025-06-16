import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {nextPlugin} from '@genkit-ai/next'; // Importer le plugin

export const ai = genkit({
  plugins: [
    googleAI(),
    nextPlugin(), // Ajouter le plugin
  ],
  // model: 'googleai/gemini-2.0-flash', // Removed as per Genkit v1.x guidance
});
