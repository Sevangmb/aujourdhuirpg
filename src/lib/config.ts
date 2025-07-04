/**
 * Configuration centralisée pour Aujourd'hui RPG
 * Toutes les variables d'environnement sont définies ici
 */

// Type pour la validation des variables d'environnement
interface EnvironmentConfig {
  // Google AI / Genkit
  googleApiKey: string | undefined;
  geminiApiKey: string | undefined;

  // Firebase
  firebase: {
    apiKey: string | undefined;
    authDomain: string | undefined;
    projectId: string | undefined;
    storageBucket: string | undefined;
    messagingSenderId: string | undefined;
    appId: string | undefined;
    measurementId: string | undefined;
  };

  // Google Maps
  googleMapsApiKey: string | undefined;

  // NewsAPI
  newsApiKey: string | undefined;

  // Environment
  nodeEnv: string;
  isDevelopment: boolean;
  isProduction: boolean;
}

// Fonction pour valider et récupérer les variables d'environnement
function getEnvironmentConfig(): EnvironmentConfig {
  return {
    // Google AI / Genkit
    googleApiKey: process.env.GOOGLE_API_KEY,
    geminiApiKey: process.env.GEMINI_API_KEY,

    // Firebase
    firebase: {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    },

    // Google Maps
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,

    // NewsAPI
    newsApiKey: process.env.NEWS_API_KEY,

    // Environment
    nodeEnv: process.env.NODE_ENV || 'development',
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
  };
}

// Configuration globale
export const config = getEnvironmentConfig();

// Validation des variables critiques
const criticalVars = [
  { key: 'GOOGLE_API_KEY', value: config.googleApiKey || config.geminiApiKey, name: 'Google AI API Key' },
  { key: 'NEXT_PUBLIC_FIREBASE_API_KEY', value: config.firebase.apiKey, name: 'Firebase API Key' },
  { key: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID', value: config.firebase.projectId, name: 'Firebase Project ID' },
  { key: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', value: config.firebase.authDomain, name: 'Firebase Auth Domain' },
];

const recommendedVars = [
  { key: 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', value: config.firebase.storageBucket, name: 'Firebase Storage Bucket' },
  { key: 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', value: config.firebase.messagingSenderId, name: 'Firebase Messaging Sender ID' },
  { key: 'NEXT_PUBLIC_FIREBASE_APP_ID', value: config.firebase.appId, name: 'Firebase App ID' },
  { key: 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', value: config.googleMapsApiKey, name: 'Google Maps API Key' },
];

const optionalVars = [
  { key: 'NEWS_API_KEY', value: config.newsApiKey, name: 'NewsAPI Key' },
  { key: 'NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID', value: config.firebase.measurementId, name: 'Firebase Measurement ID' },
];

// Fonctions utilitaires
export function validateConfiguration(): {
  isValid: boolean;
  missingCritical: string[];
  missingRecommended: string[];
  warnings: string[];
} {
  const missingCritical = criticalVars
    .filter(v => !v.value)
    .map(v => v.key);

  const missingRecommended = recommendedVars
    .filter(v => !v.value)
    .map(v => v.key);

  const warnings: string[] = [];

  // Validation spécifique Google AI
  if (!config.googleApiKey && !config.geminiApiKey) {
    warnings.push('Aucune clé API Google AI trouvée (GOOGLE_API_KEY ou GEMINI_API_KEY)');
  }

  return {
    isValid: missingCritical.length === 0,
    missingCritical,
    missingRecommended,
    warnings,
  };
}

export function logConfigurationStatus(): void {
  const validation = validateConfiguration();

  if (config.isDevelopment) {
    console.log('🔧 Configuration Status - Aujourd\'hui RPG');
    
    if (validation.isValid) {
      console.log('✅ Configuration valide - toutes les variables critiques sont présentes');
    } else {
      console.error('❌ Configuration invalide - variables critiques manquantes:');
      validation.missingCritical.forEach(key => {
        console.error(`   - ${key}`);
      });
    }

    if (validation.missingRecommended.length > 0) {
      console.warn('⚠️ Variables recommandées manquantes:');
      validation.missingRecommended.forEach(key => {
        console.warn(`   - ${key}`);
      });
    }

    if (validation.warnings.length > 0) {
      console.warn('⚠️ Avertissements:');
      validation.warnings.forEach(warning => {
        console.warn(`   - ${warning}`);
      });
    }
  }
}

// Helpers spécifiques
export const aiConfig = {
  hasApiKey: !!(config.googleApiKey || config.geminiApiKey),
  apiKey: config.googleApiKey || config.geminiApiKey,
  apiKeySource: config.googleApiKey ? 'GOOGLE_API_KEY' : 
                config.geminiApiKey ? 'GEMINI_API_KEY' : 'none',
};

export const firebaseConfig = {
  apiKey: config.firebase.apiKey,
  authDomain: config.firebase.authDomain,
  projectId: config.firebase.projectId,
  storageBucket: config.firebase.storageBucket,
  messagingSenderId: config.firebase.messagingSenderId,
  appId: config.firebase.appId,
  measurementId: config.firebase.measurementId,
};

export const mapsConfig = {
  hasApiKey: !!config.googleMapsApiKey,
  apiKey: config.googleMapsApiKey,
};

export const newsConfig = {
  hasApiKey: !!config.newsApiKey,
  apiKey: config.newsApiKey,
};

// Log automatique en développement, mais seulement côté serveur
if (config.isDevelopment && typeof window === 'undefined') {
  logConfigurationStatus();
}
