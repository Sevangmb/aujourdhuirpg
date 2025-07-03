
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

// Firebase configuration using environment variables
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID // Optional
};

// Validate required environment variables in development
if (process.env.NODE_ENV === 'development') {
  const requiredEnvVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn(
      '⚠️ Firebase Warning: Some environment variables are missing:', 
      missingVars.join(', '),
      '\nPlease see SECURITY_SETUP.md for instructions.'
    );
  }
}

// Initialize Firebase
let app;
if (!getApps().length) {
  try {
    app = initializeApp(firebaseConfig);
    console.log("✅ Firebase app initialized successfully.");
  } catch (e) {
    console.error("❌ Firebase Error: Failed to initialize Firebase app. Check your environment variables.", e);
    app = null; // Ensure app is null if initialization fails
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
