/**
 * @fileOverview Zod schema definitions for common player-related data structures used as input for scenarios.
 */
import { z } from 'genkit';
import { AVAILABLE_TONES } from '@/lib/types';

export const LocationSchema = z.object({
  latitude: z.number().describe('The latitude of the location.'),
  longitude: z.number().describe('The longitude of the location.'),
  name: z.string().describe('The human-readable name of the location (e.g., "Paris, France").'),
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
}).describe("Player's granular skills, categorized.");

export const TraitsMentalStatesSchema = z.array(z.string()).describe("Player's current mental states or traits (e.g., [\"Stressé\", \"Observateur\"]).");

export const ProgressionInputSchema = z.object({
  level: z.number().describe("Player's current level."),
  xp: z.number().describe("Player's current experience points."),
  xpToNextLevel: z.number().describe("XP needed for the player to reach the next level."),
  perks: z.array(z.string()).describe("Player's unlocked perks or passive abilities."),
});

export const AlignmentSchema = z.object({
  chaosLawful: z.number().describe("Player's alignment on the Chaos/Lawful axis (-100 to 100)."),
  goodEvil: z.number().describe("Player's alignment on the Good/Evil axis (-100 to 100)."),
});

export const InventoryItemInputSchema = z.object({
    name: z.string().describe("The name of the item."),
    quantity: z.number().describe("The quantity of the item."),
});

export const ToneSettingsSchema = z.object(
  AVAILABLE_TONES.reduce((acc, tone) => {
    acc[tone] = z.number().min(0).max(100);
    return acc;
  }, {} as Record<typeof AVAILABLE_TONES[number], z.ZodNumber>)
).partial().describe('Player-defined tone preferences (e.g., {"Horreur": 75, "Humour": 30}). Values 0-100. Neutral is 50.');
