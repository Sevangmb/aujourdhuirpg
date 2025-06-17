
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
  QuestInputSchema,
  QuestUpdateSchema
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

// --- Main Output Schema ---
// NewLocationDetailsSchema depends on LocationSchema, defined here for clarity.
export const NewLocationDetailsSchema = LocationSchema.extend({
    reasonForMove: z.string().optional().describe("A brief explanation if the AI decided the player moved, e.g., 'Took a train to Marseille'.")
}).describe("Details of the new location if the player's action caused them to move significantly. Omit if no significant location change.");

export const GenerateScenarioOutputSchema = z.object({
  scenarioText: z.string().describe('The generated scenario text, formatted in HTML (e.g., using <p> tags). This text describes the outcome of the player action and sets the scene for the next player input. It should NOT contain interactive elements like buttons.'),
  scenarioStatsUpdate: z.record(z.number()).optional().describe('A record of the changes that will happen to the player stats as a result of entering this new scenario (e.g., {"Sante": -10, "Intelligence": 5}). If there is no impact, the record can be empty or omitted.'),
  newLocationDetails: NewLocationDetailsSchema.nullable().optional(),
  xpGained: z.number().optional().describe("Experience points gained from this scenario's outcome, if any. Award reasonably (e.g., 5-50 XP)."),
  moneyChange: z.number().optional().describe("Amount of money (euros) the player gains (positive value) or loses (negative value) in this scenario. E.g., for rewards, purchases, finding/losing money. Do not include quest completion rewards here, use 'moneyReward' in 'newQuests' or 'questUpdates' for that."),
  itemsAdded: z.array(z.object({
      itemId: z.string().describe("The unique ID of the item from the master item list (e.g. 'energy_bar_01', 'medkit_basic_01', 'mysterious_key_01', 'data_stick_01')."),
      quantity: z.number().min(1).describe("Quantity of the item added.")
    })).optional().describe("List of items to be added to the player's inventory if they discover something."),
  itemsRemoved: z.array(z.object({
      itemName: z.string().describe("The NAME of the item as it appears in player's inventory (e.g. 'Smartphone', 'Barre énergétique')."),
      quantity: z.number().min(1).describe("Quantity of the item removed.")
    })).optional().describe("List of items to be removed from the player's inventory if they use or lose something."),
  newQuests: z.array(QuestInputSchema).optional().describe("Liste des nouvelles quêtes initiées par ce scénario."),
  questUpdates: z.array(QuestUpdateSchema).optional().describe("Mises à jour des quêtes existantes (objectifs complétés, statut changé)."),
  pnjInteractions: z.array(PNJInteractionSchema).optional().describe("PNJ rencontrés ou dont la relation/information a changé de manière significative."),
  majorDecisionsLogged: z.array(MajorDecisionSchema).optional().describe("Décisions importantes prises par le joueur qui méritent d'être enregistrées."),
  newClues: z.array(ClueInputSchema).optional().describe("Liste des nouveaux indices découverts par le joueur dans ce scénario."),
  newDocuments: z.array(DocumentInputSchema).optional().describe("Liste des nouveaux documents obtenus par le joueur dans ce scénario."),
  investigationNotesUpdate: z.string().nullable().optional().describe("Texte à ajouter aux notes d'enquête du joueur. L'IA peut soit ajouter un nouveau paragraphe, soit suggérer une réécriture concise des notes existantes si elles deviennent trop longues ou contradictoires. Préciser si c'est un ajout ou une révision.")
});
