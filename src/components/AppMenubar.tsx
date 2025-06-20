
"use client";

import React from 'react';
import type { User as FirebaseUser } from 'firebase/auth'; // Correct type for Firebase user
import type { Player, Position, WeatherData, JournalEntry } from '@/lib/types';

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
import {
    FileText,
    Maximize,
    Settings,
    Activity,
    Sun,
    MapPin,
    Image as ImageIcon,
    User as UserIcon,
    Save,
    LogOut,
    SlidersHorizontal,
    Briefcase,
    BookOpen,
    Search,
    BookText
} from 'lucide-react';

import PlayerSheet from '@/components/PlayerSheet';
import InventoryDisplay from '@/components/InventoryDisplay';
import QuestJournalDisplay from '@/components/QuestJournalDisplay';
import EvidenceLogDisplay from '@/components/EvidenceLogDisplay';
import StatDisplay from '@/components/StatDisplay';
import WeatherDisplay from '@/components/WeatherDisplay';
import MapDisplay from '@/components/MapDisplay';
import LocationImageDisplay from '@/components/LocationImageDisplay';
import JournalDisplay from '@/components/JournalDisplay';
import { useIsMobile } from '@/hooks/use-mobile';
import { UNKNOWN_STARTING_PLACE_NAME } from '@/data/initial-game-data';


interface AppMenubarProps {
  user: FirebaseUser | null;
  isGameActive: boolean;
  player: Player | null;
  journal: JournalEntry[]; // Added journal prop
  onRestartGame: () => void;
  onSaveGame: () => void;
  onToggleFullScreen: () => void;
  onOpenToneSettings: () => void;
  onSignOut: () => void;
  currentLocation: Position | null; // Ensure this can be null
  nearbyPois: Position[] | null; // Ensure this can be null
  weatherData: WeatherData | null;
  weatherLoading: boolean;
  weatherError: string | null;
  locationImageUrl: string | null;
  locationImageLoading: boolean;
  locationImageError: string | null;
}

const AppMenubar: React.FC<AppMenubarProps> = ({
  user,
  isGameActive,
  player,
  journal, // Destructure journal
  onRestartGame,
  onSaveGame,
  onToggleFullScreen,
  onOpenToneSettings,
  onSignOut,
  currentLocation,
  nearbyPois,
  weatherData,
  weatherLoading,
  weatherError,
  locationImageUrl,
  locationImageLoading,
  locationImageError,
}) => {
  const isMobile = useIsMobile();

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

          {isMobile && currentLocation && (
            <MenubarMenu>
              <MenubarTrigger className="px-2 sm:px-3">
                <MapPin className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only sm:ml-1">Contexte</span>
              </MenubarTrigger>
              <MenubarContent>
                <Dialog>
                  <DialogTrigger asChild>
                    <MenubarItem onSelect={(e) => e.preventDefault()}><Sun className="mr-2 h-4 w-4" />Voir la Météo</MenubarItem>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-xs md:max-w-sm max-h-[80vh]">
                    <DialogHeader><DialogTitle>Météo Actuelle</DialogTitle></DialogHeader>
                    <ScrollArea className="max-h-[70vh] p-1">
                      <WeatherDisplay weatherData={weatherData} isLoading={weatherLoading} error={weatherError} placeName={currentLocation?.name || 'Lieu Actuel'} />
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
                <Dialog>
                  <DialogTrigger asChild>
                    <MenubarItem onSelect={(e) => e.preventDefault()}><MapPin className="mr-2 h-4 w-4" />Voir la Carte</MenubarItem>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl max-h-[80vh]">
                    <DialogHeader><DialogTitle>Carte Locale</DialogTitle></DialogHeader>
                    <ScrollArea className="max-h-[70vh] p-1">
                      <MapDisplay currentLocation={currentLocation} nearbyPois={nearbyPois || []} zoom={14} />
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
                <Dialog>
                  <DialogTrigger asChild>
                    <MenubarItem onSelect={(e) => e.preventDefault()}><ImageIcon className="mr-2 h-4 w-4" />Voir le Lieu</MenubarItem>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-xs md:max-w-sm max-h-[80vh]">
                    <DialogHeader><DialogTitle>Vue du Lieu</DialogTitle></DialogHeader>
                    <ScrollArea className="max-h-[70vh] p-1">
                       <LocationImageDisplay imageUrl={locationImageUrl} placeName={currentLocation?.name || UNKNOWN_STARTING_PLACE_NAME} isLoading={locationImageLoading} error={locationImageError} />
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
              </MenubarContent>
            </MenubarMenu>
          )}

          <MenubarMenu>
            <MenubarTrigger className="px-2 sm:px-3">
                <Activity className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only sm:ml-1">Stats</span>
            </MenubarTrigger>
            <MenubarContent>
                 <Dialog>
                    <DialogTrigger asChild>
                        <MenubarItem onSelect={(e) => e.preventDefault()}><Activity className="mr-2 h-4 w-4" />Voir les Statistiques</MenubarItem>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-xs md:max-w-sm max-h-[80vh]">
                        <DialogHeader>
                        <DialogTitle>Statistiques du Personnage</DialogTitle>
                        </DialogHeader>
                        <ScrollArea className="max-h-[70vh] p-1">
                          {player ? <StatDisplay stats={player.stats} /> : <p>Statistiques non disponibles.</p>}
                        </ScrollArea>
                    </DialogContent>
                </Dialog>
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
                            <Button onClick={(e) => {
                                const dialog = e.currentTarget.closest('[role="dialog"]');
                                if (dialog) {
                                    // Manually dismiss the dialog by simulating a close action
                                    // This is a workaround if DialogClose isn't directly suitable here
                                    const closeButton = dialog.querySelector('button[aria-label="Close"], button[type="button"]:not([aria-label])') as HTMLElement; // More generic selector
                                    if (closeButton) closeButton.click();
                                    else { // Fallback if a specific close button isn't found
                                       dialog.dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true }));
                                       dialog.dispatchEvent(new Event('click', { bubbles: true, cancelable: true })); // try click too
                                       dialog.dispatchEvent(new Event('pointerup', { bubbles: true, cancelable: true }));
                                    }
                                }
                            }}>Fermer</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </MenubarContent>
          </MenubarMenu>
        </>
      )}
    </Menubar>
  );
};

export default AppMenubar;
