"use client";

import type { PlayerStats } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Smile, Brain, Dumbbell, Zap } from 'lucide-react'; // Zap for generic stat
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
};

const StatDisplay: React.FC<StatDisplayProps> = ({ stats, previousStats }) => {
  const [pulseKey, setPulseKey] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (previousStats) {
      for (const key in stats) {
        if (stats[key] !== previousStats[key]) {
          setPulseKey(key);
          const timer = setTimeout(() => setPulseKey(null), 500); // Duration of animation
          return () => clearTimeout(timer); // Cleanup if component unmounts or stats change again quickly
        }
      }
    }
  }, [stats, previousStats]);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-center text-xl text-primary">Vos Statistiques</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(stats).map(([key, value]) => {
            const IconComponent = statIcons[key] || Zap;
            const isPulsing = pulseKey === key;
            return (
              <div key={key} className="flex flex-col items-center p-2 rounded-lg bg-background shadow-sm border border-border">
                <IconComponent className={`w-8 h-8 mb-1 ${isPulsing ? 'text-accent' : 'text-foreground/80'}`} />
                <span className="font-semibold text-sm">{key}</span>
                <span 
                  className={`text-lg font-bold ${isPulsing ? 'animate-stat-pulse text-accent' : 'text-primary'}`}
                  key={`${key}-${value}`} // Force re-render for animation if value changes
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
