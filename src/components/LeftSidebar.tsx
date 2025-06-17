
"use client";

import React from 'react';
import type { Player } from '@/lib/types';
import StatDisplay from './StatDisplay';
import { useAuth } from '@/contexts/AuthContext'; 
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCircle2 } from 'lucide-react';


interface LeftSidebarProps {
  player: Player;
  // isLoading: boolean; // Removed as it's not used
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({ player }) => {
  const { user } = useAuth();

  return (
    <div className="w-60 md:w-72 lg:w-80 h-full flex flex-col p-3 gap-3 bg-sidebar text-sidebar-foreground border-r border-sidebar-border overflow-y-auto shrink-0"> 
      {/* User Info Card */}
      {user && (
         <Card className="shadow-sm shrink-0 bg-card text-card-foreground"> {/* Explicitly set card bg/fg for contrast */}
          <CardHeader className="p-2 pb-1">
            <CardTitle className="flex items-center text-sm font-semibold text-primary"> {/* Use primary from main theme for title */}
              <UserCircle2 className="w-4 h-4 mr-2" />
              Joueur
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-0 text-xs text-card-foreground/90">
             <p className="truncate">
              {user.isAnonymous ? "Connecté Anonymement" : user.email || "Utilisateur Connecté"}
            </p>
            {user.isAnonymous && <p className="text-xs text-muted-foreground">Progression locale.</p>}
          </CardContent>
        </Card>
      )}
      
      {/* Player stats display */}
      <div className="shrink-0">
        <StatDisplay stats={player.stats} previousStats={player.stats} />
      </div>

      {/* Quick Player Info */}
      <Card className="shadow-sm flex-grow flex flex-col min-h-0 bg-card text-card-foreground"> {/* Explicit card bg/fg */}
         <CardHeader className="p-2 pb-1">
            <CardTitle className="text-sm font-semibold text-primary text-center">
              {player.name}
            </CardTitle>
         </CardHeader>
         <CardContent className="p-2 pt-0 text-xs text-card-foreground/90 flex-grow overflow-y-auto"> {/* Scroll this content if it overflows card */}
            <p><span className="font-semibold">Niveau:</span> {player.progression.level}</p>
            <p><span className="font-semibold">XP:</span> {player.progression.xp} / {player.progression.xpToNextLevel}</p>
            <p><span className="font-semibold">Argent:</span> {player.money} €</p>
            <div className="mt-1">
                <h4 className="font-semibold text-xs text-muted-foreground">Traits Actifs:</h4>
                {player.traitsMentalStates && player.traitsMentalStates.length > 0 ? (
                    <ul className="list-disc list-inside">
                    {player.traitsMentalStates.slice(0, 3).map((trait, index) => ( 
                        <li key={index} className="truncate">{trait}</li>
                    ))}
                    </ul>
                ) : (
                    <p>Aucun trait actif.</p>
                )}
            </div>
         </CardContent>
      </Card>
    </div>
  );
};

export default LeftSidebar;
