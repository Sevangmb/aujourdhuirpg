
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

// Firebase configuration directly in the code
const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyCfXSVcVuVxcl3Hd2swFjAa4Zzvstyyo_8",
  authDomain: "aujourdhui-rpg.firebaseapp.com",
  projectId: "aujourdhui-rpg",
  storageBucket: "aujourdhui-rpg.firebasestorage.app", // Using the value you provided
  messagingSenderId: "528666135142",
  appId: "1:528666135142:web:7098ab95fea27f536bfba7"
  // measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional
};

// Initialize Firebase
let app;
if (!getApps().length) {
  try {
    app = initializeApp(firebaseConfig);
    console.log("Firebase app initialized successfully with hardcoded config.");
  } catch (e) {
    console.error("Firebase Error: Failed to initialize Firebase app with hardcoded config.", e);
    app = null; // Ensure app is null if initialization fails
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
