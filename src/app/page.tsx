
"use client";

import React from 'react';

// Authentication
import { useAuth } from '@/contexts/AuthContext';

// UI Components
import GameScreen from '@/components/GameScreen'; // For auth screen
import AuthenticatedAppView from '@/components/AuthenticatedAppView';
// Removed useToast here, assuming AuthenticatedAppView handles its own toasts
// and auth screen toasts might be handled differently or are less frequent.
// If page.tsx needs to show toasts (e.g. for global errors), re-add:
// import { useToast } from "@/hooks/use-toast";


function HomePageContent() {
  const {
    user,
    loadingAuth,
    signUpWithEmailPassword,
    signInWithEmailPassword,
    signInAnonymously,
    signOutUser,
  } = useAuth();
  // const { toast } = useToast(); // Re-enable if toasts are needed here

  const authScreenProps = {
    user: user, // usually null here
    loadingAuth: loadingAuth,
    signUp: signUpWithEmailPassword,
    signIn: signInWithEmailPassword,
    signInAnon: signInAnonymously,
    signOut: signOutUser, // Not typically used on auth screen but passed for consistency
  };

  if (loadingAuth) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground">
        <p>Loading authentication...</p>
        {/* You might want to add a global spinner here */}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen max-h-screen bg-background text-foreground">
      {user ? (
        <AuthenticatedAppView user={user} signOutUser={signOutUser} />
      ) : (
        // Render GameScreen for authentication purposes
        // Pass only necessary props for the auth screen functionality
        <GameScreen
          user={null} // Explicitly null for auth screen
          loadingAuth={false} // Auth is no longer loading at this point
          isLoadingState={false} // Not relevant for auth screen
          gameState={null} // No game state for auth screen
          isGameActive={false} // No game active for auth screen
          authFunctions={authScreenProps}
          // The following props are not relevant for the auth screen,
          // they are handled by AuthenticatedAppView or not applicable.
          // onCharacterCreate, onRestartGame, setGameState,
          // weatherData, weatherLoading, weatherError,
          // locationImageUrl, locationImageLoading, locationImageError,
          // isGeneratingAvatar
          // Dummy functions or omitted if GameScreen can handle undefined props gracefully
          onCharacterCreate={() => console.log("Character creation attempted from auth screen.")}
          setGameState={() => {}}
        />
      )}
    </div>
  );
}

export default function HomePage() {
  return <HomePageContent />;
}
