"use client";

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

// UI Components (if any were intended here)

// Define HomePageContent which was previously empty and causing issues
function HomePageContent() {
  const {
    user,
    loadingAuth,
    // signUpWithEmailPassword, // Commenting out unused functions for now
    // signInWithEmailPassword,
    // signInAnonymously,
    // signOutUser,
  } = useAuth();

  if (loadingAuth) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {user ? (
        <p>Welcome, {user.displayName || user.email || 'User'}!</p>
      ) : (
        <p>Please sign in.</p>
      )}
    </div>
  );
}

export default function HomePage() {
  return <HomePageContent />;
}
