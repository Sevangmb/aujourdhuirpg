
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Send, Brain, Navigation } from 'lucide-react';
import type { GameState, Position } from '@/lib/types';
import type { GameAction } from '@/lib/game-logic';
import { checkForLocationBasedEvents } from '@/lib/game-logic';
import { getDistanceInKm } from '@/lib/utils/geo-utils';
import { useToast } from '@/hooks/use-toast';

interface PlayerInputFormProps {
  playerInput: string;
  onPlayerInputChange: (value: string) => void;
  onSubmit: (actionText: string) => void; // For text-based actions
  isLoading: boolean;
  gameState: GameState; // To access nearbyPois
  dispatch: (action: GameAction) => void; // To dispatch game actions
}

const PLAYER_ACTION_REFLECT = "[PLAYER_ACTION_REFLECT_INTERNAL_THOUGHTS]";

const PlayerInputForm: React.FC<PlayerInputFormProps> = ({
  playerInput,
  onPlayerInputChange,
  onSubmit,
  isLoading,
  gameState,
  dispatch,
}) => {
  const [selectedPoiId, setSelectedPoiId] = useState<string>("");
  const previousLocationRef = useRef<Position | null | undefined>(null);
  const { toast } = useToast();

  useEffect(() => {
    const currentLocation = gameState.player?.currentLocation;
    const previousLocation = previousLocationRef.current;

    // Check if location is valid and has actually changed from a known different previous location
    if (currentLocation && previousLocation &&
        (currentLocation.latitude !== previousLocation.latitude ||
         currentLocation.longitude !== previousLocation.longitude ||
         currentLocation.name !== previousLocation.name)
       ) {
      console.log("PlayerInputForm: Location changed, checking for events.", currentLocation);
      const eventActions = checkForLocationBasedEvents(currentLocation, gameState);
      if (eventActions.length > 0) {
        console.log("PlayerInputForm: Dispatching event actions:", eventActions);
        dispatch({ type: 'TRIGGER_EVENT_ACTIONS', payload: eventActions });
      }
    }

    // Update previous location ref *after* the check, for the next render
    if (currentLocation !== previousLocation) { // Only update if it's actually different or new
        previousLocationRef.current = currentLocation;
    } else if (!previousLocation && currentLocation) { // Handle initial population of previousLocationRef
        previousLocationRef.current = currentLocation;
    }

  }, [gameState.player?.currentLocation, gameState, dispatch]); // Effect dependencies

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (playerInput.trim() === "") return;
    onSubmit(playerInput);
  };

  const handleReflectClick = () => {
    onSubmit(PLAYER_ACTION_REFLECT);
  };

  const handleMoveToPoi = () => {
    if (!selectedPoiId) return;
    const destination = gameState.nearbyPois?.find(
      (poi) => `${poi.latitude},${poi.longitude}` === selectedPoiId
    );
    const origin = gameState.player?.currentLocation;

    if (destination && origin && gameState.player) {
      const distanceKm = getDistanceInKm(origin.latitude, origin.longitude, destination.latitude, destination.longitude);
      
      // Assuming average speed of 10km/h in a city for mixed transport/walking
      const travelTimeMinutes = Math.round(distanceKm * 6); // (distance / 10) * 60
      
      // Assuming cost of 1.5€ per km for transport
      const travelCost = parseFloat((distanceKm * 1.5).toFixed(2));

      if (gameState.player.money < travelCost) {
        toast({
          variant: "destructive",
          title: "Fonds insuffisants",
          description: `Il vous faut ${travelCost.toFixed(2)}€ pour ce trajet, mais vous n'avez que ${gameState.player.money.toFixed(2)}€.`,
        });
        return;
      }

      dispatch({ type: 'MOVE_TO_LOCATION', payload: destination });
      dispatch({ type: 'ADD_GAME_TIME', payload: travelTimeMinutes });
      dispatch({ 
        type: 'ADD_TRANSACTION', 
        payload: {
          amount: -travelCost,
          type: 'expense',
          category: 'transport',
          description: `Déplacement vers ${destination.name}`
        } 
      });

      toast({
        title: "Déplacement en cours...",
        description: `Trajet vers ${destination.name}. Durée: ~${travelTimeMinutes} min. Coût: ${travelCost.toFixed(2)}€.`
      });

      setSelectedPoiId("");
    }
  };

  const nearbyPoisAvailable = gameState.nearbyPois && gameState.nearbyPois.length > 0;

  return (
    <>
      <form onSubmit={handleSubmit} className="mt-4 flex gap-2 items-end">
        <div className="flex-grow">
          <label htmlFor="playerActionInput" className="sr-only">Que faites-vous ensuite ?</label>
          <Input
            id="playerActionInput"
            type="text"
            value={playerInput}
            onChange={(e) => onPlayerInputChange(e.target.value)}
            placeholder="Que faites-vous ensuite ?"
            className="w-full"
            disabled={isLoading}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleReflectClick}
          disabled={isLoading}
          aria-label="Réfléchir"
          className="shrink-0"
        >
          {isLoading ? <Loader2 className="mr-0 sm:mr-2 h-4 w-4 animate-spin" /> : <Brain className="mr-0 sm:mr-2 h-4 w-4" />}
          <span className="hidden sm:inline">Réfléchir</span>
        </Button>
        <Button type="submit" disabled={isLoading || playerInput.trim() === ""} className="bg-primary hover:bg-primary/90 shrink-0">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          <span className="hidden sm:inline">Envoyer</span>
        </Button>
      </form>

      {nearbyPoisAvailable && (
        <div className="mt-3 flex gap-2 items-end">
          <div className="flex-grow">
            <Select value={selectedPoiId} onValueChange={setSelectedPoiId} disabled={isLoading}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Ou choisissez une destination proche..." />
              </SelectTrigger>
              <SelectContent>
                {gameState.nearbyPois?.map((poi) => (
                  <SelectItem
                    key={`${poi.latitude},${poi.longitude}`}
                    value={`${poi.latitude},${poi.longitude}`}
                  >
                    {poi.name} ({poi.zone?.name || 'Zone inconnue'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            onClick={handleMoveToPoi}
            disabled={isLoading || !selectedPoiId}
            variant="outline"
            className="shrink-0"
          >
            <Navigation className="mr-0 sm:mr-2 h-4 w-4" />
            <span className="hidden sm:inline">S'y rendre</span>
          </Button>
        </div>
      )}
    </>
  );
};

export default PlayerInputForm;
