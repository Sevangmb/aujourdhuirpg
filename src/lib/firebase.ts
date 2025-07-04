import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInAnonymously,
  signOut
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { firebaseConfig, validateConfiguration, config } from './config';

// Validation de la configuration Firebase au chargement
const validation = validateConfiguration();

if (!validation.isValid) {
  console.error(
    "❌ CRITICAL ERROR in src/lib/firebase.ts: Configuration Firebase incomplète.\n" +
    "🔧 Variables critiques manquantes:\n" +
    validation.missingCritical.map(key => `   - ${key}`).join('\n') + "\n\n" +
    "💡 Pour corriger ce problème:\n" +
    "  1. Créez un fichier .env.local à la racine du projet\n" +
    "  2. Copiez les variables depuis .env.example\n" +
    "  3. Remplacez par vos vraies clés API Firebase\n" +
    "  4. Redémarrez le serveur (npm run dev)\n\n" +
    "⚠️  ATTENTION: L'application ne fonctionnera pas tant que ce problème n'est pas résolu."
  );
}

// Validation spécifique des clés requises pour Firebase
const requiredKeys = ['apiKey', 'authDomain', 'projectId'] as const;
const missingFirebaseKeys = requiredKeys.filter(key => !firebaseConfig[key]);

if (missingFirebaseKeys.length > 0) {
  console.error(
    "❌ Firebase Error: Configuration Firebase incomplète.\n" +
    "Variables manquantes: " + missingFirebaseKeys.join(', ') + "\n" +
    "Vérifiez votre fichier .env.local"
  );
}

// Configuration Firebase utilisant UNIQUEMENT les variables d'environnement
const firebaseOptions: FirebaseOptions = {
  apiKey: firebaseConfig.apiKey!,
  authDomain: firebaseConfig.authDomain!,
  projectId: firebaseConfig.projectId!,
  storageBucket: firebaseConfig.storageBucket!,
  messagingSenderId: firebaseConfig.messagingSenderId!,
  appId: firebaseConfig.appId!,
  measurementId: firebaseConfig.measurementId // Optionnel
};

// Vérification de sécurité : s'assurer qu'aucune clé hardcodée n'est utilisée
function validateNoHardcodedKeys(config: FirebaseOptions): boolean {
  const suspiciousPatterns = [
    'AIzaSyCfXSVcVuVxcl3Hd2swFjAa4Zzvstyyo_8', // Ancienne clé exposée
    'AIzaSyCL-e_c4qG51YMfz9NrIVkPEPS8StFuo_I', // Ancienne clé Google AI exposée
    'undefined',
    'null'
  ];
  
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === 'string' && suspiciousPatterns.some(pattern => value.includes(pattern))) {
      console.error(`❌ SECURITY ALERT: Clé hardcodée détectée dans ${key}:`, value);
      return false;
    }
  }
  return true;
}

// Initialize Firebase avec validation de sécurité
let app;
if (!getApps().length) {
  try {
    // Validation de sécurité avant initialisation
    if (!validateNoHardcodedKeys(firebaseOptions)) {
      throw new Error("Configuration Firebase contient des clés hardcodées dangereuses");
    }
    
    if (!validation.isValid) {
      throw new Error(`Configuration Firebase invalide: ${validation.missingCritical.join(', ')} manquants`);
    }
    
    app = initializeApp(firebaseOptions);
    console.log("✅ Firebase app initialized successfully with secure configuration.");
    
    if (config.isDevelopment && validation.missingRecommended.length > 0) {
      console.warn(
        "⚠️ Firebase Warning: Variables recommandées manquantes:", 
        validation.missingRecommended.join(', ')
      );
    }
    
  } catch (e) {
    console.error("❌ Firebase Error: Failed to initialize Firebase app.", e);
    console.error(
      "🔧 Vérifications à effectuer:\n" +
      "  1. Fichier .env.local existe-t-il ?\n" +
      "  2. Toutes les variables NEXT_PUBLIC_FIREBASE_* sont-elles définies ?\n" +
      "  3. Les clés API sont-elles valides ?\n" +
      "  4. Le projet Firebase existe-t-il ?"
    );
    app = null;
  }
} else {
  app = getApp();
  console.log("✅ Firebase app already initialized.");
}

// Export Firebase services with enhanced error handling
export const firebaseApp = app;

// Services initialization avec gestion d'erreurs robuste
let authService = null;
let dbService = null;
let storageService = null;

if (app) {
  try {
    authService = getAuth(app);
    console.log("✅ Firebase Auth service initialized.");
  } catch (e) {
    console.error("❌ Firebase Error: Failed to initialize Auth service.", e);
  }
  
  try {
    dbService = getFirestore(app);
    console.log("✅ Firebase Firestore service initialized.");
  } catch (e) {
    console.error("❌ Firebase Error: Failed to initialize Firestore service.", e);
  }
  
  try {
    storageService = getStorage(app);
    console.log("✅ Firebase Storage service initialized.");
  } catch (e) {
    console.error("❌ Firebase Error: Failed to initialize Storage service.", e);
  }
} else {
  console.error("❌ Firebase services cannot be initialized because Firebase app failed to initialize.");
  console.error("🔧 Voir les instructions ci-dessus pour corriger la configuration.");
}

export const auth = authService;
export const db = dbService;
export const storage = storageService;

// Helper functions pour vérifier l'état des services
export const isFirebaseConfigured = () => validation.isValid && app !== null;
export const getFirebaseStatus = () => ({
  isConfigured: validation.isValid,
  appInitialized: app !== null,
  authAvailable: authService !== null,
  dbAvailable: dbService !== null,
  storageAvailable: storageService !== null,
  missingVars: validation.missingCritical,
  warnings: validation.warnings
});

// Auth functions export
export { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInAnonymously,
  signOut 
};

// Log final status en développement
if (config.isDevelopment) {
  const status = getFirebaseStatus();
  if (status.isConfigured && status.appInitialized) {
    console.log("🎉 Firebase totalement configuré et opérationnel !");
  } else {
    console.warn("⚠️ Firebase partiellement configuré. Certaines fonctionnalités peuvent ne pas marcher.");
  }
}
