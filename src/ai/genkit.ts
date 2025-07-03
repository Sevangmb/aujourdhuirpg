
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Check for API key availability with better error messages
const googleApiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
const apiKeyFound = !!googleApiKey;

if (!apiKeyFound) {
  console.error(
    "❌ CRITICAL ERROR in src/ai/genkit.ts: Neither GOOGLE_API_KEY nor GEMINI_API_KEY found in environment variables.\n" +
    "🔧 To fix this issue:\n" +
    "  1. Create a .env.local file in your project root\n" +
    "  2. Add: GOOGLE_API_KEY=your_google_ai_api_key\n" +
    "  3. Get your API key from: https://makersuite.google.com/app/apikey\n" +
    "  4. Ensure the key has permissions for the Generative Language API (Gemini)\n\n" +
    "⚠️  WARNING: The googleAI() plugin initialization may fail, causing errors like:\n" +
    "   'TypeError: loadedPlugin.initializer is not a function'\n\n" +
    "🛑 AI features will not work until this is resolved."
  );
} else {
  console.log("✅ src/ai/genkit.ts: Google API Key found in environment. Initializing googleAI() plugin...");
}

// Initialize Genkit with proper error handling
export const ai = genkit({
  plugins: [
    // Only initialize googleAI if we have an API key
    ...(apiKeyFound ? [googleAI()] : []),
  ],
  // Log configuration status
  logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
});

// Export a helper to check if AI is properly configured
export const isAIConfigured = () => apiKeyFound;

// Export configuration status for other modules
export const aiConfig = {
  hasApiKey: apiKeyFound,
  apiKeySource: process.env.GOOGLE_API_KEY ? 'GOOGLE_API_KEY' : 
                process.env.GEMINI_API_KEY ? 'GEMINI_API_KEY' : 'none',
};

if (!apiKeyFound) {
  console.warn(
    "⚠️  AI module initialized without Google API key. " +
    "AI-powered features will be disabled until configuration is fixed."
  );
} else {
  console.log(
    `✅ AI module successfully initialized with API key from: ${aiConfig.apiKeySource}`
  );
}
