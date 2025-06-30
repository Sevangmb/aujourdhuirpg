
"use client";

import type { Player } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Heart, Zap, Euro, Utensils, GlassWater } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface PlayerStatusPanelProps {
  player: Player;
}

const PlayerStatusPanel: React.FC<PlayerStatusPanelProps> = ({ player }) => {
  if (!player) return null;

  const hungerLevel = player.physiology?.basic_needs?.hunger?.level ?? 100;
  const thirstLevel = player.physiology?.basic_needs?.thirst?.level ?? 100;

  const sante = player.stats.Sante;
  const energie = player.stats.Energie;

  const santePercentage = sante.max ? (sante.value / sante.max) * 100 : 100;
  const energiePercentage = energie.max ? (energie.value / energie.max) * 100 : 100;

  return (
    <Card>
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-lg font-headline">{player.name}</CardTitle>
        <CardDescription className="text-xs">Niv. {player.progression.level} - {player.origin}</CardDescription>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="flex items-center gap-1.5"><Heart className="w-4 h-4 text-red-500" /> Santé</span>
            <span>{sante.value} / {sante.max}</span>
          </div>
          <Progress value={santePercentage} className="h-2 [&>div]:bg-red-500" />
        </div>
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-yellow-500" /> Énergie</span>
            <span>{energie.value} / {energie.max}</span>
          </div>
          <Progress value={energiePercentage} className="h-2 [&>div]:bg-yellow-500" />
        </div>
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="flex items-center gap-1.5"><Utensils className="w-4 h-4 text-orange-500" /> Faim</span>
            <span>{Math.round(hungerLevel)} / 100</span>
          </div>
          <Progress value={hungerLevel} className="h-2 [&>div]:bg-orange-500" />
        </div>
         <div className="space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="flex items-center gap-1.5"><GlassWater className="w-4 h-4 text-blue-500" /> Soif</span>
            <span>{Math.round(thirstLevel)} / 100</span>
          </div>
          <Progress value={thirstLevel} className="h-2 [&>div]:bg-blue-500" />
        </div>
        <div className="flex justify-between items-center text-sm font-semibold p-2 bg-muted rounded-md">
          <span className="flex items-center gap-1.5"><Euro className="w-4 h-4 text-green-600" /> Argent</span>
          <span>{player.money.toFixed(2)} €</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlayerStatusPanel;
