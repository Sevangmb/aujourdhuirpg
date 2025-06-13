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
    if (currentContentRef && !isLoading) {
      const choiceButtons = currentContentRef.querySelectorAll('button[data-choice-text]');
      
      const eventListeners: Array<{element: Element, type: string, listener: EventListener}> = [];

      choiceButtons.forEach(button => {
        const choiceText = button.getAttribute('data-choice-text');
        if (choiceText) {
          const handleClick = (event: Event) => {
            event.preventDefault(); // Prevent default button behavior if any
            onChoiceMade(choiceText);
          };
          button.addEventListener('click', handleClick);
          eventListeners.push({element: button, type: 'click', listener: handleClick});
        }
      });

      // Cleanup function to remove event listeners
      return () => {
        eventListeners.forEach(({element, type, listener}) => {
          element.removeEventListener(type, listener);
        });
      };
    }
  }, [scenarioHTML, onChoiceMade, isLoading]); // Rerun when HTML changes or loading state changes

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
