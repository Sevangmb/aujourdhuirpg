
import type { IntelligentItem } from './item-types';
import type { Quest } from './quest-types';
import type { PNJ } from './pnj-types';
import type { MajorDecision } from './decision-types';
import type { Clue, GameDocument } from './evidence-types';
import type { ToneSettings } from './tone-types';
import type { Position } from './game-types'; // Corrected path
import type { Transaction } from './finance-types';
import type { HistoricalContact } from './historical-contact-types';
import type { GameEra } from './era-types';
import type { AdvancedPhysiologySystem } from './physiology-types';

export interface Stat {
  value: number;
  max?: number; // Optional max value, e.g., for health or energy
}

export type PlayerStats = {
  Sante: Stat;
  Energie: Stat;
  Stress: Stat;
  Volonte: Stat;
  Charisme: Stat;
  Intelligence: Stat;
  Force: Stat;
  Reputation: Stat;
  Humeur: Stat;
  Curiosite: Stat;
  Inspiration: Stat;
};


// --- NEW ADVANCED SKILL SYSTEM ---
export interface AdvancedSkillSystem {
  cognitive: {
    analysis: number;
    memory: number;
    creativity: number;
    logic: number;
    observation: number;
  };
  social: {
    persuasion: number;
    empathy: number;
    leadership: number;
    networking: number;
    cultural_adaptation: number;
  };
  physical: {
    endurance: number;
    agility: number;
    stealth: number;
    strength: number;
    dexterity: number;
  };
  technical: {
    technology: number;
    investigation: number;
    languages: number;
    finance: number;
    crafting: number;
  };
  survival: {
    streetwise: number;
    wilderness: number;
    medical: number;
    navigation: number;
    adaptation: number;
  };
}

// DEPRECATED, but kept for type compatibility during transition
export type Skills = Record<string, number>;
// --- END ADVANCED SKILL SYSTEM ---

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
  skills: AdvancedSkillSystem; // UPDATED from Skills to AdvancedSkillSystem
  physiology: AdvancedPhysiologySystem; // NEW: Advanced physiology system
  traitsMentalStates: TraitsMentalStates;
  progression: Progression;
  alignment: Alignment;
  inventory: IntelligentItem[];
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
