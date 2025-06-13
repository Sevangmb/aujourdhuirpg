
"use client";

import type { User } from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  auth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInAnonymously as firebaseSignInAnonymously, // Renamed to avoid conflict
  signOut as firebaseSignOut 
} from '@/lib/firebase';
import { useToast } from "@/hooks/use-toast";
import { clearGameState as clearLocalGameState } from '@/lib/game-logic'; // Import clearGameState
// Firestore delete function is not directly called here on sign out,
// as the game state might be intentionally kept for re-login.
// Deletion is handled in page.tsx on explicit restart for a logged-in user.

interface AuthContextData {
  user: User | null;
  loadingAuth: boolean;
  signUpWithEmailPassword: (email: string, password: string) => Promise<void>;
  signInWithEmailPassword: (email: string, password: string) => Promise<void>;
  signInAnonymously: () => Promise<void>; // Kept the same name for the exported function
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!auth) { 
      console.error("Firebase auth is not initialized. Check your Firebase config.");
      setLoadingAuth(false);
      return;
    }
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
      setLoadingAuth(false);
    });
    return () => unsubscribe(); 
  }, []);

  const signUpWithEmailPassword = async (email: string, password: string) => {
    if (!auth) return;
    // setLoadingAuth(true); // Handled by onAuthStateChanged
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      toast({
        title: "Inscription réussie",
        description: "Bienvenue ! Vous êtes maintenant connecté.",
      });
      // Game state will be loaded by useEffect in page.tsx based on the new user state
    } catch (error: any) {
      console.error("Erreur d'inscription:", error);
      toast({
        variant: "destructive",
        title: "Erreur d'inscription",
        description: error.message || "Impossible de créer un compte.",
      });
    }
  };

  const signInWithEmailPassword = async (email: string, password: string) => {
    if (!auth) return;
    // setLoadingAuth(true); // Handled by onAuthStateChanged
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Connexion réussie",
        description: "Content de vous revoir !",
      });
      // Game state will be loaded by useEffect in page.tsx
    } catch (error: any) {
      console.error("Erreur de connexion:", error);
      toast({
        variant: "destructive",
        title: "Erreur de connexion",
        description: error.message || "Email ou mot de passe incorrect.",
      });
    }
  };

  const signInAnonymously = async () => { 
    if (!auth) return;
    // setLoadingAuth(true); // Handled by onAuthStateChanged
    try {
      await firebaseSignInAnonymously(auth); 
      toast({
        title: "Connecté anonymement",
        description: "Vous pouvez jouer sans compte. Votre progression sera locale.",
      });
      // Game state will be loaded by useEffect in page.tsx (from localStorage for anon)
    } catch (error: any) {
      console.error("Erreur de connexion anonyme:", error);
      toast({
        variant: "destructive",
        title: "Erreur de connexion anonyme",
        description: error.message || "Impossible de se connecter anonymement.",
      });
    }
  };

  const signOutUser = async () => {
    if (!auth) return;
    // setLoadingAuth(true); // Handled by onAuthStateChanged
    try {
      await firebaseSignOut(auth);
      // setUser(null); // This will be handled by onAuthStateChanged
      clearLocalGameState(); // Clear local game state on sign out
      toast({
        title: "Déconnexion réussie",
        description: "À bientôt !",
      });
      // page.tsx will reset its gameState to player: null due to user becoming null
    } catch (error: any) {
      console.error("Erreur de déconnexion:", error);
      toast({
        variant: "destructive",
        title: "Erreur de déconnexion",
        description: error.message || "Impossible de se déconnecter.",
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, loadingAuth, signUpWithEmailPassword, signInWithEmailPassword, signInAnonymously, signOutUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextData => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
