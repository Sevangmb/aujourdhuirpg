import type { GameState, Player } from '@/lib/types';
import { hydratePlayer } from '@/lib/game-state-persistence';
import { getInitialScenario } from '@/data/initial-game-data';

export const LOCAL_STORAGE_KEY = 'aujourdhuiRPGGameState';

export function loadGameStateFromLocal(): GameState | null {
  if (typeof window !== 'undefined' && localStorage) {
    const savedStateString = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedStateString) {
      try {
        const parsedState = JSON.parse(savedStateString) as Partial<GameState>;
        if (!parsedState.player) return null;
        const hydratedPlayer = hydratePlayer(parsedState.player);
        return {
          player: hydratedPlayer,
          currentScenario: parsedState.currentScenario || getInitialScenario(hydratedPlayer),
          nearbyPois: parsedState.nearbyPois || null,
          gameTimeInMinutes: parsedState.gameTimeInMinutes || 0,
          journal: parsedState.journal || [],
          toneSettings: parsedState.toneSettings || hydratedPlayer.toneSettings,
        };
      } catch (error) {
        console.error('LocalStorage Error: Error parsing game state:', error);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    }
  }
  return null;
}

export function saveGameStateToLocal(state: GameState): boolean {
    if (!state || !state.player) {
        console.warn("Save Game Warning: Attempted to save invalid or incomplete game state to local storage.", state);
        return false;
    }
    if (typeof window !== 'undefined' && localStorage) {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
            return true;
        } catch (error) {
            console.error("LocalStorage Error: Failed to save game state:", error);
            return false;
        }
    }
    return false;
}


export function clearGameState(): void {
  if (typeof window !== 'undefined' && localStorage) {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    console.log('LocalStorage Info: Game state cleared locally.');
  }
}
