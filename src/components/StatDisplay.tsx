
"use client";

import type { PlayerStats } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Zap, Brain, Dumbbell, Dices, Hand, Crosshair, Users, Anchor, Book, UserCog, CloudFog, Sparkles } from 'lucide-react'; 
import React from 'react';

interface StatDisplayProps {
  stats: PlayerStats;
}

const statIcons: Record<string, React.ElementType> = {
  Sante: Heart,
  Energie: Zap,
  Stress: CloudFog,
  Force: Dumbbell,
  Dexterite: Hand,
  Constitution: Heart,
  Intelligence: Brain,
  Perception: Crosshair,
  Charisme: Users,
  Volonte: Anchor,
  Savoir: Book,
  Technique: UserCog,
  MagieOccultisme: Sparkles,
  Discretion: CloudFog,
  ChanceDestin: Dices,
};

const STATS_TO_DISPLAY: (keyof PlayerStats)[] = [
    'Sante', 'Energie', 'Stress', 'Force', 'Dexterite', 'Constitution', 'Intelligence', 'Perception', 'Charisme'
];


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
        <CardTitle className="font-headline text-center text-lg text-primary">Attributs</CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <div className="grid grid-cols-3 gap-2">
          {stats && STATS_TO_DISPLAY.map((key) => {
            const statObj = stats[key];
            const IconComponent = statIcons[key] || Zap;
            if (!IconComponent || !statObj) return null;
            
            const isPulsing = pulseKey === key;
            return (
              <div 
                key={key} 
                className={`flex flex-col items-center p-1.5 rounded-lg bg-background shadow-sm border border-border ${isPulsing ? 'animate-stat-pulse' : ''}`}
              >
                <IconComponent className={`w-5 h-5 mb-0.5 ${isPulsing ? 'text-accent' : 'text-foreground/80'}`} />
                <span className="font-semibold text-xs">{key}</span>
                <span className={`text-sm font-bold ${isPulsing ? 'text-accent' : 'text-primary'}`}>
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
