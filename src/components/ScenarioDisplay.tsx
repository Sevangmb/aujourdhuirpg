
"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface ScenarioDisplayProps {
  scenarioHTML: string;
  isLoading?: boolean;
}

const ScenarioDisplay: React.FC<ScenarioDisplayProps> = ({ scenarioHTML, isLoading }) => {
  return (
    <Card className="shadow-lg flex-grow flex flex-col">
      <CardContent className="p-6 flex-grow scenario-html-content">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="ml-4 text-lg">Chargement du prochain scénario...</p>
          </div>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: scenarioHTML }} />
        )}
      </CardContent>
    </Card>
  );
};

export default ScenarioDisplay;
