
"use client";

import type { PlayerStats } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Zap, Brain, Dumbbell, Dices, Hand, Crosshair, Users, Anchor, Book, UserCog, CloudFog } from 'lucide-react'; 
import React from 'react';

interface StatDisplayProps {
  stats: PlayerStats;
}

const Sparkles = (props: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M9.93 2.55a2 2 0 0 0-1.86 0L6.43 3.7a2 2 0 0 1-1.86 0L2.93 2.55a2 2 0 0 0-1.86 0L.43 3.7a2 2 0 0 0 0 3.72l1.64 1.15a2 2 0 0 1 0 3.72L.43 13.45a2 2 0 0 0 0 3.72l1.64 1.15a2 2 0 0 0 1.86 0l1.64-1.15a2 2 0 0 1 1.86 0l1.64 1.15a2 2 0 0 0 1.86 0l1.64-1.15a2 2 0 0 1 0-3.72l-1.64-1.15a2 2 0 0 0 0-3.72l1.64-1.15a2 2 0 0 1 1.86 0l1.64 1.15a2 2 0 0 0 1.86 0l1.64-1.15a2 2 0 0 1 0-3.72l-1.64-1.15a2 2 0 0 0 0-3.72l-1.64-1.15a2 2 0 0 1-1.86 0L16 3.7a2 2 0 0 0-1.86 0l-1.64-1.15a2 2 0 0 1-1.86 0l-1.64-1.15a2 2 0 0 0-1.86 0Z" />
    <path d="M22 12h-2" /><path d="M2 12H0" /><path d="M12 2V0" /><path d="M12 22v-2" />
  </svg>
);

const statIcons: Record<string, React.ElementType> = {
  Sante: Heart,
  Energie: Zap,
  Stress: CloudFog,
  Force: Dumbbell,
  Dexterite: UserCog,
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
