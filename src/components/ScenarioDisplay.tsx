
"use client";

import React from 'react';

interface ScenarioDisplayProps {
  scenarioHTML: string;
  isLoading?: boolean;
}

const ScenarioDisplay: React.FC<ScenarioDisplayProps> = ({ scenarioHTML, isLoading }) => {
  return (
    <div className="scenario-html-content bg-background p-4 md:p-6 rounded-lg border shadow-sm">
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="ml-4 text-lg">Chargement du prochain scénario...</p>
        </div>
      ) : (
        <div dangerouslySetInnerHTML={{ __html: scenarioHTML }} />
      )}
    </div>
  );
};

export default ScenarioDisplay;
