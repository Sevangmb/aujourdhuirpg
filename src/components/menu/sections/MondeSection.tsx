
"use client";

import React from 'react';
import type { Player, GameState } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import GeoIntelligenceDisplay from '@/components/GeoIntelligenceDisplay';
import { UNKNOWN_STARTING_PLACE_NAME } from '@/data/initial-game-data';
import { BrainCircuit } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import MapDisplay from '@/components/MapDisplay';
import WeatherDisplay from '@/components/WeatherDisplay';
import LocationImageDisplay from '@/components/LocationImageDisplay';
import { useGame } from '@/contexts/GameContext';

interface SectionProps {
  player: Player;
  gameState: GameState;
}

export const MondeSection: React.FC<SectionProps> = ({ player, gameState }) => {
  const { handleInitiateTravel } = useGame();
  const { contextualData } = gameState;
  const { weather, locationImage, pois } = contextualData;

  const [isGeoIntelOpen, setIsGeoIntelOpen] = React.useState(false);

  const currentLocation = player.currentLocation;
  const currentLocationName = currentLocation?.name || UNKNOWN_STARTING_PLACE_NAME;

  return (
    <div className="space-y-4">
      <WeatherDisplay
        weatherData={weather.data}
        isLoading={weather.loading}
        error={weather.error}
        placeName={currentLocationName}
        gameTimeInMinutes={gameState.gameTimeInMinutes}
      />
      <MapDisplay
        currentLocation={currentLocation}
        nearbyPois={pois.data || []}
        onPoiClick={handleInitiateTravel}
      />
      <LocationImageDisplay
        imageUrl={locationImage.url}
        placeName={currentLocationName}
        isLoading={locationImage.loading}
        error={locationImage.error}
        era={player.era}
      />
      <Button variant="outline" className="w-full justify-start" onClick={() => setIsGeoIntelOpen(true)}>
        <BrainCircuit className="mr-2" /> Analyse Géospatiale
      </Button>
       <Dialog open={isGeoIntelOpen} onOpenChange={setIsGeoIntelOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
            <DialogHeader><DialogTitle>Analyse Géospatiale du Lieu</DialogTitle></DialogHeader>
            <ScrollArea className="-m-6 mt-0 p-1 pt-0">
                <div className="p-6">
                    <GeoIntelligenceDisplay
                        data={gameState.contextualData.geoIntelligence.data}
                        isLoading={gameState.contextualData.geoIntelligence.loading}
                        error={gameState.contextualData.geoIntelligence.error}
                        placeName={player.currentLocation?.name || UNKNOWN_STARTING_PLACE_NAME}
                    />
                </div>
            </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};
