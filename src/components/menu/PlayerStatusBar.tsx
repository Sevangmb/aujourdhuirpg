
"use client";

import React from 'react';
import { Heart, Zap, Utensils, GlassWater, Euro } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { Player } from '@/lib/types';

interface PlayerStatusBarProps {
  player: Player;
  compact?: boolean;
  className?: string;
}

export const PlayerStatusBar: React.FC<PlayerStatusBarProps> = ({ 
  player, 
  compact = false, 
  className 
}) => {
  const { stats, money, physiology } = player;

  // Fonction pour déterminer la couleur selon le niveau
  const getHealthColor = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage <= 25) return 'text-red-500';
    if (percentage <= 50) return 'text-orange-500';
    return 'text-green-500';
  };

  const getPhysiologyColor = (level: number) => {
    if (level < 25) return 'text-red-500';
    if (level < 50) return 'text-orange-500';
    return 'text-green-500';
  };
  
  const getEnergyColor = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage <= 25) return 'text-red-500';
    if (percentage <= 50) return 'text-orange-500';
    return 'text-yellow-500';
  };

  if (compact) {
    return (
      <TooltipProvider>
        <div className={cn("flex flex-wrap gap-x-3 gap-y-1 text-sm", className)}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1">
                <Heart className={cn("w-4 h-4", getHealthColor(stats.Sante.value, stats.Sante.max))} />
                <span className="font-medium">
                  {stats.Sante.value}/{stats.Sante.max}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent><p>Santé</p></TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1">
                <Zap className={cn("w-4 h-4", getEnergyColor(stats.Energie.value, stats.Energie.max))} />
                <span className="font-medium">
                  {stats.Energie.value}/{stats.Energie.max}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent><p>Énergie</p></TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1">
                <Utensils className={cn("w-4 h-4", getPhysiologyColor(physiology.basic_needs.hunger.level))} />
                <span className="font-medium">{Math.round(physiology.basic_needs.hunger.level)}%</span>
              </div>
            </TooltipTrigger>
            <TooltipContent><p>Faim</p></TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1">
                <GlassWater className={cn("w-4 h-4", getPhysiologyColor(physiology.basic_needs.thirst.level))} />
                <span className="font-medium">{Math.round(physiology.basic_needs.thirst.level)}%</span>
              </div>
            </TooltipTrigger>
            <TooltipContent><p>Soif</p></TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1">
                <Euro className="w-4 h-4 text-green-500" />
                <span className="font-medium">{money.toFixed(2)}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent><p>Argent</p></TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    );
  }

  // Version complète (non-compact)
  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className={cn("w-4 h-4", getHealthColor(stats.Sante.value, stats.Sante.max))} />
            <span className="text-sm font-medium">Santé</span>
          </div>
          <span className="text-sm text-muted-foreground">{stats.Sante.value}/{stats.Sante.max}</span>
        </div>
        <Progress value={(stats.Sante.value / stats.Sante.max) * 100} className="h-2" />
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className={cn("w-4 h-4", getEnergyColor(stats.Energie.value, stats.Energie.max))} />
            <span className="text-sm font-medium">Énergie</span>
          </div>
          <span className="text-sm text-muted-foreground">{stats.Energie.value}/{stats.Energie.max}</span>
        </div>
        <Progress value={(stats.Energie.value / stats.Energie.max) * 100} className="h-2" />
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Utensils className={cn("w-4 h-4", getPhysiologyColor(physiology.basic_needs.hunger.level))} />
            <span className="text-sm font-medium">Faim</span>
          </div>
          <span className="text-sm text-muted-foreground">{Math.round(physiology.basic_needs.hunger.level)}%</span>
        </div>
        <Progress value={physiology.basic_needs.hunger.level} className="h-2" />
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GlassWater className={cn("w-4 h-4", getPhysiologyColor(physiology.basic_needs.thirst.level))} />
            <span className="text-sm font-medium">Soif</span>
          </div>
          <span className="text-sm text-muted-foreground">{Math.round(physiology.basic_needs.thirst.level)}%</span>
        </div>
        <Progress value={physiology.basic_needs.thirst.level} className="h-2" />
      </div>
    </div>
  );
};
