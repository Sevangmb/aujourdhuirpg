import React, { useState } from 'react';
import { X, Menu } from 'lucide-react';
import PlayerStatusBar from '@/components/ui/PlayerStatusBar';

/**
 * EXEMPLE D'INTÉGRATION - ModernMenuExample
 * 
 * Ce composant montre comment intégrer PlayerStatusBar
 * dans un menu coulissant moderne complet.
 * 
 * Utilisez ce code comme référence pour implémenter
 * le menu moderne dans votre application.
 */

interface ModernMenuProps {
  isOpen: boolean;
  onToggle: () => void;
}

const ModernMenu: React.FC<ModernMenuProps> = ({ isOpen, onToggle }) => {
  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={onToggle}
        />
      )}

      {/* Menu coulissant */}
      <div className={`
        fixed top-0 left-0 h-full w-80 bg-background border-r border-border shadow-2xl
        transform transition-transform duration-300 ease-in-out z-50
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        flex flex-col
      `}>
        {/* Header du menu */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card">
          <h2 className="text-lg font-bold text-foreground">
            🎮 Aujourd'hui RPG
          </h2>
          <button
            onClick={onToggle}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Contenu du menu */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-6">
            {/* T2.2 - Status Bar du Joueur - IMPLÉMENTÉ */}
            <PlayerStatusBar />

            {/* T2.3 - Actions rapides (placeholder) */}
            <div className="bg-muted/50 border border-dashed border-muted-foreground/30 rounded-lg p-4">
              <div className="text-center space-y-2">
                <div className="text-muted-foreground font-medium">
                  ⚡ T2.3 - Actions Rapides
                </div>
                <div className="text-xs text-muted-foreground">
                  Échéance : 10 juillet 2025
                </div>
                <div className="text-xs text-muted-foreground">
                  Sauvegarder • Voyager • Analyser • Plein écran
                </div>
              </div>
            </div>

            {/* T2.4 - Sections organisées (placeholder) */}
            <div className="bg-muted/50 border border-dashed border-muted-foreground/30 rounded-lg p-4">
              <div className="text-center space-y-2">
                <div className="text-muted-foreground font-medium">
                  📁 T2.4 - Sections Organisées
                </div>
                <div className="text-xs text-muted-foreground">
                  Échéance : 12 juillet 2025
                </div>
                <div className="text-xs text-muted-foreground">
                  Personnage • Équipement • Aventure • Monde • Social • Économie
                </div>
              </div>
            </div>

            {/* T2.5 - Actions système (placeholder) */}
            <div className="bg-muted/50 border border-dashed border-muted-foreground/30 rounded-lg p-4">
              <div className="text-center space-y-2">
                <div className="text-muted-foreground font-medium">
                  ⚙️ T2.5 - Actions Système
                </div>
                <div className="text-xs text-muted-foreground">
                  Échéance : 14 juillet 2025
                </div>
                <div className="text-xs text-muted-foreground">
                  Paramètres • Aide • Support • Déconnexion
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer avec version */}
        <div className="p-4 border-t border-border bg-card/50">
          <div className="text-center text-xs text-muted-foreground">
            Version 0.1.0 • Phase 1 en cours
          </div>
        </div>
      </div>
    </>
  );
};

// Composant principal avec bouton hamburger
const ModernMenuExample: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Empêcher le scroll du body quand le menu est ouvert
  React.useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

  // Fermer le menu avec la touche Escape
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMenuOpen]);

  return (
    <>
      {/* Bouton hamburger fixe */}
      <button
        onClick={toggleMenu}
        className={`
          fixed top-4 left-4 z-50 
          bg-background border border-border shadow-lg rounded-lg p-3
          hover:bg-muted transition-all duration-200
          ${isMenuOpen ? 'scale-110' : 'scale-100'}
        `}
        aria-label={isMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
      >
        <div className="relative w-5 h-5">
          <Menu className={`
            absolute inset-0 transition-all duration-200
            ${isMenuOpen ? 'rotate-180 opacity-0' : 'rotate-0 opacity-100'}
          `} />
          <X className={`
            absolute inset-0 transition-all duration-200
            ${isMenuOpen ? 'rotate-0 opacity-100' : 'rotate-180 opacity-0'}
          `} />
        </div>
      </button>

      {/* Menu moderne */}
      <ModernMenu isOpen={isMenuOpen} onToggle={toggleMenu} />
    </>
  );
};

export default ModernMenuExample;

/**
 * INSTRUCTIONS D'UTILISATION :
 * 
 * 1. Remplacez votre composant de menu actuel par ce composant
 * 2. Adaptez les imports selon votre structure de projet
 * 3. Personnalisez les couleurs et animations selon votre thème
 * 4. Implémentez progressivement T2.3, T2.4, T2.5
 * 
 * DÉPENDANCES :
 * - PlayerStatusBar (✅ implémenté)
 * - Lucide React icons
 * - Tailwind CSS
 * - GameContext
 */