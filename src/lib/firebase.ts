
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

// TEMPORARY: Hardcoding Firebase config for debugging auth/api-key-not-valid issue
const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyCfXSVcVuVxcl3Hd2swFjAa4Zzvstyyo_8",
  authDomain: "aujourdhui-rpg.firebaseapp.com",
  projectId: "aujourdhui-rpg",
  storageBucket: "aujourdhui-rpg.firebasestorage.app",
  messagingSenderId: "528666135142",
  appId: "1:528666135142:web:7098ab95fea27f536bfba7",
  // measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Kept as env var for now or can be omitted if not used
};

// Perform checks for essential Firebase config values
// if (!firebaseConfig.apiKey) {
//   console.error("Firebase Error: API Key (NEXT_PUBLIC_FIREBASE_API_KEY) is missing. Check your .env file and ensure the Next.js server was restarted.");
// }
// if (!firebaseConfig.authDomain) {
//   console.error("Firebase Error: Auth Domain (NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN) is missing.");
// }

// Initialize Firebase
let app;
if (!getApps().length) {
  // if (firebaseConfig.apiKey && firebaseConfig.projectId) { // Check is less critical now with hardcoding
  app = initializeApp(firebaseConfig);
  // } else {
  //   console.error("Firebase Error: Cannot initialize Firebase due to missing critical configuration (API Key or Project ID).");
  // }
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
