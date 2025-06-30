
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
  IntelligentItemInputSchema,
  ToneSettingsSchema,
  PlayerInputSchema, // Using a more comprehensive player schema
  EnemySchema,
} from './schemas/player-common-schemas';
import { QuestInputSchema, QuestUpdateSchema } from './schemas/quest-schemas';
import { PNJInteractionSchema } from './schemas/pnj-schemas';
import { MajorDecisionSchema } from './schemas/decision-schemas';
import { ClueInputSchema, DocumentInputSchema } from './schemas/evidence-schemas';
import { NewTransactionSchema } from './schemas/finance-schemas';
import { DynamicItemCreationPayloadSchema } from './schemas/item-schemas';


// --- Main Input Schema ---
// This schema describes all the information the game provides to the AI for context.
export const GenerateScenarioInputSchema = z.object({
  player: PlayerInputSchema.describe("L'objet complet contenant toutes les informations sur le joueur."),
  playerChoice: z.string().describe("L'action textuelle que le joueur a saisie."),
  currentScenario: z.string().describe('Le contexte du scénario actuel (le texte HTML du scénario précédent).'),
  currentEnemy: EnemySchema.optional().nullable().describe("L'ennemi actuel si le joueur est en combat."),
  
  // This field is for events calculated by the game engine BEFORE calling the AI.
  deterministicEvents: z.array(z.string()).optional().describe("Un résumé des événements déterministes calculés par le moteur de jeu. L'IA DOIT raconter ces événements comme s'étant déjà produits."),

  // Contextual summaries for the AI's narration
  activeQuests: z.array(QuestInputSchema.omit({ objectives: true }).extend({ id: z.string(), status: z.string(), currentObjectivesDescriptions: z.array(z.string())})).optional().describe("Liste des quêtes actives et inactives du joueur (ID, titre, description, objectifs actuels, statut) pour contexte."),
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
  isCombatAction: z.boolean().optional().describe("Indique si ce choix est une action de combat."),
  combatActionType: z.enum(['attack', 'defend', 'flee', 'special']).optional().describe("Le type spécifique d'action de combat."),
  skillCheck: z.object({
      skill: z.string().describe("Le chemin de la compétence à tester (ex: 'cognitive.observation')."),
      difficulty: z.number().describe("La difficulté cible pour le test (ex: 60)."),
  }).optional().describe("Un test de compétence optionnel associé à cette action."),
  skillGains: z.record(z.number()).optional().describe("XP de compétence gagnée lors de la réussite de cette action. Ex: {'cognitive.observation': 5, 'physical.stealth': 2}"),
  physiologicalEffects: z.object({ 
      hunger: z.number().optional(), 
      thirst: z.number().optional() 
  }).optional().describe("Effets physiologiques si le choix implique de manger/boire."),
  statEffects: z.record(z.number()).optional().describe("Effets sur les statistiques du joueur après l'action. Ex: {'Energie': 5, 'Stress': -10}"),
}).describe("Un choix guidé et riche pour le joueur.");

// --- Main Output Schema ---
// This schema describes the AI's response, which now includes both narration and game-state-changing events.
export const GenerateScenarioOutputSchema = z.object({
  scenarioText: z.string().describe('Le texte du scénario généré, formaté en HTML. Ce texte décrit le résultat de l\'action du joueur et prépare la scène pour la prochaine action.'),
  
  newLocationDetails: LocationSchema.extend({
    reasonForMove: z.string().optional()
  }).nullable().optional().describe("Détails d'un nouveau lieu si l'action du joueur l'a fait se déplacer de manière significative."),

  // --- NEW AI-DRIVEN GAME EVENTS ---
  // The AI can now populate these fields to directly influence the game state.

  combatEvent: z.object({
    startCombat: EnemySchema.optional().describe("Si un combat commence, fournit les détails de l'ennemi. Le jeu prend le relais pour l'état du combat."),
    endCombat: z.boolean().optional().describe("Mettre à true lorsque le combat est terminé (par fuite ou victoire).")
  }).optional().describe("Événements liés au combat."),

  newQuests: z.array(QuestInputSchema).optional().describe("Liste de nouvelles quêtes à ajouter au journal du joueur. L'IA crée ces quêtes lorsque l'histoire le justifie."),
  
  updatedQuests: z.array(QuestUpdateSchema).optional().describe("Liste des mises à jour des quêtes existantes (ex: marquer un objectif comme complété)."),

  newPNJs: z.array(PNJInteractionSchema).optional().describe("Liste de nouveaux PNJ que le joueur rencontre. L'IA les crée pour peupler le monde."),

  updatedPNJs: z.array(z.object({
    id: z.string().describe("ID du PNJ existant à mettre à jour."),
    dispositionScore: z.number().optional().describe("Nouveau score de disposition du PNJ envers le joueur après l'interaction."),
    newInteractionLogEntry: z.string().optional().describe("Nouvelle entrée à ajouter à l'historique des interactions du PNJ.")
  })).optional().describe("Mises à jour des PNJ existants, comme leur disposition envers le joueur."),

  newClues: z.array(ClueInputSchema).optional().describe("Nouveaux indices découverts par le joueur."),
  
  newDocuments: z.array(DocumentInputSchema).optional().describe("Nouveaux documents que le joueur obtient."),
  
  updatedInvestigationNotes: z.string().nullable().optional().describe("Mise à jour optionnelle des notes d'enquête du joueur avec de nouvelles synthèses ou hypothèses par l'IA."),

  itemsToAddToInventory: z.array(z.object({
    itemId: z.string().describe("L'ID de l'objet depuis la liste maîtresse (ex: 'medkit_basic_01')."),
    quantity: z.number().min(1).describe("La quantité d'objet à ajouter.")
  })).optional().describe("Objets à ajouter directement à l'inventaire du joueur (ex: récompenses de quête, objets trouvés)."),
  
  itemUpdates: z.array(z.object({
    instanceId: z.string().describe("L'ID d'instance unique de l'objet à mettre à jour."),
    xpGained: z.number().describe("La quantité de points d'expérience que l'objet a gagné.")
  })).optional().describe("Mises à jour des objets dans l'inventaire du joueur, comme un gain d'expérience."),

  itemsUsed: z.array(z.object({
    instanceId: z.string().describe("L'ID d'instance unique de l'objet à mettre à jour."),
    usageDescription: z.string().describe("Très brève description de l'utilisation (ex: 'Pour crocheter la serrure', 'Pour prendre une photo du suspect').")
  })).optional().describe("Liste des objets de l'inventaire utilisés durant cette action."),

  newDynamicItems: z.array(DynamicItemCreationPayloadSchema).optional().describe("Liste d'objets uniques ou dynamiques à créer et à ajouter à l'inventaire."),
  
  newTransactions: z.array(NewTransactionSchema).optional().describe("Liste des transactions financières qui ont eu lieu. À utiliser pour tout changement monétaire (revenu ou dépense)."),
  
  aiRecommendation: z.object({
    focus: z.string().describe("Un ou deux mots résumant l'axe recommandé, ex: 'Gagner de l'argent' ou 'Enquêter sur la piste'."),
    reasoning: z.string().describe("Une brève explication en une phrase pour la recommandation, ex: 'Vos fonds sont bas et une opportunité de job s'est présentée.'"),
  }).optional().describe("La recommandation stratégique de l'IA pour guider le joueur vers une action pertinente."),

  choices: z.array(StoryChoiceSchema).min(1).describe("Une liste de 3-4 choix riches et contextuels que le joueur peut faire ensuite. Ne doit pas être vide."),

  xpGained: z.number().optional().describe("Points d'expérience (XP) que le joueur gagne."),

}).describe("Schéma de sortie pour le flux generateScenario, incluant maintenant les événements de jeu pilotés par l'IA.");
