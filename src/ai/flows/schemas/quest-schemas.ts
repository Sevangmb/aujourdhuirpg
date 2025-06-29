/**
 * @fileOverview Zod schema definitions for quest-related data structures used in scenarios.
 */
import { z } from 'genkit';

// This schema is simplified for AI generation.
// The game logic will handle adding IDs and managing status.
export const QuestInputSchema = z.object({
  title: z.string().describe("Titre de la quête."),
  description: z.string().describe("Description générale de la quête."),
  type: z.enum(['main', 'secondary', 'job']).describe("Type de quête (principale, secondaire, ou un 'job'/'gig' qui est principalement pour gagner de l'argent)."),
  objectives: z.array(z.string()).min(1).describe("Liste des descriptions textuelles des objectifs. Chaque chaîne est un objectif."),
  giver: z.string().optional().describe("Nom du PNJ qui a donné la quête. OMETTRE si pas de PNJ donneur spécifique."),
  rewardDescription: z.string().optional().describe("Description textuelle de la récompense potentielle (objets, XP)."),
  moneyReward: z.number().optional().describe("Montant d'argent (euros) offert en récompense pour la quête."),
  relatedLocation: z.string().optional().describe("Nom d'un lieu pertinent pour la quête."),
}).describe("Structure pour une nouvelle quête à ajouter au journal du joueur. L'IA n'a pas besoin de fournir un ID ou un statut.");

// This schema remains the same, as it's used for updating existing quests by ID.
export const QuestUpdateSchema = z.object({
  questId: z.string().describe("ID de la quête existante à mettre à jour."),
  newStatus: z.enum(['active', 'completed', 'failed']).optional().describe("Nouveau statut de la quête si changé."),
  updatedObjectives: z.array(z.object({
    objectiveId: z.string().describe("ID de l'objectif à mettre à jour."),
    isCompleted: z.boolean().describe("Si l'objectif est maintenant complété.")
  })).optional().describe("Liste des objectifs dont le statut a changé."),
  newObjectiveDescription: z.string().optional().describe("Description d'un nouvel objectif ajouté à cette quête (rare). L'IA devrait préférer créer des sous-quêtes ou des quêtes séquentielles.")
}).describe("Structure pour mettre à jour une quête existante.");
