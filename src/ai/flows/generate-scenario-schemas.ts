
/**
 * @fileOverview Zod schema definitions for the generateScenario flow input and output.
 * This file outlines the contract between the game engine and the AI narrator.
 */
import {z} from 'genkit';
import { ACTION_TYPES, MOOD_TYPES, CHOICE_ICON_NAMES } from '@/lib/types/choice-types';
import { PlayerInputSchema } from './schemas/player-common-schemas';
import type { GameEvent } from '@/lib/types';


// --- Main Input Schema ---
// This schema describes all the information the game provides to the AI for context.
export const GenerateScenarioInputSchema = z.object({
  player: PlayerInputSchema.describe("L'objet complet contenant toutes les informations sur le joueur."),
  playerChoiceText: z.string().describe("L'action textuelle que le joueur a saisie."),
  gameEvents: z.string().describe("Une chaîne JSON représentant une liste d'événements de jeu que le moteur a calculés. L'IA DOIT raconter ces événements de manière immersive."),
  previousScenarioText: z.string().describe('Le contexte du scénario précédent (le texte HTML du scénario précédent).'),
}).describe("Schéma d'entrée pour le flux generateScenario. L'IA est un narrateur, pas un décideur.");


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
// The AI's response is now purely narrative and suggestive.
export const GenerateScenarioOutputSchema = z.object({
  scenarioText: z.string().describe('Le texte du scénario généré, formaté en HTML. Ce texte décrit le résultat de l\'action du joueur et prépare la scène pour la prochaine action.'),
  
  aiRecommendation: z.object({
    focus: z.string().describe("Un ou deux mots résumant l'axe recommandé, ex: 'Gagner de l'argent' ou 'Enquêter sur la piste'."),
    reasoning: z.string().describe("Une brève explication en une phrase pour la recommandation, ex: 'Vos fonds sont bas et une opportunité de job s'est présentée.'"),
  }).optional().describe("La recommandation stratégique de l'IA pour guider le joueur vers une action pertinente."),

  choices: z.array(StoryChoiceSchema).min(1).describe("Une liste de 3-4 choix riches et contextuels que le joueur peut faire ensuite. Ne doit pas être vide."),
  
}).describe("Schéma de sortie pour le flux generateScenario. L'IA ne génère plus d'événements de jeu, seulement la narration et les choix.");
