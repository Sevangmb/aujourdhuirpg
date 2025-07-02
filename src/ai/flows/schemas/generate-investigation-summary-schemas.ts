
/**
 * @fileOverview Zod schemas for the investigation summary generation flow.
 */
import { z } from 'zod';

const ClueSummarySchema = z.object({
  title: z.string(),
  description: z.string(),
  type: z.string(),
});

const DocumentSummarySchema = z.object({
  title: z.string(),
  content: z.string(),
  type: z.string(),
});

export const GenerateInvestigationSummaryInputSchema = z.object({
  playerName: z.string().describe("Le nom du joueur, qui est l'enquêteur."),
  clues: z.array(ClueSummarySchema).describe("Liste des indices que le joueur a collectés."),
  documents: z.array(DocumentSummarySchema).describe("Liste des documents que le joueur a obtenus."),
  activeQuests: z.array(z.string()).describe("Titres des quêtes d'enquête actives pour fournir un contexte sur l'affaire en cours."),
  previousSummary: z.string().optional().describe("Le résumé précédent, s'il existe, pour que l'IA puisse le mettre à jour plutôt que de repartir de zéro."),
});
export type GenerateInvestigationSummaryInput = z.infer<typeof GenerateInvestigationSummaryInputSchema>;

export const GenerateInvestigationSummaryOutputSchema = z.object({
  summary: z.string().describe("Un résumé intelligent et synthétique de l'enquête. Il doit relier les points entre les indices, poser des questions pertinentes et suggérer des pistes. Le ton est celui d'un assistant-détective perspicace."),
});
export type GenerateInvestigationSummaryOutput = z.infer<typeof GenerateInvestigationSummaryOutputSchema>;
