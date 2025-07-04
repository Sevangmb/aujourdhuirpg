"use client";

import React, { useState, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Menu, 
  X, 
  User, 
  Package, 
  Sword, 
  Globe, 
  Users, 
  Coins,
  Calendar,
  Cloud,
  Sun,
  Thermometer
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Import des composants modulaires améliorés
import { EnhancedPlayerStatusBar } from './menu/EnhancedPlayerStatusBar';
import { EnhancedQuickActionsBar } from './menu/EnhancedQuickActionsBar';
import { MenuSections } from './menu/MenuSections';
import { SystemActions } from './menu/SystemActions';

interface ModernAppMenubarProps {
  className?: string;
}

const ModernAppMenubar: React.FC<ModernAppMenubarProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('personnage');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather] = useState({ temp: 22, icon: '☀️' });
  
  const { gameState } = useGame();
  const { user, signOutUser } = useAuth();

  // Mise à jour de l'heure toutes les minutes
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Fermer le menu avec ESC
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Prévenir le scroll du body quand le menu est ouvert
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const navigationItems = [
    { 
      id: 'personnage', 
      icon: User, 
      label: 'Personnage', 
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950'
    },
    { 
      id: 'equipement', 
      icon: Package, 
      label: 'Équipement', 
      badge: 5,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-950'
    },
    { 
      id: 'aventure', 
      icon: Sword, 
      label: 'Aventure',
      color: 'text-red-500',
      bgColor: 'bg-red-50 dark:bg-red-950'
    },
    { 
      id: 'monde', 
      icon: Globe, 
      label: 'Monde',
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950'
    },
    { 
      id: 'social', 
      icon: Users, 
      label: 'Social',
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950'
    },
    { 
      id: 'economie', 
      icon: Coins, 
      label: 'Économie',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950'
    }
  ];

  if (!gameState?.player) {
    return null;
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <TooltipProvider>
      <div className={cn("relative z-50", className)}>
        {/* Menu compact fermé */}
        {!isOpen && (
          <div className="fixed top-0 left-0 w-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-lg border-b border-slate-700 z-40">
            <div className="flex items-center justify-between px-4 py-3">
              
              {/* Bouton menu et titre */}
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMenu}
                  className="p-2 hover:bg-slate-700 text-white"
                >
                  <Menu className="h-5 w-5" />
                </Button>
                
                <div className="flex items-center gap-3">
                  <div className="text-lg font-bold">🎮 Aujourd'hui RPG</div>
                  <div className="text-sm text-slate-300">
                    {gameState.player.name}
                  </div>
                </div>
              </div>

              {/* Informations contextuelles */}
              <div className="flex items-center gap-4 text-sm text-slate-300">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatTime(currentTime)}
                </div>
                <div className="flex items-center gap-1">
                  <span>{weather.icon}</span>
                  <span>{weather.temp}°C</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Menu complet ouvert */}
        {isOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50">
            <div className="bg-white dark:bg-slate-900 h-screen w-full max-w-md shadow-2xl relative flex flex-col">
              
              {/* En-tête avec gradient */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6 relative overflow-hidden">
                
                {/* Bouton fermer */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMenu}
                  className="absolute top-4 left-4 p-2 hover:bg-white/20 text-white z-10"
                >
                  <X className="h-5 w-5" />
                </Button>

                {/* Météo et heure */}
                <div className="absolute top-4 right-4 text-center">
                  <div className="text-xs opacity-80">
                    {formatTime(currentTime)}
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <span>{weather.icon}</span>
                    <span>{weather.temp}°C</span>
                  </div>
                </div>

                {/* Titre du jeu */}
                <div className="text-center mt-8 mb-4">
                  <div className="text-2xl font-bold">🎮 Aujourd'hui RPG</div>
                </div>

                {/* Profil du personnage */}
                <div className="flex items-center justify-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-2xl border-4 border-white/30">
                    👩
                  </div>
                  <div>
                    <div className="text-xl font-semibold">{gameState.player.name}</div>
                    <div className="text-sm opacity-80">Niveau {gameState.player.progression?.level || 1}</div>
                  </div>
                </div>

                {/* Date et heure du jeu */}
                <div className="text-center text-sm opacity-80">
                  {formatDate(currentTime)}
                </div>

                {/* Motif de fond décoratif */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-10 left-10 w-20 h-20 bg-white rounded-full blur-xl"></div>
                  <div className="absolute bottom-10 right-10 w-16 h-16 bg-blue-300 rounded-full blur-xl"></div>
                </div>
              </div>

              {/* Corps du menu */}
              <div className="flex-1 overflow-y-auto">
                
                {/* Barre de statut détaillée */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800">
                  <EnhancedPlayerStatusBar 
                    player={gameState.player} 
                    compact={false}
                  />
                </div>

                {/* Actions rapides */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                  <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">
                    Actions rapides
                  </div>
                  <EnhancedQuickActionsBar onAction={() => setIsOpen(false)} />
                </div>

                {/* Navigation principale avec argent */}
                <div className="p-4">
                  <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 p-4 rounded-xl mb-4 flex items-center justify-center gap-2 font-bold text-lg shadow-lg">
                    <Coins className="h-5 w-5" />
                    {gameState.player.money?.toFixed(2) || '0.00'}€
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {navigationItems.map((item) => (
                      <Tooltip key={item.id}>
                        <TooltipTrigger asChild>
                          <Button
                            variant={activeTab === item.id ? "default" : "outline"}
                            onClick={() => setActiveTab(item.id)}
                            className={cn(
                              "relative h-20 flex flex-col items-center justify-center gap-2 text-xs font-medium transition-all hover:scale-105",
                              activeTab === item.id 
                                ? `${item.bgColor} ${item.color} border-2` 
                                : "hover:bg-slate-50 dark:hover:bg-slate-800"
                            )}
                          >
                            <item.icon className={cn(
                              "h-6 w-6",
                              activeTab === item.id ? item.color : "text-slate-600 dark:text-slate-400"
                            )} />
                            <span className={cn(
                              activeTab === item.id ? item.color : "text-slate-600 dark:text-slate-400"
                            )}>
                              {item.label}
                            </span>
                            {item.badge && (
                              <Badge 
                                variant="destructive" 
                                className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs font-bold"
                              >
                                {item.badge}
                              </Badge>
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{item.label}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>

                {/* Contenu des sections */}
                <div className="p-4 min-h-[300px]">
                  <MenuSections 
                    activeTab={activeTab} 
                    player={gameState.player}
                    gameState={gameState}
                  />
                </div>

                {/* Actions système */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                  <SystemActions 
                    user={user} 
                    signOutUser={signOutUser}
                    onAction={() => setIsOpen(false)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default ModernAppMenubar;
