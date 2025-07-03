
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
};

// Check for the most critical environment variables
const isFirebaseConfigured = firebaseConfig.apiKey && firebaseConfig.projectId;

// Initialize Firebase
let app;
if (isFirebaseConfigured) {
  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
      console.log("✅ Firebase app initialized successfully.");
    } catch (e) {
      console.error("❌ Firebase Error: Failed to initialize Firebase app.", e);
      app = null;
    }
  } else {
    app = getApp();
    console.log("✅ Firebase app already initialized.");
  }
} else {
  console.warn(
    "⚠️ Firebase configuration is missing (likely NEXT_PUBLIC_FIREBASE_API_KEY or NEXT_PUBLIC_FIREBASE_PROJECT_ID). " +
    "Firebase services will be disabled. See SECURITY_SETUP.md for instructions."
  );
  app = null;
}

// Export Firebase services, which will be null if initialization failed.
export const firebaseApp = app;

let authService = null;
let dbService = null;
let storageService = null;

if (app) {
  try {
    authService = getAuth(app);
  } catch (e) {
    console.error("❌ Firebase Auth Error: Failed to get Auth service. Is your API key correct?", e);
  }
  
  try {
    dbService = getFirestore(app);
  } catch (e) {
    console.error("❌ Firebase Firestore Error: Failed to get Firestore service.", e);
  }
  
  try {
    storageService = getStorage(app);
  } catch (e) {
    console.error("❌ Firebase Storage Error: Failed to get Storage service.", e);
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
