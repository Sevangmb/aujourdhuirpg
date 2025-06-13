
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
// Pour utiliser d'autres services Firebase, importez-les ici, par exemple :
// import { getFirestore } from "firebase/firestore";
// import { getAuth } from "firebase/auth";
// import { getAnalytics } from "firebase/analytics";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialiser Firebase
let app;
if (typeof window !== 'undefined' && !getApps().length) {
  app = initializeApp(firebaseConfig);
  // Si vous souhaitez utiliser Analytics (assurez-vous d'importer getAnalytics)
  // if (firebaseConfig.measurementId) {
  //   getAnalytics(app);
  // }
} else if (typeof window !== 'undefined') {
  app = getApp();
}

// Exporter l'instance de l'application initialisée
// et potentiellement d'autres services Firebase que vous initialisez
// export const db = getFirestore(app);
// export const auth = getAuth(app);
export { app as firebaseApp };
