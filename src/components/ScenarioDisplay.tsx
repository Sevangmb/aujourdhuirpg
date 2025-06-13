
"use client";

import React, { useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface ScenarioDisplayProps {
  scenarioHTML: string;
  onChoiceMade: (choiceText: string) => void;
  isLoading?: boolean;
}

const ScenarioDisplay: React.FC<ScenarioDisplayProps> = ({ scenarioHTML, onChoiceMade, isLoading }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentContentRef = contentRef.current;

    if (!currentContentRef || isLoading) {
      // Si la référence n'est pas encore disponible ou si nous chargeons,
      // s'assurer qu'aucun ancien écouteur ne persiste et ne rien faire de plus.
      // La fonction de nettoyage de l'effet précédent s'en est déjà occupée.
      return;
    }

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Remonter dans l'arbre DOM pour trouver le bouton si l'utilisateur a cliqué sur un enfant du bouton
      const button = target.closest('button[data-choice-text]') as HTMLButtonElement | null;

      if (button) {
        const choiceText = button.getAttribute('data-choice-text');
        if (choiceText) {
          event.preventDefault(); // Empêcher le comportement par défaut du bouton
          onChoiceMade(choiceText);
        }
      }
    };

    // Attacher l'écouteur d'événement au conteneur
    currentContentRef.addEventListener('click', handleClick);

    // Fonction de nettoyage pour retirer l'écouteur d'événement
    return () => {
      if (currentContentRef) {
        currentContentRef.removeEventListener('click', handleClick);
      }
    };
    // Dépendances :
    // - scenarioHTML : pour ré-attacher si le HTML de base change fondamentalement (même si la délégation le rend moins critique pour les enfants)
    // - onChoiceMade : pour s'assurer que la dernière version du callback est utilisée
    // - isLoading : pour s'assurer que les écouteurs sont (ré)attachés une fois le chargement terminé
  }, [scenarioHTML, onChoiceMade, isLoading]);

  return (
    <Card className="shadow-lg flex-grow flex flex-col">
      <CardContent className="p-6 flex-grow scenario-html-content">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="ml-4 text-lg">Chargement du prochain scénario...</p>
          </div>
        ) : (
          <div ref={contentRef} dangerouslySetInnerHTML={{ __html: scenarioHTML }} />
        )}
      </CardContent>
    </Card>
  );
};

export default ScenarioDisplay;
