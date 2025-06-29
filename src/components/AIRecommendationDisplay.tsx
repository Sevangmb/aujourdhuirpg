"use client";

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Lightbulb } from 'lucide-react';

interface AIRecommendationDisplayProps {
  focus: string;
  reasoning: string;
}

const AIRecommendationDisplay: React.FC<AIRecommendationDisplayProps> = ({ focus, reasoning }) => {
  if (!focus || !reasoning) {
    return null;
  }
  
  return (
    <Alert className="mb-4 bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/50 dark:border-yellow-700 dark:text-yellow-300">
      <Lightbulb className="h-5 w-5 text-yellow-500" />
      <AlertTitle className="font-semibold">{focus}</AlertTitle>
      <AlertDescription>
        {reasoning}
      </AlertDescription>
    </Alert>
  );
};

export default AIRecommendationDisplay;
