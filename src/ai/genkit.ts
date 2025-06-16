
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
// import next from '@genkit-ai/next'; // Temporarily remove to isolate the error

export const ai = genkit({
  plugins: [
    googleAI(),
    // next(), // Temporarily remove to isolate the error
  ],
  // model: 'googleai/gemini-2.0-flash', // Removed as per Genkit v1.x guidance
});

