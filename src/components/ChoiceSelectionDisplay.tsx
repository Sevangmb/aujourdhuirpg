"use client";

import type { StoryChoice, ActionType } from '@/lib/types';
import ChoiceCard from './ChoiceCard';
import { Button } from './ui/button';
import AIRecommendationDisplay from './AIRecommendationDisplay';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Eye, Compass, MessageSquare, Zap, Brain, Briefcase } from 'lucide-react';

interface ChoiceSelectionDisplayProps {
  choices: StoryChoice[];
  onSelectChoice: (choice: StoryChoice) => void;
  isLoading: boolean;
  aiRecommendation: { focus: string; reasoning: string } | null;
}

const actionTypeConfig: Record<ActionType, { label: string; icon: React.ElementType }> = {
  observation: { label: "Observation & Analyse", icon: Eye },
  exploration: { label: "Exploration", icon: Compass },
  social: { label: "Actions Sociales", icon: MessageSquare },
  action: { label: "Actions Directes", icon: Zap },
  reflection: { label: "Réflexion & Introspection", icon: Brain },
  job: { label: "Opportunités & Jobs", icon: Briefcase },
};

const ChoiceSelectionDisplay: React.FC<ChoiceSelectionDisplayProps> = ({ choices, onSelectChoice, isLoading, aiRecommendation }) => {
  
  const groupedChoices = choices.reduce((acc, choice) => {
    const type = choice.type || 'action';
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(choice);
    return acc;
  }, {} as Record<string, StoryChoice[]>);

  // Define the order of the categories to ensure a consistent layout
  const categoryOrder: ActionType[] = ['job', 'action', 'social', 'exploration', 'observation', 'reflection'];
  
  // By default, all categories with choices will be open
  const defaultOpenCategories = Object.keys(groupedChoices);

  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold text-center mb-3 text-primary">Que faites-vous ?</h3>
      {aiRecommendation && (
        <AIRecommendationDisplay focus={aiRecommendation.focus} reasoning={aiRecommendation.reasoning} />
      )}
      
      <Accordion type="multiple" defaultValue={defaultOpenCategories} className="w-full">
        {categoryOrder.map(category => {
          if (!groupedChoices[category] || groupedChoices[category].length === 0) {
            return null;
          }
          const config = actionTypeConfig[category as ActionType];
          return (
            <AccordionItem value={category} key={category}>
              <AccordionTrigger className="text-base font-semibold hover:no-underline">
                <div className="flex items-center gap-2">
                   <config.icon className="w-5 h-5 text-primary/80"/> 
                   <span>{config.label}</span>
                   <span className="text-sm font-normal text-muted-foreground">({groupedChoices[category].length})</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                  {groupedChoices[category].map((choice) => (
                    <ChoiceCard
                      key={choice.id}
                      choice={choice}
                      onSelect={onSelectChoice}
                      disabled={isLoading}
                    />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>

      <div className="text-center mt-4">
          <Button variant="ghost" disabled={true}>Action personnalisée (prochainement)...</Button>
      </div>
    </div>
  );
};

export default ChoiceSelectionDisplay;
