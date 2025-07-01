/**
 * @fileOverview Type definitions specific to the Combat module.
 */
import { z } from 'zod';

export type Enemy = {
  name: string;
  description: string;
  health: number;
  maxHealth: number;
  attack: number;
  defense: number;
};


// Zod Schema for AI generation
export const EnemySchema = z.object({
  name: z.string().describe("Nom de l'ennemi."),
  description: z.string().describe("Description de l'ennemi."),
  health: z.number().describe("Santé maximale de l'ennemi."),
  maxHealth: z.number().describe("Santé maximale de l'ennemi."),
  attack: z.number().describe("Valeur d'attaque de l'ennemi."),
  defense: z.number().describe("Valeur de défense de l'ennemi."),
});
