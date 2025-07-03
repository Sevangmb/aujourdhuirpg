
import { z } from 'zod';

export type PNJRelationStatus = 'friendly' | 'neutral' | 'hostile' | 'allied' | 'rival' | 'unknown';
export type PNJImportance = 'major' | 'minor' | 'recurring';

export interface PNJ {
  id: string; // Unique ID for the PNJ, e.g., "pnj_marie_cafe_owner"
  name: string;
  description: string; // Physical description, role, etc.
  relationStatus: PNJRelationStatus;
  trustLevel: number; // Optional: 0-100
  importance: PNJImportance;
  firstEncountered: string; // Scenario/location of first encounter
  notes?: string[]; // Player or AI notes about this PNJ
  lastSeen?: string; // ISO string date
  dispositionScore: number;
  interactionHistory: string[];
}

// --- Zod Schema for AI ---
// This schema is used for both generating new NPCs and describing existing ones to the AI.
export const PNJInteractionSchema = z.object({
  id: z.string().optional().describe("ID du PNJ s'il existe déjà. OMETTRE pour un nouveau PNJ."),
  name: z.string().describe("Nom complet du PNJ."),
  description: z.string().describe("Brève description du PNJ (apparence, rôle)."),
  relationStatus: z.enum(['friendly', 'neutral', 'hostile', 'allied', 'rival', 'unknown']).default('neutral').describe("Relation initiale ou actuelle du PNJ avec le joueur."),
  importance: z.enum(['major', 'minor', 'recurring']).default('minor').describe("Importance du PNJ dans l'histoire."),
  dispositionScore: z.number().optional().default(50).describe("Score de disposition du PNJ envers le joueur (50 = neutre).")
});
