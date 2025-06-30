/**
 * @fileOverview Defines the types for the recipe and culinary systems.
 * Based on the "Système de Physiologie Contextuelle Intelligente" design document.
 */

// A simplified version for the initial implementation with TheMealDB
export interface EnrichedRecipe {
  id: string; // e.g., "52772"
  name: string; // e.g., "Teriyaki Chicken Casserole"
  category: string; // e.g., "Chicken"
  area: string; // e.g., "Japanese"
  instructions: string;
  imageUrl: string;
  youtubeUrl?: string;
  ingredients: { name: string; measure: string }[];
  source?: string; // e.g., "TheMealDB"
}
