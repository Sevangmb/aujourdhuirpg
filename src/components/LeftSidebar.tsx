
"use client";

import React from 'react';
import type { Player } from '@/lib/types';
import StatDisplay from './StatDisplay';
// AuthDisplay is no longer imported here as it's primarily in the Menubar or central area
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext'; // To get user info for display
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCircle2 } from 'lucide-react';


interface LeftSidebarProps {
  player: Player; 
  isLoading: boolean;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({ player, isLoading }) => {
  const { user } = useAuth(); // Get user for display purposes

  return (
    <div className="h-full flex flex-col gap-2"> 
      {/* User Info Card - simplified from AuthDisplay */}
      {user && (
         <Card className="shadow-sm shrink-0">
          <CardHeader className="p-2 pb-1">
            <CardTitle className="flex items-center text-sm font-semibold text-sidebar-primary">
              <UserCircle2 className="w-4 h-4 mr-2" />
              Joueur
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-0 text-xs text-sidebar-foreground/90">
             <p className="truncate">
              {user.isAnonymous ? "Connecté Anonymement" : user.email || "Utilisateur Connecté"}
            </p>
            {user.isAnonymous && <p className="text-xs text-sidebar-muted-foreground">Progression locale.</p>}
          </CardContent>
        </Card>
      )}
      
      {/* Player stats display */}
      <div className="shrink-0">
        <StatDisplay stats={player.stats} previousStats={player.stats} />
      </div>

      {/* Quick Player Info */}
      <Card className="shadow-sm flex-grow flex flex-col min-h-0">
         <CardHeader className="p-2 pb-1">
            <CardTitle className="text-sm font-semibold text-sidebar-primary text-center">
              {player.name}
            </CardTitle>
         </CardHeader>
         <CardContent className="p-2 pt-0 text-xs text-sidebar-foreground/90 flex-grow overflow-y-auto">
            <p><span className="font-semibold">Niveau:</span> {player.progression.level}</p>
            <p><span className="font-semibold">XP:</span> {player.progression.xp} / {player.progression.xpToNextLevel}</p>
            <p><span className="font-semibold">Argent:</span> {player.money} €</p>
            <div className="mt-1">
                <h4 className="font-semibold text-xs text-sidebar-muted-foreground">Traits Actifs:</h4>
                {player.traitsMentalStates && player.traitsMentalStates.length > 0 ? (
                    <ul className="list-disc list-inside">
                    {player.traitsMentalStates.slice(0, 3).map((trait, index) => ( // Show first 3 traits
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
