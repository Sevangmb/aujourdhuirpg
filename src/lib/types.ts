export type PlayerStats = {
  Sante: number;
  Charisme: number;
  Intelligence: number;
  Force: number;
  [key: string]: number; // Allows for dynamic stats if needed
};

export type Player = {
  name: string;
  background: string;
  stats: PlayerStats;
};

// This type represents the data for a scenario that the player is currently in.
// scenarioStatsUpdate is the effect of the *previous choice* leading to *this current* scenario.
export type Scenario = {
  scenarioText: string; // HTML content from AI, includes choices as interactive elements
};

export type GameState = {
  player: Player | null;
  currentScenario: Scenario | null;
  // History might be useful later, for now, not strictly necessary for core loop
  // history: Scenario[]; 
};
