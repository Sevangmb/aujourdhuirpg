"use client";

import type { PlayerStats } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Smile, Brain, Dumbbell, Zap, CloudFog, Anchor, Users, Lightbulb, Sparkles } from 'lucide-react'; 
import React from 'react';

interface StatDisplayProps {
  stats: PlayerStats;
  previousStats?: PlayerStats;
}

const statIcons: Record<string, React.ElementType> = {
  Sante: Heart,
  Charisme: Smile,
  Intelligence: Brain,
  Force: Dumbbell,
  Energie: Zap,
  Stress: CloudFog,
  Volonte: Anchor,
  Reputation: Users,
  Humeur: Smile,
  Curiosite: Lightbulb,
  Inspiration: Sparkles,
};

const StatDisplay: React.FC<StatDisplayProps> = ({ stats, previousStats }) => {
  const [pulseKey, setPulseKey] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (previousStats) {
      for (const key in stats) {
        if (stats[key] !== previousStats[key]) {
          setPulseKey(key);
          const timer = setTimeout(() => setPulseKey(null), 500); // Duration of animation
          return () => clearTimeout(timer); 
        }
      }
    }
  }, [stats, previousStats]);

  return (
    <Card className="shadow-md">
      <CardHeader className="p-3">
        <CardTitle className="font-headline text-center text-lg text-primary">Statistiques</CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <div className="grid grid-cols-2 gap-2">
          {stats && Object.entries(stats).map(([key, value]) => {
            const IconComponent = statIcons[key] || Zap; // Default to Zap if no icon
            if (!IconComponent) return null; // Don't render if icon not found
            
            const isPulsing = pulseKey === key;
            return (
              <div key={key} className="flex flex-col items-center p-1.5 rounded-lg bg-background shadow-sm border border-border">
                <IconComponent className={`w-6 h-6 mb-0.5 ${isPulsing ? 'text-accent' : 'text-foreground/80'}`} />
                <span className="font-semibold text-xs">{key}</span>
                <span 
                  className={`text-md font-bold ${isPulsing ? 'animate-stat-pulse text-accent' : 'text-primary'}`}
                  key={`${key}-${value}`}
                >
                  {value}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default StatDisplay;
