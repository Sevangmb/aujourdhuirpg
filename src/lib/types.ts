
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
  xpToNextLevel: number; // Added to track target for next level
  perks: string[];
};

export type Alignment = {
  chaosLawful: number; // e.g., -100 (Chaos) to 100 (Lawful)
  goodEvil: number; // e.g., -100 (Evil) to 100 (Good)
};

export type InventoryItemType = 'wearable' | 'consumable' | 'key' | 'electronic' | 'misc' | 'quest';

export interface InventoryItem {
  id: string; // Unique ID for the item
  name: string;
  description: string;
  type: InventoryItemType;
  iconName: string; // Preferably a keyof typeof LucideIcons, or a generic one
  quantity: number;
  stackable?: boolean; // Added to determine if items stack
  // properties?: Record<string, any>; // e.g., for weapon: { damage: 10 }, for food: { healthRestore: 20 }
}

// Master definition for an item, used in the item database
export interface MasterInventoryItem extends Omit<InventoryItem, 'quantity'> {
  // Quantity is not part of master def, it's instance-specific
}


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
  inventory: InventoryItem[];
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

