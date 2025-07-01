
/**
 * @fileOverview Zod schema definitions for the generateScenario flow input and output.
 * This file outlines the contract between the game engine and the AI narrator.
 */
import {z} from 'zod';
import { ACTION_TYPES, MOOD_TYPES, CHOICE_ICON_NAMES } from '@/lib/types/choice-types';
import { PlayerInputSchema } from '@/lib/types/player-types';
import { QuestInputSchema, QuestUpdateSchema } from '@/modules/quests/types';
import { PNJInteractionSchema } from '@/lib/types/pnj-types';
import { MajorDecisionSchema } from '@/lib/types/decision-types';
import { ClueInputSchema, DocumentInputSchema } from '@/lib/types/evidence-types';
import { NewTransactionSchema } from '@/modules/economy/types';
import { DynamicItemCreationPayloadSchema } from '@/lib/types/item-types';
import { EnemySchema } from '@/modules/combat/types';

// --- Main Input Schema ---
export const GenerateScenarioInputSchema = z.object({
  player: PlayerInputSchema.describe("L'objet complet contenant toutes les informations sur le joueur."),
  playerChoiceText: z.string().describe("L'action textuelle que le joueur a saisie."),
  gameEvents: z.string().describe("Une chaîne de caractères résumant les événements de jeu que le moteur a calculés. L'IA DOIT raconter ces événements de manière immersive."),
  previousScenarioText: z.string().describe('Le contexte du scénario précédent (le texte HTML du scénario précédent).'),
  cascadeResult: z.string().optional().describe("Un résumé textuel des informations contextuelles générées par les modules de la cascade. L'IA doit utiliser ce contexte pour sa narration."),
}).describe("Schéma d'entrée pour le flux generateScenario. L'IA est un narrateur, pas un décideur.");


export const StoryChoiceSchema = z.object({
  id: z.string().describe("Un identifiant unique pour le choix (ex: 'explorer_crypte')."),
  text: z.string().describe("Le texte court et actionnable pour le bouton du choix (ex: 'Explorer la crypte')."),
  description: z.string().describe("Une description un peu plus longue de l'action, pour le contenu de la carte."),
  iconName: z.enum(CHOICE_ICON_NAMES).describe("Le nom d'une icône Lucide-React valide pour représenter le choix."),
  type: z.enum(ACTION_TYPES).describe("La catégorie de l'action."),
  mood: z.enum(MOOD_TYPES).describe("L'ambiance générale de ce choix."),
  consequences: z.array(z.string()).describe("Une liste de 2-3 conséquences probables ou mots-clés (ex: ['Révélation', 'Danger potentiel'])."),
  
  skillCheck: z.object({
      skill: z.string().describe("Le chemin de la compétence à tester (ex: 'sociales.persuasion')."),
      difficulty: z.number().describe("La difficulté cible pour le test (ex: 60)."),
  }).optional().describe("Un test de compétence optionnel associé à cette action."),
  
  energyCost: z.number().optional().describe("LAISSER VIDE. Le moteur de jeu calculera ce coût."),
  timeCost: z.number().optional().describe("LAISSER VIDE. Le moteur de jeu calculera ce coût."),
  skillGains: z.record(z.number()).optional().describe("LAISSER VIDE. Le moteur de jeu attribuera l'XP."),
  physiologicalEffects: z.object({ 
      hunger: z.number().optional(), 
      thirst: z.number().optional() 
  }).optional().describe("Effets physiologiques si le choix implique de manger/boire."),
  statEffects: z.record(z.number()).optional().describe("Effets sur les statistiques du joueur après l'action. Ex: {'Energie': 5, 'Stress': -10}"),
}).describe("Un choix guidé et riche pour le joueur. Seuls les champs narratifs sont obligatoires.");

// --- Main Output Schema ---
export const GenerateScenarioOutputSchema = z.object({
  scenarioText: z.string().describe('Le texte du scénario généré, formaté en HTML. Ce texte décrit le résultat de l\'action du joueur et prépare la scène pour la prochaine action.'),
  
  aiRecommendation: z.object({
    focus: z.string().describe("Un ou deux mots résumant l'axe recommandé, ex: 'Gagner de l'argent' ou 'Enquêter sur la piste'."),
    reasoning: z.string().describe("Une brève explication en une phrase pour la recommandation, ex: 'Vos fonds sont bas et une opportunité de job s'est présentée.'"),
  }).optional().describe("La recommandation stratégique de l'IA pour guider le joueur vers une action pertinente."),

  choices: z.array(StoryChoiceSchema).describe("Une liste de 3-4 choix riches et contextuels que le joueur peut faire ensuite.").optional(),
  
  newQuests: z.array(QuestInputSchema).optional().describe("Propose de nouvelles quêtes à ajouter au journal du joueur."),
  questUpdates: z.array(QuestUpdateSchema).optional().describe("Propose des mises à jour de quêtes existantes (ex: objectif complété)."),
  newPNJs: z.array(PNJInteractionSchema).optional().describe("Introduit de nouveaux personnages non-joueurs dans la scène."),
  newItems: z.array(DynamicItemCreationPayloadSchema).optional().describe("Introduit de nouveaux objets dans le jeu (ex: un objet trouvé)."),
  newTransactions: z.array(NewTransactionSchema).optional().describe("Génère des transactions financières (ex: trouver de l'argent, recevoir un paiement)."),
  newClues: z.array(ClueInputSchema).optional().describe("Génère de nouveaux indices pour le dossier d'enquête."),
  newDocuments: z.array(DocumentInputSchema).optional().describe("Génère de nouveaux documents à ajouter au dossier d'enquête."),
  majorDecisions: z.array(MajorDecisionSchema).optional().describe("Enregistre une décision majeure prise par le joueur."),
  startCombat: z.array(EnemySchema).optional().describe("Introduit un ou plusieurs ennemis pour commencer un combat."),
}).describe("Schéma de sortie pour le flux generateScenario. L'IA génère la narration, les choix, et peut proposer des changements d'état du jeu.");
