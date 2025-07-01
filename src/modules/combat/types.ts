/**
 * @fileOverview Type definitions specific to the Combat module.
 */

export type Enemy = {
  name: string;
  description: string;
  health: number;
  maxHealth: number;
  attack: number;
  defense: number;
};
