
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

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Perform checks for essential Firebase config values
if (!firebaseConfig.apiKey) {
  console.error("Firebase Critical Error: API Key (NEXT_PUBLIC_FIREBASE_API_KEY) is MISSING in your .env.local file. Firebase will not work. Please ensure it's set and the Next.js server was restarted.");
} else if (firebaseConfig.apiKey.includes(" ") || firebaseConfig.apiKey.length < 20) { // Basic sanity check, most API keys are longer
  console.warn(
    "Firebase Warning: The API Key (NEXT_PUBLIC_FIREBASE_API_KEY) in your .env.local file appears to be malformed (e.g., contains spaces) or too short. " +
    "Please ensure it's copied EXACTLY from your Firebase project settings (Project settings > General > Your apps > Web API Key). " +
    `The key being used starts with: '${firebaseConfig.apiKey.substring(0, 10)}...' and has length ${firebaseConfig.apiKey.length}. ` +
    "Any characters (even '.-please-pass-a-valid-api-key.') accidentally appended to the key will cause 'auth/api-key-not-valid' errors."
  );
}

if (!firebaseConfig.authDomain) {
  console.error("Firebase Critical Error: Auth Domain (NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN) is missing in your .env.local file. Please ensure it's set and the Next.js server was restarted.");
}
if (!firebaseConfig.projectId) {
  console.error("Firebase Critical Error: Project ID (NEXT_PUBLIC_FIREBASE_PROJECT_ID) is missing in your .env.local file. Please ensure it's set and the Next.js server was restarted.");
}


// Initialize Firebase
let app;
if (!getApps().length) {
  if (firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.authDomain) {
    try {
      app = initializeApp(firebaseConfig);
      console.log("Firebase app initialized successfully.");
    } catch (e) {
      console.error("Firebase Error: Failed to initialize Firebase app.", e);
      app = null; // Ensure app is null if initialization fails
    }
  } else {
    console.error("Firebase Error: Cannot initialize Firebase due to missing critical configuration (API Key, Project ID, or Auth Domain). Ensure environment variables are set correctly in .env.local and the server is restarted.");
    app = null; // Ensure app is null if config is missing
  }
} else {
  app = getApp();
  console.log("Firebase app already initialized.");
}

// Export Firebase services, ensuring 'app' might be undefined if initialization failed
export const firebaseApp = app;
// Gracefully handle if app is not initialized or auth/db/storage services fail to init
let authService = null;
let dbService = null;
let storageService = null;

if (app) {
  try {
    authService = getAuth(app);
  } catch (e) {
    console.error("Firebase Error: Failed to initialize Auth service.", e);
  }
  try {
    dbService = getFirestore(app);
  } catch (e) {
    console.error("Firebase Error: Failed to initialize Firestore service.", e);
  }
  try {
    storageService = getStorage(app);
  } catch (e) {
    console.error("Firebase Error: Failed to initialize Storage service.", e);
  }
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
