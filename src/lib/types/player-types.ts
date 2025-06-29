import type { InventoryItem } from './item-types';
import type { Quest } from './quest-types';
import type { PNJ } from './pnj-types';
import type { MajorDecision } from './decision-types';
import type { Clue, GameDocument } from './evidence-types';
import type { ToneSettings } from './tone-types';
import type { Position } from './game-types'; // Corrected path
import type { Transaction } from './finance-types';
import type { HistoricalContact } from './historical-contact-types';
import type { GameEra } from './era-types';

export type PlayerStats = {
  Sante: number;
  Charisme: number;
  Intelligence: number;
  Force: number;
  Energie: number; // Nouvelle stat: Endurance du joueur
  Stress: number; // Nouvelle stat: Niveau de tension psychologique
  Volonte: number; // Nouvelle stat: Résistance mentale
  Reputation: number; // Nouvelle stat: Opinion générale des PNJ
  Humeur: number;
  Curiosite: number;
  Inspiration: number;
  [key: string]: number; // Allows for dynamic stats if needed
};

// Removed LocationData interface

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
  isAnonymous?: boolean;
  name: string;
  gender: string;
  age: number;
  avatarUrl: string;
  origin: string; // Origine géographique, sociale, etc.
  era: GameEra; // New field for the character's starting era
  background: string; // Historique plus détaillé du personnage, style RP
  startingLocationName?: string; // Added for character creation context
  stats: PlayerStats;
  skills: Skills;
  traitsMentalStates: TraitsMentalStates;
  progression: Progression;
  alignment: Alignment;
  inventory: InventoryItem[];
  money: number; // Player's current money (euros)
  transactionLog: Transaction[];
  currentLocation: Position; // Changed from LocationData to Position
  toneSettings: ToneSettings;
  // Nouveaux champs pour le journal de quêtes, etc.
  questLog: Quest[];
  encounteredPNJs: PNJ[];
  decisionLog: MajorDecision[];
  // Nouveaux champs pour Indices & Documents
  clues: Clue[];
  documents: GameDocument[];
  investigationNotes: string; // Un texte libre pour les hypothèses, suspects, lieux
  historicalContacts: HistoricalContact[]; // Carnet d'adresses pour les contacts historiques
  lastPlayed?: string; // Added to track last played timestamp, hydrated from save file
};
