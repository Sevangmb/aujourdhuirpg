
export type PNJRelationStatus = 'friendly' | 'neutral' | 'hostile' | 'allied' | 'rival' | 'unknown';
export type PNJImportance = 'major' | 'minor' | 'recurring';

export interface PNJ {
  id: string; // Unique ID for the PNJ, e.g., "pnj_marie_cafe_owner"
  name: string;
  description: string; // Physical description, role, etc.
  relationStatus: PNJRelationStatus;
  trustLevel?: number; // Optional: 0-100
  importance: PNJImportance;
  firstEncountered: string; // Scenario/location of first encounter
  notes?: string[]; // Player or AI notes about this PNJ
  lastSeen?: string; // ISO string date
  dispositionScore: number;
  interactionHistory: string[];
}
