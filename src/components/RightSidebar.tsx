
"use client";

import React from 'react';
import type { Player } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import InventoryDisplay from './InventoryDisplay';
import QuestJournalDisplay from './QuestJournalDisplay';
import EvidenceLogDisplay from './EvidenceLogDisplay'; 
import { Briefcase, ScrollText, FileText } from 'lucide-react';

interface RightSidebarProps {
  player: Player | null;
}

const RightSidebar: React.FC<RightSidebarProps> = ({ player }) => {
  if (!player) {
    return <div className="p-4 text-muted-foreground">Chargement des données du joueur...</div>;
  }

  return (
    <div className="h-full flex flex-col p-1">
      <Tabs defaultValue="inventory" className="w-full flex-grow flex flex-col min-h-0"> {/* Added min-h-0 */}
        <TabsList className="grid w-full grid-cols-3 shrink-0">
          <TabsTrigger value="inventory" className="text-xs sm:text-sm">
            <Briefcase className="w-3 h-3 mr-1 sm:mr-2" /> Inventaire
          </TabsTrigger>
          <TabsTrigger value="quests" className="text-xs sm:text-sm">
            <ScrollText className="w-3 h-3 mr-1 sm:mr-2" /> Quêtes
          </TabsTrigger>
          <TabsTrigger value="evidence" className="text-xs sm:text-sm">
            <FileText className="w-3 h-3 mr-1 sm:mr-2" /> Dossier
          </TabsTrigger>
        </TabsList>
        <ScrollArea className="flex-grow mt-2 pr-1 min-h-0"> {/* Added min-h-0 */}
          <TabsContent value="inventory" className="m-0 p-0 h-full"> {/* Ensure TabsContent can take height */}
            <InventoryDisplay inventory={player.inventory} />
          </TabsContent>
          <TabsContent value="quests" className="m-0 p-0 h-full">
            <QuestJournalDisplay player={player} />
          </TabsContent>
          <TabsContent value="evidence" className="m-0 p-0 h-full">
            <EvidenceLogDisplay player={player} />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
};

export default RightSidebar;

