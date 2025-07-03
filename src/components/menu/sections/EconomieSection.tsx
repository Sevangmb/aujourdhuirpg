
"use client";

import React from 'react';
import type { Player } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import FinancialsDisplay from '@/components/FinancialsDisplay';
import { Euro } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';


interface SectionProps {
  player: Player;
}

export const EconomieSection: React.FC<SectionProps> = ({ player }) => {
  const [isFinancialsOpen, setIsFinancialsOpen] = React.useState(false);

  return (
    <div className="space-y-2">
      <Button variant="outline" className="w-full justify-start" onClick={() => setIsFinancialsOpen(true)}>
        <Euro className="mr-2" /> Relevé Financier
      </Button>
      <Dialog open={isFinancialsOpen} onOpenChange={setIsFinancialsOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
          <DialogHeader><DialogTitle>Relevé Financier</DialogTitle></DialogHeader>
          <FinancialsDisplay transactions={player.transactionLog || []} currentBalance={player.money} />
        </DialogContent>
      </Dialog>
      {/* Placeholder for crafting/trading */}
      <div className="p-4 text-center border-2 border-dashed rounded-lg text-muted-foreground">
        <p className="font-semibold">Artisanat & Commerce</p>
        <p className="text-xs">Bientôt disponible (T3)</p>
      </div>
    </div>
  );
};
