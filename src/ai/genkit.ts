import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import { aiConfig, config } from '../lib/config';

// Validation de la configuration AI
if (!aiConfig.hasApiKey) {
  console.error(
    "❌ CRITICAL ERROR in src/ai/genkit.ts: Aucune clé API Google AI trouvée.\n" +
    "🔧 Pour corriger ce problème:\n" +
    "  1. Créez un fichier .env.local à la racine du projet\n" +
    "  2. Ajoutez: GOOGLE_API_KEY=votre_cle_google_ai\n" +
    "  3. Obtenez votre clé API depuis: https://makersuite.google.com/app/apikey\n" +
    "  4. Assurez-vous que la clé a les permissions pour l'API Generative Language (Gemini)\n\n" +
    "⚠️  ATTENTION: Les fonctionnalités IA ne fonctionneront pas tant que ce problème n'est pas résolu.\n" +
    "   Erreurs possibles: 'TypeError: loadedPlugin.initializer is not a function'\n\n" +
    "🛑 L'application peut fonctionner en mode dégradé sans IA."
  );
} else {
  console.log(`✅ src/ai/genkit.ts: Clé API Google AI trouvée (source: ${aiConfig.apiKeySource}). Initialisation du plugin googleAI()...`);
}

// Initialize Genkit with proper error handling
export const ai = genkit({
  plugins: [
    // Only initialize googleAI if we have an API key
    ...(aiConfig.hasApiKey ? [googleAI()] : []),
  ],
  // Log configuration status
  logLevel: config.isDevelopment ? 'debug' : 'info',
});

// Export a helper to check if AI is properly configured
export const isAIConfigured = () => aiConfig.hasApiKey;

// Export configuration status for other modules
export const getAIConfig = () => ({
  hasApiKey: aiConfig.hasApiKey,
  apiKeySource: aiConfig.apiKeySource,
  isConfigured: aiConfig.hasApiKey,
});

// Log final status
if (!aiConfig.hasApiKey) {
  console.warn(
    "⚠️  AI module initialized without Google API key. " +
    "AI-powered features will be disabled until configuration is fixed."
  );
} else {
  console.log("✅ AI module successfully configured and ready.");
}