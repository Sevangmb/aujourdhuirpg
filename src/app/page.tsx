"use client";

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AuthScreen from '@/components/AuthScreen';
import AuthenticatedAppView from '@/components/AuthenticatedAppView';

// UI Components (if any were intended here)

// Define HomePageContent which was previously empty and causing issues
function HomePageContent() {
  const {
    user,
    loadingAuth,
    signUpWithEmailPassword,
    signInWithEmailPassword,
    signInAnonymously,
    signOutUser,
  } = useAuth();

  if (loadingAuth) {
    return <div className="flex h-screen w-full items-center justify-center">Chargement de l'application...</div>;
  }

  return (
    <div>
      {user ? (
        <AuthenticatedAppView user={user} signOutUser={signOutUser} />
      ) : (
        <AuthScreen
          loadingAuth={loadingAuth}
          signUp={signUpWithEmailPassword}
          signIn={signInWithEmailPassword}
          signInAnon={signInAnonymously}
        />
      )}
    </div>
  );
}

export default function HomePage() {
  return <HomePageContent />;
}
