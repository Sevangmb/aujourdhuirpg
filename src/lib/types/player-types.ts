
import type { InventoryItem } from './item-types';
import type { Quest } from './quest-types';
import type { PNJ } from './pnj-types';
import type { MajorDecision } from './decision-types';
import type { Clue, GameDocument } from './evidence-types';
import type { ToneSettings } from './tone-types';

export type PlayerStats = {
  Sante: number;
  Charisme: number;
  Intelligence: number;
  Force: number;
  Energie: number; // Nouvelle stat: Endurance du joueur
  Stress: number; // Nouvelle stat: Niveau de tension psychologique
  Volonte: number; // Nouvelle stat: Résistance mentale
  Reputation: number; // Nouvelle stat: Opinion générale des PNJ
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
  money: number; // Player's current money (euros)
  currentLocation: LocationData;
  toneSettings: ToneSettings;
  // Nouveaux champs pour le journal de quêtes, etc.
  questLog: Quest[];
  encounteredPNJs: PNJ[];
  decisionLog: MajorDecision[];
  // Nouveaux champs pour Indices & Documents
  clues: Clue[];
  documents: GameDocument[];
  investigationNotes: string; // Un texte libre pour les hypothèses, suspects, lieux
};

