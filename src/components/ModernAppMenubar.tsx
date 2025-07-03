"use client";

import React, { useState, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Import des composants modulaires (T2.2-T2.5)
import { PlayerStatusBar } from './menu/PlayerStatusBar';
import { QuickActionsBar } from './menu/QuickActionsBar';
import { MenuSections } from './menu/MenuSections';
import { SystemActions } from './menu/SystemActions';

interface ModernAppMenubarProps {
  className?: string;
}

const ModernAppMenubar: React.FC<ModernAppMenubarProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('personnage');
  const { gameState } = useGame();
  const { user, signOutUser } = useAuth();

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

  const closeMenu = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Bouton Hamburger Fixe */}
      <button
        onClick={toggleMenu}
        className={cn(
          "fixed top-4 left-4 z-50 p-3 rounded-lg",
          "bg-background/80 backdrop-blur-md border border-border",
          "hover:bg-background/90 hover:scale-105",
          "active:scale-95 transition-all duration-200",
          "shadow-lg hover:shadow-xl",
          className
        )}
        aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
      >
        <div className="w-6 h-6 relative">
          <Menu 
            className={cn(
              "absolute inset-0 transition-all duration-300",
              isOpen ? "rotate-180 opacity-0 scale-0" : "rotate-0 opacity-100 scale-100"
            )}
          />
          <X 
            className={cn(
              "absolute inset-0 transition-all duration-300",
              isOpen ? "rotate-0 opacity-100 scale-100" : "rotate-180 opacity-0 scale-0"
            )}
          />
        </div>
      </button>

      {/* Overlay et Menu Coulissant */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={closeMenu}
            aria-hidden="true"
          />

          {/* Menu Container */}
          <div
            className={cn(
              "fixed left-0 top-0 h-full z-40",
              "w-full sm:w-80 md:w-80", // Fullscreen mobile, 320px desktop
              "bg-background/95 backdrop-blur-md border-r border-border",
              "transform transition-transform duration-300 ease-out",
              "overflow-hidden flex flex-col",
              "shadow-2xl"
            )}
            role="navigation"
          >
            {/* HEADER du Menu */}
            <div className="pt-20 pb-4 px-6 border-b border-border shrink-0">
              {/* Titre */}
              <div className="mb-4">
                <h1 className="text-xl font-bold text-foreground">
                  🎮 Aujourd'hui RPG
                </h1>
                {gameState.player && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {gameState.player.name}
                  </p>
                )}
              </div>

              {/* T2.2 - Status Bar du Joueur */}
              {gameState.player && (
                <PlayerStatusBar player={gameState.player} compact />
              )}

              {/* T2.3 - Actions Rapides */}
              <QuickActionsBar onAction={closeMenu} />
            </div>

            {/* CONTENU PRINCIPAL - T2.4 - Sections Organisées */}
            <div className="flex-1 overflow-hidden">
              <MenuSections 
                activeTab={activeTab}
                onTabChange={setActiveTab}
                player={gameState.player}
                gameState={gameState}
              />
            </div>

            {/* FOOTER - T2.5 - Actions Système */}
            <div className="shrink-0 border-t border-border">
              <SystemActions 
                user={user}
                signOutUser={signOutUser}
                onAction={closeMenu}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default ModernAppMenubar;