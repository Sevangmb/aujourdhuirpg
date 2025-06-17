
/**
 * @fileOverview Zod schema definitions for common player-related data structures used as input for scenarios.
 */
import { z } from 'genkit';
import { AVAILABLE_TONES } from '@/lib/types';

export const LocationSchema = z.object({
  latitude: z.number().describe('The latitude of the location.'),
  longitude: z.number().describe('The longitude of the location.'),
  placeName: z.string().describe('The human-readable name of the location (e.g., "Paris, France").'),
});

export const SkillsSchema = z.record(z.number()).describe("Player's skills (e.g., {\"Informatique\": 10, \"Discretion\": 5}).");
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
