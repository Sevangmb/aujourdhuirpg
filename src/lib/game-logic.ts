
import type { PlayerStats, GameState, Scenario, Player, LocationData, Skills, TraitsMentalStates, Progression, Alignment, InventoryItem } from './types';
import { Package } from 'lucide-react'; // Default icon

export const LOCAL_STORAGE_KEY = 'aujourdhuiRPGGameState';

export const initialPlayerStats: PlayerStats = {
  Sante: 100,
  Charisme: 50,
  Intelligence: 50,
  Force: 50,
};

export const initialSkills: Skills = {
  Informatique: 10,
  Discretion: 5,
  Dialogue: 15,
  Perception: 12,
  Survie: 8,
};

export const initialTraitsMentalStates: TraitsMentalStates = ["Prudent", "Observateur"];

export const initialProgression: Progression = {
  level: 1,
  xp: 0,
  perks: [],
};

export const initialAlignment: Alignment = {
  chaosLawful: 0, // Neutre
  goodEvil: 0,    // Neutre
};

export const initialInventory: InventoryItem[] = [
  { id: 'smartphone_01', name: 'Smartphone', description: 'Un smartphone moderne, batterie presque pleine.', type: 'electronic', iconName: 'Smartphone', quantity: 1 },
  { id: 'wallet_01', name: 'Portefeuille', description: 'Contient une carte bancaire et quelques billets.', type: 'misc', iconName: 'Wallet', quantity: 1 },
  { id: 'keys_01', name: "Clés d'appartement", description: "Un trousseau de clés qui semble ouvrir une porte quelque part.", type: 'key', iconName: 'KeyRound', quantity: 1 },
];

export const initialPlayerLocation: LocationData = {
  latitude: 48.8566, // Paris latitude
  longitude: 2.3522, // Paris longitude
  placeName: 'Paris, France',
};

export const defaultAvatarUrl = 'https://placehold.co/150x150.png';

export function getInitialScenario(player: Player): Scenario {
 return {
    scenarioText: `
      <h1 class="font-headline">Bienvenue, ${player.name}</h1>
      <p>Vous êtes ${player.name}, ${player.background}. Vous vous trouvez à ${player.currentLocation.placeName}, une ville pleine d'opportunités et de mystères. Le soleil du matin commence à réchauffer les rues pavées.</p>
      <p>Tapez ci-dessous ce que vous souhaitez faire pour commencer votre journée.</p>
    `,
  };
}


export function saveGameState(state: GameState): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  }
}

export function loadGameState(): GameState | null {
  if (typeof window !== 'undefined') {
    const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState) as GameState;
        if (parsedState.player) {
          // Ensure older game states without new fields get defaults
          if (!parsedState.player.currentLocation) {
            parsedState.player.currentLocation = initialPlayerLocation;
          }
          if (!parsedState.player.gender) parsedState.player.gender = "Préfère ne pas préciser";
          if (typeof parsedState.player.age !== 'number') parsedState.player.age = 25;
          if (!parsedState.player.avatarUrl) parsedState.player.avatarUrl = defaultAvatarUrl;
          if (!parsedState.player.origin) parsedState.player.origin = "Inconnue";
          if (!parsedState.player.skills) parsedState.player.skills = { ...initialSkills };
          if (!parsedState.player.traitsMentalStates) parsedState.player.traitsMentalStates = [...initialTraitsMentalStates];
          if (!parsedState.player.progression) parsedState.player.progression = { ...initialProgression };
          if (!parsedState.player.alignment) parsedState.player.alignment = { ...initialAlignment };
          if (!parsedState.player.inventory) parsedState.player.inventory = [ ...initialInventory ];
        }
        return parsedState;
      } catch (error) {
        console.error("Erreur lors du chargement de l'état du jeu:", error);
        localStorage.removeItem(LOCAL_STORAGE_KEY); // Clear corrupted state
        return null;
      }
    }
  }
  return null;
}

export function clearGameState(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }
}

export function applyStatChanges(currentStats: PlayerStats, changes: Record<string, number>): PlayerStats {
  const newStats = { ...currentStats };
  for (const key in changes) {
    if (Object.prototype.hasOwnProperty.call(newStats, key)) {
      newStats[key] = Math.max(0, newStats[key] + changes[key]); // Ensure stats don't go below 0
    } else {
      newStats[key] = Math.max(0, changes[key]);
    }
  }
  return newStats;
}
