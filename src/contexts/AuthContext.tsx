
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
import { clearGameState } from '@/lib/game-logic'; // Import clearGameState

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
    if (!auth) { // Check if auth is initialized
      console.error("Firebase auth is not initialized. Check your Firebase config.");
      setLoadingAuth(false);
      return;
    }
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
      setLoadingAuth(false);
    });
    return () => unsubscribe(); // Cleanup subscription on unmount
  }, []);

  const signUpWithEmailPassword = async (email: string, password: string) => {
    if (!auth) return;
    setLoadingAuth(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      toast({
        title: "Inscription réussie",
        description: "Bienvenue ! Vous êtes maintenant connecté.",
      });
    } catch (error: any) {
      console.error("Erreur d'inscription:", error);
      toast({
        variant: "destructive",
        title: "Erreur d'inscription",
        description: error.message || "Impossible de créer un compte.",
      });
      // setLoadingAuth(false) will be handled by onAuthStateChanged, or if error, set it here
      if (!auth.currentUser) setLoadingAuth(false);
    }
  };

  const signInWithEmailPassword = async (email: string, password: string) => {
    if (!auth) return;
    setLoadingAuth(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Connexion réussie",
        description: "Content de vous revoir !",
      });
    } catch (error: any) {
      console.error("Erreur de connexion:", error);
      toast({
        variant: "destructive",
        title: "Erreur de connexion",
        description: error.message || "Email ou mot de passe incorrect.",
      });
      if (!auth.currentUser) setLoadingAuth(false); 
    }
  };

  const signInAnonymously = async () => { // Exported function name remains signInAnonymously
    if (!auth) return;
    setLoadingAuth(true);
    try {
      await firebaseSignInAnonymously(auth); // Use renamed import
      toast({
        title: "Connecté anonymement",
        description: "Vous pouvez jouer sans compte. Votre progression sera locale.",
      });
    } catch (error: any) {
      console.error("Erreur de connexion anonyme:", error);
      toast({
        variant: "destructive",
        title: "Erreur de connexion anonyme",
        description: error.message || "Impossible de se connecter anonymement.",
      });
      if (!auth.currentUser) setLoadingAuth(false);
    }
  };

  const signOutUser = async () => {
    if (!auth) return;
    setLoadingAuth(true);
    try {
      await firebaseSignOut(auth);
      setUser(null); 
      clearGameState(); // Clear game state on sign out
      toast({
        title: "Déconnexion réussie",
        description: "À bientôt !",
      });
    } catch (error: any)
{
      console.error("Erreur de déconnexion:", error);
      toast({
        variant: "destructive",
        title: "Erreur de déconnexion",
        description: error.message || "Impossible de se déconnecter.",
      });
    } finally {
        setLoadingAuth(false);
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
