
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { GameState, Player, Scenario, PlayerStats, LocationData, InventoryItem, Progression } from '@/lib/types';
import StatDisplay from './StatDisplay';
import ScenarioDisplay from './ScenarioDisplay';
import { Button } from '@/components/ui/button';
import { generateScenario, type GenerateScenarioInput, type GenerateScenarioOutput } from '@/ai/flows/generate-scenario';
import { 
  applyStatChanges, 
  saveGameState, 
  getInitialScenario, 
  initialPlayerLocation,
  addItemToInventory,
  removeItemFromInventory,
  addXP
} from '@/lib/game-logic';
import { useToast } from "@/hooks/use-toast";
import { Loader2, RotateCcw, UserCircle2, Briefcase, Zap, Star } from 'lucide-react';
import { getCurrentWeather, type WeatherData } from '@/app/actions/get-current-weather';
import MapDisplay from './MapDisplay';
import WeatherDisplay from './WeatherDisplay';
import PlayerInputForm from './PlayerInputForm';
import PlayerSheet from './PlayerSheet';
import InventoryDisplay from './InventoryDisplay';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface GamePlayProps {
  initialGameState: GameState;
  onRestart: () => void;
}

const GamePlay: React.FC<GamePlayProps> = ({ initialGameState, onRestart }) => {
  const [player, setPlayer] = useState<Player | null>(initialGameState.player);
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(initialGameState.currentScenario);
  const [previousStats, setPreviousStats] = useState<PlayerStats | undefined>(initialGameState.player?.stats);
  const [isLoading, setIsLoading] = useState(false);
  const [playerInput, setPlayerInput] = useState('');
  const { toast } = useToast();

  const [currentLocationForUI, setCurrentLocationForUI] = useState<LocationData>(
    initialGameState.player?.currentLocation || initialPlayerLocation
  );
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [isPlayerSheetOpen, setIsPlayerSheetOpen] = useState(false);
  const [isInventorySheetOpen, setIsInventorySheetOpen] = useState(false);


  useEffect(() => {
    if (player && player.currentLocation && !currentScenario) {
      const firstScenario = getInitialScenario(player);
      setCurrentScenario(firstScenario);
    } else if (player && !player.currentLocation) {
        console.warn("Player object missing currentLocation, re-initializing scenario with default location.");
        const playerWithDefaultLocation = { ...player, currentLocation: initialPlayerLocation };
        setPlayer(playerWithDefaultLocation); 
        setCurrentLocationForUI(initialPlayerLocation); 
        const firstScenario = getInitialScenario(playerWithDefaultLocation);
        setCurrentScenario(firstScenario);
        saveGameState({ player: playerWithDefaultLocation, currentScenario: firstScenario });
    }
  }, [player, currentScenario]);

  useEffect(() => {
    const fetchWeatherForLocation = async (loc: LocationData) => {
      setWeatherLoading(true);
      setWeatherError(null);
      try {
        const result = await getCurrentWeather(loc.latitude, loc.longitude);
        if ('error' in result) {
          setWeatherError(result.error);
          setWeather(null);
        } else {
          setWeather(result);
        }
      } catch (e: any) {
        const errorMessage = e.message || "Une erreur inconnue est survenue lors de la récupération de la météo.";
        setWeatherError(errorMessage);
        setWeather(null);
      } finally {
        setWeatherLoading(false);
      }
    };

    const locationToFetch = player?.currentLocation;
    if (locationToFetch && typeof locationToFetch.latitude === 'number' && typeof locationToFetch.longitude === 'number') {
       fetchWeatherForLocation(locationToFetch);
       if (currentLocationForUI.placeName !== locationToFetch.placeName || 
           currentLocationForUI.latitude !== locationToFetch.latitude ||
           currentLocationForUI.longitude !== locationToFetch.longitude) {
         setCurrentLocationForUI(locationToFetch); 
       }
    } else if (typeof currentLocationForUI.latitude === 'number' && typeof currentLocationForUI.longitude === 'number') {
      fetchWeatherForLocation(currentLocationForUI);
    }

  }, [player?.currentLocation, currentLocationForUI]);

  const handlePlayerActionSubmit = useCallback(async (actionText: string) => {
    if (!player || !currentScenario || !actionText.trim()) {
      if (!actionText.trim()){
        toast({
          variant: "destructive",
          title: "Action vide",
          description: "Veuillez entrer une action.",
        });
      }
      return;
    }

    if (!player.currentLocation || typeof player.currentLocation.latitude !== 'number' || typeof player.currentLocation.longitude !== 'number') {
      console.error("Critical Error: player.currentLocation is invalid before AI call.", player);
      toast({
          variant: "destructive",
          title: "Erreur Critique du Jeu",
          description: "La localisation du joueur est manquante ou invalide. Essayez de redémarrer le jeu.",
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setPreviousStats(player.stats);

    const simplifiedInventory = player.inventory.map(item => ({ name: item.name, quantity: item.quantity }));
    const playerProgressionForAI = {
      level: player.progression.level,
      xp: player.progression.xp,
      xpToNextLevel: player.progression.xpToNextLevel,
      perks: player.progression.perks,
    };

    const inputForAI: GenerateScenarioInput = {
      playerName: player.name,
      playerGender: player.gender,
      playerAge: player.age,
      playerOrigin: player.origin,
      playerBackground: player.background,
      playerStats: player.stats,
      playerSkills: player.skills,
      playerTraitsMentalStates: player.traitsMentalStates,
      playerProgression: playerProgressionForAI,
      playerAlignment: player.alignment,
      playerInventory: simplifiedInventory,
      playerChoice: actionText.trim(),
      currentScenario: currentScenario.scenarioText,
      playerLocation: player.currentLocation, 
    };

    try {
      const output: GenerateScenarioOutput = await generateScenario(inputForAI);

      let updatedPlayer = { ...player }; // Start with current player state

      // 1. Apply stat changes
      if (output.scenarioStatsUpdate) {
        const updatedStats = applyStatChanges(updatedPlayer.stats, output.scenarioStatsUpdate);
        updatedPlayer.stats = updatedStats;
      }

      // 2. Apply XP changes and check for level up
      if (typeof output.xpGained === 'number' && output.xpGained > 0) {
        const { newProgression, leveledUp } = addXP(updatedPlayer.progression, output.xpGained);
        updatedPlayer.progression = newProgression;
        toast({
          title: "Expérience gagnée !",
          description: `Vous avez gagné ${output.xpGained} XP.`,
          action: <Zap className="text-yellow-400" />
        });
        if (leveledUp) {
          toast({
            title: "Niveau Supérieur !",
            description: `Félicitations, vous êtes maintenant niveau ${newProgression.level} !`,
            action: <Star className="text-yellow-500" />
          });
        }
      }
      
      // 3. Apply inventory changes (items added)
      if (output.itemsAdded && output.itemsAdded.length > 0) {
        let currentInv = updatedPlayer.inventory;
        output.itemsAdded.forEach(itemToAdd => {
          currentInv = addItemToInventory(currentInv, itemToAdd.itemId, itemToAdd.quantity);
          toast({
            title: "Objet obtenu !",
            description: `Vous avez obtenu : ${itemToAdd.itemId} (x${itemToAdd.quantity})`,
          });
        });
        updatedPlayer.inventory = currentInv;
      }

      // 4. Apply inventory changes (items removed)
      if (output.itemsRemoved && output.itemsRemoved.length > 0) {
        let currentInv = updatedPlayer.inventory;
        output.itemsRemoved.forEach(itemToRemove => {
          currentInv = removeItemFromInventory(currentInv, itemToRemove.itemName, itemToRemove.quantity);
           toast({
            title: "Objet utilisé/perdu",
            description: `${itemToRemove.itemName} (x${itemToRemove.quantity}) retiré de l'inventaire.`,
          });
        });
        updatedPlayer.inventory = currentInv;
      }

      // 5. Update location if changed
      if (output.newLocationDetails && 
          typeof output.newLocationDetails.latitude === 'number' && 
          typeof output.newLocationDetails.longitude === 'number' && 
          output.newLocationDetails.placeName) {
        const newLoc: LocationData = {
          latitude: output.newLocationDetails.latitude,
          longitude: output.newLocationDetails.longitude,
          placeName: output.newLocationDetails.placeName,
        };
        updatedPlayer.currentLocation = newLoc;
         toast({
          title: "Déplacement !",
          description: `Vous êtes maintenant à ${newLoc.placeName}. ${output.newLocationDetails.reasonForMove || ''}`,
        });
      }
      
      setPlayer(updatedPlayer); // Update player state with all changes

      const nextScenario: Scenario = {
        scenarioText: output.scenarioText,
      };
      setCurrentScenario(nextScenario);

      const newGameState: GameState = { player: updatedPlayer, currentScenario: nextScenario };
      saveGameState(newGameState);

      setPlayerInput('');
      // Removed generic success toast as specific toasts are more informative

    } catch (error) {
      console.error("Erreur lors de la génération du scénario:", error);
      let errorMessage = "Impossible de générer le prochain scénario.";
      if (error instanceof Error) {
        errorMessage += ` Détail: ${error.message}`;
      }
      toast({
        variant: "destructive",
        title: "Erreur de Connexion avec l'IA",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, [player, currentScenario, toast]);


  if (!player || !currentScenario) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl">Chargement du jeu...</p>
        <Button onClick={onRestart} variant="outline" className="mt-4">
          <RotateCcw className="mr-2 h-4 w-4" /> Recommencer
        </Button>
      </div>
    );
  }
  
  const displayLocation = player.currentLocation || initialPlayerLocation;

  return (
    <div className="flex flex-col h-full p-4 md:p-8 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <WeatherDisplay weatherData={weather} isLoading={weatherLoading} error={weatherError} placeName={displayLocation.placeName} />
         <MapDisplay latitude={displayLocation.latitude} longitude={displayLocation.longitude} placeName={displayLocation.placeName} />
      </div>
      
      <div className="md:sticky md:top-4 md:z-10 grid gap-4">
         <StatDisplay stats={player.stats} previousStats={previousStats} />
      </div>
      
      <div className="flex justify-center my-4 space-x-2">
        <Sheet open={isPlayerSheetOpen} onOpenChange={setIsPlayerSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="shadow-md">
              <UserCircle2 className="mr-2 h-4 w-4" /> Fiche Personnage
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-full sm:w-[500px] md:w-[600px] lg:w-[700px] p-0 overflow-y-auto">
            <SheetHeader className="p-4 border-b sticky top-0 bg-background z-10">
              <SheetTitle className="font-headline text-primary">Fiche de Personnage</SheetTitle>
              <SheetDescription>
                Consultez les détails de votre personnage.
              </SheetDescription>
            </SheetHeader>
            <PlayerSheet player={player} />
          </SheetContent>
        </Sheet>

        <Sheet open={isInventorySheetOpen} onOpenChange={setIsInventorySheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="shadow-md">
              <Briefcase className="mr-2 h-4 w-4" /> Inventaire
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:w-[500px] md:w-[600px] lg:w-[700px] p-0 flex flex-col">
            <SheetHeader className="p-4 border-b sticky top-0 bg-background z-10">
              <SheetTitle className="font-headline text-primary">Inventaire</SheetTitle>
              <SheetDescription>
                Objets que vous transportez.
              </SheetDescription>
            </SheetHeader>
            <InventoryDisplay inventory={player.inventory} />
          </SheetContent>
        </Sheet>
      </div>


      <div className="flex-grow flex">
        <ScenarioDisplay
          scenarioHTML={currentScenario.scenarioText}
          isLoading={isLoading}
        />
      </div>

      <PlayerInputForm
        playerInput={playerInput}
        onPlayerInputChange={setPlayerInput}
        onSubmit={handlePlayerActionSubmit}
        isLoading={isLoading}
      />

      <div className="flex justify-center mt-auto pt-4">
        <Button onClick={onRestart} variant="outline" className="shadow-md" disabled={isLoading}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Recommencer la partie
        </Button>
      </div>
    </div>
  );
};

export default GamePlay;
