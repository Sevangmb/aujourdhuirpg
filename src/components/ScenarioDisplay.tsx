
"use client";

import React from 'react';

interface ScenarioDisplayProps {
  scenarioHTML: string;
  isLoading?: boolean;
}

const ScenarioDisplay: React.FC<ScenarioDisplayProps> = ({ scenarioHTML, isLoading }) => {
  // Sanitize and format the HTML string to ensure it renders correctly.
  // This will replace newline characters with <br> tags so they are displayed,
  // which is crucial for making error messages readable.
  const formattedHTML = (scenarioHTML || "").replace(/\n/g, '<br />');

  return (
    <div className="scenario-html-content bg-background p-4 md:p-6 rounded-lg border shadow-sm">
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="ml-4 text-lg">Chargement du prochain scénario...</p>
        </div>
      ) : (
        <div dangerouslySetInnerHTML={{ __html: formattedHTML }} />
      )}
    </div>
  );
};

export default ScenarioDisplay;
