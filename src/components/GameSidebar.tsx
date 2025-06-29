
"use client";

import React from 'react';
import { useGame } from '@/contexts/GameContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import MapDisplay from './MapDisplay';
import WeatherDisplay from './WeatherDisplay';
import LocationImageDisplay from './LocationImageDisplay';
import PlayerStatusPanel from './PlayerStatusPanel';
import { UNKNOWN_STARTING_PLACE_NAME } from '@/data/initial-game-data';
import { useIsMobile } from '@/hooks/use-mobile';


const GameSidebar: React.FC = () => {
  const { gameState, contextualData, handleInitiateTravel } = useGame();
  const { weather, locationImage, pois } = contextualData;
  const isMobile = useIsMobile();
  
  if (!gameState || !gameState.player) return null;

  const { player, nearbyPois, gameTimeInMinutes } = gameState;
  const currentLocation = player.currentLocation;

  const content = (
    <div className="space-y-4">
      <PlayerStatusPanel player={player} />
      <WeatherDisplay
        weatherData={weather.data}
        isLoading={weather.loading}
        error={weather.error}
        placeName={currentLocation.name}
        gameTimeInMinutes={gameTimeInMinutes}
      />
      <MapDisplay
        currentLocation={currentLocation}
        nearbyPois={pois.data || []}
        onPoiClick={handleInitiateTravel}
      />
      <LocationImageDisplay
        imageUrl={locationImage.url}
        placeName={currentLocation.name || UNKNOWN_STARTING_PLACE_NAME}
        isLoading={locationImage.loading}
        error={locationImage.error}
      />
    </div>
  );

  if (isMobile) {
    return (
        <details className="p-2 border-t md:hidden">
            <summary className="font-semibold text-sm cursor-pointer">Afficher le statut et le contexte</summary>
            <div className="pt-4">
              {content}
            </div>
        </details>
    )
  }

  return (
    <aside className="w-full md:w-80 lg:w-96 flex-shrink-0 hidden md:block">
      <ScrollArea className="h-full p-2">
        {content}
      </ScrollArea>
    </aside>
  );
};

export default GameSidebar;
