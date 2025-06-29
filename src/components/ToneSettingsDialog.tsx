
"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import type { ToneSettings, GameTone } from '@/lib/types';
import { AVAILABLE_TONES } from '@/lib/types';
import { useGame } from '@/contexts/GameContext'; // Import context
import { useToast } from '@/hooks/use-toast'; // Import toast


interface ToneSettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const ToneSettingsDialog: React.FC<ToneSettingsDialogProps> = ({ isOpen, onOpenChange }) => {
  const { gameState, dispatch } = useGame();
  const { toast } = useToast();
  const currentSettings = gameState?.toneSettings;

  const [localSettings, setLocalSettings] = useState<ToneSettings>(currentSettings || {});

  useEffect(() => {
    if (currentSettings) {
      setLocalSettings(currentSettings);
    }
  }, [currentSettings]);

  const handleSliderChange = (tone: GameTone, value: number[]) => {
    setLocalSettings(prev => ({ ...prev, [tone]: value[0] }));
  };

  const handleSave = () => {
    if (!gameState || !gameState.player) return;

    const updatedPlayer = { ...gameState.player, toneSettings: localSettings };
    dispatch({ type: 'UPDATE_PLAYER_DATA', payload: updatedPlayer });
    toast({ title: "Tonalité Sauvegardée" });
    onOpenChange(false);
  };

  const handleCancel = () => {
    if (currentSettings) {
      setLocalSettings(currentSettings);
    }
    onOpenChange(false);
  };
  
  const getToneValue = (tone: GameTone): number => {
    return localSettings[tone] ?? 50;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) handleCancel();
      else onOpenChange(true);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Paramètres de Tonalité Narrative</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {AVAILABLE_TONES.map(tone => (
            <div key={tone} className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor={`slider-${tone}`}>{tone}</Label>
                <span className="text-sm text-muted-foreground w-8 text-right">{getToneValue(tone)}%</span>
              </div>
              <Slider
                id={`slider-${tone}`}
                min={0}
                max={100}
                step={1}
                value={[getToneValue(tone)]}
                onValueChange={(value) => handleSliderChange(tone, value)}
                className="w-full"
              />
            </div>
          ))}
        </div>
        <DialogFooter className="sm:justify-end gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Annuler
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSave}>
            Sauvegarder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ToneSettingsDialog;
