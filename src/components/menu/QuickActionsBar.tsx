"use client";

import React from 'react';
import { 
  Save, 
  Maximize, 
  MapPin, 
  Search, 
  Backpack, 
  BookOpen 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useGame } from '@/contexts/GameContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface QuickActionsBarProps {
  onAction?: () => void; // Callback pour fermer le menu après action
  className?: string;
}

export const QuickActionsBar: React.FC<QuickActionsBarProps> = ({ 
  onAction, 
  className 
}) => {
  const { 
    handleSaveGame,
    openTravelModal,
    triggerGeoAnalysis,
    gameState 
  } = useGame();
  const { toast } = useToast();

  // Actions rapides avec leurs configurations
  const quickActions = [
    {
      id: 'save',
      icon: Save,
      label: 'Sauvegarder',
      tooltip: 'Sauvegarder la partie',
      onClick: async () => {
        try {
          await handleSaveGame();
          toast({
            title: "Partie sauvegardée",
            description: "Votre progression a été sauvegardée avec succès.",
          });
          onAction?.();
        } catch (error) {
          toast({
            variant: "destructive",
            title: "Erreur de sauvegarde",
            description: "Impossible de sauvegarder la partie.",
          });
        }
      }
    },
    {
      id: 'fullscreen',
      icon: Maximize,
      label: 'Plein écran',
      tooltip: 'Basculer en plein écran',
      onClick: () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {
            toast({
              variant: "destructive",
              title: "Plein écran impossible",
              description: "Votre navigateur ne supporte pas le plein écran.",
            });
          });
        } else {
          document.exitFullscreen();
        }
        onAction?.();
      }
    },
    {
      id: 'travel',
      icon: MapPin,
      label: 'Voyager',
      tooltip: 'Ouvrir la modal de voyage',
      onClick: () => {
        if (openTravelModal) {
          openTravelModal();
        } else {
          toast({
            variant: "destructive",
            title: "Voyage indisponible",
            description: "Le système de voyage n'est pas encore disponible.",
          });
        }
        onAction?.();
      }
    },
    {
      id: 'analyze',
      icon: Search,
      label: 'Analyser',
      tooltip: 'Analyser le lieu actuel',
      onClick: async () => {
        try {
          if (triggerGeoAnalysis) {
            await triggerGeoAnalysis();
            toast({
              title: "Analyse en cours",
              description: "Analyse du lieu en cours...",
            });
          } else {
            toast({
              variant: "destructive",
              title: "Analyse indisponible",
              description: "L'analyse géographique n'est pas disponible.",
            });
          }
          onAction?.();
        } catch (error) {
          toast({
            variant: "destructive",
            title: "Erreur d'analyse",
            description: "Impossible d'analyser le lieu actuel.",
          });
        }
      }
    },
    {
      id: 'inventory',
      icon: Backpack,
      label: 'Inventaire',
      tooltip: 'Accès rapide à l\'inventaire',
      onClick: () => {
        // TODO: Implémenter l'ouverture rapide de l'inventaire
        // Peut basculer vers l'onglet "équipement" du menu
        toast({
          title: "Inventaire",
          description: "Basculez vers l'onglet Équipement pour voir votre inventaire.",
        });
        onAction?.();
      }
    },
    {
      id: 'journal',
      icon: BookOpen,
      label: 'Journal',
      tooltip: 'Journal de bord',
      onClick: () => {
        // TODO: Implémenter l'ouverture rapide du journal
        // Peut basculer vers l'onglet "aventure" du menu
        toast({
          title: "Journal",
          description: "Basculez vers l'onglet Aventure pour voir votre journal.",
        });
        onAction?.();
      }
    }
  ];

  return (
    <TooltipProvider>
      <div className={cn("mt-4", className)}>
        <div className="mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Actions Rapides
          </span>
        </div>
        
        {/* Grid responsive: 6x1 sur desktop, 3x2 sur mobile */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {quickActions.map((action) => {
            const IconComponent = action.icon;
            
            return (
              <Tooltip key={action.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={action.onClick}
                    className={cn(
                      "h-10 w-full flex flex-col items-center justify-center gap-1 p-1",
                      "hover:bg-primary/10 hover:border-primary/20",
                      "transition-all duration-200 hover:scale-105 active:scale-95"
                    )}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span className="text-xs font-medium leading-none">
                      {action.label}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{action.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
};