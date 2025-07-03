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

// Hardcoding the configuration as a last resort to bypass environment variable loading issues.
// This is not recommended for production applications.
const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyCfXSVcVuVxcl3Hd2swFjAa4Zzvstyyo_8",
  authDomain: "aujourdhui-rpg.firebaseapp.com",
  projectId: "aujourdhui-rpg",
  storageBucket: "aujourdhui-rpg.appspot.com", // Corrected storage bucket format
  messagingSenderId: "528666135142",
  appId: "1:528666135142:web:1e9678352c33a7f36bfba7"
};

// Initialize Firebase
let app;
if (!getApps().length) {
  try {
    app = initializeApp(firebaseConfig);
    console.log("✅ Firebase app initialized successfully from hardcoded config.");
  } catch (e) {
    console.error("❌ Firebase Error: Failed to initialize Firebase app.", e);
    app = null;
  }
} else {
  app = getApp();
  console.log("✅ Firebase app already initialized.");
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
