
"use client";

import React from 'react';
import type { Player, GameState } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import QuestJournalDisplay from '@/components/QuestJournalDisplay';
import EvidenceLogDisplay from '@/components/EvidenceLogDisplay';
import { BookOpen, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SectionProps {
  player: Player;
  gameState: GameState;
}

export const AventureSection: React.FC<SectionProps> = ({ player }) => {
  const [isJournalOpen, setIsJournalOpen] = React.useState(false);
  const [isEvidenceOpen, setIsEvidenceOpen] = React.useState(false);

  return (
    <div className="space-y-2">
      <Button variant="outline" className="w-full justify-start" onClick={() => setIsJournalOpen(true)}>
        <BookOpen className="mr-2" /> Journal de Quêtes
      </Button>
      <Dialog open={isJournalOpen} onOpenChange={setIsJournalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
          <DialogHeader><DialogTitle>Journal de Quêtes</DialogTitle></DialogHeader>
          <ScrollArea className="flex-grow p-1 -m-6 mt-0"><QuestJournalDisplay player={player} /></ScrollArea>
        </DialogContent>
      </Dialog>
      
      <Button variant="outline" className="w-full justify-start" onClick={() => setIsEvidenceOpen(true)}>
        <Search className="mr-2" /> Dossier d'Enquête
      </Button>
      <Dialog open={isEvidenceOpen} onOpenChange={setIsEvidenceOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
          <DialogHeader><DialogTitle>Dossier d'Enquête</DialogTitle></DialogHeader>
          <ScrollArea className="flex-grow p-1 -m-6 mt-0"><EvidenceLogDisplay player={player} /></ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};
