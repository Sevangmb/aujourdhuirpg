/**
 * @fileOverview Zod schemas for the generateHistoricalContact flow.
 */
import { z } from 'genkit';
import { HistoricalPersonalitySchema, ModernIdentitySchema, ContactKnowledgeSchema } from '@/lib/types/historical-contact-types';

export const GenerateHistoricalContactInputSchema = z.object({
    historical: HistoricalPersonalitySchema.describe("Les détails sur la personnalité historique réelle."),
    modern: ModernIdentitySchema.describe("L'identité moderne générée pour cette personnalité."),
    location: z.string().describe("Le nom du lieu de la rencontre (ex: Montmartre).")
});
export type GenerateHistoricalContactInput = z.infer<typeof GenerateHistoricalContactInputSchema>;

export const GenerateHistoricalContactOutputSchema = ContactKnowledgeSchema;
export type GenerateHistoricalContactOutput = z.infer<typeof GenerateHistoricalContactOutputSchema>;
