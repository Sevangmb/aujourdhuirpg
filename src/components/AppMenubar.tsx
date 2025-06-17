
"use client";

import React from 'react';
import type { User } from 'firebase/auth';
import type { Player } from '@/lib/types';

import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarSeparator, MenubarTrigger } from "@/components/ui/menubar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { SlidersHorizontal, Save, User as UserIcon, Briefcase, BookOpen, Search, LogOut } from 'lucide-react';

import PlayerSheet from '@/components/PlayerSheet';
import InventoryDisplay from '@/components/InventoryDisplay';
import QuestJournalDisplay from '@/components/QuestJournalDisplay';
import EvidenceLogDisplay from '@/components/EvidenceLogDisplay';

interface AppMenubarProps {
  user: User | null;
  isGameActive: boolean;
  player: Player | null;
  onRestartGame: () => void;
  onSaveGame: () => void;
  onToggleFullScreen: () => void;
  onOpenToneSettings: () => void;
  onSignOut: () => void;
}

const AppMenubar: React.FC<AppMenubarProps> = ({
  user,
  isGameActive,
  player,
  onRestartGame,
  onSaveGame,
  onToggleFullScreen,
  onOpenToneSettings,
  onSignOut,
}) => {
  return (
    <Menubar className="w-full rounded-none border-b shrink-0">
      <MenubarMenu>
        <MenubarTrigger>Fichier</MenubarTrigger>
        <MenubarContent>
          <MenubarItem onClick={onRestartGame}>
            Nouvelle Partie
          </MenubarItem>
          <MenubarItem onClick={onSaveGame} disabled={!isGameActive}>
            <Save className="mr-2 h-4 w-4" /> Sauvegarder la Partie
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onClick={() => window.close()}>Quitter</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>Affichage</MenubarTrigger>
        <MenubarContent>
          <MenubarItem onClick={onToggleFullScreen}>Plein écran</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      {player && (
        <MenubarMenu>
          <MenubarTrigger>Paramètres</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onSelect={(e) => { e.preventDefault(); onOpenToneSettings(); }}>
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Tonalité Narrative
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      )}
      {player && (
        <MenubarMenu>
          <MenubarTrigger>Joueur</MenubarTrigger>
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
      )}
      <div className="ml-auto flex items-center pr-2">
        {user && (
          <div className="text-xs text-muted-foreground mr-2">
            {user.isAnonymous ? "Anonyme" : user.email}
          </div>
        )}
        {user && (
          <Button variant="ghost" size="sm" onClick={onSignOut} className="text-xs h-8">
            <LogOut className="mr-1 h-3 w-3" /> Déconnexion
          </Button>
        )}
      </div>
    </Menubar>
  );
};

export default AppMenubar;
