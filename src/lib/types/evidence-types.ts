import { z } from 'zod';

export type ClueType = 'photo' | 'testimony' | 'text_extract' | 'object_observation' | 'digital_trace' | 'audio_recording' | 'misc_clue';

export interface Clue {
  id: string; // Unique ID for the clue, e.g., "clue_photo_crime_scene_01"
  title: string;
  description: string; // Detailed description of the clue
  type: ClueType;
  dateFound: string; // ISO string date
  source?: string; // How/where the clue was found (e.g., "PNJ Interview: Témoin X", "Fouille: Bureau de la victime")
  imageUrl?: string; // Optional URL if it's a photo clue
  keywords?: string[]; // Keywords for searching/tagging, suggested by AI or player
}

export type DocumentType = 'article' | 'letter' | 'note' | 'journal_entry' | 'computer_log' | 'report' | 'misc_document';

export interface GameDocument {
  id: string; // Unique ID for the document, e.g., "doc_letter_victim_01"
  title: string;
  content: string; // Can be plain text or HTML for formatting
  type: DocumentType;
  dateAcquired: string; // ISO string date
  source?: string; // How/where the document was acquired
  keywords?: string[]; // Keywords for searching/tagging
}

// --- Zod Schemas for AI ---
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
