
"use client";

import type { StoryChoice } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Clock, Zap, HelpCircle, Target, TrendingUp, Utensils, GlassWater, TrendingDown } from 'lucide-react';
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
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
          {choice.physiologicalEffects?.hunger && (
            <Badge variant="outline" className="text-xs font-normal border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-700 dark:bg-orange-900/50 dark:text-orange-300">
              <Utensils className="w-3 h-3 mr-1" />
              +{choice.physiologicalEffects.hunger} Faim
            </Badge>
          )}
          {choice.physiologicalEffects?.thirst && (
            <Badge variant="outline" className="text-xs font-normal border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
              <GlassWater className="w-3 h-3 mr-1" />
              +{choice.physiologicalEffects.thirst} Soif
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {choice.statEffects && Object.entries(choice.statEffects).map(([stat, value]) => (
            <Badge key={stat} variant="outline" className={cn(
                "text-xs font-normal",
                 value > 0 
                    ? "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-700 dark:bg-sky-900/50 dark:text-sky-300"
                    : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-700 dark:bg-rose-900/50 dark:text-rose-300"
                )}>
              {value > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              {stat} {value > 0 ? '+' : ''}{value}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ChoiceCard;
