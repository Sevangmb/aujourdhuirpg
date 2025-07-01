
/**
 * @fileOverview A Genkit tool to fetch real-world recipes using the recipe service.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { fetchRecipesByArea } from '@/data-sources/food/themealdb-api';
import type { EnrichedRecipe } from '@/lib/types';

const GetRecipesInputSchema = z.object({
  cuisine: z.string().describe('The national cuisine to search for (e.g., "French", "Japanese", "Italian"). Must be an English term for the area.'),
  limit: z.number().min(1).max(5).optional().default(3).describe('Maximum number of recipes to return.'),
});
export type GetRecipesInput = z.infer<typeof GetRecipesInputSchema>;

const RecipeSchema = z.object({
    id: z.string(),
    name: z.string(),
    category: z.string(),
    area: z.string(),
    instructions: z.string().optional(),
    imageUrl: z.string().url(),
    ingredients: z.array(z.object({ name: z.string(), measure: z.string() })).optional(),
});

const GetRecipesOutputSchema = z.object({
  recipes: z.array(RecipeSchema).describe('A list of authentic recipes found.'),
  message: z.string().optional().describe('A summary message, e.g., if no recipes were found or an error occurred.'),
});
export type GetRecipesOutput = z.infer<typeof GetRecipesOutputSchema>;

export const getRecipesTool = ai.defineTool(
  {
    name: 'getRecipesTool',
    description:
      'Fetches authentic, real-world recipes for a specific national cuisine (e.g., French, Japanese). Use this to find specific dishes when the player wants to explore local food, eat, or cook.',
    inputSchema: GetRecipesInputSchema,
    outputSchema: GetRecipesOutputSchema,
  },
  async (input: GetRecipesInput): Promise<GetRecipesOutput> => {
    const recipes: EnrichedRecipe[] = await fetchRecipesByArea(input.cuisine, input.limit);
    
    if (recipes.length === 0) {
        return { recipes: [], message: `No recipes found for ${input.cuisine} cuisine.` };
    }

    // The type from the service is compatible with the tool's output schema
    return { recipes };
  }
);
