
import { z } from 'zod';
import { AVAILABLE_TONES } from './tone-types';
import type { IntelligentItem } from './item-types';
import type { Quest } from '../modules/quests/types';
import type { PNJ } from './pnj-types';
import type { MajorDecision } from './decision-types';
import type { Clue, GameDocument } from './evidence-types';
import type { ToneSettings } from './tone-types';
import type { Position } from './game-types'; 
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

// --- Zod Schemas for AI ---

export const LocationSchema = z.object({
  latitude: z.number().describe('La latitude du lieu.'),
  longitude: z.number().describe('La longitude du lieu.'),
  name: z.string().describe('Le nom lisible du lieu (ex: "Paris, France").'),
  type: z.string().optional().describe('Le type de lieu (ex: "restaurant", "shop", "museum").'),
  description: z.string().optional().describe('Une brève description du lieu.'),
  tags: z.record(z.string()).optional().describe('Tags bruts décrivant le lieu (ex: { "cuisine": "italian" }).'),
});

export const EnemySchema = z.object({
  name: z.string().describe("Nom de l'ennemi."),
  description: z.string().describe("Description de l'ennemi."),
  health: z.number().describe("Santé actuelle de l'ennemi."),
  maxHealth: z.number().describe("Santé maximale de l'ennemi."),
  attack: z.number().describe("Valeur d'attaque de l'ennemi."),
  defense: z.number().describe("Valeur de défense de l'ennemi."),
});

// This simplified schema is for the AI, which only needs the level number.
export const SkillsSchema = z.object({
  cognitive: z.object({
    analysis: z.number(), memory: z.number(), creativity: z.number(),
    logic: z.number(), observation: z.number(),
  }),
  social: z.object({
    persuasion: z.number(), empathy: z.number(), leadership: z.number(),
    networking: z.number(), cultural_adaptation: z.number(),
  }),
  physical: z.object({
    endurance: z.number(), agility: z.number(), stealth: z.number(),
    strength: z.number(), dexterity: z.number(),
  }),
  technical: z.object({
    technology: z.number(), investigation: z.number(), languages: z.number(),
    finance: z.number(), crafting: z.number(),
  }),
  survival: z.object({
    streetwise: z.number(), wilderness: z.number(), medical: z.number(),
    navigation: z.number(), adaptation: z.number(),
  }),
});

export const TraitsMentalStatesSchema = z.array(z.string());

export const ProgressionInputSchema = z.object({
  level: z.number().describe("Le niveau actuel du joueur."),
  xp: z.number().describe("Les points d'expérience actuels du joueur."),
  xpToNextLevel: z.number().describe("L'XP requis pour atteindre le prochain niveau."),
  perks: z.array(z.string()).describe("Les avantages ou capacités passives débloqués par le joueur."),
});

export const AlignmentSchema = z.object({
  chaosLawful: z.number().describe("L'alignement du joueur sur l'axe Chaos/Loi (-100 à 100)."),
  goodEvil: z.number().describe("L'alignement du joueur sur l'axe Bien/Mal (-100 à 100)."),
});

export const IntelligentItemInputSchema = z.object({
  instanceId: z.string().describe("L'identifiant unique de cette instance d'objet."),
  id: z.string().describe("L'identifiant de base de l'objet (le modèle)."),
  name: z.string().describe("Le nom de l'objet."),
  description: z.string().describe("La description de l'objet."),
  type: z.enum(['wearable', 'consumable', 'key', 'electronic', 'tool', 'misc', 'quest']).describe("La catégorie de l'objet."),
  quantity: z.number().describe("La quantité de cet objet."),
  condition: z.object({ durability: z.number() }).describe("L'état actuel de l'objet (100 = parfait)."),
  memory: z.object({
    acquisitionStory: z.string().describe("Comment et où cet objet a été obtenu."),
  }).describe("La 'mémoire' de l'objet, son histoire."),
  economics: z.object({
      base_value: z.number(),
      rarity_multiplier: z.number()
  }).describe("Les propriétés économiques de base de l'objet."),
});


export const ToneSettingsSchema = z.object(
  AVAILABLE_TONES.reduce((acc, tone) => {
    acc[tone] = z.number().min(0).max(100);
    return acc;
  }, {} as Record<typeof AVAILABLE_TONES[number], z.ZodNumber>)
).partial();


// A comprehensive player schema for AI input
export const PlayerInputSchema = z.object({
  name: z.string(),
  gender: z.string(),
  age: z.number(),
  origin: z.string(),
  era: z.string(),
  background: z.string(),
  stats: z.record(z.string(), z.number()),
  skills: SkillsSchema,
  physiology: z.object({
    basic_needs: z.object({
      hunger: z.object({ level: z.number() }),
      thirst: z.object({ level: z.number() }),
    }),
  }),
  traitsMentalStates: TraitsMentalStatesSchema,
  progression: ProgressionInputSchema,
  alignment: AlignmentSchema,
  inventory: z.array(IntelligentItemInputSchema),
  money: z.number(),
  currentLocation: LocationSchema,
  toneSettings: ToneSettingsSchema,
  keyInventoryItems: z.array(z.string()).optional().describe("Liste des objets clés actuellement dans l'inventaire du joueur."),
  recentActionTypes: z.array(z.string()).optional().describe("Les types des 3 dernières actions du joueur, pour éviter la répétition."),
  physiologicalState: z.object({
    needsFood: z.boolean(),
    needsRest: z.boolean(),
    isThirsty: z.boolean(),
  }).optional().describe("État physiologique résumé du joueur pour guider les actions (faim, fatigue, soif)."),
});
