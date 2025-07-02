"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Sword, Shield, ArrowRight, Clock, Zap, Target } from 'lucide-react';
import type { Enemy, CombatAction } from '@/modules/combat/types';
import type { Player } from '@/lib/types';

interface SimpleCombatUIProps {
  player: Player;
  enemy: Enemy;
  availableActions: CombatAction[];
  onActionSelected: (actionId: string) => void;
  combatLog: string[];
  isPlayerTurn: boolean;
}

const SimpleCombatUI: React.FC<SimpleCombatUIProps> = ({
  player,
  enemy,
  availableActions,
  onActionSelected,
  combatLog,
  isPlayerTurn
}) => {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  const handleActionClick = (actionId: string) => {
    setSelectedAction(actionId);
    onActionSelected(actionId);
  };

  const getActionIcon = (iconName: string) => {
    const icons: { [key: string]: React.ElementType } = {
      Sword,
      Shield, 
      ArrowRight,
      Clock,
      Zap,
      Target
    };
    return icons[iconName] || Sword;
  };

  const getHealthPercentage = (current: number, max: number) => {
    return (current / max) * 100;
  };

  const getHealthColor = (percentage: number) => {
    if (percentage > 60) return 'bg-green-500';
    if (percentage > 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-slate-900 rounded-lg overflow-hidden shadow-2xl border border-slate-700">
        
        {/* Header */}
        <div className="bg-red-900/30 p-4 border-b border-slate-700">
          <h2 className="text-2xl font-bold text-white text-center">
            Combat contre {enemy.name}
          </h2>
          <p className="text-center text-slate-300 mt-1">
            {isPlayerTurn ? 'À votre tour' : 'Tour de l\'ennemi'}
          </p>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Colonne Joueur */}
          <Card className="bg-slate-800/50 border-slate-600">
            <CardHeader>
              <CardTitle className="text-green-400">{player.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Santé */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Santé</span>
                  <span>{player.stats.Sante.value} / {player.stats.Sante.max || 100}</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-3">
                  <div 
                    className={`h-full rounded-full transition-all ${getHealthColor(
                      getHealthPercentage(player.stats.Sante.value, player.stats.Sante.max || 100)
                    )}`}
                    style={{ 
                      width: `${getHealthPercentage(player.stats.Sante.value, player.stats.Sante.max || 100)}%` 
                    }}
                  />
                </div>
              </div>

              {/* Énergie */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Énergie</span>
                  <span>{player.stats.Energie.value} / 100</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${player.stats.Energie.value}%` }}
                  />
                </div>
              </div>

              {/* Stats principales */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>Force: {player.stats.Force.value}</div>
                <div>Intel: {player.stats.Intelligence.value}</div>
              </div>
            </CardContent>
          </Card>

          {/* Colonne Actions */}
          <div className="space-y-4">
            {/* Actions disponibles */}
            {isPlayerTurn && (
              <Card className="bg-slate-800/50 border-slate-600">
                <CardHeader>
                  <CardTitle className="text-blue-400">Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-2">
                    {availableActions.map((action) => {
                      const Icon = getActionIcon(action.iconName);
                      const canUse = player.stats.Energie.value >= action.energyCost;
                      
                      return (
                        <Button
                          key={action.id}
                          onClick={() => handleActionClick(action.id)}
                          disabled={!canUse}
                          variant={selectedAction === action.id ? "default" : "outline"}
                          className={`h-auto p-3 flex items-center gap-3 text-left justify-start
                            ${!canUse ? 'opacity-50 cursor-not-allowed' : ''}
                          `}
                        >
                          <Icon className="w-5 h-5" />
                          <div className="flex-1">
                            <div className="font-medium">{action.name}</div>
                            <div className="text-xs opacity-70">
                              Énergie: {action.energyCost} • Précision: {action.accuracy}%
                            </div>
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Combat log */}
            <Card className="bg-slate-800/50 border-slate-600">
              <CardHeader>
                <CardTitle className="text-yellow-400">Journal de Combat</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {combatLog.slice(-5).map((entry, index) => (
                    <div key={index} className="text-sm text-slate-300 p-2 bg-slate-700/30 rounded">
                      {entry}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Colonne Ennemi */}
          <Card className="bg-slate-800/50 border-slate-600">
            <CardHeader>
              <CardTitle className="text-red-400">{enemy.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Santé ennemi */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Santé</span>
                  <span>{enemy.health} / {enemy.maxHealth}</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-3">
                  <div 
                    className={`h-full rounded-full transition-all ${getHealthColor(
                      getHealthPercentage(enemy.health, enemy.maxHealth)
                    )}`}
                    style={{ 
                      width: `${getHealthPercentage(enemy.health, enemy.maxHealth)}%` 
                    }}
                  />
                </div>
              </div>

              {/* Description ennemi */}
              <div className="text-sm text-slate-300">
                {enemy.description}
              </div>

              {/* Stats ennemi */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>Attaque: {enemy.attack}</div>
                <div>Défense: {enemy.defense}</div>
              </div>

              {/* Indicateur de tour */}
              {!isPlayerTurn && (
                <Badge variant="destructive" className="w-full justify-center">
                  L'ennemi réfléchit...
                </Badge>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default SimpleCombatUI;
