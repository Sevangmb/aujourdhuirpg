
/**
 * @fileOverview Zod schema definitions for quest-related data structures used in scenarios.
 */
import { z } from 'genkit';

export const QuestObjectiveInputSchema = z.object({
  id: z.string().describe("Identifiant unique de l'objectif (ex: 'trouver_document_x')."),
  description: z.string().describe("Description de ce que le joueur doit faire."),
  isCompleted: z.boolean().default(false).describe("Si l'objectif est complété (généralement false à la création).")
}).describe("Un objectif spécifique d'une quête.");

export const QuestInputSchema = z.object({
  id: z.string().describe("Identifiant unique de la quête (ex: 'quete_principale_01', 'secondaire_cafe_mystere'). Doit être unique et mémorable."),
  title: z.string().describe("Titre de la quête."),
  description: z.string().describe("Description générale de la quête."),
  type: z.enum(['main', 'secondary']).describe("Type de quête (principale ou secondaire)."),
  status: z.enum(['active', 'inactive', 'completed', 'failed']).default('active').describe("Statut de la quête."),
  objectives: z.array(QuestObjectiveInputSchema).describe("Liste des objectifs de la quête."),
  giver: z.string().optional().describe("Nom du PNJ qui a donné la quête. OMITTIR si pas de PNJ donneur spécifique."),
  rewardDescription: z.string().optional().describe("Description textuelle de la récompense potentielle (objets, XP)."),
  moneyReward: z.number().optional().describe("Montant d'argent (euros) offert en récompense pour la quête."),
  relatedLocation: z.string().optional().describe("Nom d'un lieu pertinent pour la quête."),
}).describe("Structure pour une nouvelle quête à ajouter au journal du joueur.");

export const QuestUpdateSchema = z.object({
  questId: z.string().describe("ID de la quête existante à mettre à jour."),
  newStatus: z.enum(['active', 'completed', 'failed']).optional().describe("Nouveau statut de la quête si changé."),
  updatedObjectives: z.array(z.object({
    objectiveId: z.string().describe("ID de l'objectif à mettre à jour."),
    isCompleted: z.boolean().describe("Si l'objectif est maintenant complété.")
  })).optional().describe("Liste des objectifs dont le statut a changé."),
  newObjectiveDescription: z.string().optional().describe("Description d'un nouvel objectif ajouté à cette quête (rare). L'IA devrait préférer créer des sous-quêtes ou des quêtes séquentielles.")
}).describe("Structure pour mettre à jour une quête existante.");
