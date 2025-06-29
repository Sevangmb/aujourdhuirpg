/**
 * @fileOverview Zod schemas for the generateHistoricalContact flow.
 */
import { z } from 'genkit';
import { HistoricalPersonalitySchema, ModernIdentitySchema, ContactKnowledgeSchema, GenerateHistoricalContactInputSchema as TypeHistoricalContactInputSchema } from '@/lib/types/historical-contact-types';

export const GenerateHistoricalContactInputSchema = TypeHistoricalContactInputSchema;
export type GenerateHistoricalContactInput = z.infer<typeof GenerateHistoricalContactInputSchema>;

export const GenerateHistoricalContactOutputSchema = ContactKnowledgeSchema;
export type GenerateHistoricalContactOutput = z.infer<typeof GenerateHistoricalContactOutputSchema>;
