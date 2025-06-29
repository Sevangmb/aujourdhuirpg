/**
 * @fileOverview Zod schema definitions for common player-related data structures used as input for scenarios.
 */
import { z } from 'genkit';
import { AVAILABLE_TONES } from '@/lib/types';

export const LocationSchema = z.object({
  latitude: z.number().describe('La latitude du lieu.'),
  longitude: z.number().describe('La longitude du lieu.'),
  name: z.string().describe('Le nom lisible du lieu (ex: "Paris, France").'),
});

// UPDATED to AdvancedSkillSystem structure
export const SkillsSchema = z.object({
  cognitive: z.object({
    analysis: z.number(),
    memory: z.number(),
    creativity: z.number(),
    logic: z.number(),
    observation: z.number(),
  }),
  social: z.object({
    persuasion: z.number(),
    empathy: z.number(),
    leadership: z.number(),
    networking: z.number(),
    cultural_adaptation: z.number(),
  }),
  physical: z.object({
    endurance: z.number(),
    agility: z.number(),
    stealth: z.number(),
    strength: z.number(),
    dexterity: z.number(),
  }),
  technical: z.object({
    technology: z.number(),
    investigation: z.number(),
    languages: z.number(),
    finance: z.number(),
    crafting: z.number(),
  }),
  survival: z.object({
    streetwise: z.number(),
    wilderness: z.number(),
    medical: z.number(),
    navigation: z.number(),
    adaptation: z.number(),
  }),
}).describe("Compétences granulaires du joueur, par catégorie.");

export const TraitsMentalStatesSchema = z.array(z.string()).describe("États mentaux ou traits actuels du joueur (ex: [\"Stressé\", \"Observateur\"]).");

export const ProgressionInputSchema = z.object({
  level: z.number().describe("Niveau actuel du joueur."),
  xp: z.number().describe("Points d'expérience actuels du joueur."),
  xpToNextLevel: z.number().describe("XP requis pour atteindre le prochain niveau."),
  perks: z.array(z.string()).describe("Avantages ou capacités passives débloqués par le joueur."),
});

export const AlignmentSchema = z.object({
  chaosLawful: z.number().describe("Alignement du joueur sur l'axe Chaos/Loi (-100 à 100)."),
  goodEvil: z.number().describe("Alignement du joueur sur l'axe Bien/Mal (-100 à 100)."),
});

export const InventoryItemInputSchema = z.object({
    name: z.string().describe("Le nom de l'objet."),
    quantity: z.number().describe("La quantité de l'objet."),
});

export const ToneSettingsSchema = z.object(
  AVAILABLE_TONES.reduce((acc, tone) => {
    acc[tone] = z.number().min(0).max(100);
    return acc;
  }, {} as Record<typeof AVAILABLE_TONES[number], z.ZodNumber>)
).partial().describe('Préférences de tonalité définies par le joueur (ex: {"Horreur": 75, "Humour": 30}). Valeurs de 0 à 100. Neutre est à 50.');
