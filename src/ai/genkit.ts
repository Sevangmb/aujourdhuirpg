
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const apiKeyFound = !!(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY);

if (!apiKeyFound) {
  console.error(
    "CRITICAL ERROR in src/ai/genkit.ts: GOOGLE_API_KEY or GEMINI_API_KEY is missing from environment variables. " +
    "The googleAI() plugin for Genkit WILL LIKELY FAIL TO INITIALIZE CORRECTLY. " +
    "This can lead to errors like 'TypeError: loadedPlugin.initializer is not a function'. " +
    "Please ensure your .env file (or server environment variables) is correctly set up with a valid Google API key " +
    "that has permissions for the Generative Language API (Gemini)."
  );
} else {
  console.log("src/ai/genkit.ts: Google API Key found in environment. Proceeding with googleAI() plugin initialization.");
}

export const ai = genkit({
  plugins: [
    googleAI(),
    // If the API key is missing, googleAI() might return a malformed plugin object,
    // which would then cause the 'initializer is not a function' error when genkit() processes it.
    // The error log above aims to make this root cause more apparent.
  ],
  // model: 'googleai/gemini-2.0-flash', // Removed as per Genkit v1.x guidance
});


