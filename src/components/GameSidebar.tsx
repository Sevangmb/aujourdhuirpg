"use client";

import React from 'react';
import type { Position, Player } from '@/lib/types';
import type { WeatherData } from '@/app/actions/get-current-weather';

import { ScrollArea } from '@/components/ui/scroll-area';
import MapDisplay from './MapDisplay';
import WeatherDisplay from './WeatherDisplay';
import LocationImageDisplay from './LocationImageDisplay';
import PlayerStatusPanel from './PlayerStatusPanel';
import { UNKNOWN_STARTING_PLACE_NAME } from '@/data/initial-game-data';
import { useIsMobile } from '@/hooks/use-mobile';


interface GameSidebarProps {
  player: Player;
  currentLocation: Position;
  nearbyPois: Position[] | null;
  gameTimeInMinutes: number;
  weatherData: WeatherData | null;
  weatherLoading: boolean;
  weatherError: string | null;
  locationImageUrl: string | null;
  locationImageLoading: boolean;
  locationImageError: string | null;
  onPoiClick?: (poi: Position) => void;
}

const GameSidebar: React.FC<GameSidebarProps> = ({
  player,
  currentLocation,
  nearbyPois,
  gameTimeInMinutes,
  weatherData,
  weatherLoading,
  weatherError,
  locationImageUrl,
  locationImageLoading,
  locationImageError,
  onPoiClick,
}) => {
  const isMobile = useIsMobile();
  
  const content = (
    <div className="space-y-4">
      <PlayerStatusPanel player={player} />
      <WeatherDisplay
        weatherData={weatherData}
        isLoading={weatherLoading}
        error={weatherError}
        placeName={currentLocation.name}
        gameTimeInMinutes={gameTimeInMinutes}
      />
      <MapDisplay
        currentLocation={currentLocation}
        nearbyPois={nearbyPois || []}
        onPoiClick={onPoiClick}
      />
      <LocationImageDisplay
        imageUrl={locationImageUrl}
        placeName={currentLocation.name || UNKNOWN_STARTING_PLACE_NAME}
        isLoading={locationImageLoading}
        error={locationImageError}
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
