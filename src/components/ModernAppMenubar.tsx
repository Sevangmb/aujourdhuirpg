"use client";

import React, { useState, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Menu, X } from 'lucide-react';

const ModernAppMenubar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { gameState, isGameActive } = useGame();

  // Gestion fermeture avec ESC
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  // Ne pas afficher si pas de données joueur
  if (!gameState?.player) return null;

  return (
    <>
      {/* Bouton Menu Hamburger - Position fixe en haut à gauche */}
      <button
        onClick={toggleMenu}
        className="fixed top-4 left-4 z-50 bg-slate-800/95 backdrop-blur-sm rounded-lg p-3 
                 hover:bg-slate-700/95 transition-all duration-200 shadow-lg border border-slate-700
                 hover:scale-105 active:scale-95"
        aria-label={isMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
      >
        <div className="relative w-5 h-5">
          {/* Animation croisée Menu <-> X */}
          <Menu 
            className={`absolute w-5 h-5 text-white transition-all duration-300 ${
              isMenuOpen ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'
            }`}
          />
          <X 
            className={`absolute w-5 h-5 text-white transition-all duration-300 ${
              isMenuOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'
            }`}
          />
        </div>
      </button>

      {/* Overlay avec backdrop blur */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 transition-all duration-300"
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}

      {/* Menu Principal Coulissant */}
      <div 
        className={`fixed top-0 left-0 h-full bg-slate-900/98 backdrop-blur-md z-40 
                   border-r border-slate-700 shadow-2xl transition-all duration-300 ease-out
                   ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}
                   ${/* Responsive width */}
                   w-80 md:w-80 sm:w-full`}
        role="navigation"
        aria-label="Menu principal"
      >
        <div className="h-full flex flex-col">
          {/* Header avec espace pour le bouton hamburger */}
          <div className="pt-20 px-4 pb-4">
            {/* Titre du menu */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-white mb-1">
                🎮 Aujourd'hui RPG
              </h1>
              <p className="text-slate-400 text-sm">
                Menu principal - {gameState.player.name}
              </p>
            </div>

            {/* Placeholder pour Status Bar (T2.2) */}
            <div className="bg-slate-800/50 rounded-lg p-4 mb-4 border border-slate-700">
              <div className="text-center text-slate-400 text-sm">
                📊 Status du joueur
                <br />
                <span className="text-xs">(À implémenter dans T2.2)</span>
              </div>
            </div>

            {/* Placeholder pour Actions Rapides (T2.3) */}
            <div className="bg-slate-800/30 rounded-lg p-4 mb-4 border border-slate-600">
              <div className="text-center text-slate-400 text-sm">
                ⚡ Actions rapides
                <br />
                <span className="text-xs">(À implémenter dans T2.3)</span>
              </div>
            </div>
          </div>

          {/* Contenu principal scrollable */}
          <div className="flex-1 overflow-y-auto px-4">
            {/* Placeholder pour Sections Menu (T2.4) */}
            <div className="space-y-3 mb-4">
              {[
                '👤 Personnage',
                '🎒 Équipement', 
                '📖 Aventure',
                '🌍 Monde',
                '👥 Social',
                '💰 Économie'
              ].map((section, index) => (
                <div 
                  key={index}
                  className="bg-slate-800/30 rounded-lg p-3 border border-slate-600
                           hover:bg-slate-700/40 transition-colors cursor-pointer"
                >
                  <div className="text-slate-300 text-sm">
                    {section}
                    <span className="text-slate-500 text-xs block">
                      (À implémenter dans T2.4)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer avec Actions Système (T2.5) */}
          <div className="p-4 border-t border-slate-700">
            <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-600">
              <div className="text-center text-slate-400 text-sm">
                ⚙️ Actions système
                <br />
                <span className="text-xs">(À implémenter dans T2.5)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ModernAppMenubar;