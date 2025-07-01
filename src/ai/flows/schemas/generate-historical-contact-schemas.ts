/**
 * @fileOverview Zod schemas for the generateHistoricalContact flow.
 */
import { z } from 'zod';
import { HistoricalContactSchema, ContactKnowledgeSchema, GenerateHistoricalContactInputSchema as TypeHistoricalContactInputSchema } from '@/modules/historical/types';

export const GenerateHistoricalContactInputSchema = TypeHistoricalContactInputSchema;
export type GenerateHistoricalContactInput = z.infer<typeof GenerateHistoricalContactInputSchema>;

export const GenerateHistoricalContactOutputSchema = ContactKnowledgeSchema;
export type GenerateHistoricalContactOutput = z.infer<typeof GenerateHistoricalContactOutputSchema>;
