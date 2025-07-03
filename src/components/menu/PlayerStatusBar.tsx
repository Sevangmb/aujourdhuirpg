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
    if (level >= 80) return 'text-red-500';
    if (level >= 60) return 'text-orange-500';
    return 'text-green-500';
  };

  if (compact) {
    return (
      <TooltipProvider>
        <div className={cn("flex flex-wrap gap-2 text-sm", className)}>
          {/* Santé */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1">
                <Heart className={cn("w-4 h-4", getHealthColor(stats.Santé.value, stats.Santé.max))} />
                <span className="font-medium">
                  {stats.Santé.value}/{stats.Santé.max}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Santé: {stats.Santé.value}/{stats.Santé.max}</p>
            </TooltipContent>
          </Tooltip>

          {/* Énergie */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1">
                <Zap className={cn("w-4 h-4", getHealthColor(stats.Énergie.value, stats.Énergie.max))} />
                <span className="font-medium">
                  {stats.Énergie.value}/{stats.Énergie.max}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Énergie: {stats.Énergie.value}/{stats.Énergie.max}</p>
            </TooltipContent>
          </Tooltip>

          {/* Faim */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1">
                <Utensils className={cn("w-4 h-4", getPhysiologyColor(physiology.hunger))} />
                <span className="font-medium">{physiology.hunger}%</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Faim: {physiology.hunger}%</p>
            </TooltipContent>
          </Tooltip>

          {/* Soif */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1">
                <GlassWater className={cn("w-4 h-4", getPhysiologyColor(physiology.thirst))} />
                <span className="font-medium">{physiology.thirst}%</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Soif: {physiology.thirst}%</p>
            </TooltipContent>
          </Tooltip>

          {/* Argent */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1">
                <Euro className="w-4 h-4 text-yellow-500" />
                <span className="font-medium">{money.toFixed(2)}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Argent: {money.toFixed(2)} €</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    );
  }

  // Version complète (non-compact)
  return (
    <div className={cn("space-y-3", className)}>
      {/* Santé */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className={cn("w-4 h-4", getHealthColor(stats.Santé.value, stats.Santé.max))} />
            <span className="text-sm font-medium">Santé</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {stats.Santé.value}/{stats.Santé.max}
          </span>
        </div>
        <Progress 
          value={(stats.Santé.value / stats.Santé.max) * 100} 
          className="h-2"
        />
      </div>

      {/* Énergie */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className={cn("w-4 h-4", getHealthColor(stats.Énergie.value, stats.Énergie.max))} />
            <span className="text-sm font-medium">Énergie</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {stats.Énergie.value}/{stats.Énergie.max}
          </span>
        </div>
        <Progress 
          value={(stats.Énergie.value / stats.Énergie.max) * 100} 
          className="h-2"
        />
      </div>

      {/* Faim */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Utensils className={cn("w-4 h-4", getPhysiologyColor(physiology.hunger))} />
            <span className="text-sm font-medium">Faim</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {physiology.hunger}%
          </span>
        </div>
        <Progress 
          value={physiology.hunger} 
          className="h-2"
        />
      </div>

      {/* Soif */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GlassWater className={cn("w-4 h-4", getPhysiologyColor(physiology.thirst))} />
            <span className="text-sm font-medium">Soif</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {physiology.thirst}%
          </span>
        </div>
        <Progress 
          value={physiology.thirst} 
          className="h-2"
        />
      </div>

      {/* Argent */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Euro className="w-4 h-4 text-yellow-500" />
          <span className="text-sm font-medium">Argent</span>
        </div>
        <span className="text-sm font-medium">
          {money.toFixed(2)} €
        </span>
      </div>
    </div>
  );
};