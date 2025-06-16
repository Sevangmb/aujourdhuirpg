
"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import type { ToneSettings, GameTone } from '@/lib/types';
import { AVAILABLE_TONES } from '@/lib/types';

interface ToneSettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentSettings: ToneSettings;
  onSave: (newSettings: ToneSettings) => void;
}

const ToneSettingsDialog: React.FC<ToneSettingsDialogProps> = ({ isOpen, onOpenChange, currentSettings, onSave }) => {
  const [localSettings, setLocalSettings] = useState<ToneSettings>(currentSettings);

  useEffect(() => {
    // Sync local state if currentSettings prop changes (e.g., after save or initial load)
    setLocalSettings(currentSettings);
  }, [currentSettings]);

  const handleSliderChange = (tone: GameTone, value: number[]) => {
    setLocalSettings(prev => ({ ...prev, [tone]: value[0] }));
  };

  const handleSave = () => {
    onSave(localSettings);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setLocalSettings(currentSettings); // Reset to original before closing
    onOpenChange(false);
  };
  
  // Ensure that even if a tone is not in currentSettings, it gets a default of 50
  const getToneValue = (tone: GameTone): number => {
    return localSettings[tone] ?? 50;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) handleCancel(); // Ensure settings are reset if dialog is closed via X or overlay click
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
