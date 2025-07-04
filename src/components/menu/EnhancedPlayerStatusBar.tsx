
"use client";

import React from 'react';
import { Heart, Zap, Utensils, Droplets, TrendingUp, Shield } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { Player } from '@/lib/types';

interface EnhancedPlayerStatusBarProps {
  player: Player;
  compact?: boolean;
  className?: string;
}

export const EnhancedPlayerStatusBar: React.FC<EnhancedPlayerStatusBarProps> = ({ 
  player, 
  compact = false, 
  className 
}) => {
  const { stats, physiology } = player;

  const getStatusColor = (current: number, max: number) => {
    const percentage = max > 0 ? (current / max) * 100 : 0;
    if (percentage <= 25) return { 
      text: 'text-red-500', 
    };
    if (percentage <= 50) return { 
      text: 'text-orange-500', 
    };
    if (percentage <= 75) return { 
      text: 'text-yellow-500', 
    };
    return { 
      text: 'text-green-500', 
    };
  };

  const getPhysiologyColor = (level: number) => {
    if (level < 25) return { 
      text: 'text-red-500', 
    };
    if (level < 50) return { 
      text: 'text-orange-500', 
    };
    if (level < 75) return { 
      text: 'text-blue-500', 
    };
    return { 
      text: 'text-green-500', 
    };
  };

  const statItems = [
    {
      id: 'health',
      icon: Heart,
      label: 'Santé',
      current: stats?.Sante?.value || 0,
      max: stats?.Sante?.max || 100,
      colors: getStatusColor(stats?.Sante?.value || 0, stats?.Sante?.max || 100),
      unit: 'PV'
    },
    {
      id: 'energy',
      icon: Zap,
      label: 'Énergie',
      current: stats?.Energie?.value || 0,
      max: stats?.Energie?.max || 100,
      colors: getStatusColor(stats?.Energie?.value || 0, stats?.Energie?.max || 100),
      unit: 'EN'
    },
    {
      id: 'hunger',
      icon: Utensils,
      label: 'Faim',
      current: physiology?.basic_needs?.hunger?.level || 0,
      max: 100,
      colors: getPhysiologyColor(physiology?.basic_needs?.hunger?.level || 0),
      unit: '%',
      isPhysiology: true
    },
    {
      id: 'thirst',
      icon: Droplets,
      label: 'Soif',
      current: physiology?.basic_needs?.thirst?.level || 0,
      max: 100,
      colors: getPhysiologyColor(physiology?.basic_needs?.thirst?.level || 0),
      unit: '%',
      isPhysiology: true
    }
  ];

  if (compact) {
    return (
      <TooltipProvider>
        <div className={cn("flex flex-wrap gap-3", className)}>
          {statItems.map((item) => (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2 backdrop-blur-sm">
                  <item.icon className={cn("h-4 w-4", item.colors.text)} />
                  <span className="text-sm font-medium text-white">
                    {item.isPhysiology 
                      ? `${Math.round(item.current)}${item.unit}`
                      : `${item.current}/${item.max}`
                    }
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <div className="font-medium">{item.label}</div>
                  <div className="text-sm text-slate-400">
                    {item.isPhysiology 
                      ? `${Math.round(item.current)}% / 100%`
                      : `${item.current} / ${item.max} ${item.unit}`
                    }
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn("space-y-4", className)}>
        <div className="grid grid-cols-2 gap-4">
          {statItems.map((item) => {
            const percentage = item.max > 0 ? (item.current / item.max) * 100 : 0;
            return (
              <div key={item.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "p-2 rounded-lg",
                      percentage <= 25 ? "bg-red-50 dark:bg-red-950" :
                      percentage <= 50 ? "bg-orange-50 dark:bg-orange-950" :
                      percentage <= 75 ? "bg-yellow-50 dark:bg-yellow-950" :
                      "bg-green-50 dark:bg-green-950"
                    )}>
                      <item.icon className={cn("h-4 w-4", item.colors.text)} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {item.label}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {item.isPhysiology 
                          ? `${Math.round(item.current)}%`
                          : `${item.current}/${item.max}`
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {(player.progression?.level || 1) > 1 && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
            <div className="grid grid-cols-3 gap-3 text-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3">
                    <TrendingUp className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {player.progression?.level || 1}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      Niveau
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Niveau du personnage</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-3">
                    <Shield className="h-5 w-5 text-purple-500 mx-auto mb-1" />
                    <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      {0}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      Défense
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Défense physique</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="bg-red-50 dark:bg-red-950 rounded-lg p-3">
                    <Heart className="h-5 w-5 text-red-500 mx-auto mb-1" />
                    <div className="text-lg font-bold text-red-600 dark:text-red-400">
                     {0}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      Attaque
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Force d'attaque</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};
