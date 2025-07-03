
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
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose?: () => void;
}

export function SettingsModal({ open, onOpenChange, onClose }: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Paramètres du Jeu</DialogTitle>
          <DialogDescription>
            Ajustez les paramètres de votre expérience de jeu.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="py-4 space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                    <Label htmlFor="theme-switch" className="flex flex-col space-y-1">
                        <span>Thème sombre</span>
                        <span className="font-normal leading-snug text-muted-foreground">
                            Activez le mode sombre pour une interface plus reposante.
                        </span>
                    </Label>
                    <Switch id="theme-switch" disabled />
                </div>
                 <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                    <Label htmlFor="sound-switch" className="flex flex-col space-y-1">
                        <span>Effets sonores</span>
                         <span className="font-normal leading-snug text-muted-foreground">
                            Activez les effets sonores pour plus d'immersion.
                        </span>
                    </Label>
                    <Switch id="sound-switch" disabled />
                </div>
                <p className="text-center text-sm text-muted-foreground pt-4">Plus d'options à venir bientôt !</p>
            </div>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={() => { onOpenChange(false); onClose?.(); }}>Sauvegarder et Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
