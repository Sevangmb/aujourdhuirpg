
/**
 * @fileOverview Type definitions specific to the Combat module.
 */
import { z } from 'zod';
import type { PlayerStats } from '@/lib/types';

export type EnemyStats = {
  Force: number;
  Dexterite: number;
  Constitution: number;
  Perception: number;
};

export type Enemy = {
  name: string;
  description: string;
  health: number;
  maxHealth: number;
  attack: number;
  defense: number;
  stats: EnemyStats;
};


// Zod Schema for AI generation
export const EnemySchema = z.object({
  name: z.string().describe("Nom de l'ennemi."),
  description: z.string().describe("Description de l'ennemi."),
  maxHealth: z.number().describe("Santé maximale de l'ennemi."),
  attack: z.number().describe("Valeur d'attaque de base de l'ennemi."),
  defense: z.number().describe("Valeur de défense de base de l'ennemi."),
  stats: z.object({
      Force: z.number().describe("Force de l'ennemi."),
      Dexterite: z.number().describe("Dextérité de l'ennemi."),
      Constitution: z.number().describe("Constitution de l'ennemi."),
      Perception: z.number().describe("Perception de l'ennemi."),
  }).describe("Statistiques de l'ennemi.")
});

// This is a conversion of the Zod schema for use in the game state.
// We add health here, which is set to maxHealth when combat starts.
export type EnemyGameState = z.infer<typeof EnemySchema> & {
    health: number;
};

// Override the base Zod schema for combat start to remove health/maxHealth ambiguity.
// The AI will only provide maxHealth. The logic will set current health.
export const StartCombatEnemySchema = EnemySchema;
