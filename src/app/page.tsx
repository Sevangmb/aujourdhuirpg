
"use client";

import React from 'react';

// Authentication
import { useAuth } from '@/contexts/AuthContext';

// UI Components

  const {
    user,
    loadingAuth, // Firebase auth loading
    signUpWithEmailPassword,
    signInWithEmailPassword,
    signInAnonymously,
    signOutUser,
  } = useAuth();

    </div>
  );
}

export default function HomePage() {
  return <HomePageContent />;
}
