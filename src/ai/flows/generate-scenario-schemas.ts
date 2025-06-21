
/**
 * @fileOverview Zod schema definitions for the generateScenario flow input and output.
 * This file reflects the new architecture where the AI's role is primarily narrative generation.
 */
import {z} from 'genkit';

// Schemas for player data, quests, etc., remain largely the same as they are part of the INPUT to the AI.
import {
  LocationSchema,
  SkillsSchema,
  TraitsMentalStatesSchema,
  ProgressionInputSchema,
  AlignmentSchema,
  InventoryItemInputSchema,
  ToneSettingsSchema
} from './schemas/player-common-schemas';
import { QuestInputSchema } from './schemas/quest-schemas';
import { PNJInteractionSchema } from './schemas/pnj-schemas';
import { MajorDecisionSchema } from './schemas/decision-schemas';
import { ClueInputSchema, DocumentInputSchema } from './schemas/evidence-schemas';


// --- Main Input Schema ---
// This schema now includes a field for deterministic events calculated by the game engine.
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

  // NEW FIELD for deterministic events
  deterministicEvents: z.array(z.string()).optional().describe("A summary of deterministic events calculated by the game engine. The AI MUST narrate these events as having already occurred."),

  // Contextual summaries remain useful for the AI's narration
  activeQuests: z.array(QuestInputSchema.omit({ status: true, objectives: true }).extend({ currentObjectivesDescriptions: z.array(z.string())})).optional().describe("Liste des quêtes actives du joueur (titre, description, objectifs actuels) pour contexte."),
  encounteredPNJsSummary: z.array(z.object({
    name: z.string(),
    relationStatus: z.string(),
    dispositionScore: z.number().optional(),
    interactionHistorySummary: z.string().optional()
  })).optional().describe("Résumé des PNJ importants déjà rencontrés."),
  currentCluesSummary: z.array(z.object({ title: z.string(), summary: z.string() })).optional().describe("Résumé des indices importants déjà découverts par le joueur."),
  currentDocumentsSummary: z.array(z.object({title: z.string(), summary: z.string()})).optional().describe("Résumé des documents importants déjà obtenus par le joueur."),
  currentInvestigationNotes: z.string().optional().describe("Les notes d'enquête actuelles du joueur (hypothèses, suspects, etc.).")
}).describe("Input schema for the generateScenario flow.");


// --- Main Output Schema ---
// This schema is now drastically simplified. The AI's primary job is to generate the narrative.
// Mechanical changes are no longer part of the AI's output.
export const GenerateScenarioOutputSchema = z.object({
  /** The generated scenario text, formatted in HTML. This text describes the outcome of the player action, incorporating any deterministic events provided in the input, and sets the scene for the next player input. It should NOT contain interactive elements like buttons. */
  scenarioText: z.string().describe('The generated scenario text, formatted in HTML, narrating the outcome of the player action and any provided deterministic events.'),
  
  /** The AI can still suggest a location change, as this is a narrative-heavy event. */
  newLocationDetails: LocationSchema.extend({
    reasonForMove: z.string().optional()
  }).nullable().optional().describe("Details of a new location if the player's action caused them to move significantly."),

}).describe("Simplified output schema for the generateScenario flow, focusing on narrative generation.");
