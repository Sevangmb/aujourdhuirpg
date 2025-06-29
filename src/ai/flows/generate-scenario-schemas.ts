
/**
 * @fileOverview Zod schema definitions for the generateScenario flow input and output.
 * This file outlines the contract between the game engine and the AI narrator.
 */
import {z} from 'genkit';
import { ACTION_TYPES, MOOD_TYPES, CHOICE_ICON_NAMES } from '@/lib/types/choice-types';


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
  playerName: z.string().describe('Le nom du personnage du joueur.'),
  playerGender: z.string().describe("Le genre du personnage du joueur."),
  playerAge: z.number().describe("L'âge du personnage du joueur."),
  playerOrigin: z.string().describe("L'origine (sociale, géographique) du personnage du joueur."),
  playerBackground: z.string().describe("L'historique ou le passé du personnage du joueur."),
  playerStats: z.record(z.number()).describe('Un enregistrement des statistiques du personnage (ex: {"Sante": 100, "Charisme": 50}).'),
  playerEra: z.string().describe('L\'époque dans laquelle se déroule le jeu.'),
  playerStartingLocation: z.string().describe('Le lieu de départ initial choisi par le joueur.'),
  playerSkills: SkillsSchema,
  playerTraitsMentalStates: TraitsMentalStatesSchema,
  playerProgression: ProgressionInputSchema,
  playerAlignment: AlignmentSchema,
  playerInventory: z.array(InventoryItemInputSchema).describe("Une liste des objets que le joueur possède actuellement, avec leur nom et quantité."),
  playerMoney: z.number().describe("La quantité d'argent actuelle du joueur (en euros)."),
  
  playerChoice: z.string().describe('L\'action textuelle que le joueur a saisie.'),
  currentScenario: z.string().describe('Le contexte du scénario actuel (le texte HTML du scénario précédent).'),
  playerLocation: LocationSchema.describe("La position actuelle du joueur."),
  toneSettings: ToneSettingsSchema.optional(),

  // This field is for events calculated by the game engine BEFORE calling the AI.
  deterministicEvents: z.array(z.string()).optional().describe("Un résumé des événements déterministes calculés par le moteur de jeu. L'IA DOIT raconter ces événements comme s'étant déjà produits."),

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
}).describe("Schéma d'entrée pour le flux generateScenario.");


export const StoryChoiceSchema = z.object({
  id: z.string().describe("Un identifiant unique pour le choix (ex: 'explorer_crypte')."),
  text: z.string().describe("Le texte court et actionnable pour le bouton du choix (ex: 'Explorer la crypte')."),
  description: z.string().describe("Une description un peu plus longue de l'action, pour le contenu de la carte."),
  iconName: z.enum(CHOICE_ICON_NAMES).describe("Le nom d'une icône Lucide-React valide pour représenter le choix."),
  type: z.enum(ACTION_TYPES).describe("La catégorie de l'action."),
  mood: z.enum(MOOD_TYPES).describe("L'ambiance générale de ce choix."),
  energyCost: z.number().describe("Le coût en énergie estimé pour le joueur (1-20)."),
  timeCost: z.number().describe("Le coût en temps estimé en minutes pour l'action (5-60)."),
  consequences: z.array(z.string()).describe("Une liste de 2-3 conséquences probables ou mots-clés (ex: ['Révélation', 'Danger potentiel'])."),
  skillCheck: z.object({
      skill: z.string().describe("Le chemin de la compétence à tester (ex: 'cognitive.observation')."),
      difficulty: z.number().describe("La difficulté cible pour le test (ex: 60)."),
  }).optional().describe("Un test de compétence optionnel associé à cette action."),
  skillGains: z.record(z.number()).optional().describe("XP de compétence gagnée lors de la réussite de cette action. Ex: {'cognitive.observation': 5, 'physical.stealth': 2}"),
}).describe("Un choix guidé et riche pour le joueur.");

// --- Main Output Schema ---
// This schema describes the AI's response, which now includes both narration and game-state-changing events.
export const GenerateScenarioOutputSchema = z.object({
  /** The generated scenario text, formatted in HTML. This text describes the outcome of the player action and sets the scene for the next player input. */
  scenarioText: z.string().describe('Le texte du scénario généré, formaté en HTML. Ce texte décrit le résultat de l\'action du joueur et prépare la scène pour la prochaine action.'),
  
  /** If the AI's narrative causes a significant location change, it can specify the new location details here. */
  newLocationDetails: LocationSchema.extend({
    reasonForMove: z.string().optional()
  }).nullable().optional().describe("Détails d'un nouveau lieu si l'action du joueur l'a fait se déplacer de manière significative."),

  // --- NEW AI-DRIVEN GAME EVENTS ---
  // The AI can now populate these fields to directly influence the game state.

  /** A list of new quests the AI wants to add to the player's journal. */
  newQuests: z.array(QuestInputSchema).optional().describe("Liste de nouvelles quêtes à ajouter au journal du joueur. L'IA crée ces quêtes lorsque l'histoire le justifie."),
  
  /** A list of updates to existing quests (e.g., completing an objective). */
  updatedQuests: z.array(QuestUpdateSchema).optional().describe("Liste des mises à jour des quêtes existantes (ex: marquer un objectif comme complété)."),

  /** A list of new Non-Player Characters (PNJ) introduced in the narrative. */
  newPNJs: z.array(PNJInteractionSchema).optional().describe("Liste de nouveaux PNJ que le joueur rencontre. L'IA les crée pour peupler le monde."),

  /** A list of updates to existing PNJ's dispositions or relationships. */
  updatedPNJs: z.array(z.object({
    id: z.string().describe("ID du PNJ existant à mettre à jour."),
    dispositionScore: z.number().optional().describe("Nouveau score de disposition du PNJ envers le joueur après l'interaction."),
    newInteractionLogEntry: z.string().optional().describe("Nouvelle entrée à ajouter à l'historique des interactions du PNJ.")
  })).optional().describe("Mises à jour des PNJ existants, comme leur disposition envers le joueur."),

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
  newTransactions: z.array(NewTransactionSchema).optional().describe("Liste des transactions financières qui ont eu lieu. À utiliser pour tout changement monétaire (revenu ou dépense)."),
  
  /** AI's strategic recommendation for the player's next move. */
  aiRecommendation: z.object({
    focus: z.string().describe("A one or two-word summary of the recommended focus, e.g., 'Gagner de l'argent' or 'Enquêter sur la piste'."),
    reasoning: z.string().describe("A brief, one-sentence explanation for the recommendation, e.g., 'Vos fonds sont bas et une opportunité de job s'est présentée.'"),
  }).optional().describe("La recommandation stratégique de l'IA pour guider le joueur vers une action pertinente."),

  /** A list of 3-4 rich, context-aware choices for the player to take next. This field is required. */
  choices: z.array(StoryChoiceSchema).min(1).describe("Une liste de 3-4 choix riches et contextuels que le joueur peut faire ensuite. Ne doit pas être vide."),

  /** The amount of experience points (XP) the player has gained. */
  xpGained: z.number().optional().describe("Points d'expérience (XP) que le joueur gagne."),

}).describe("Schéma de sortie pour le flux generateScenario, incluant maintenant les événements de jeu pilotés par l'IA.");
