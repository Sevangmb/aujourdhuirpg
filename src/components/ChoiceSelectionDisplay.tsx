"use client";

import type { StoryChoice } from '@/lib/types';
import ChoiceCard from './ChoiceCard';
import { Button } from './ui/button';

interface ChoiceSelectionDisplayProps {
  choices: StoryChoice[];
  onSelectChoice: (choice: StoryChoice) => void;
  isLoading: boolean;
}

const ChoiceSelectionDisplay: React.FC<ChoiceSelectionDisplayProps> = ({ choices, onSelectChoice, isLoading }) => {
  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold text-center mb-3 text-primary">Que faites-vous ?</h3>
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
