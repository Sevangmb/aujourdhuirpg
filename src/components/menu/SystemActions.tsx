
"use client";

import React, { useState } from 'react';
import { Users, Settings, HelpCircle, LogOut } from 'lucide-react';
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
import { useGame } from '@/contexts/GameContext';
import { SettingsModal } from './modals/SettingsModal';
import { HelpModal } from './modals/HelpModal';

interface SystemActionsProps {
  user: User | null;
  signOutUser: () => Promise<void>;
  onAction?: () => void;
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
  const { handleExitToSelection } = useGame();

  const handleLogout = async () => {
    onAction?.();
    await signOutUser();
  };

  const systemActions = [
    {
      id: 'switch-character',
      icon: Users,
      label: 'Changer Personnage',
      onClick: () => {
        onAction?.();
        handleExitToSelection();
      }
    },
    {
      id: 'settings',
      icon: Settings,
      label: 'Paramètres',
      onClick: () => setShowSettings(true)
    },
    {
      id: 'help',
      icon: HelpCircle,
      label: 'Aide',
      onClick: () => setShowHelp(true)
    },
    {
      id: 'logout',
      icon: LogOut,
      label: 'Déconnexion',
      onClick: () => setShowLogoutConfirm(true),
      destructive: true,
    }
  ];

  return (
    <>
      <div className={cn("p-2", className)}>
        {user && (
          <div className="mb-2 px-2">
            <p className="text-xs text-muted-foreground truncate">
              {user.isAnonymous ? "Anonyme" : user.email}
            </p>
          </div>
        )}
        <div className="grid grid-cols-1 gap-1">
          {systemActions.map((action) => (
            <Button
              key={action.id}
              variant={action.destructive ? "destructive" : "ghost"}
              size="sm"
              onClick={action.onClick}
              className="w-full justify-start gap-2"
            >
              <action.icon className="w-4 h-4" />
              <span>{action.label}</span>
            </Button>
          ))}
        </div>
      </div>

      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la déconnexion</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir vous déconnecter ? La partie sera sauvegardée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-destructive hover:bg-destructive/90">
              Se déconnecter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SettingsModal open={showSettings} onOpenChange={setShowSettings} onClose={onAction} />
      <HelpModal open={showHelp} onOpenChange={setShowHelp} onClose={onAction} />
    </>
  );
};
