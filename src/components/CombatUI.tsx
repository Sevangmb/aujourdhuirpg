
/**
 * @fileOverview Immersive Combat User Interface
 * Complete tactical combat interface with animations and visual feedback
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Sword, 
  Shield, 
  Zap, 
  Eye, 
  MessageSquare, 
  Wind, 
  Heart, 
  Lightning,
  Target,
  Gauge,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Player } from '@/lib/types';
import type { Enemy, CombatAction, CombatLogEntry } from '@/modules/combat/enhanced-types';
import { useCombat, useCombatAnimations, useCombatSounds } from '@/hooks/useCombat';

// === ICON MAPPING ===
const actionIcons = {
  attack: Sword,
  defend: Shield,
  special: Zap,
  analyze: Eye,
  intimidate: MessageSquare,
  feint: Wind,
  use_item: Heart,
  flee: Wind
};

// === MAIN COMBAT INTERFACE ===

interface CombatUIProps {
  player: Player;
  enemies: Enemy[];
  onCombatEnd: (outcome: 'victory' | 'defeat' | 'flee') => void;
  isOpen: boolean;
  onClose: () => void;
}

export function CombatUI({ player, enemies, onCombatEnd, isOpen, onClose }: CombatUIProps) {
  const combat = useCombat();
  const animations = useCombatAnimations();
  const sounds = useCombatSounds();
  const [selectedTargetIndex, setSelectedTargetIndex] = useState(0);

  // Initialize combat when component mounts
  useEffect(() => {
    if (isOpen && !combat.combatState) {
      combat.startCombat(player, enemies);
    }
  }, [isOpen, combat, player, enemies]);

  // Handle combat end conditions
  useEffect(() => {
    if (combat.combatState) {
      const playerStats = combat.getPlayerStats();
      const allEnemiesDefeated = combat.combatState.enemies.every(enemy => enemy.currentStats.health <= 0);
      
      if (playerStats?.health <= 0) {
        combat.endCombat('defeat');
        sounds.playSound('defeat');
        onCombatEnd('defeat');
      } else if (allEnemiesDefeated) {
        combat.endCombat('victory');
        sounds.playSound('victory');
        onCombatEnd('victory');
      }
    }
  }, [combat.combatState?.player.stats.health, combat.combatState?.enemies, combat, onCombatEnd, sounds]);

  if (!isOpen || !combat.combatState) {
    return null;
  }

  const playerStats = combat.getPlayerStats();
  const availableActions = combat.getAvailableActions();

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-7xl h-full max-h-[90vh] bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg border border-slate-700 shadow-2xl overflow-hidden">
        
        {/* Combat Header */}
        <div className="bg-gradient-to-r from-red-900/50 to-orange-900/50 p-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Sword className="w-6 h-6 text-red-400" />
              Combat - Tour {combat.combatState.turnCount}
            </h2>
            <div className="flex items-center gap-2">
              <Badge variant={combat.combatState.currentTurn === 'player' ? 'default' : 'secondary'}>
                {combat.combatState.currentTurn === 'player' ? 'Votre Tour' : 'Tour Ennemi'}
              </Badge>
              <Button variant="ghost" onClick={onClose} className="text-white hover:bg-white/10">
                ✕
              </Button>
            </div>
          </div>
        </div>

        <div className="flex h-full">
          
          {/* Left Panel - Player Status */}
          <div className="w-1/4 p-4 border-r border-slate-700 bg-slate-900/50">
            <PlayerCombatCard 
              player={player} 
              playerStats={playerStats} 
            />
          </div>

          {/* Center Panel - Combat Arena */}
          <div className="flex-1 p-4">
            <div className="h-full flex flex-col">
              
              {/* Enemy Display */}
              <div className="flex-1 mb-4">
                <EnemyDisplayArea 
                  enemies={combat.combatState.enemies}
                  selectedIndex={selectedTargetIndex}
                  onSelectTarget={setSelectedTargetIndex}
                />
              </div>

              {/* Action Selection */}
              {combat.combatState.currentTurn === 'player' && (
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600">
                  <ActionSelectionPanel 
                    actions={availableActions}
                    selectedAction={combat.selectedAction}
                    onSelectAction={combat.selectAction}
                    onExecuteAction={(action) => {
                      combat.executeAction(action, selectedTargetIndex);
                      sounds.playSound('attack');
                    }}
                    canPerformAction={combat.canPerformAction}
                    getSuccessProbability={(action) => combat.getActionSuccessProbability(action, selectedTargetIndex)}
                    isAnimating={combat.animating}
                  />
                </div>
              )}

            </div>
          </div>

          {/* Right Panel - Combat Log */}
          <div className="w-1/4 border-l border-slate-700 bg-slate-900/50">
            <CombatLogPanel combatLog={combat.combatState.combatLog} />
          </div>

        </div>

        {/* Loading/Animation Overlay */}
        {combat.animating && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-10">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-600">
              <div className="flex items-center gap-3">
                <Lightning className="w-6 h-6 text-yellow-400 animate-pulse" />
                <span className="text-white">Action en cours...</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// === PLAYER COMBAT CARD ===

interface PlayerCombatCardProps {
  player: Player;
  playerStats: any;
}

function PlayerCombatCard({ player, playerStats }: PlayerCombatCardProps) {
  if (!playerStats) return null;

  const healthPercent = (playerStats.health / playerStats.maxHealth) * 100;
  const staminaPercent = (playerStats.stamina / playerStats.maxStamina) * 100;

  return (
    <Card className="bg-slate-800/80 border-slate-600">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-white flex items-center gap-2">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
            {player.name[0]}
          </div>
          {player.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Health Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white flex items-center gap-1">
              <Heart className="w-4 h-4 text-red-400" />
              Santé
            </span>
            <span className="text-white">{playerStats.health}/{playerStats.maxHealth}</span>
          </div>
          <Progress 
            value={healthPercent} 
            className="h-3"
          />
        </div>

        {/* Stamina Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white flex items-center gap-1">
              <Gauge className="w-4 h-4 text-blue-400" />
              Endurance
            </span>
            <span className="text-white">{playerStats.stamina}/{playerStats.maxStamina}</span>
          </div>
          <Progress 
            value={staminaPercent} 
            className="h-3"
          />
        </div>

        {/* Status Effects */}
        {playerStats.statusEffects && playerStats.statusEffects.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm text-white">Effets Actifs:</span>
            <div className="space-y-1">
              {playerStats.statusEffects.map((effect: any, index: number) => (
                <StatusEffectBadge key={index} effect={effect} />
              ))}
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
}

// === ENEMY DISPLAY AREA ===

interface EnemyDisplayAreaProps {
  enemies: Enemy[];
  selectedIndex: number;
  onSelectTarget: (index: number) => void;
}

function EnemyDisplayArea({ enemies, selectedIndex, onSelectTarget }: EnemyDisplayAreaProps) {
  return (
    <div className="h-full bg-gradient-to-b from-slate-800/30 to-slate-900/30 rounded-lg border border-slate-600 p-4">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Target className="w-5 h-5 text-red-400" />
        Ennemis ({enemies.filter(e => e.currentStats.health > 0).length})
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {enemies.map((enemy, index) => (
          <EnemyCard 
            key={enemy.instanceId}
            enemy={enemy}
            index={index}
            isSelected={selectedIndex === index}
            isAlive={enemy.currentStats.health > 0}
            onSelect={() => onSelectTarget(index)}
          />
        ))}
      </div>
    </div>
  );
}

// === ENEMY CARD ===

interface EnemyCardProps {
  enemy: Enemy;
  index: number;
  isSelected: boolean;
  isAlive: boolean;
  onSelect: () => void;
}

function EnemyCard({ enemy, index, isSelected, isAlive, onSelect }: EnemyCardProps) {
  const healthPercent = (enemy.currentStats.health / enemy.currentStats.maxHealth) * 100;

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-200 hover:scale-105",
        isSelected ? "ring-2 ring-red-400 bg-slate-700/80" : "bg-slate-800/60",
        !isAlive && "opacity-50 grayscale"
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-white">{enemy.name}</h4>
          {!isAlive && <Badge variant="destructive">Vaincu</Badge>}
        </div>
        
        <p className="text-sm text-slate-300 mb-3">{enemy.description}</p>
        
        {/* Health Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white">Santé</span>
            <span className="text-white">{enemy.currentStats.health}/{enemy.currentStats.maxHealth}</span>
          </div>
          <Progress 
            value={healthPercent} 
            className="h-2"
          />
        </div>

        {/* Status Effects */}
        {enemy.currentStats.statusEffects.length > 0 && (
          <div className="mt-3 space-y-1">
            {enemy.currentStats.statusEffects.map((effect, effectIndex) => (
              <StatusEffectBadge key={effectIndex} effect={effect} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// === ACTION SELECTION PANEL ===

interface ActionSelectionPanelProps {
  actions: CombatAction[];
  selectedAction: CombatAction | null;
  onSelectAction: (action: CombatAction | null) => void;
  onExecuteAction: (action: CombatAction) => void;
  canPerformAction: (action: CombatAction) => boolean;
  getSuccessProbability: (action: CombatAction) => number;
  isAnimating: boolean;
}

function ActionSelectionPanel({ 
  actions, 
  selectedAction, 
  onSelectAction, 
  onExecuteAction, 
  canPerformAction,
  getSuccessProbability,
  isAnimating 
}: ActionSelectionPanelProps) {
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
        <Zap className="w-5 h-5 text-yellow-400" />
        Actions de Combat
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {actions.map((action) => {
          const canPerform = canPerformAction(action);
          const successRate = getSuccessProbability(action);
          const IconComponent = actionIcons[action.type] || Sword;
          
          return (
            <Button
              key={action.id}
              variant={selectedAction?.id === action.id ? "default" : "outline"}
              className={cn(
                "h-auto p-3 flex flex-col items-center gap-2 text-xs",
                !canPerform && "opacity-50 cursor-not-allowed",
                selectedAction?.id === action.id && "ring-2 ring-yellow-400"
              )}
              disabled={!canPerform || isAnimating}
              onClick={() => {
                if (selectedAction?.id === action.id) {
                  onExecuteAction(action);
                } else {
                  onSelectAction(action);
                }
              }}
            >
              <IconComponent className="w-5 h-5" />
              <div className="text-center">
                <div className="font-medium">{action.name}</div>
                <div className="text-xs opacity-75">
                  {action.stamina_cost} endurance
                </div>
                <div className="text-xs text-green-400">
                  {successRate}% succès
                </div>
              </div>
            </Button>
          );
        })}
      </div>

      {/* Action Details */}
      {selectedAction && (
        <div className="bg-slate-800/80 rounded-lg p-4 border border-slate-600">
          <h4 className="font-semibold text-white mb-2">{selectedAction.name}</h4>
          <p className="text-sm text-slate-300 mb-3">{selectedAction.description}</p>
          
          <div className="flex gap-2 mt-4">
            <Button 
              onClick={() => onExecuteAction(selectedAction)} 
              disabled={!canPerformAction(selectedAction) || isAnimating}
              className="flex-1"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Exécuter
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onSelectAction(null)}
              disabled={isAnimating}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Annuler
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// === COMBAT LOG PANEL ===

interface CombatLogPanelProps {
  combatLog: CombatLogEntry[];
}

function CombatLogPanel({ combatLog }: CombatLogPanelProps) {
  return (
    <Card className="h-full bg-slate-800/80 border-slate-600">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-400" />
          Journal de Combat
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[500px] px-4">
          <div className="space-y-2">
            {combatLog.slice(-20).map((entry) => (
              <CombatLogEntryComponent key={entry.id} entry={entry} />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// === COMBAT LOG ENTRY ===

interface CombatLogEntryProps {
  entry: CombatLogEntry;
}

function CombatLogEntryComponent({ entry }: CombatLogEntryProps) {
  const getEntryIcon = () => {
    switch (entry.type) {
      case 'damage': return <Sword className="w-3 h-3 text-red-400" />;
      case 'healing': return <Heart className="w-3 h-3 text-green-400" />;
      case 'status': return <Zap className="w-3 h-3 text-yellow-400" />;
      case 'turn_start': return <Clock className="w-3 h-3 text-blue-400" />;
      default: return <Eye className="w-3 h-3 text-slate-400" />;
    }
  };

  const getEntryColor = () => {
    switch (entry.type) {
      case 'damage': return 'text-red-300';
      case 'healing': return 'text-green-300';
      case 'status': return 'text-yellow-300';
      case 'turn_start': return 'text-blue-300';
      default: return 'text-slate-300';
    }
  };

  return (
    <div className={cn("flex items-start gap-2 text-xs", getEntryColor())}>
      {getEntryIcon()}
      <div className="flex-1">
        <div>{entry.description}</div>
        {entry.details && (
          <div className="text-xs opacity-75 mt-1">
            {entry.details.damage && `Dégâts: ${entry.details.damage}`}
            {entry.details.healing && `Soins: ${entry.details.healing}`}
            {entry.details.critical && " (Critique!)"}
          </div>
        )}
      </div>
    </div>
  );
}

// === STATUS EFFECT BADGE ===

interface StatusEffectBadgeProps {
  effect: any;
}

function StatusEffectBadge({ effect }: StatusEffectBadgeProps) {
  return (
    <Badge 
      className="text-xs bg-yellow-500/80"
      title={effect.description}
    >
      {effect.name} ({effect.duration})
    </Badge>
  );
}

export default CombatUI;
