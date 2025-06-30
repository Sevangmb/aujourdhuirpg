
/**
 * @fileOverview Zod schema definitions for major player decision data structures used in scenarios.
 */
import { z } from 'genkit';

export const MajorDecisionSchema = z.object({
  id: z.string().describe("Identifiant unique pour cette décision (ex: 'choix_trahir_contact_paris')."),
  summary: z.string().describe("Résumé concis de la décision prise par le joueur."),
  outcome: z.string().describe("Conséquence immédiate ou prévue de cette décision."),
  scenarioContext: z.string().describe("Brève description du contexte du scénario au moment de la décision.")
});
