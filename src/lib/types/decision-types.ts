import { z } from 'zod';

export interface MajorDecision {
  id: string; // Unique ID for the decision, e.g., "decision_betray_contact_01"
  summary: string; // "J'ai choisi d'aider X plutôt que Y."
  outcome: string; // "Cela a conduit à Z."
  scenarioContext: string; // Brief context of the scenario when decision was made
  dateMade: string; // ISO string date
}

// Zod Schema for AI generation
export const MajorDecisionSchema = z.object({
  id: z.string().describe("Identifiant unique pour cette décision (ex: 'choix_trahir_contact_paris')."),
  summary: z.string().describe("Résumé concis de la décision prise par le joueur."),
  outcome: z.string().describe("Conséquence immédiate ou prévue de cette décision."),
  scenarioContext: z.string().describe("Brève description du contexte du scénario au moment de la décision.")
});
