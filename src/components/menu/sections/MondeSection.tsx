
"use client";

import React from 'react';
import type { Player, GameState } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import GeoIntelligenceDisplay from '@/components/GeoIntelligenceDisplay';
import { UNKNOWN_STARTING_PLACE_NAME } from '@/data/initial-game-data';
import { BrainCircuit } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SectionProps {
  player: Player;
  gameState: GameState;
}

export const MondeSection: React.FC<SectionProps> = ({ player, gameState }) => {
  const [isGeoIntelOpen, setIsGeoIntelOpen] = React.useState(false);
  const geoIntelligence = gameState.contextualData.geoIntelligence;

  return (
    <div className="space-y-2">
      <Button variant="outline" className="w-full justify-start" onClick={() => setIsGeoIntelOpen(true)}>
        <BrainCircuit className="mr-2" /> Analyse Géospatiale
      </Button>
       <Dialog open={isGeoIntelOpen} onOpenChange={setIsGeoIntelOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
            <DialogHeader><DialogTitle>Analyse Géospatiale du Lieu</DialogTitle></DialogHeader>
            <ScrollArea className="-m-6 mt-0 p-1 pt-0">
                <div className="p-6">
                    <GeoIntelligenceDisplay
                        data={geoIntelligence.data}
                        isLoading={geoIntelligence.loading}
                        error={geoIntelligence.error}
                        placeName={player.currentLocation?.name || UNKNOWN_STARTING_PLACE_NAME}
                    />
                </div>
            </ScrollArea>
        </DialogContent>
      </Dialog>
      {/* Placeholder for map */}
      <div className="p-4 text-center border-2 border-dashed rounded-lg text-muted-foreground">
        <p className="font-semibold">Carte du Monde</p>
        <p className="text-xs">Bientôt disponible (T3)</p>
      </div>
    </div>
  );
};
