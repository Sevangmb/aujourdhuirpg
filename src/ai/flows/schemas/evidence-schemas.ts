
/**
 * @fileOverview Zod schema definitions for evidence (clues and documents) related data structures used in scenarios.
 */
import { z } from 'genkit';

export const ClueInputSchema = z.object({
  id: z.string().describe("Identifiant unique pour l'indice (ex: 'indice_photo_scene_01', 'temoignage_voisin_02'). Doit être unique et mémorable."),
  title: z.string().describe("Titre concis de l'indice."),
  description: z.string().describe("Description détaillée de l'indice. Ce que le joueur apprend ou observe."),
  type: z.enum(['photo', 'testimony', 'text_extract', 'object_observation', 'digital_trace', 'audio_recording', 'misc_clue']).describe("Type d'indice."),
  source: z.string().optional().describe("Source de l'indice (ex: 'Trouvé sur le bureau de la victime', 'Entretien avec Mr. X')."),
  imageUrl: z.string().url().optional().describe("URL de l'image si le type est 'photo'. Utiliser https://placehold.co pour les placeholders."),
  keywords: z.array(z.string()).optional().describe("Mots-clés pertinents pour cet indice (1-3 mots).")
}).describe("Structure pour un nouvel indice découvert par le joueur.");

export const DocumentInputSchema = z.object({
  id: z.string().describe("Identifiant unique pour le document (ex: 'doc_lettre_victime_01', 'article_journal_affaire_x'). Doit être unique et mémorable."),
  title: z.string().describe("Titre du document."),
  content: z.string().describe("Contenu textuel du document (peut être du HTML simple pour la mise en forme)."),
  type: z.enum(['article', 'letter', 'note', 'journal_entry', 'computer_log', 'report', 'misc_document']).describe("Type de document."),
  source: z.string().optional().describe("Source du document (ex: 'Récupéré dans les emails de Y', 'Archive de la bibliothèque')."),
  keywords: z.array(z.string()).optional().describe("Mots-clés pertinents pour ce document (1-3 mots).")
}).describe("Structure pour un nouveau document obtenu par le joueur.");
