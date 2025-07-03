/**
 * @fileOverview Zod schemas for the generateHistoricalContact flow.
 */
import { z } from 'zod';
import { GenerateHistoricalContactInputSchema as TypeHistoricalContactInputSchema, ContactKnowledgeSchema } from '@/modules/historical/types';

export const GenerateHistoricalContactInputSchema = TypeHistoricalContactInputSchema;

export const GenerateHistoricalContactOutputSchema = ContactKnowledgeSchema;
