"use client";

import type { StoryChoice } from '@/lib/types';
import ChoiceCard from './ChoiceCard';
import { Button } from './ui/button';
import AIRecommendationDisplay from './AIRecommendationDisplay';

interface ChoiceSelectionDisplayProps {
  choices: StoryChoice[];
  onSelectChoice: (choice: StoryChoice) => void;
  isLoading: boolean;
  aiRecommendation: { focus: string; reasoning: string } | null;
}

const ChoiceSelectionDisplay: React.FC<ChoiceSelectionDisplayProps> = ({ choices, onSelectChoice, isLoading, aiRecommendation }) => {
  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold text-center mb-3 text-primary">Que faites-vous ?</h3>
      {aiRecommendation && (
        <AIRecommendationDisplay focus={aiRecommendation.focus} reasoning={aiRecommendation.reasoning} />
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {choices.map((choice) => (
          <ChoiceCard
            key={choice.id}
            choice={choice}
            onSelect={onSelectChoice}
            disabled={isLoading}
          />
        ))}
      </div>
       <div className="text-center mt-4">
          <Button variant="ghost" disabled={true}>Action personnalisée (prochainement)...</Button>
      </div>
    </div>
  );
};

export default ChoiceSelectionDisplay;
