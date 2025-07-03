
import { z } from 'zod';
import type { IntelligentItem } from './item-types';
import type { Quest } from '@/modules/quests/types';
import { PNJInteractionSchema as PNJInputSchema } from './pnj-types';
import type { MajorDecision } from './decision-types';
import type { Clue, GameDocument } from './evidence-types';
import type { ToneSettings } from './tone-types';
import type { Position } from './game-types'; 
import type { Transaction } from '@/modules/economy/types';
import type { HistoricalContact } from '@/modules/historical/types';
import type { GameEra } from './era-types';
import type { AdvancedPhysiologySystem } from './physiology-types';

export interface Stat {
  value: number;
  max?: number; // Optional max value, e.g., for health or energy
}

// NEW STAT SYSTEM
export type PlayerStats = {
  // --- CORE STATS ---
  Force: Stat;
  Dexterite: Stat;
  Constitution: Stat;
  Intelligence: Stat;
  Perception: Stat;
  Charisme: Stat;
  Volonte: Stat;
  Savoir: Stat;
  Technique: Stat;
  MagieOccultisme: Stat;
  Discretion: Stat;
  ChanceDestin: Stat;
  // --- DERIVED STATS ---
  Sante: Stat;
  Energie: Stat;
  Stress: Stat;
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
  physiques: SkillCategory & {
    combat_mains_nues: SkillDetail;
    arme_blanche: SkillDetail;
    arme_de_tir: SkillDetail;
    arme_a_feu: SkillDetail;
    pilotage_monture: SkillDetail;
    pilotage_vehicules: SkillDetail;
    pilotage_spatial: SkillDetail;
    esquive: SkillDetail;
    natation: SkillDetail;
    escalade: SkillDetail;
    discretion_skill: SkillDetail; // Added for stealth checks
  };
  techniques: SkillCategory & {
    artisanat_general: SkillDetail;
    forge_metallurgie: SkillDetail;
    maconnerie_construction: SkillDetail;
    menuiserie: SkillDetail;
    couture_tissage: SkillDetail;
    joaillerie: SkillDetail;
    navigation: SkillDetail;
    mecanique: SkillDetail;
    electronique: SkillDetail;
    informatique_hacking: SkillDetail;
    ingenierie_spatiale: SkillDetail;
    contrefacon: SkillDetail;
  };
  survie: SkillCategory & {
    pistage: SkillDetail;
    orientation: SkillDetail;
    chasse_peche: SkillDetail;
    herboristerie: SkillDetail;
    premiers_secours: SkillDetail;
    medecine: SkillDetail;
    survie_generale: SkillDetail;
  };
  sociales: SkillCategory & {
    persuasion: SkillDetail;
    seduction: SkillDetail;
    intimidation: SkillDetail;
    tromperie_baratin: SkillDetail;
    commandement: SkillDetail;
    etiquette: SkillDetail;
  };
  savoir: SkillCategory & {
    histoire: SkillDetail;
    geographie: SkillDetail;
    theologie_religions: SkillDetail;
    sciences_naturelles: SkillDetail;
    alchimie_chimie: SkillDetail;
    occultisme_magie_theorique: SkillDetail;
    astrologie_astronomie: SkillDetail;
  };
}

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
  skills: AdvancedSkillSystem;
  physiology: AdvancedPhysiologySystem;
  momentum: MomentumSystem;
  traitsMentalStates: TraitsMentalStates;
  progression: Progression;
  alignment: Alignment;
  inventory: IntelligentItem[];
  money: number; // Player's current money (euros)
  transactionLog: Transaction[];
  currentLocation: Position;
  toneSettings: ToneSettings;
  questLog: Quest[];
  encounteredPNJs: PNJ[];
  decisionLog: MajorDecision[];
  clues: Clue[];
  documents: GameDocument[];
  investigationNotes: string;
  historicalContacts: HistoricalContact[];
  lastPlayed?: string;
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

// This simplified schema is for the AI, which only needs the level number.
export const SkillsSchema = z.record(z.record(z.number())).describe("Un objet contenant les catégories de compétences, chacune avec un record des compétences et de leur niveau. e.g., { 'physiques': { 'combat_mains_nues': 10 } }");


export const PlayerStatsSchema = z.object({
    Force: z.number(), Dexterite: z.number(), Constitution: z.number(),
    Intelligence: z.number(), Perception: z.number(), Charisme: z.number(),
    Volonte: z.number(), Savoir: z.number(), Technique: z.number(),
    MagieOccultisme: z.number(), Discretion: z.number(), ChanceDestin: z.number(),
    Sante: z.number(), Energie: z.number(), Stress: z.number()
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
  type: z.enum(['wearable', 'consumable', 'key', 'electronic', 'tool', 'misc', 'quest', 'weapon', 'armor']).describe("La catégorie de l'objet."),
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


// A comprehensive player schema for AI input
export const PlayerInputSchema = z.object({
  name: z.string(),
  gender: z.string(),
  age: z.number(),
  origin: z.string(),
  era: z.string(),
  background: z.string(),
  stats: PlayerStatsSchema,
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
  encounteredPNJs: z.array(PNJInputSchema).optional().describe("Liste des PNJ déjà rencontrés et leur disposition actuelle envers vous."),
  keyInventoryItems: z.array(z.string()).optional().describe("Liste des objets clés actuellement dans l'inventaire du joueur."),
  recentActionTypes: z.array(z.string()).optional().describe("Les types des 3 dernières actions du joueur, pour éviter la répétition."),
  physiologicalState: z.object({
    needsFood: z.boolean(),
    needsRest: z.boolean(),
    isThirsty: z.boolean(),
  }).optional().describe("État physiologique résumé du joueur pour guider les actions (faim, fatigue, soif)."),
});
