
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Loader2, Send, Brain, Navigation, Footprints, TrainFront, Car } from 'lucide-react';
import type { GameState, Position, PlayerStats } from '@/lib/types';
import type { GameAction } from '@/lib/game-logic';
import { checkForLocationBasedEvents } from '@/lib/game-logic';
import { getDistanceInKm } from '@/lib/utils/geo-utils';
import { useToast } from '@/hooks/use-toast';
import { aiService } from '@/services/aiService';

interface PlayerInputFormProps {
  playerInput: string;
  onPlayerInputChange: (value: string) => void;
  onSubmit: (actionText: string) => void; // For text-based actions
  isLoading: boolean;
  gameState: GameState; // To access nearbyPois
  dispatch: (action: GameAction) => void; // To dispatch game actions
}

interface TravelOption {
    mode: 'walk' | 'metro' | 'taxi';
    label: string;
    icon: React.ElementType;
    time: number;
    cost: number;
    energy: number;
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
  const [isTravelModalOpen, setIsTravelModalOpen] = useState(false);
  const [travelOptions, setTravelOptions] = useState<TravelOption[]>([]);
  const previousLocationRef = useRef<Position | null | undefined>(null);
  const { toast } = useToast();

  useEffect(() => {
    const currentLocation = gameState.player?.currentLocation;
    const previousLocation = previousLocationRef.current;

    if (currentLocation && previousLocation &&
        (currentLocation.latitude !== previousLocation.latitude ||
         currentLocation.longitude !== previousLocation.longitude ||
         currentLocation.name !== previousLocation.name)
       ) {
      const eventActions = checkForLocationBasedEvents(currentLocation, gameState);
      if (eventActions.length > 0) {
        dispatch({ type: 'TRIGGER_EVENT_ACTIONS', payload: eventActions });
      }
    }

    if (currentLocation !== previousLocation) {
        previousLocationRef.current = currentLocation;
    } else if (!previousLocation && currentLocation) {
        previousLocationRef.current = currentLocation;
    }

  }, [gameState.player?.currentLocation, gameState, dispatch]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (playerInput.trim() === "") return;
    onSubmit(playerInput);
  };

  const handleReflectClick = () => {
    onSubmit(PLAYER_ACTION_REFLECT);
  };
  
  const destination = gameState.nearbyPois?.find(
    (poi) => `${poi.latitude},${poi.longitude}` === selectedPoiId
  );

  const calculateTravelOptions = () => {
    if (!destination || !gameState.player) {
      setTravelOptions([]);
      return;
    }

    const origin = gameState.player.currentLocation;
    const distanceKm = getDistanceInKm(origin.latitude, origin.longitude, destination.latitude, destination.longitude);

    const options: TravelOption[] = [
      {
        mode: 'walk',
        label: 'Marcher',
        icon: Footprints,
        time: Math.round(distanceKm * 12 + 1), // 5 km/h
        cost: 0,
        energy: Math.max(1, Math.round(distanceKm * 5)),
      },
      {
        mode: 'metro',
        label: 'Transport en commun',
        icon: TrainFront,
        time: Math.round(5 + distanceKm * 4), // ~15 km/h avg + 5 min wait
        cost: 2.15,
        energy: Math.max(1, Math.round(distanceKm * 1)),
      },
      {
        mode: 'taxi',
        label: 'Taxi / VTC',
        icon: Car,
        time: Math.round(3 + distanceKm * 2), // ~30 km/h avg + 3 min wait
        cost: parseFloat((5 + distanceKm * 1.8).toFixed(2)),
        energy: 0,
      }
    ];
    setTravelOptions(options);
  };

  const handleOpenTravelModal = () => {
    calculateTravelOptions();
    setIsTravelModalOpen(true);
  };

  const handleConfirmTravel = async (option: TravelOption) => {
    if (!destination || !gameState.player) return;

    if (gameState.player.money < option.cost) {
      toast({
        variant: "destructive",
        title: "Fonds insuffisants",
        description: `Il vous faut ${option.cost.toFixed(2)}€ pour ce trajet.`,
      });
      return;
    }

    if (gameState.player.stats.Energie < option.energy) {
        toast({
            variant: "destructive",
            title: "Pas assez d'énergie",
            description: `Ce trajet est trop fatiguant pour le moment. Reposez-vous.`
        });
        return;
    }

    let travelNarrative = "";
    try {
        const eventResult = await aiService.generateTravelEvent({
            travelMode: option.mode,
            origin: gameState.player.currentLocation,
            destination: destination,
            playerStats: gameState.player.stats,
            playerSkills: gameState.player.skills,
            gameTimeInMinutes: gameState.gameTimeInMinutes,
        });
        travelNarrative = eventResult.narrative;
    } catch (e) {
        console.error("Failed to generate travel event narrative.", e);
        // Fail silently and continue with the travel.
    }

    dispatch({
        type: 'EXECUTE_TRAVEL',
        payload: {
            destination: destination,
            travelNarrative: travelNarrative,
            time: option.time,
            cost: option.cost,
            energy: option.energy,
        }
    });

    toast({
      title: `Déplacement vers ${destination.name}...`,
      description: `Mode: ${option.label}, Durée: ~${option.time} min, Coût: ${option.cost.toFixed(2)}€, Énergie: -${option.energy}`
    });

    setIsTravelModalOpen(false);
    setSelectedPoiId("");
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
                    {poi.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialog open={isTravelModalOpen} onOpenChange={setIsTravelModalOpen}>
            <AlertDialogTrigger asChild>
                <Button
                    type="button"
                    onClick={handleOpenTravelModal}
                    disabled={isLoading || !selectedPoiId}
                    variant="outline"
                    className="shrink-0"
                >
                    <Navigation className="mr-0 sm:mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">S'y rendre</span>
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Se rendre à {destination?.name || 'destination'}</AlertDialogTitle>
                    <AlertDialogDescription>
                        Comment souhaitez-vous voyager ?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-2">
                    {travelOptions.map(option => {
                        const canAfford = gameState.player && gameState.player.money >= option.cost;
                        const hasEnergy = gameState.player && gameState.player.stats.Energie >= option.energy;
                        const canTravel = canAfford && hasEnergy;
                        
                        let disabledReason = "";
                        if (!canAfford) disabledReason = "Fonds insuffisants";
                        else if (!hasEnergy) disabledReason = "Pas assez d'énergie";

                        return (
                            <Button key={option.mode} variant="outline" className="w-full justify-start h-auto p-3" onClick={() => handleConfirmTravel(option)} disabled={!canTravel}>
                                <option.icon className="mr-4 h-5 w-5" />
                                <div className="text-left flex-grow">
                                    <p className="font-semibold">{option.label}</p>
                                    <p className="text-xs text-muted-foreground">
                                        Durée: ~{option.time} min | Coût: {option.cost.toFixed(2)}€ | Énergie: -{option.energy}
                                    </p>
                                </div>
                                {!canTravel && <span className="ml-2 text-xs text-destructive">{disabledReason}</span>}
                            </Button>
                        );
                    })}
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        </div>
      )}
    </>
  );
};

export default PlayerInputForm;
