
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

// Construct Firebase config from environment variables
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
  console.error("Firebase Error: API Key (NEXT_PUBLIC_FIREBASE_API_KEY) is missing. Check your .env file and ensure the Next.js server was restarted.");
  // Potentially throw an error or handle this state appropriately for your app
  // throw new Error("Firebase API Key is missing."); 
}
if (!firebaseConfig.authDomain) {
  console.error("Firebase Error: Auth Domain (NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN) is missing.");
}
// Add more checks here if other fields are absolutely critical for initialization.

// Initialize Firebase
let app;
if (!getApps().length) {
  if (firebaseConfig.apiKey && firebaseConfig.projectId) { // Only initialize if essential keys are present
    app = initializeApp(firebaseConfig);
  } else {
    console.error("Firebase Error: Cannot initialize Firebase due to missing critical configuration (API Key or Project ID).");
    // Handle the case where Firebase cannot be initialized, e.g., by disabling Firebase-dependent features
  }
} else {
  app = getApp();
}

// Export Firebase services, ensuring 'app' might be undefined if initialization failed
export const firebaseApp = app;
export const auth = app ? getAuth(app) : null; // Gracefully handle if app is not initialized
export const db = app ? getFirestore(app) : null;
export const storage = app ? getStorage(app) : null;

export { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInAnonymously,
  signOut 
};
