
"use client";

import React from 'react';
import type { Player } from '@/lib/types';
import StatDisplay from './StatDisplay';
import AuthDisplay from './AuthDisplay'; // To display logged-in user info & logout
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';

interface LeftSidebarProps {
  player: Player; // Player is now expected to be non-null
  isLoading: boolean;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({ player, isLoading }) => {
  const { user, signOutUser } = useAuth(); // Get user and signOut for AuthDisplay

  return (
    <div className="h-full flex flex-col p-1 gap-2">
      {/* AuthDisplay will show current user info and logout button */}
      <div className="shrink-0">
        <AuthDisplay
          user={user}
          loadingAuth={isLoading} // Use the isLoading prop for AuthDisplay's loading state
          signUp={async () => {}} // SignUp/SignIn/Anon are not used here, only showing logged-in state
          signIn={async () => {}}
          signInAnon={async () => {}}
          signOut={signOutUser}
        />
      </div>
      
      {/* Player stats display */}
      <div className="shrink-0">
        <StatDisplay stats={player.stats} previousStats={player.stats} />
      </div>

      {/* Placeholder for any future sidebar content, PlayerSheet removed for redundancy */}
      <ScrollArea className="flex-grow rounded-md border p-1 min-h-0">
         <h2 className="text-lg font-headline text-primary p-2 text-center sticky top-0 bg-sidebar z-10">Joueur Actif</h2>
         <div className="p-2 text-sm text-muted-foreground">
            <p>Nom: {player.name}</p>
            <p>Niveau: {player.progression.level}</p>
            {/* Additional quick info can be added here if needed */}
         </div>
      </ScrollArea>
      {/* Restart button removed, handled by Menubar */}
    </div>
  );
};

export default LeftSidebar;
