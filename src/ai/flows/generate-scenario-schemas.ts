
/**
 * @fileOverview Zod schema definitions for the generateScenario flow input and output.
 * This file outlines the contract between the game engine and the AI narrator.
 */
import {z} from 'genkit';

// Schemas for player data, quests, etc., are imported to define the AI's potential outputs.
import {
  LocationSchema,
  SkillsSchema,
  TraitsMentalStatesSchema,
  ProgressionInputSchema,
  AlignmentSchema,
  InventoryItemInputSchema,
  ToneSettingsSchema
} from './schemas/player-common-schemas';
import { QuestInputSchema, QuestUpdateSchema } from './schemas/quest-schemas';
import { PNJInteractionSchema } from './schemas/pnj-schemas';
import { MajorDecisionSchema } from './schemas/decision-schemas';
import { ClueInputSchema, DocumentInputSchema } from './schemas/evidence-schemas';
import { NewTransactionSchema } from './schemas/finance-schemas';


// --- Main Input Schema ---
// This schema describes all the information the game provides to the AI for context.
export const GenerateScenarioInputSchema = z.object({
  playerName: z.string().describe('The name of the player character.'),
  playerGender: z.string().describe("The player character's gender."),
  playerAge: z.number().describe("The player character's age."),
  playerOrigin: z.string().describe("The player character's origin (social, geographical)."),
  playerBackground: z.string().describe('The background or history of the player character.'),
  playerStats: z.record(z.number()).describe('A record of the player character stats (e.g., {"Sante": 100, "Charisme": 50}).'),
  playerEra: z.string().describe('The era the game is set in.'),
  playerStartingLocation: z.string().describe('The initial location chosen by the player.'),
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

  // This field is for events calculated by the game engine BEFORE calling the AI.
  deterministicEvents: z.array(z.string()).optional().describe("A summary of deterministic events calculated by the game engine. The AI MUST narrate these events as having already occurred."),

  // Contextual summaries for the AI's narration
  activeQuests: z.array(QuestInputSchema.omit({ status: true, objectives: true }).extend({ currentObjectivesDescriptions: z.array(z.string())})).optional().describe("Liste des quêtes actives du joueur (titre, description, objectifs actuels) pour contexte."),
  encounteredPNJsSummary: z.array(z.object({
    name: z.string(),
    relationStatus: z.string(),
    dispositionScore: z.number().optional(),
    interactionHistorySummary: z.string().optional()
  })).optional().describe("Résumé des PNJ importants déjà rencontrés."),
  currentCluesSummary: z.array(z.object({ title: z.string(), summary: z.string() })).optional().describe("Résumé des indices importants déjà découverts par le joueur."),
  currentDocumentsSummary: z.array(z.object({title: z.string(), summary: z.string()})).optional().describe("Résumé des documents importants déjà obtenus par le joueur."),
  currentInvestigationNotes: z.string().optional().describe("Les notes d'enquête actuelles du joueur (hypothèses, suspects, etc.). L'IA peut mettre à jour ce champ dans sa réponse.")
}).describe("Input schema for the generateScenario flow.");


// --- Main Output Schema ---
// This schema describes the AI's response, which now includes both narration and game-state-changing events.
export const GenerateScenarioOutputSchema = z.object({
  /** The generated scenario text, formatted in HTML. This text describes the outcome of the player action and sets the scene for the next player input. */
  scenarioText: z.string().describe('The generated scenario text, formatted in HTML.'),
  
  /** If the AI's narrative causes a significant location change, it can specify the new location details here. */
  newLocationDetails: LocationSchema.extend({
    reasonForMove: z.string().optional()
  }).nullable().optional().describe("Details of a new location if the player's action caused them to move significantly."),

  // --- NEW AI-DRIVEN GAME EVENTS ---
  // The AI can now populate these fields to directly influence the game state.

  /** A list of new quests the AI wants to add to the player's journal. */
  newQuests: z.array(QuestInputSchema).optional().describe("Liste de nouvelles quêtes à ajouter au journal du joueur. L'IA crée ces quêtes lorsque l'histoire le justifie."),
  
  /** A list of updates to existing quests (e.g., completing an objective). */
  updatedQuests: z.array(QuestUpdateSchema).optional().describe("Liste des mises à jour des quêtes existantes (ex: marquer un objectif comme complété)."),

  /** A list of new Non-Player Characters (PNJ) introduced in the narrative. */
  newPNJs: z.array(PNJInteractionSchema).optional().describe("Liste de nouveaux PNJ que le joueur rencontre. L'IA les crée pour peupler le monde."),

  /** A list of updates to existing PNJ's dispositions or relationships. */
  updatedPNJs: z.array(PNJInteractionSchema.pick({ id: true, dispositionScore: true, newInteractionLogEntry: true })).optional().describe("Mises à jour des PNJ existants, comme leur disposition envers le joueur."),

  /** A list of new clues for the player's investigation log. */
  newClues: z.array(ClueInputSchema).optional().describe("Nouveaux indices découverts par le joueur."),
  
  /** A list of new documents obtained by the player. */
  newDocuments: z.array(DocumentInputSchema).optional().describe("Nouveaux documents que le joueur obtient."),
  
  /** Optional: The AI can update the player's investigation notes with new summaries or hypotheses. */
  updatedInvestigationNotes: z.string().nullable().optional().describe("Mise à jour optionnelle des notes d'enquête du joueur avec de nouvelles synthèses ou hypothèses par l'IA."),

  /** A list of items to add directly to the player's inventory. */
  itemsToAddToInventory: z.array(z.object({
    itemId: z.string().describe("The ID of the item from the master item list (e.g., 'medkit_basic_01')."),
    quantity: z.number().min(1).describe("The quantity of the item to add.")
  })).optional().describe("Objets à ajouter directement à l'inventaire du joueur (ex: récompenses de quête, objets trouvés)."),
  
  /** A list of financial transactions that occurred as a result of the narrative. Use this for any monetary changes. */
  newTransactions: z.array(NewTransactionSchema).optional().describe("A list of financial transactions that occurred. Use this for any monetary changes (income or expenses)."),

  /** A list of 3-4 short, context-aware suggested actions for the player to take next. */
  suggestedActions: z.array(z.string()).optional().describe("A list of 3-4 short, context-aware suggested actions for the player to take next."),

  /** The amount of experience points (XP) the player has gained. */
  xpGained: z.number().optional().describe("Points d'expérience (XP) que le joueur gagne."),

}).describe("Output schema for the generateScenario flow, now including AI-driven game events.");
