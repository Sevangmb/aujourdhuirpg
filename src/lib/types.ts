
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

// --- Types pour le Journal de Quêtes, PNJ, Décisions ---
export type QuestStatus = 'active' | 'completed' | 'failed' | 'inactive';
export type QuestType = 'main' | 'secondary';

export interface QuestObjective {
  id: string; // e.g., "find_document"
  description: string;
  isCompleted: boolean;
}

export interface Quest {
  id: string; // Unique ID for the quest, e.g., "main_story_01_paris_intro"
  title: string;
  description: string; // Overall description of the quest
  type: QuestType;
  status: QuestStatus;
  objectives: QuestObjective[];
  giver?: string; // Name of the PNJ who gave the quest, if any
  reward?: string; // Text description of the reward
  relatedLocation?: string; // Name of a relevant location
  dateAdded: string; // ISO string date
  dateCompleted?: string; // ISO string date
}

export type PNJRelationStatus = 'friendly' | 'neutral' | 'hostile' | 'allied' | 'rival' | 'unknown';
export type PNJImportance = 'major' | 'minor' | 'recurring';

export interface PNJ {
  id: string; // Unique ID for the PNJ, e.g., "pnj_marie_cafe_owner"
  name: string;
  description: string; // Physical description, role, etc.
  relationStatus: PNJRelationStatus;
  trustLevel?: number; // Optional: 0-100
  importance: PNJImportance;
  firstEncountered: string; // Scenario/location of first encounter
  notes?: string[]; // Player or AI notes about this PNJ
  lastSeen?: string; // ISO string date
}

export interface MajorDecision {
  id: string; // Unique ID for the decision, e.g., "decision_betray_contact_01"
  summary: string; // "J'ai choisi d'aider X plutôt que Y."
  outcome: string; // "Cela a conduit à Z."
  scenarioContext: string; // Brief context of the scenario when decision was made
  dateMade: string; // ISO string date
}
// --- Fin des types pour Journal de Quêtes, PNJ, Décisions ---


export type Player = {
  uid?: string; // Firebase Auth UID, optional for anonymous or pre-auth states
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
  // Nouveaux champs pour le journal de quêtes, etc.
  questLog: Quest[];
  encounteredPNJs: PNJ[];
  decisionLog: MajorDecision[];
};

// This type represents the data for a scenario that the player is currently in.
export type Scenario = {
  scenarioText: string; // HTML content from AI
};

export type GameState = {
  player: Player | null;
  currentScenario: Scenario | null;
};

// Notification types for UI feedback after AI processing
export type GameNotificationType =
  | 'xp_gained'
  | 'item_added'
  | 'item_removed'
  | 'leveled_up'
  | 'location_changed'
  | 'stat_changed'
  | 'quest_added' // New
  | 'quest_updated' // New
  | 'pnj_encountered' // New
  | 'decision_logged'; // New

export interface GameNotification {
  type: GameNotificationType;
  title: string;
  description?: string;
  details?: Record<string, any>; // e.g., { itemName: 'Potion', quantity: 1 } or { amount: 50 }
}
