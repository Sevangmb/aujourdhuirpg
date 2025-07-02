
"use client";

import React from 'react';
import { useGame } from '@/contexts/GameContext';
import type { StoryChoice } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sword, Heart, Shield, Run, Loader2 } from 'lucide-react';

const CombatUI: React.FC = () => {
  const { gameState, handleChoiceSelected, isLoading } = useGame();
  const { player, currentEnemy } = gameState;

  if (!player || !currentEnemy) return null;

  const healingItems = player.inventory.filter(
    (item) => item.type === 'consumable' && item.effects?.Sante && item.effects.Sante > 0
  );

  const onAction = (choice: Partial<StoryChoice>) => {
    const fullChoice: StoryChoice = {
      id: `combat_${choice.id || choice.combatActionType}_${Date.now()}`,
      text: choice.text || 'Action de combat',
      description: choice.description || 'Une action pendant le combat.',
      iconName: 'Sword', // Default icon
      type: 'action',
      mood: 'adventurous',
      energyCost: 2, // Base cost for combat actions
      timeCost: 1, // Combat turns are quick
      consequences: [],
      isCombatAction: true,
      ...choice,
    };
    handleChoiceSelected(fullChoice);
  };
  
  return (
    <Card className="mt-4 border-destructive/50 bg-destructive/5 dark:bg-destructive/10">
      <CardContent className="p-4">
        <h3 className="text-lg font-semibold text-center mb-3 text-destructive">COMBAT!</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Button
            onClick={() => onAction({ combatActionType: 'attack', text: `Attaquer ${currentEnemy.name}` })}
            disabled={isLoading}
            size="lg"
            className="h-auto py-3 bg-destructive hover:bg-destructive/90"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Sword className="w-5 h-5 mr-2" />
            Attaquer
          </Button>
          
          {healingItems.map(item => (
            <Button
              key={item.instanceId}
              onClick={() => onAction({ 
                  combatActionType: 'use_item', 
                  text: `Utiliser ${item.name}`,
                  itemReference: item.instanceId,
                })}
              disabled={isLoading}
              variant="secondary"
              size="lg"
              className="h-auto py-3"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Heart className="w-5 h-5 mr-2" />
              Utiliser {item.name}
            </Button>
          ))}

          <Button
            onClick={() => onAction({ combatActionType: 'defend', text: 'Se défendre' })}
            disabled={true} // Not implemented yet
            variant="outline"
            size="lg"
            className="h-auto py-3"
          >
            <Shield className="w-5 h-5 mr-2" />
            Défendre (Bientôt)
          </Button>

          <Button
            onClick={() => onAction({ combatActionType: 'flee', text: 'Tenter de fuir' })}
            disabled={isLoading}
            variant="ghost"
            size="lg"
            className="h-auto py-3"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Run className="w-5 h-5 mr-2" />
            Fuir
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CombatUI;
