
import type { IntelligentItem } from './item-types';
import type { Quest } from './quest-types';
import type { PNJ } from './pnj-types';
import type { MajorDecision } from './decision-types';
import type { Clue, GameDocument } from './evidence-types';
import type { ToneSettings } from './tone-types';
import type { Position } from './game-types'; // Corrected path
import type { Transaction } from '../modules/economy/types';
import type { HistoricalContact } from '../modules/historical/types';
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


export interface SkillDetail {
  level: number;
  xp: number;
  xpToNext: number;
}

export interface SkillCategory {
    [key: string]: SkillDetail;
}

// --- NEW ADVANCED SKILL SYSTEM ---
export interface AdvancedSkillSystem {
  cognitive: SkillCategory & {
    analysis: SkillDetail;
    memory: SkillDetail;
    creativity: SkillDetail;
    logic: SkillDetail;
    observation: SkillDetail;
  };
  social: SkillCategory & {
    persuasion: SkillDetail;
    empathy: SkillDetail;
    leadership: SkillDetail;
    networking: SkillDetail;
    cultural_adaptation: SkillDetail;
  };
  physical: SkillCategory & {
    endurance: SkillDetail;
    agility: SkillDetail;
    stealth: SkillDetail;
    strength: SkillDetail;
    dexterity: SkillDetail;
  };
  technical: SkillCategory & {
    technology: SkillDetail;
    investigation: SkillDetail;
    languages: SkillDetail;
    finance: SkillDetail;
    crafting: SkillDetail;
  };
  survival: SkillCategory & {
    streetwise: SkillDetail;
    wilderness: SkillDetail;
    medical: SkillDetail;
    navigation: SkillDetail;
    adaptation: SkillDetail;
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

export interface MomentumSystem {
  consecutive_successes: number;
  consecutive_failures: number;
  momentum_bonus: number;
  desperation_bonus: number;
}

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
  momentum: MomentumSystem; // NEW: Momentum System
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
