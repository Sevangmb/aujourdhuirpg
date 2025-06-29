"use client";

import type { StoryChoice } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Clock, Zap, HelpCircle, Target, TrendingUp } from 'lucide-react';
import * as LucideIcons from 'lucide-react';


interface ChoiceCardProps {
  choice: StoryChoice;
  onSelect: (choice: StoryChoice) => void;
  disabled?: boolean;
}

const choiceTypeStyles: Record<string, string> = {
  observation: 'choice-card-observation',
  exploration: 'choice-card-exploration',
  social: 'choice-card-social',
  action: 'choice-card-action',
  reflection: 'choice-card-reflection',
  job: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700'
};

const skillPathToLabel = (path: string): string => {
    const parts = path.split('.');
    if (parts.length < 2) return path;
    const skillName = parts[1];
    return skillName.charAt(0).toUpperCase() + skillName.slice(1).replace(/_/g, ' ');
};


const ChoiceCard: React.FC<ChoiceCardProps> = ({ choice, onSelect, disabled }) => {
  const Icon = (LucideIcons as any)[choice.iconName] || HelpCircle;

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] border-2 border-transparent',
        choiceTypeStyles[choice.type],
        disabled && 'opacity-60 cursor-not-allowed hover:scale-100'
      )}
      onClick={() => !disabled && onSelect(choice)}
    >
      <CardHeader className="flex flex-row items-start gap-4 p-4 pb-2">
        <Icon className="w-8 h-8 mt-1" />
        <div>
          <CardTitle className="text-base">{choice.text}</CardTitle>
          <div className="flex items-center gap-x-3 text-xs opacity-80 mt-1 flex-wrap">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {choice.timeCost} min</span>
            <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> -{choice.energyCost} Énergie</span>
            {choice.successProbability !== undefined && (
              <span className="flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400">
                <Target className="w-3 h-3" /> {choice.successProbability}% Succès
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <CardDescription className="text-xs mb-3 min-h-[30px]">{choice.description}</CardDescription>
        <div className="flex flex-wrap gap-1">
          {choice.consequences.map((consequence) => (
            <Badge key={consequence} variant="secondary" className="text-xs">
              {consequence}
            </Badge>
          ))}
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {choice.skillGains && Object.entries(choice.skillGains).map(([skillPath, gain]) => (
            <Badge key={skillPath} variant="outline" className="text-xs font-normal border-green-200 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-900/50 dark:text-green-300">
              <TrendingUp className="w-3 h-3 mr-1" />
              {skillPathToLabel(skillPath)} +{gain}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ChoiceCard;
