
"use client";

import React from 'react';
import type { User as FirebaseUser } from 'firebase/auth'; // Correct type for Firebase user
import { useGame } from '@/contexts/GameContext'; // Import the context hook

import {
    Menubar,
    MenubarContent,
    MenubarItem,
    MenubarMenu,
    MenubarSeparator,
    MenubarTrigger,
    MenubarLabel
} from "@/components/ui/menubar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    FileText,
    Maximize,
    Settings,
    Activity,
    Save,
    LogOut,
    SlidersHorizontal,
    Briefcase,
    BookOpen,
    Search,
    BookText,
    BrainCircuit, // Icon for Geo-Intelligence
    Users,
    Euro,
    BookUser,
    User as UserIcon,
} from 'lucide-react';

import PlayerSheet from '@/components/PlayerSheet';
import InventoryDisplay from '@/components/InventoryDisplay';
import QuestJournalDisplay from '@/components/QuestJournalDisplay';
import EvidenceLogDisplay from '@/components/EvidenceLogDisplay';
import StatDisplay from '@/components/StatDisplay';
import GeoIntelligenceDisplay from './GeoIntelligenceDisplay'; // Import new component
import FinancialsDisplay from './FinancialsDisplay'; // Import new component
import { UNKNOWN_STARTING_PLACE_NAME } from '@/data/initial-game-data';
import HistoricalContactsBook from './HistoricalContactsBook';
import ToneSettingsDialog from './ToneSettingsDialog'; // Import ToneSettingsDialog
import JournalDisplay from './JournalDisplay';


const AppMenubar: React.FC = () => {
    const {
        user,
        gameState,
        isGameActive,
        handleManualSave,
        handleExitToSelection,
        handleSignOut,
    } = useGame();

    const { 
        geoIntelligence,
    } = gameState.contextualData;
    
    const [isToneSettingsOpen, setIsToneSettingsOpen] = React.useState(false);
    const player = gameState?.player;

    const onToggleFullScreen = () => {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen();
        else if (document.exitFullscreen) document.exitFullscreen();
    };

    if (!player) return null;

    return (
    <>
        <Menubar className="w-full rounded-none border-b shrink-0 px-1 sm:px-2 z-50">
        <MenubarMenu>
            <MenubarTrigger className="px-2 sm:px-3">
                <FileText className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only sm:ml-1">Fichier</span>
            </MenubarTrigger>
            <MenubarContent>
            <MenubarItem onClick={handleExitToSelection}>
                <Users className="mr-2 h-4 w-4" /> Changer de Personnage
            </MenubarItem>
            <MenubarItem onClick={handleManualSave} disabled={!isGameActive}>
                <Save className="mr-2 h-4 w-4" /> Sauvegarder la Partie
            </MenubarItem>
            {user && (
                <>
                <MenubarSeparator />
                <MenubarLabel className="px-2 py-1.5 text-xs text-muted-foreground truncate max-w-[150px] sm:max-w-[200px]">
                    {user.isAnonymous ? "Connecté Anonymement" : user.email}
                </MenubarLabel>
                <MenubarItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" /> Déconnexion
                </MenubarItem>
                </>
            )}
            <MenubarSeparator />
            <MenubarItem onClick={() => window.close()}>Quitter</MenubarItem>
            </MenubarContent>
        </MenubarMenu>

        <MenubarMenu>
            <MenubarTrigger className="px-2 sm:px-3">
                <Settings className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only sm:ml-1">Paramètres</span>
            </MenubarTrigger>
            <MenubarContent>
                <MenubarItem onSelect={(e) => { e.preventDefault(); setIsToneSettingsOpen(true); }}>
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
                        <DialogHeader><DialogTitle>Fiche Personnage</DialogTitle></DialogHeader>
                        <ScrollArea className="max-h-[70vh] p-2"><PlayerSheet player={player} /></ScrollArea>
                    </DialogContent>
                </Dialog>
                <Dialog>
                    <DialogTrigger asChild>
                        <MenubarItem onSelect={(e) => e.preventDefault()}><Activity className="mr-2 h-4 w-4" />Statistiques</MenubarItem>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-xs md:max-w-sm max-h-[80vh]">
                        <DialogHeader><DialogTitle>Statistiques du Personnage</DialogTitle></DialogHeader>
                        <ScrollArea className="max-h-[70vh] p-1"><StatDisplay stats={player.stats} /></ScrollArea>
                    </DialogContent>
                </Dialog>
                <MenubarSeparator />
                <Dialog>
                    <DialogTrigger asChild>
                        <MenubarItem onSelect={(e) => e.preventDefault()}><Briefcase className="mr-2 h-4 w-4" />Inventaire</MenubarItem>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-2xl max-h-[80vh]">
                        <DialogHeader><DialogTitle>Inventaire</DialogTitle></DialogHeader>
                        <ScrollArea className="max-h-[70vh] p-1"><InventoryDisplay inventory={player.inventory} /></ScrollArea>
                    </DialogContent>
                </Dialog>
                <Dialog>
                    <DialogTrigger asChild>
                        <MenubarItem onSelect={(e) => e.preventDefault()}><BookOpen className="mr-2 h-4 w-4" />Journal de Quêtes</MenubarItem>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl max-h-[80vh]">
                        <DialogHeader><DialogTitle>Journal de Quêtes</DialogTitle></DialogHeader>
                        <ScrollArea className="max-h-[70vh] p-1"><QuestJournalDisplay player={player} /></ScrollArea>
                    </DialogContent>
                </Dialog>
                <Dialog>
                    <DialogTrigger asChild>
                        <MenubarItem onSelect={(e) => e.preventDefault()}><Search className="mr-2 h-4 w-4" />Dossier d'Enquête</MenubarItem>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl max-h-[80vh]">
                        <DialogHeader><DialogTitle>Dossier d'Enquête</DialogTitle></DialogHeader>
                        <ScrollArea className="max-h-[70vh] p-1"><EvidenceLogDisplay player={player} /></ScrollArea>
                    </DialogContent>
                </Dialog>
                <MenubarSeparator />
                 <Dialog>
                    <DialogTrigger asChild>
                        <MenubarItem onSelect={(e) => e.preventDefault()}><Euro className="mr-2 h-4 w-4" />Finances</MenubarItem>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl max-h-[80vh]">
                        <DialogHeader><DialogTitle>Relevé Financier</DialogTitle></DialogHeader>
                        <ScrollArea className="max-h-[70vh] p-1"><FinancialsDisplay transactions={player.transactionLog || []} currentBalance={player.money} /></ScrollArea>
                    </DialogContent>
                </Dialog>
                 <Dialog>
                    <DialogTrigger asChild>
                        <MenubarItem onSelect={(e) => e.preventDefault()}><BookUser className="mr-2 h-4 w-4" />Carnet de Contacts</MenubarItem>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-4xl max-h-[90vh]">
                        <DialogHeader><DialogTitle>Carnet de Contacts Historiques</DialogTitle></DialogHeader>
                        <div className="p-1">
                            <HistoricalContactsBook contacts={player.historicalContacts || []} />
                        </div>
                    </DialogContent>
                </Dialog>
            </MenubarContent>
        </MenubarMenu>
        
        <MenubarMenu>
            <MenubarTrigger className="px-2 sm:px-3">
                <BrainCircuit className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only sm:ml-1">Analyse</span>
            </MenubarTrigger>
            <MenubarContent>
                <Dialog>
                    <DialogTrigger asChild>
                        <MenubarItem onSelect={(e) => e.preventDefault()}>
                            <BrainCircuit className="mr-2 h-4 w-4" /> Analyse Géospatiale
                        </MenubarItem>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl max-h-[80vh]">
                        <DialogHeader><DialogTitle>Analyse Géospatiale du Lieu</DialogTitle></DialogHeader>
                        <ScrollArea className="max-h-[70vh] p-1">
                           <GeoIntelligenceDisplay
                                data={geoIntelligence.data}
                                isLoading={geoIntelligence.loading}
                                error={geoIntelligence.error}
                                placeName={player.currentLocation?.name || UNKNOWN_STARTING_PLACE_NAME}
                           />
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
                            <BookText className="mr-2 h-4 w-4" /> Ouvrir le Journal de Bord
                        </MenubarItem>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl max-h-[80vh] flex flex-col">
                        <DialogHeader>
                            <DialogTitle>Journal de Bord</DialogTitle>
                        </DialogHeader>
                        <div className="flex-grow min-h-0">
                           <ScrollArea className="h-full pr-4">
                               <JournalDisplay journal={gameState.journal || []} />
                           </ScrollArea>
                        </div>
                    </DialogContent>
                </Dialog>
            </MenubarContent>
        </MenubarMenu>
        </Menubar>
        <ToneSettingsDialog
            isOpen={isToneSettingsOpen}
            onOpenChange={setIsToneSettingsOpen}
        />
    </>
    );
};

export default AppMenubar;
