export type PlayerStats = {
  Sante: number;
  Charisme: number;
  Intelligence: number;
  Force: number;
  [key: string]: number; // Allows for dynamic stats if needed
};

export interface LocationData {
  latitude: number;
  longitude: number;
  placeName: string;
}

export type Player = {
  name: string;
  background: string;
  stats: PlayerStats;
  currentLocation: LocationData;
};

// This type represents the data for a scenario that the player is currently in.
export type Scenario = {
  scenarioText: string; // HTML content from AI
};

export type GameState = {
  player: Player | null;
  currentScenario: Scenario | null;
  // History might be useful later, for now, not strictly necessary for core loop
  // history: Scenario[];
};
