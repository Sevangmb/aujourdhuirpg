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

// Validation de la configuration Firebase
const validation = validateConfiguration();

if (!validation.isValid) {
  console.error("❌ Firebase Error: Configuration invalide. Variables manquantes:");
  validation.missingCritical.forEach(key => {
    console.error(`   - ${key}`);
  });
  
  if (config.isDevelopment) {
    console.error(
      "\n🔧 Pour corriger ce problème:\n" +
      "  1. Créez un fichier .env.local à la racine du projet\n" +
      "  2. Ajoutez les variables d'environnement requises:\n" +
      "     NEXT_PUBLIC_FIREBASE_API_KEY=votre_cle_api\n" +
      "     NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=votre-projet.firebaseapp.com\n" +
      "     NEXT_PUBLIC_FIREBASE_PROJECT_ID=votre-projet-id\n" +
      "     NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=votre-projet.firebasestorage.app\n" +
      "     NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=votre_sender_id\n" +
      "     NEXT_PUBLIC_FIREBASE_APP_ID=votre_app_id\n" +
      "  3. Obtenez ces valeurs depuis: https://console.firebase.google.com/\n\n" +
      "⚠️  ATTENTION: Ne commitez JAMAIS le fichier .env.local !"
    );
  }
}

// Vérification des variables Firebase requises
const requiredFirebaseVars = ['apiKey', 'authDomain', 'projectId'] as const;
const missingFirebaseVars = requiredFirebaseVars.filter(key => !firebaseConfig[key]);

if (missingFirebaseVars.length > 0) {
  throw new Error(
    `Variables Firebase critiques manquantes: ${missingFirebaseVars.join(', ')}\n` +
    "Impossible d'initialiser Firebase sans ces variables."
  );
}

// Configuration Firebase (SANS fallbacks hardcodés pour la sécurité)
const firebaseAppConfig: FirebaseOptions = {
  apiKey: firebaseConfig.apiKey!,
  authDomain: firebaseConfig.authDomain!,
  projectId: firebaseConfig.projectId!,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
  measurementId: firebaseConfig.measurementId,
};

// Initialize Firebase
let app;
if (!getApps().length) {
  try {
    app = initializeApp(firebaseAppConfig);
    console.log("✅ Firebase app initialized successfully.");
  } catch (e) {
    console.error("❌ Firebase Error: Failed to initialize Firebase app.", e);
    app = null;
  }
} else {
  app = getApp();
  console.log("✅ Firebase app already initialized.");
}

// Export Firebase services with better error handling
export const firebaseApp = app;

// Gracefully handle service initialization
let authService = null;
let dbService = null;
let storageService = null;

if (app) {
  try {
    authService = getAuth(app);
  } catch (e) {
    console.error("❌ Firebase Error: Failed to initialize Auth service.", e);
  }
  
  try {
    dbService = getFirestore(app);
  } catch (e) {
    console.error("❌ Firebase Error: Failed to initialize Firestore service.", e);
  }
  
  try {
    storageService = getStorage(app);
  } catch (e) {
    console.error("❌ Firebase Error: Failed to initialize Storage service.", e);
  }
} else {
  console.error("❌ Firebase services cannot be initialized because Firebase app failed to initialize.");
}

export const auth = authService;
export const db = dbService;
export const storage = storageService;

export { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInAnonymously,
  signOut 
};

// Helper pour vérifier si Firebase est configuré
export const isFirebaseConfigured = () => !!app;

// Export de la configuration pour les tests ou le debugging
export const getFirebaseConfig = () => firebaseAppConfig;