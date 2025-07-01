
/**
 * @fileOverview Zod schema definitions for evidence (clues and documents) related data structures used in scenarios.
 */
import { z } from 'zod';

// Simplified for AI generation. Game logic will add ID, date, source etc.
export const ClueInputSchema = z.object({
  title: z.string().describe("Titre concis de l'indice."),
  description: z.string().describe("Description détaillée de l'indice. Ce que le joueur apprend ou observe."),
  type: z.enum(['photo', 'testimony', 'text_extract', 'object_observation', 'digital_trace', 'audio_recording', 'misc_clue']).describe("Type d'indice."),
});

// Simplified for AI generation. Game logic will add ID, date, source etc.
export const DocumentInputSchema = z.object({
  title: z.string().describe("Titre du document."),
  content: z.string().describe("Contenu textuel du document (peut être du HTML simple pour la mise en forme)."),
  type: z.enum(['article', 'letter', 'note', 'journal_entry', 'computer_log', 'report', 'misc_document']).describe("Type de document."),
});
