
"use client";

import React from 'react';
import type { Player } from '@/lib/types';
import PlayerSheet from './PlayerSheet';
import StatDisplay from './StatDisplay';
import AuthDisplay from './AuthDisplay'; 
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from './ui/button';
import { RotateCcw } from 'lucide-react';

interface LeftSidebarProps {
  player: Player | null;
  onRestart: () => void;
  isLoading: boolean;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({ player, onRestart, isLoading }) => {
  const { user, loadingAuth, signUpWithEmailPassword, signInWithEmailPassword, signInAnonymously, signOutUser } = useAuth();

  return (
    <div className="h-full flex flex-col p-2 gap-4">
      <div className="shrink-0">
        <AuthDisplay
          user={user}
          loadingAuth={loadingAuth}
          signUp={signUpWithEmailPassword}
          signIn={signInWithEmailPassword}
          signInAnon={signInAnonymously}
          signOut={signOutUser}
        />
      </div>
      {player && (
        <>
          <div className="shrink-0">
            <StatDisplay stats={player.stats} previousStats={player.stats} />
          </div>
          <ScrollArea className="flex-grow rounded-md border p-1 min-h-0"> {/* min-h-0 allows flex item to shrink */}
             <h2 className="text-lg font-headline text-primary p-2 text-center sticky top-0 bg-sidebar z-10">Fiche Personnage</h2>
            <PlayerSheet player={player} />
          </ScrollArea>
        </>
      )}
       <Button onClick={onRestart} variant="outline" className="mt-auto shrink-0" disabled={isLoading}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Recommencer
        </Button>
    </div>
  );
};

export default LeftSidebar;

