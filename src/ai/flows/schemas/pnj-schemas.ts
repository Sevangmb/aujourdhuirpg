
/**
 * @fileOverview Zod schema definitions for PNJ (NPC) related data structures used in scenarios.
 */
import { z } from 'genkit';

export const PNJInteractionSchema = z.object({
  id: z.string().describe("Identifiant unique du PNJ (ex: 'pnj_marie_cafe', 'pnj_detective_dupont'). Doit être unique et mémorable."),
  name: z.string().describe("Nom du PNJ."),
  description: z.string().describe("Brève description du PNJ ou de son rôle actuel."),
  relationStatus: z.enum(['friendly', 'neutral', 'hostile', 'allied', 'rival', 'unknown']).default('neutral').describe("Relation actuelle du joueur avec ce PNJ."),
  importance: z.enum(['major', 'minor', 'recurring']).default('minor').describe("Importance du PNJ dans l'histoire."),
  trustLevel: z.number().min(0).max(100).optional().describe("Niveau de confiance du PNJ envers le joueur (0-100)."),
  firstEncountered: z.string().optional().describe("Contexte de la première rencontre (si c'est la première fois)."),
  notes: z.array(z.string()).optional().describe("Notes à ajouter sur ce PNJ (actions mémorables, informations clés données).")
}).describe("Structure pour enregistrer ou mettre à jour une interaction avec un PNJ.");
