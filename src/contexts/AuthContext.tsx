
"use client";

import type { User } from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  auth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInAnonymously,
  signOut as firebaseSignOut 
} from '@/lib/firebase';
import { useToast } from "@/hooks/use-toast";

interface AuthContextData {
  user: User | null;
  loadingAuth: boolean;
  signUpWithEmailPassword: (email: string, password: string) => Promise<void>;
  signInWithEmailPassword: (email: string, password: string) => Promise<void>;
  signInAnonymously: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
      setLoadingAuth(false);
    });
    return () => unsubscribe(); // Cleanup subscription on unmount
  }, []);

  const signUpWithEmailPassword = async (email: string, password: string) => {
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
      setLoadingAuth(false);
    }
    // setLoadingAuth(false) is handled by onAuthStateChanged
  };

  const signInWithEmailPassword = async (email: string, password: string) => {
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
      setLoadingAuth(false); 
    }
    // setLoadingAuth(false) is handled by onAuthStateChanged
  };

  const signInAnonymously = async () => {
    setLoadingAuth(true);
    try {
      await signInAnonymously(auth);
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
      setLoadingAuth(false);
    }
    // setLoadingAuth(false) is handled by onAuthStateChanged
  };

  const signOutUser = async () => {
    setLoadingAuth(true);
    try {
      await firebaseSignOut(auth);
      setUser(null); 
      toast({
        title: "Déconnexion réussie",
        description: "À bientôt !",
      });
    } catch (error: any) {
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
