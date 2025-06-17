
/**
 * @fileOverview Zod schema definitions for the generateScenario flow input and output.
 * Imports sub-schemas from the './schemas/' directory.
 */
import {z} from 'genkit';

// Import schemas from sub-files
import {
  LocationSchema,
  SkillsSchema,
  TraitsMentalStatesSchema,
  ProgressionInputSchema,
  AlignmentSchema,
  InventoryItemInputSchema,
  ToneSettingsSchema
} from './schemas/player-common-schemas';
import {
  QuestInputSchema, // This is the schema for new quests
  QuestUpdateSchema // This is the schema for updating quests
} from './schemas/quest-schemas';
import { PNJInteractionSchema } from './schemas/pnj-schemas';
import { MajorDecisionSchema } from './schemas/decision-schemas';
import { ClueInputSchema, DocumentInputSchema } from './schemas/evidence-schemas';

// --- Main Input Schema ---
export const GenerateScenarioInputSchema = z.object({
  playerName: z.string().describe('The name of the player character.'),
  playerGender: z.string().describe("The player character's gender."),
  playerAge: z.number().describe("The player character's age."),
  playerOrigin: z.string().describe("The player character's origin (social, geographical)."),
  playerBackground: z.string().describe('The background or history of the player character.'),
  playerStats: z.record(z.number()).describe('A record of the player character stats (e.g., {"Sante": 100, "Charisme": 50}).'),
  playerSkills: SkillsSchema,
  playerTraitsMentalStates: TraitsMentalStatesSchema,
  playerProgression: ProgressionInputSchema,
  playerAlignment: AlignmentSchema,
  playerInventory: z.array(InventoryItemInputSchema).describe("A list of items the player currently possesses, with their names and quantities."),
  playerMoney: z.number().describe("The player's current amount of money (in euros)."),
  playerChoice: z.string().describe('The free-form text action the player typed.'),
  currentScenario: z.string().describe('The current scenario context (the HTML text of the previous scenario).'),
  playerLocation: LocationSchema.describe("The player's current location."),
  toneSettings: ToneSettingsSchema.optional(),
  activeQuests: z.array(QuestInputSchema.omit({ status: true, objectives: true }).extend({ currentObjectivesDescriptions: z.array(z.string())})).optional().describe("Liste des quêtes actives du joueur (titre, description, objectifs actuels) pour contexte."),
  encounteredPNJsSummary: z.array(z.object({name: z.string(), relationStatus: z.string()})).optional().describe("Résumé des PNJ importants déjà rencontrés et leur relation actuelle."),
  currentCluesSummary: z.array(z.object({title: z.string(), type: z.string()})).optional().describe("Résumé des indices importants déjà découverts par le joueur."),
  currentDocumentsSummary: z.array(z.object({title: z.string(), type: z.string()})).optional().describe("Résumé des documents importants déjà obtenus par le joueur."),
  currentInvestigationNotes: z.string().optional().describe("Les notes d'enquête actuelles du joueur (hypothèses, suspects, etc.).")
});

// --- Simplified Input Schema (for the flow/prompt) ---
export const SimplifiedGenerateScenarioInputSchema = GenerateScenarioInputSchema.omit({
  activeQuests: true,
  encounteredPNJsSummary: true,
  currentCluesSummary: true,
  currentDocumentsSummary: true,
}).extend({
  activeQuests: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().describe("Simplified description, potentially truncated."),
    type: z.string(),
    moneyReward: z.number().optional(),
    currentObjectivesDescriptions: z.array(z.string())
  })).optional().describe("Simplified list of active quests."),
  encounteredPNJsSummary: z.array(z.object({
    name: z.string(),
    relationStatus: z.string()
  })).optional().describe("Simplified list of encountered PNJ summaries."),
  currentCluesSummary: z.array(z.object({
    title: z.string(),
    type: z.string()
  })).optional().describe("Simplified list of current clue summaries."),
  currentDocumentsSummary: z.array(z.object({
    title: z.string(),
    type: z.string()
  })).optional().describe("Simplified list of current document summaries.")
});

// --- Main Output Schema ---
// NewLocationDetailsSchema depends on LocationSchema, defined here for clarity.
export const NewLocationDetailsSchema = LocationSchema.extend({
    reasonForMove: z.string().optional().describe("A brief explanation if the AI decided the player moved, e.g., 'Took a train to Marseille'.")
}).describe("Details of the new location if the player's action caused them to move significantly. Omit if no significant location change.");

export const GenerateScenarioOutputSchema = z.object({
  scenarioText: z.string().describe('The generated scenario text, formatted in HTML (e.g., using <p> tags). This text describes the outcome of the player action and sets the scene for the next player input. It should NOT contain interactive elements like buttons.'),
  newLocationDetails: NewLocationDetailsSchema.nullable().optional(),
  pnjInteractions: z.array(PNJInteractionSchema).optional().describe("PNJ rencontrés ou dont la relation/information a changé de manière significative."),
  majorDecisionsLogged: z.array(MajorDecisionSchema).optional().describe("Décisions importantes prises par le joueur qui méritent d'être enregistrées."),
  investigationNotesUpdate: z.string().nullable().optional().describe("Texte à ajouter aux notes d'enquête du joueur. L'IA peut soit ajouter un nouveau paragraphe, soit suggérer une réécriture concise des notes existantes si elles deviennent trop longues ou contradictoires. Préciser si c'est un ajout ou une révision."),
  newQuestsProposed: z.array(QuestInputSchema).optional().describe("Liste des nouvelles quêtes proposées par l'IA au format QuestInputSchema. Ces quêtes seront ajoutées au journal du joueur."),
  questUpdatesProposed: z.array(QuestUpdateSchema).optional().describe("Liste des mises à jour de quêtes existantes proposées par l'IA au format QuestUpdateSchema (ex: objectif complété, statut changé).")
});
