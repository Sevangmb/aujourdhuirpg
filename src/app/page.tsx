
"use client";

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AuthScreen from '@/components/AuthScreen';
import AuthenticatedAppView from '@/components/AuthenticatedAppView';
import LoadingState from '@/components/LoadingState';

export default function HomePage() {
  const {
    user,
    loadingAuth,
    signUpWithEmailPassword,
    signInWithEmailPassword,
    signInAnonymously,
    signOutUser,
  } = useAuth();

  if (loadingAuth) {
    return <LoadingState loadingAuth={true} isLoadingState={false} />;
  }

  if (user) {
    return <AuthenticatedAppView user={user} signOutUser={signOutUser} />;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8 bg-muted/40">
        <AuthScreen
        loadingAuth={loadingAuth}
        signUp={signUpWithEmailPassword}
        signIn={signInWithEmailPassword}
        signInAnon={signInAnonymously}
        />
    </main>
  );
}
