
"use client";

import React from 'react';
import type { Position } from '@/lib/types';
import { getDistanceInKm } from '@/lib/utils/geo-utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PersonStanding, Train, Car, Coins, Clock, Zap } from 'lucide-react';

interface TravelModalProps {
  isOpen: boolean;
  onClose: () => void;
  origin: Position;
  destination: Position;
  onConfirmTravel: (mode: 'walk' | 'metro' | 'taxi') => void;
  playerMoney: number;
  playerEnergy: number;
}

interface TravelOption {
  mode: 'walk' | 'metro' | 'taxi';
  label: string;
  icon: React.ElementType;
  time: number;
  cost: number;
  energy: number;
}

export const TravelModal: React.FC<TravelModalProps> = ({
  isOpen,
  onClose,
  origin,
  destination,
  onConfirmTravel,
  playerMoney,
  playerEnergy,
}) => {
  if (!isOpen) return null;

  const distance = getDistanceInKm(origin.latitude, origin.longitude, destination.latitude, destination.longitude);

  const travelOptions: TravelOption[] = [
    {
      mode: 'walk',
      label: 'Marcher',
      icon: PersonStanding,
      time: Math.round(distance * 12),
      cost: 0,
      energy: Math.round(distance * 5) + 1,
    },
    {
      mode: 'metro',
      label: 'Métro',
      icon: Train,
      time: Math.round(distance * 4 + 10),
      cost: 1.9,
      energy: Math.round(distance * 1) + 1,
    },
    {
      mode: 'taxi',
      label: 'Taxi',
      icon: Car,
      time: Math.round(distance * 2 + 5),
      cost: parseFloat((5 + distance * 1.5).toFixed(2)),
      energy: Math.round(distance * 0.5),
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Voyager vers {destination.name}</DialogTitle>
          <DialogDescription>
            Distance estimée : {distance.toFixed(2)} km. Choisissez votre mode de transport.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-4">
          {travelOptions.map((option) => {
            const canAfford = playerMoney >= option.cost;
            const hasEnergy = playerEnergy >= option.energy;
            const isDisabled = !canAfford || !hasEnergy;

            return (
              <Button
                key={option.mode}
                variant="outline"
                className="w-full h-auto justify-start p-3"
                onClick={() => onConfirmTravel(option.mode)}
                disabled={isDisabled}
              >
                <option.icon className="w-6 h-6 mr-4" />
                <div className="text-left">
                  <p className="font-semibold">{option.label}</p>
                  <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3"/>~{option.time} min</span>
                    <span className={`flex items-center gap-1 ${canAfford ? '' : 'text-destructive'}`}><Coins className="w-3 h-3"/>{option.cost.toFixed(2)} €</span>
                    <span className={`flex items-center gap-1 ${hasEnergy ? '' : 'text-destructive'}`}><Zap className="w-3 h-3"/>-{option.energy} Énergie</span>
                  </div>
                </div>
              </Button>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
