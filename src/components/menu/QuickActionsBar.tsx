
"use client";

import React from 'react';
import { Save, Maximize, MapPin, Search } from 'lucide-react';
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
  const { handleManualSave, gameState } = useGame();
  const { toast } = useToast();

  const handleToggleFullScreen = () => {
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
  };

  const quickActions = [
    {
      id: 'save',
      icon: Save,
      label: 'Sauvegarder',
      onClick: async () => {
        await handleManualSave();
        onAction?.();
      }
    },
    {
      id: 'fullscreen',
      icon: Maximize,
      label: 'Plein écran',
      onClick: handleToggleFullScreen
    },
    {
      id: 'travel',
      icon: MapPin,
      label: 'Voyager',
      onClick: () => {
        toast({ title: "Bientôt disponible", description: "Le système de voyage rapide sera implémenté dans T2.3." });
        onAction?.();
      }
    },
    {
      id: 'analyze',
      icon: Search,
      label: 'Analyser',
      onClick: () => {
        toast({ title: "Bientôt disponible", description: "L'analyse de lieu sera implémentée dans T2.3." });
        onAction?.();
      }
    },
  ];

  return (
    <TooltipProvider>
      <div className={cn("mt-4", className)}>
        <div className="grid grid-cols-4 gap-2">
          {quickActions.map((action) => {
            const IconComponent = action.icon;
            
            return (
              <Tooltip key={action.id} delayDuration={300}>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={action.onClick}
                    className="h-14 w-full flex flex-col items-center justify-center gap-1 p-1 hover:bg-primary/10"
                  >
                    <IconComponent className="w-5 h-5" />
                    <span className="text-xs font-medium leading-none">
                      {action.label}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{action.label}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
};
