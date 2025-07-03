
"use client";

import React from 'react';
import type { Player } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PlayerSheet from '@/components/PlayerSheet';
import StatDisplay from '@/components/StatDisplay';
import { User, Activity } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SectionProps {
  player: Player;
}

export const PersonnageSection: React.FC<SectionProps> = ({ player }) => {
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [isStatsOpen, setIsStatsOpen] = React.useState(false);

  return (
    <div className="space-y-2">
      <Button variant="outline" className="w-full justify-start" onClick={() => setIsSheetOpen(true)}>
        <User className="mr-2" /> Fiche de Personnage
      </Button>
      <Dialog open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader><DialogTitle>Fiche de Personnage</DialogTitle></DialogHeader>
          <ScrollArea className="-m-6 mt-0 p-1 pt-0"><div className="p-6"><PlayerSheet player={player} /></div></ScrollArea>
        </DialogContent>
      </Dialog>
      
      <Button variant="outline" className="w-full justify-start" onClick={() => setIsStatsOpen(true)}>
        <Activity className="mr-2" /> Statistiques Détaillées
      </Button>
      <Dialog open={isStatsOpen} onOpenChange={setIsStatsOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle>Statistiques</DialogTitle></DialogHeader>
          <StatDisplay stats={player.stats} />
        </DialogContent>
      </Dialog>
    </div>
  );
};
