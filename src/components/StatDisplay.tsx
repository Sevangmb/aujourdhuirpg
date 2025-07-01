
"use client";

import type { PlayerStats } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Smile, Brain, Dumbbell, Zap, CloudFog, Anchor, Users, Lightbulb, Sparkles } from 'lucide-react'; 
import React from 'react';

interface StatDisplayProps {
  stats: PlayerStats;
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

const StatDisplay: React.FC<StatDisplayProps> = ({ stats }) => {
  const [pulseKey, setPulseKey] = React.useState<string | null>(null);
  const prevStatsRef = React.useRef<PlayerStats>();

  React.useEffect(() => {
    const prevStats = prevStatsRef.current;
    if (prevStats) {
      const keyOfChangedStat = (Object.keys(stats) as Array<keyof PlayerStats>).find(
        (key) => stats[key].value !== prevStats[key].value
      );

      if (keyOfChangedStat) {
        setPulseKey(keyOfChangedStat);
        const timer = setTimeout(() => setPulseKey(null), 500); // Animation duration
        return () => clearTimeout(timer);
      }
    }
    prevStatsRef.current = stats;
  }, [stats]);

  return (
    <Card className="shadow-md">
      <CardHeader className="p-3">
        <CardTitle className="font-headline text-center text-lg text-primary">Statistiques</CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <div className="grid grid-cols-2 gap-2">
          {stats && Object.entries(stats).map(([key, statObj]) => {
            const IconComponent = statIcons[key] || Zap;
            if (!IconComponent) return null;
            
            const isPulsing = pulseKey === key;
            return (
              <div 
                key={key} 
                className={`flex flex-col items-center p-1.5 rounded-lg bg-background shadow-sm border border-border ${isPulsing ? 'animate-stat-pulse' : ''}`}
              >
                <IconComponent className={`w-6 h-6 mb-0.5 ${isPulsing ? 'text-accent' : 'text-foreground/80'}`} />
                <span className="font-semibold text-xs">{key}</span>
                <span className={`text-md font-bold ${isPulsing ? 'text-accent' : 'text-primary'}`}>
                  {statObj.value}
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
