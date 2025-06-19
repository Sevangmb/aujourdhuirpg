
"use client";

import React from 'react';
import type { User as FirebaseUser } from 'firebase/auth'; // Renamed to avoid conflict with Lucide's User icon
import type { Player, JournalEntry } from '@/lib/types';

import { 
    Menubar, 
    MenubarContent, 
    MenubarItem, 
    MenubarMenu, 
    MenubarSeparator, 
    MenubarTrigger,
    MenubarLabel
} from "@/components/ui/menubar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from '@/components/ui/scroll-area';
// Removed Button import as it's no longer used directly in the Menubar itself for sign-out
import { 
    SlidersHorizontal, 
    Save, 
    User as UserIcon, 
    Briefcase, 
    BookOpen,
    BookText, // Added BookText for Journal
    Search, 
    LogOut, 
    FileText,
    Maximize,
    Settings // Using Settings icon for "Paramètres" menu
} from 'lucide-react';

import PlayerSheet from '@/components/PlayerSheet';
import InventoryDisplay from '@/components/InventoryDisplay';
import QuestJournalDisplay from '@/components/QuestJournalDisplay';
import EvidenceLogDisplay from '@/components/EvidenceLogDisplay';
import JournalDisplay from '@/components/JournalDisplay'; // Added JournalDisplay import

interface AppMenubarProps {
  user: FirebaseUser | null;
  isGameActive: boolean;
  player: Player | null;
  onRestartGame: () => void;
  onSaveGame: () => void;
  onToggleFullScreen: () => void;
  onOpenToneSettings: () => void;
  onSignOut: () => void;
  journal?: JournalEntry[]; // Added journal prop
}

const AppMenubar: React.FC<AppMenubarProps> = ({
  user,
  isGameActive,
  player,
  journal, // Added journal to destructuring
  onRestartGame,
  onSaveGame,
  onToggleFullScreen,
  onOpenToneSettings,
  onSignOut,
}) => {
  return (
    <Menubar className="w-full rounded-none border-b shrink-0 px-1 sm:px-2">
      <MenubarMenu>
        <MenubarTrigger className="px-2 sm:px-3">
            <FileText className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only sm:ml-1">Fichier</span>
        </MenubarTrigger>
        <MenubarContent>
          <MenubarItem onClick={onRestartGame}>
            Nouvelle Partie
          </MenubarItem>
          <MenubarItem onClick={onSaveGame} disabled={!isGameActive}>
            <Save className="mr-2 h-4 w-4" /> Sauvegarder la Partie
          </MenubarItem>
          {user && (
            <>
              <MenubarSeparator />
              <MenubarLabel className="px-2 py-1.5 text-xs text-muted-foreground truncate max-w-[150px] sm:max-w-[200px]">
                {user.isAnonymous ? "Connecté Anonymement" : user.email}
              </MenubarLabel>
              <MenubarItem onClick={onSignOut}>
                <LogOut className="mr-2 h-4 w-4" /> Déconnexion
              </MenubarItem>
            </>
          )}
          <MenubarSeparator />
          <MenubarItem onClick={() => window.close()}>Quitter</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      
      {player && (
        <>
          <MenubarMenu>
            <MenubarTrigger className="px-2 sm:px-3">
                <Settings className="h-4 w-4" /> 
                <span className="sr-only sm:not-sr-only sm:ml-1">Paramètres</span>
            </MenubarTrigger>
            <MenubarContent>
                <MenubarItem onSelect={(e) => { e.preventDefault(); onOpenToneSettings(); }}>
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Tonalité Narrative
                </MenubarItem>
                <MenubarItem onClick={onToggleFullScreen}>
                    <Maximize className="mr-2 h-4 w-4" /> Plein écran
                </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          <MenubarMenu>
            <MenubarTrigger className="px-2 sm:px-3">
                <UserIcon className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only sm:ml-1">Joueur</span>
            </MenubarTrigger>
            <MenubarContent>
                <Dialog>
                <DialogTrigger asChild>
                    <MenubarItem onSelect={(e) => e.preventDefault()}><UserIcon className="mr-2 h-4 w-4" />Fiche Personnage</MenubarItem>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl max-h-[80vh]">
                    <DialogHeader>
                    <DialogTitle>Fiche Personnage</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="max-h-[70vh] p-2">
                    {player ? <PlayerSheet player={player} /> : <p>Aucune donnée de personnage.</p>}
                    </ScrollArea>
                </DialogContent>
                </Dialog>
                <Dialog>
                <DialogTrigger asChild>
                    <MenubarItem onSelect={(e) => e.preventDefault()}><Briefcase className="mr-2 h-4 w-4" />Inventaire</MenubarItem>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-2xl max-h-[80vh]">
                    <DialogHeader><DialogTitle>Inventaire</DialogTitle></DialogHeader>
                    <ScrollArea className="max-h-[70vh] p-1">
                    {player ? <InventoryDisplay inventory={player.inventory} /> : <p>Inventaire non disponible.</p>}
                    </ScrollArea>
                </DialogContent>
                </Dialog>
                <Dialog>
                <DialogTrigger asChild>
                    <MenubarItem onSelect={(e) => e.preventDefault()}><BookOpen className="mr-2 h-4 w-4" />Journal de Quêtes</MenubarItem>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl max-h-[80vh]">
                    <DialogHeader><DialogTitle>Journal de Quêtes</DialogTitle></DialogHeader>
                    <ScrollArea className="max-h-[70vh] p-1">
                    {player ? <QuestJournalDisplay player={player} /> : <p>Journal de quêtes non disponible.</p>}
                    </ScrollArea>
                </DialogContent>
                </Dialog>
                <Dialog>
                <DialogTrigger asChild>
                    <MenubarItem onSelect={(e) => e.preventDefault()}><Search className="mr-2 h-4 w-4" />Dossier d'Enquête</MenubarItem>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl max-h-[80vh]">
                    <DialogHeader><DialogTitle>Dossier d'Enquête</DialogTitle></DialogHeader>
                    <ScrollArea className="max-h-[70vh] p-1">
                    {player ? <EvidenceLogDisplay player={player} /> : <p>Dossier d'enquête non disponible.</p>}
                    </ScrollArea>
                </DialogContent>
                </Dialog>
            </MenubarContent>
          </MenubarMenu>

          <MenubarMenu>
            <MenubarTrigger className="px-2 sm:px-3">
                <BookText className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only sm:ml-1">Journal</span>
            </MenubarTrigger>
            <MenubarContent>
                <Dialog>
                    <DialogTrigger asChild>
                        <MenubarItem onSelect={(e) => e.preventDefault()}>
                            <BookText className="mr-2 h-4 w-4" /> Ouvrir le Journal
                        </MenubarItem>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl max-h-[80vh]">
                        <DialogHeader>
                            <DialogTitle>Journal de Bord</DialogTitle>
                        </DialogHeader>
                        <ScrollArea className="max-h-[70vh] p-1">
                            <JournalDisplay journal={journal || []} />
                        </ScrollArea>
                        <DialogFooter>
                             {/* DialogClose could be used here too, but Button provides explicit control if needed */}
                            <Button onClick={(e) => {
                                // Find the dialog and manually set its open state to false
                                // This is a common pattern if DialogClose is not directly usable or if more control is needed
                                const dialog = e.currentTarget.closest('[role="dialog"]');
                                if (dialog) {
                                    dialog.dispatchEvent(new Event('pointerdown', { bubbles: true }));
                                    dialog.dispatchEvent(new Event('pointerup', { bubbles: true }));
                                }
                            }}>Fermer</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </MenubarContent>
          </MenubarMenu>
        </>
      )}

      {/* The div for user email and sign-out button is removed from here as they are now in the "Fichier" menu */}
    </Menubar>
  );
};

export default AppMenubar;
