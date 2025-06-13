
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

export type Skills = Record<string, number>; // e.g., {"Informatique": 10, "Discretion": 5}
export type TraitsMentalStates = string[]; // e.g., ["Stressé", "Fatigué"]
export type Progression = {
  level: number;
  xp: number;
  perks: string[];
};
export type Alignment = {
  chaosLawful: number; // e.g., -100 (Chaos) to 100 (Lawful)
  goodEvil: number; // e.g., -100 (Evil) to 100 (Good)
};

export type Player = {
  name: string;
  gender: string;
  age: number;
  avatarUrl: string;
  origin: string; // Origine géographique, sociale, etc.
  background: string; // Historique plus détaillé du personnage, style RP
  stats: PlayerStats;
  skills: Skills;
  traitsMentalStates: TraitsMentalStates;
  progression: Progression;
  alignment: Alignment;
  currentLocation: LocationData;
};

// This type represents the data for a scenario that the player is currently in.
export type Scenario = {
  scenarioText: string; // HTML content from AI
};

export type GameState = {
  player: Player | null;
  currentScenario: Scenario | null;
};
