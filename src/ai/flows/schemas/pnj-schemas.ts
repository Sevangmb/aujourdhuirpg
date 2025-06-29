
/**
 * @fileOverview Zod schema definitions for PNJ (NPC) related data structures used in scenarios.
 */
import { z } from 'genkit';

export const PNJInteractionSchema = z.object({
  id: z.string().describe("Identifiant unique et mémorable du PNJ (ex: 'pnj_marie_cafe', 'pnj_detective_dupont')."),
  name: z.string().describe("Nom complet du PNJ."),
  description: z.string().describe("Brève description du PNJ (apparence, rôle)."),
  relationStatus: z.enum(['friendly', 'neutral', 'hostile', 'allied', 'rival', 'unknown']).default('neutral').describe("Relation initiale du PNJ avec le joueur."),
  importance: z.enum(['major', 'minor', 'recurring']).default('minor').describe("Importance du PNJ dans l'histoire."),
  dispositionScore: z.number().optional().describe("Score initial de disposition du PNJ envers le joueur (ex: -50 pour hostile, 50 pour amical).")
}).describe("Structure pour un nouveau PNJ rencontré par le joueur.");
