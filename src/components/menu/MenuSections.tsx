"use client";

import React, { useState } from 'react';
import { 
  User, 
  Backpack, 
  Sword, 
  Globe, 
  Users, 
  Coins 
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Player, GameState } from '@/lib/types';

// Import des composants existants
import InventoryDisplay from '@/components/InventoryDisplay';
import HistoricalContactsBook from '@/components/HistoricalContactsBook';
import EvidenceLogDisplay from '@/components/EvidenceLogDisplay';

// Composants temporaires pour les sections non encore implémentées
import { PersonnageSection } from './sections/PersonnageSection';
import { AventureSection } from './sections/AventureSection';
import { MondeSection } from './sections/MondeSection';
import { EconomieSection } from './sections/EconomieSection';

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
  // Configuration des sections du menu
  const menuSections = [
    {
      id: 'personnage',
      label: 'Personnage',
      icon: User,
      component: PersonnageSection,
      badge: null,
      description: 'Statistiques et progression'
    },
    {
      id: 'equipement',
      label: 'Équipement',
      icon: Backpack,
      component: InventoryDisplay,
      badge: player?.inventory?.length || 0,
      description: 'Inventaire et objets'
    },
    {
      id: 'aventure',
      label: 'Aventure',
      icon: Sword,
      component: AventureSection,
      badge: gameState.player?.quests?.filter(q => q.status === 'active')?.length || 0,
      description: 'Quêtes et journal'
    },
    {
      id: 'monde',
      label: 'Monde',
      icon: Globe,
      component: MondeSection,
      badge: null,
      description: 'Carte et exploration'
    },
    {
      id: 'social',
      label: 'Social',
      icon: Users,
      component: HistoricalContactsBook,
      badge: gameState.player?.historicalContacts?.length || 0,
      description: 'Contacts et relations'
    },
    {
      id: 'economie',
      label: 'Économie',
      icon: Coins,
      component: EconomieSection,
      badge: null,
      description: 'Commerce et artisanat'
    }
  ];

  if (!player) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>Aucun joueur sélectionné</p>
      </div>
    );
  }

  return (
    <div className={cn("h-full flex flex-col", className)}>
      <Tabs 
        value={activeTab} 
        onValueChange={onTabChange}
        className="h-full flex flex-col"
      >
        {/* Navigation par onglets */}
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 gap-1 h-auto p-1 bg-muted/50">
          {menuSections.map((section) => {
            const IconComponent = section.icon;
            
            return (
              <TabsTrigger
                key={section.id}
                value={section.id}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 px-1",
                  "data-[state=active]:bg-background data-[state=active]:text-foreground",
                  "hover:bg-background/50 transition-all duration-200",
                  "text-xs"
                )}
              >
                <div className="relative">
                  <IconComponent className="w-4 h-4" />
                  {section.badge !== null && section.badge > 0 && (
                    <Badge 
                      variant="secondary" 
                      className="absolute -top-2 -right-2 h-4 w-4 p-0 text-xs flex items-center justify-center"
                    >
                      {section.badge > 99 ? '99+' : section.badge}
                    </Badge>
                  )}
                </div>
                <span className="leading-none font-medium">
                  {section.label}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Contenu des onglets */}
        <div className="flex-1 overflow-hidden">
          {menuSections.map((section) => {
            const SectionComponent = section.component;
            
            return (
              <TabsContent
                key={section.id}
                value={section.id}
                className="h-full m-0 p-0"
              >
                <ScrollArea className="h-full">
                  <div className="p-4">
                    {/* Header de section */}
                    <div className="mb-4 pb-2 border-b border-border">
                      <div className="flex items-center gap-2 mb-1">
                        <section.icon className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold text-lg">
                          {section.label}
                        </h3>
                        {section.badge !== null && section.badge > 0 && (
                          <Badge variant="secondary">
                            {section.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {section.description}
                      </p>
                    </div>

                    {/* Contenu de la section */}
                    <div className="space-y-4">
                      {/* Rendu conditionnel selon la section */}
                      {section.id === 'equipement' && (
                        <SectionComponent 
                          player={player} 
                          gameState={gameState}
                        />
                      )}
                      
                      {section.id === 'social' && (
                        <SectionComponent 
                          contacts={player.historicalContacts || []}
                          player={player}
                        />
                      )}
                      
                      {section.id === 'aventure' && (
                        <div className="space-y-6">
                          <SectionComponent 
                            player={player}
                            gameState={gameState}
                          />
                          <div>
                            <h4 className="font-medium mb-2">Indices et Documents</h4>
                            <EvidenceLogDisplay 
                              player={player}
                              gameState={gameState}
                            />
                          </div>
                        </div>
                      )}
                      
                      {['personnage', 'monde', 'economie'].includes(section.id) && (
                        <SectionComponent 
                          player={player}
                          gameState={gameState}
                        />
                      )}
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>
            );
          })}
        </div>
      </Tabs>
    </div>
  );
};