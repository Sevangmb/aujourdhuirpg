import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Heart, Zap, Apple, Droplets, Coins } from 'lucide-react';
import { useGameContext } from '@/contexts/GameContext';

interface StatusBarProps {
  className?: string;
}

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  maxValue: number;
  color: string;
  textColor: string;
}

const StatItem: React.FC<StatItemProps> = ({
  icon,
  label,
  value,
  maxValue,
  color,
  textColor
}) => {
  const percentage = Math.max(0, Math.min(100, (value / maxValue) * 100));
  
  // Couleur dynamique selon le pourcentage
  const getBarColor = () => {
    if (percentage > 60) return 'bg-green-500';
    if (percentage > 30) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex items-center space-x-2 min-w-0">
      <div className={`flex-shrink-0 ${textColor}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground font-medium truncate">
            {label}
          </span>
          <span className={`font-bold ${textColor}`}>
            {Math.round(value)}/{maxValue}
          </span>
        </div>
        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={`absolute top-0 left-0 h-full ${getBarColor()} transition-all duration-500 ease-out`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};

const PlayerStatusBar: React.FC<StatusBarProps> = ({ className = '' }) => {
  const { gameState } = useGameContext();
  
  // Valeurs par défaut si gameState n'est pas disponible
  const defaultStats = {
    health: 100,
    maxHealth: 100,
    energy: 80,
    maxEnergy: 100,
    hunger: 70,
    maxHunger: 100,
    thirst: 85,
    maxThirst: 100,
    money: 150
  };

  const stats = gameState?.player?.stats || defaultStats;
  const money = gameState?.player?.money || defaultStats.money;

  return (
    <div className={`bg-card border border-border rounded-lg p-4 space-y-3 ${className}`}>
      {/* Titre de la section */}
      <div className="flex items-center space-x-2 border-b border-border pb-2">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <h3 className="text-sm font-semibold text-foreground">
          État du Joueur
        </h3>
      </div>

      {/* Stats principales */}
      <div className="space-y-3">
        {/* Santé */}
        <StatItem
          icon={<Heart className="h-4 w-4" />}
          label="Santé"
          value={stats.health}
          maxValue={stats.maxHealth}
          color="text-red-500"
          textColor="text-red-500"
        />

        {/* Énergie */}
        <StatItem
          icon={<Zap className="h-4 w-4" />}
          label="Énergie"
          value={stats.energy}
          maxValue={stats.maxEnergy}
          color="text-blue-500"
          textColor="text-blue-500"
        />

        {/* Faim */}
        <StatItem
          icon={<Apple className="h-4 w-4" />}
          label="Faim"
          value={stats.hunger}
          maxValue={stats.maxHunger}
          color="text-orange-500"
          textColor="text-orange-500"
        />

        {/* Soif */}
        <StatItem
          icon={<Droplets className="h-4 w-4" />}
          label="Soif"
          value={stats.thirst}
          maxValue={stats.maxThirst}
          color="text-cyan-500"
          textColor="text-cyan-500"
        />
      </div>

      {/* Argent */}
      <div className="pt-2 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Coins className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium text-muted-foreground">
              Argent
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-lg font-bold text-yellow-500">
              {money.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground">€</span>
          </div>
        </div>
      </div>

      {/* Indicateur de mise à jour */}
      <div className="flex items-center justify-center pt-2">
        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
          <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
          <span>Mise à jour temps réel</span>
        </div>
      </div>
    </div>
  );
};

export default PlayerStatusBar;