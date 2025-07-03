
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose?: () => void;
}

export function HelpModal({ open, onOpenChange, onClose }: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Aide & Support</DialogTitle>
          <DialogDescription>
            Informations et guides pour Aujourd'hui RPG.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="py-4 space-y-4">
            <h3 className="font-semibold">Principes du jeu</h3>
            <p className="text-sm text-muted-foreground">
              Aujourd'hui RPG est un jeu de rôle textuel où vos choix façonnent une histoire unique. Il n'y a pas de "bonne" ou "mauvaise" façon de jouer. Explorez, interagissez, et créez votre propre aventure !
            </p>
            <h3 className="font-semibold">Contact</h3>
             <p className="text-sm text-muted-foreground">
              Pour tout problème technique ou suggestion, veuillez contacter le support via notre canal Discord (lien à venir).
            </p>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={() => { onOpenChange(false); onClose?.(); }}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
