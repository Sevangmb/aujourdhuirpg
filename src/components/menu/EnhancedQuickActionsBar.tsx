"use client";

import React from 'react';
import { 
  Save, 
  Maximize, 
  MapPin, 
  Search, 
  BookOpen,
  Camera,
  MessageCircle,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useGame } from '@/contexts/GameContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface EnhancedQuickActionsBarProps {
  onAction?: () => void; // Callback pour fermer le menu après action
  className?: string;
}

export const EnhancedQuickActionsBar: React.FC<EnhancedQuickActionsBarProps> = ({ 
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

  const handleSave = async () => {
    try {
      await handleManualSave();
      toast({
        title: "💾 Partie sauvegardée",
        description: "Votre progression a été sauvegardée avec succès.",
      });
      onAction?.();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur de sauvegarde",
        description: "Impossible de sauvegarder votre progression.",
      });
    }
  };

  const handleTravel = () => {
    toast({
      title: "🗺️ Carte ouverte",
      description: "Sélectionnez votre destination.",
    });
    onAction?.();
  };

  const handleAnalyze = () => {
    toast({
      title: "📊 Analyse en cours",
      description: "Analyse géospatiale de votre position...",
    });
    onAction?.();
  };

  const handleJournal = () => {
    toast({
      title: "📖 Journal ouvert",
      description: "Consultez vos notes et découvertes.",
    });
    onAction?.();
  };

  const handleCamera = () => {
    toast({
      title: "📸 Mode photo",
      description: "Capturez des moments mémorables.",
    });
    onAction?.();
  };

  const handleChat = () => {
    toast({
      title: "💬 Chat ouvert",
      description: "Communiquez avec d'autres joueurs.",
    });
    onAction?.();
  };

  const handleSettings = () => {
    toast({
      title: "⚙️ Paramètres",
      description: "Configurez votre expérience de jeu.",
    });
    onAction?.();
  };

  const primaryActions = [
    {
      id: 'save',
      icon: Save,
      label: 'Sauvegarder',
      onClick: handleSave,
      color: 'bg-green-500 hover:bg-green-600',
      description: 'Sauvegarder la partie'
    },
    {
      id: 'travel',
      icon: MapPin,
      label: 'Voyager',
      onClick: handleTravel,
      color: 'bg-blue-500 hover:bg-blue-600',
      description: 'Ouvrir la carte'
    },
    {
      id: 'analyze',
      icon: Search,
      label: 'Analyser',
      onClick: handleAnalyze,
      color: 'bg-purple-500 hover:bg-purple-600',
      description: 'Analyser la zone'
    },
    {
      id: 'fullscreen',
      icon: Maximize,
      label: 'Plein écran',
      onClick: handleToggleFullScreen,
      color: 'bg-slate-500 hover:bg-slate-600',
      description: 'Mode plein écran'
    }
  ];

  const secondaryActions = [
    {
      id: 'journal',
      icon: BookOpen,
      label: 'Journal',
      onClick: handleJournal,
      color: 'bg-amber-500 hover:bg-amber-600',
      description: 'Ouvrir le journal'
    },
    {
      id: 'camera',
      icon: Camera,
      label: 'Photo',
      onClick: handleCamera,
      color: 'bg-pink-500 hover:bg-pink-600',
      description: 'Prendre une photo'
    },
    {
      id: 'chat',
      icon: MessageCircle,
      label: 'Chat',
      onClick: handleChat,
      color: 'bg-indigo-500 hover:bg-indigo-600',
      description: 'Chat multijoueur'
    },
    {
      id: 'settings',
      icon: Settings,
      label: 'Config',
      onClick: handleSettings,
      color: 'bg-gray-500 hover:bg-gray-600',
      description: 'Paramètres'
    }
  ];

  return (
    <TooltipProvider>
      <div className={cn("space-y-4", className)}>
        
        {/* Actions principales */}
        <div>
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
            Actions principales
          </div>
          <div className="grid grid-cols-2 gap-3">
            {primaryActions.map((action) => (
              <Tooltip key={action.id}>
                <TooltipTrigger asChild>
                  <Button
                    onClick={action.onClick}
                    className={cn(
                      "h-16 flex flex-col items-center justify-center gap-2 text-white font-medium transition-all hover:scale-105 hover:shadow-lg",
                      action.color
                    )}
                  >
                    <action.icon className="h-5 w-5" />
                    <span className="text-xs">{action.label}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{action.description}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>

        {/* Actions secondaires */}
        <div>
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
            Outils avancés
          </div>
          <div className="grid grid-cols-4 gap-2">
            {secondaryActions.map((action) => (
              <Tooltip key={action.id}>
                <TooltipTrigger asChild>
                  <Button
                    onClick={action.onClick}
                    size="sm"
                    className={cn(
                      "h-12 flex flex-col items-center justify-center gap-1 text-white font-medium transition-all hover:scale-105",
                      action.color
                    )}
                  >
                    <action.icon className="h-4 w-4" />
                    <span className="text-xs">{action.label}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{action.description}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>

        {/* Raccourcis clavier */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
          <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Échap</span>
              <span>Fermer le menu</span>
            </div>
            <div className="flex justify-between">
              <span>Ctrl + S</span>
              <span>Sauvegarder</span>
            </div>
            <div className="flex justify-between">
              <span>F11</span>
              <span>Plein écran</span>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};