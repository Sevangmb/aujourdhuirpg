
"use client";

import React from 'react';
import { User, Backpack, Sword, Globe, Users as SocialIcon, Coins } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Player, GameState } from '@/lib/types';

// Import des composants de contenu de section
import { PersonnageSection } from './sections/PersonnageSection';
import { AventureSection } from './sections/AventureSection';
import { MondeSection } from './sections/MondeSection';
import { EconomieSection } from './sections/EconomieSection';
import InventoryDisplay from '@/components/InventoryDisplay';
import HistoricalContactsBook from '@/components/HistoricalContactsBook';


interface MenuSectionsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  player: Player | null;
  gameState: GameState;
  className?: string;
}

export const MenuSections: React.FC<MenuSectionsProps> = ({
  activeTab,
  onTabChange,
  player,
  gameState,
  className
}) => {
  if (!player) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground p-4">
        <p>Chargement des données du joueur...</p>
      </div>
    );
  }

  const menuSections = [
    { id: 'personnage', label: 'Personnage', icon: User, component: PersonnageSection },
    { id: 'equipement', label: 'Équipement', icon: Backpack, component: InventoryDisplay, badge: player.inventory.length },
    { id: 'aventure', label: 'Aventure', icon: Sword, component: AventureSection, badge: player.questLog.filter(q => q.status === 'active').length },
    { id: 'monde', label: 'Monde', icon: Globe, component: MondeSection },
    { id: 'social', label: 'Social', icon: SocialIcon, component: HistoricalContactsBook, badge: player.historicalContacts.length },
    { id: 'economie', label: 'Économie', icon: Coins, component: EconomieSection },
  ];

  return (
    <div className={cn("h-full flex flex-col", className)}>
      <Tabs value={activeTab} onValueChange={onTabChange} className="h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 gap-1 h-auto p-1 bg-muted/50">
          {menuSections.map(({ id, label, icon: Icon, badge }) => (
            <TabsTrigger key={id} value={id} className="flex-col p-1.5 h-auto text-xs data-[state=active]:bg-background">
              <div className="relative">
                <Icon className="w-5 h-5 mb-1" />
                {badge > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-2 h-4 w-4 p-0 text-xs flex items-center justify-center rounded-full">
                    {badge > 9 ? '9+' : badge}
                  </Badge>
                )}
              </div>
              <span className="leading-none font-medium">{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        <ScrollArea className="flex-1">
            {menuSections.map(({ id, component: Component }) => (
                <TabsContent key={id} value={id} className="m-0">
                    <div className="p-4">
                        {/* TypeScript ne peut pas garantir le type des props pour les composants dynamiques, d'où le 'any' */}
                        <Component 
                            player={player} 
                            gameState={gameState} 
                            inventory={player.inventory}
                            contacts={player.historicalContacts}
                        />
                    </div>
                </TabsContent>
            ))}
        </ScrollArea>
      </Tabs>
    </div>
  );
};
