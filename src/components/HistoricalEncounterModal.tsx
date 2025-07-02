
"use client";

import React from 'react';
import type { AdaptedContact } from '@/modules/historical/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

interface HistoricalEncounterModalProps {
  encounter: AdaptedContact | null;
  onApproach: (contact: AdaptedContact) => void;
  onIgnore: () => void;
}

export const HistoricalEncounterModal: React.FC<HistoricalEncounterModalProps> = ({ encounter, onApproach, onIgnore }) => {
  if (!encounter) return null;

  const { historical, modern } = encounter;

  return (
    <Dialog open={!!encounter} onOpenChange={(isOpen) => !isOpen && onIgnore()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <Avatar className="w-24 h-24 mb-4 border-4 border-primary/20">
            <AvatarImage src={historical.thumbnail} alt={historical.name} />
            <AvatarFallback>{modern.name.substring(0, 2)}</AvatarFallback>
          </Avatar>
          <DialogTitle className="text-2xl font-headline text-primary">{modern.name}</DialogTitle>
          <DialogDescription className="text-sm">
            {modern.profession}, {modern.age} ans
          </DialogDescription>
          <Badge variant="secondary" className="mt-2">Lié à {historical.name}</Badge>
        </DialogHeader>
        <div className="my-4 p-4 bg-muted/50 rounded-lg text-center">
          <p className="italic text-foreground">"{modern.greeting}"</p>
        </div>
        <DialogFooter className="flex-row justify-center space-x-2">
          <Button onClick={() => onApproach(encounter)} className="flex-1">L'aborder</Button>
          <Button onClick={onIgnore} variant="outline" className="flex-1">Ignorer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
