
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

// TEMPORARY: Hardcoded Firebase config for diagnostics
const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyCfXSVcVuVxcl3Hd2swFjAa4Zzvstyyo_8",
  authDomain: "aujourdhui-rpg.firebaseapp.com",
  projectId: "aujourdhui-rpg",
  storageBucket: "aujourdhui-rpg.firebasestorage.app",
  messagingSenderId: "528666135142",
  appId: "1:528666135142:web:7098ab95fea27f536bfba7",
  // measurementId can be added if you use it, otherwise it's optional
  // measurementId: "YOUR_MEASUREMENT_ID" 
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

export const firebaseApp = app;
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInAnonymously,
  signOut 
};
