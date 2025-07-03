
/**
 * @fileOverview Zod schemas and TypeScript types for the Historical Contacts feature.
 */
import type { GameState } from '@/lib/types/game-types';
import { z } from 'zod';
import { AVAILABLE_ERAS } from '@/lib/types/era-types';

// Data structure for the raw historical information fetched from Wikipedia
export const HistoricalPersonalitySchema = z.object({
  name: z.string().describe("Le nom complet de la personnalité historique."),
  birth: z.object({
    year: z.number().optional(),
    place: z.string().optional(),
  }).optional(),
  death: z.object({
    year: z.number().optional(),
    place: z.string().optional(),
  }).optional(),
  occupation: z.array(z.string()).optional().describe("Liste des professions ou rôles principaux."),
  extract: z.string().describe("Résumé biographique provenant de Wikipedia."),
  wikipediaUrl: z.string().url().describe("URL de la page Wikipedia."),
  thumbnail: z.string().url().optional().describe("URL de l'image de la personnalité."),
});
export type HistoricalPersonality = z.infer<typeof HistoricalPersonalitySchema>;

// Data structure for the modern adaptation of the historical figure
export const ModernIdentitySchema = z.object({
  name: z.string().describe("Nom du contact moderne généré."),
  age: z.number().describe("Âge approximatif du contact moderne."),
  profession: z.string().describe("Profession moderne, souvent liée à l'héritage historique."),
  connectionType: z.enum(["descendant", "expert", "guardian", "contemporary", "other", "self"]).describe("Type de lien avec la figure historique."),
  greeting: z.string().describe("Phrase d'accroche pour la rencontre."),
  personality: z.array(z.string()).describe("Quelques traits de personnalité (ex: 'cultivée', 'discrète')."),
});
export type ModernIdentity = z.infer<typeof ModernIdentitySchema>;

// Data structure for the AI-enriched knowledge part of the contact
export const ContactKnowledgeSchema = z.object({
    secrets: z.array(z.string()).describe("Secrets ou informations cachées que le contact peut révéler."),
    historicalFacts: z.array(z.string()).describe("Faits historiques authentiques que le contact connaît."),
    availableQuests: z.array(z.string()).describe("Pistes de quêtes que le contact peut proposer."),
});
export type ContactKnowledge = z.infer<typeof ContactKnowledgeSchema>;


// The complete data structure for a historical contact encountered by the player
export const HistoricalContactSchema = z.object({
  id: z.string().uuid().describe("ID unique pour cette instance de contact rencontré."),
  historical: HistoricalPersonalitySchema,
  modern: ModernIdentitySchema,
  metAt: z.object({
    placeName: z.string(),
    coordinates: z.object({ lat: z.number(), lng: z.number() }),
    date: z.string().datetime(),
  }),
  relationship: z.object({
    trustLevel: z.number().min(0).max(100),
    interactionCount: z.number().int().min(0),
    lastInteraction: z.string().datetime(),
  }),
  knowledge: ContactKnowledgeSchema,
});
export type HistoricalContact = z.infer<typeof HistoricalContactSchema>;

export const GenerateHistoricalContactInputSchema = z.object({
    historical: HistoricalPersonalitySchema.describe("Les détails sur la personnalité historique réelle."),
    modern: ModernIdentitySchema.describe("L'identité moderne générée pour cette personnalité."),
    location: z.string().describe("Le nom du lieu de la rencontre (ex: Montmartre)."),
    playerEra: z.enum(AVAILABLE_ERAS).describe("L'époque dans laquelle le joueur se trouve."),
});
export type GenerateHistoricalContactInput = z.infer<typeof GenerateHistoricalContactInputSchema>;

// Type for the combined object passed to components and context
export type AdaptedContact = { 
    historical: HistoricalPersonality; 
    modern: ModernIdentity; 
    knowledge: ContactKnowledge; 
};

// Re-export GameState for logic functions
export type { GameState } from '@/lib/types/game-types';
