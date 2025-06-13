import type { PlayerStats, GameState, Scenario, Player } from './types';

export const LOCAL_STORAGE_KEY = 'aujourdhuiRPGGameState';

export const initialPlayerStats: PlayerStats = {
  Sante: 100,
  Charisme: 50,
  Intelligence: 50,
  Force: 50,
};

export function getInitialScenario(player: Player): Scenario {
 return {
    scenarioText: `
      <h1 class="font-headline">Bienvenue, ${player.name}</h1>
      <p>Vous êtes ${player.name}, ${player.background}. Vous vous trouvez au cœur de Paris, une ville pleine d'opportunités et de mystères. Le soleil du matin commence à réchauffer les rues pavées.</p>
      <p>Que souhaitez-vous faire pour commencer votre journée ?</p>
      <div>
        <button data-choice-text="Explorer les environs immédiats">Explorer les environs immédiats</button>
        <button data-choice-text="Trouver un café et observer les passants">Trouver un café et observer les passants</button>
        <button data-choice-text="Consulter les actualités sur votre téléphone">Consulter les actualités sur votre téléphone</button>
      </div>
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
        return JSON.parse(savedState) as GameState;
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
      // If a new stat is introduced by AI, add it, ensuring it's not negative
      newStats[key] = Math.max(0, changes[key]);
    }
  }
  return newStats;
}
