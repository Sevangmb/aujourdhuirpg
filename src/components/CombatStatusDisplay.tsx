
"use client";

import React from 'react';
import type { Enemy } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Shield } from 'lucide-react';

interface CombatStatusDisplayProps {
  enemy: Enemy;
}

const CombatStatusDisplay: React.FC<CombatStatusDisplayProps> = ({ enemy }) => {
  if (!enemy) return null;

  const healthPercentage = (enemy.health / enemy.maxHealth) * 100;

  return (
    <Card className="border-destructive bg-red-50 dark:bg-red-900/20">
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-lg font-headline text-destructive flex items-center">
          <Shield className="w-5 h-5 mr-2" /> EN COMBAT
        </CardTitle>
        <CardDescription className="text-sm font-semibold">{enemy.name}</CardDescription>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <p className="text-xs italic text-muted-foreground mb-2">{enemy.description}</p>
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs text-destructive/90 dark:text-destructive/80">
            <span>Santé</span>
            <span>{Math.round(enemy.health)} / {enemy.maxHealth}</span>
          </div>
          <Progress value={healthPercentage} className="h-2 [&>div]:bg-destructive" />
        </div>
      </CardContent>
    </Card>
  );
};

export default CombatStatusDisplay;
