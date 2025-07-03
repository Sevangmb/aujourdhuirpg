"use client";

import React, { useState } from 'react';
import { 
  Users, 
  Settings, 
  HelpCircle, 
  LogOut 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { User } from 'firebase/auth';

// Import des modals (à créer)
import { SettingsModal } from './modals/SettingsModal';
import { HelpModal } from './modals/HelpModal';

interface SystemActionsProps {
  user: User | null;
  signOutUser: () => Promise<void>;
  onAction?: () => void; // Callback pour fermer le menu après action
  className?: string;
}

export const SystemActions: React.FC<SystemActionsProps> = ({
  user,
  signOutUser,
  onAction,
  className
}) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const { toast } = useToast();

  // Actions système avec leurs configurations
  const systemActions = [
    {
      id: 'switch-character',
      icon: Users,
      label: 'Changer de personnage',
      variant: 'outline' as const,
      onClick: () => {
        // TODO: Implémenter le changement de personnage
        // Doit sauvegarder automatiquement puis retourner à la sélection
        toast({
          title: "Changement de personnage",
          description: "Cette fonctionnalité sera bientôt disponible.",
        });
        onAction?.();
      }
    },
    {
      id: 'settings',
      icon: Settings,
      label: 'Paramètres',
      variant: 'outline' as const,
      onClick: () => {
        setShowSettings(true);
      }
    },
    {
      id: 'help',
      icon: HelpCircle,
      label: 'Aide',
      variant: 'outline' as const,
      onClick: () => {
        setShowHelp(true);
      }
    },
    {
      id: 'logout',
      icon: LogOut,
      label: 'Déconnexion',
      variant: 'destructive' as const,
      onClick: () => {
        setShowLogoutConfirm(true);
      }
    }
  ];

  const handleLogout = async () => {
    try {
      await signOutUser();
      toast({
        title: "Déconnexion réussie",
        description: "À bientôt !",
      });
      onAction?.();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur de déconnexion",
        description: "Impossible de se déconnecter.",
      });
    }
    setShowLogoutConfirm(false);
  };

  return (
    <>
      <div className={cn("p-4 bg-muted/20", className)}>
        {/* Ligne de séparation */}
        <div className="mb-4">
          <div className="h-px bg-border" />
        </div>

        {/* Info utilisateur */}
        {user && (
          <div className="mb-4 px-2">
            <p className="text-xs text-muted-foreground mb-1">
              Connecté en tant que
            </p>
            <p className="text-sm font-medium truncate">
              {user.email || 'Utilisateur anonyme'}
            </p>
          </div>
        )}

        {/* Actions système */}
        <div className="grid grid-cols-2 gap-2">
          {systemActions.map((action) => {
            const IconComponent = action.icon;
            
            return (
              <Button
                key={action.id}
                variant={action.variant}
                size="sm"
                onClick={action.onClick}
                className={cn(
                  "flex items-center gap-2 justify-start h-auto py-2 px-3",
                  "text-xs font-medium",
                  action.variant === 'destructive' && "hover:bg-destructive/90"
                )}
              >
                <IconComponent className="w-4 h-4 shrink-0" />
                <span className="truncate">{action.label}</span>
              </Button>
            );
          })}
        </div>

        {/* Version du jeu */}
        <div className="mt-4 pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Aujourd'hui RPG v0.1.0
          </p>
        </div>
      </div>

      {/* Modal de confirmation de déconnexion */}
      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la déconnexion</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir vous déconnecter ? Votre progression sera automatiquement sauvegardée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>
              Se déconnecter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de paramètres */}
      <SettingsModal
        open={showSettings}
        onOpenChange={setShowSettings}
        onClose={() => {
          setShowSettings(false);
          onAction?.();
        }}
      />

      {/* Modal d'aide */}
      <HelpModal
        open={showHelp}
        onOpenChange={setShowHelp}
        onClose={() => {
          setShowHelp(false);
          onAction?.();
        }}
      />
    </>
  );
};