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
import { clearGameState as clearLocalGameState } from '@/services/localStorageService'; 

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
    if (!auth) { 
      console.warn(
        "AuthContext Warning: Firebase auth service is not available. This is expected if Firebase environment variables are not set. Authentication features will be disabled. See SECURITY_SETUP.md for details."
      );
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
    if (!auth) {
        console.error("Auth service not available for sign up.");
        toast({ variant: "destructive", title: "Erreur de service", description: "Le service d'authentification n'est pas disponible." });
        return;
    }
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      toast({
        title: "Inscription réussie",
        description: "Bienvenue ! Vous êtes maintenant connecté.",
      });
    } catch (error: any) {
      console.error("Erreur d'inscription Firebase:", error.code, error.message);
      let description = "Une erreur inconnue est survenue lors de l'inscription.";
      if (error.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            description = "Cette adresse e-mail est déjà utilisée par un autre compte.";
            break;
          case 'auth/invalid-email':
            description = "L'adresse e-mail n'est pas valide.";
            break;
          case 'auth/operation-not-allowed':
            description = "L'inscription par e-mail et mot de passe n'est pas activée. Vérifiez la configuration de votre projet Firebase.";
            break;
          case 'auth/weak-password':
            description = "Le mot de passe est trop faible. Il doit contenir au moins 6 caractères.";
            break;
          default:
            description = error.message || description;
        }
      } else if (error.message) {
        description = error.message;
      }
      toast({
        variant: "destructive",
        title: "Erreur d'inscription",
        description: description,
      });
    }
  };

  const signInWithEmailPassword = async (email: string, password: string) => {
    if (!auth) {
        console.error("Auth service not available for sign in.");
        toast({ variant: "destructive", title: "Erreur de service", description: "Le service d'authentification n'est pas disponible." });
        return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Connexion réussie",
        description: "Content de vous revoir !",
      });
    } catch (error: any) {
      console.error("Erreur de connexion Firebase:", error.code, error.message);
      let description = "Une erreur inconnue est survenue lors de la connexion.";
      if (error.code) {
        switch (error.code) {
          case 'auth/invalid-email':
            description = "L'adresse e-mail n'est pas valide.";
            break;
          case 'auth/user-disabled':
            description = "Ce compte utilisateur a été désactivé.";
            break;
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
             description = "Adresse e-mail ou mot de passe incorrect.";
            break;
          case 'auth/operation-not-allowed':
             description = "La connexion par e-mail et mot de passe n'est pas activée. Vérifiez la configuration de votre projet Firebase.";
             break;
          default:
            description = error.message || description;
        }
      } else if (error.message) {
        description = error.message;
      }
      toast({
        variant: "destructive",
        title: "Erreur de connexion",
        description: description,
      });
    }
  };

  const signInAnonymously = async () => { 
    if (!auth) {
        console.error("Auth service not available for anonymous sign in.");
        toast({ variant: "destructive", title: "Erreur de service", description: "Le service d'authentification n'est pas disponible." });
        return;
    }
    try {
      await firebaseSignInAnonymously(auth); 
      toast({
        title: "Connecté anonymement",
        description: "Vous pouvez jouer sans compte. Votre progression sera locale.",
      });
    } catch (error: any) {
      console.error("Erreur de connexion anonyme Firebase:", error.code, error.message);
      toast({
        variant: "destructive",
        title: "Erreur de connexion anonyme",
        description: error.message || "Impossible de se connecter anonymement.",
      });
    }
  };

  const signOutUser = async () => {
    if (!auth) {
        console.error("Auth service not available for sign out.");
        // Don't necessarily need a toast here unless sign out itself fails rarely
        return;
    }
    try {
      await firebaseSignOut(auth);
      clearLocalGameState(); 
      toast({
        title: "Déconnexion réussie",
        description: "À bientôt !",
      });
    } catch (error: any) {
      console.error("Erreur de déconnexion Firebase:", error.code, error.message);
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
