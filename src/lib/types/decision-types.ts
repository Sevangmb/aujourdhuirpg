
export interface MajorDecision {
  id: string; // Unique ID for the decision, e.g., "decision_betray_contact_01"
  summary: string; // "J'ai choisi d'aider X plutôt que Y."
  outcome: string; // "Cela a conduit à Z."
  scenarioContext: string; // Brief context of the scenario when decision was made
  dateMade: string; // ISO string date
}
