
'use server';
/**
 * @fileOverview Service for fetching real-world recipes from external APIs.
 * Initial implementation uses TheMealDB API.
 */

import type { EnrichedRecipe } from '@/lib/types';

const THE_MEAL_DB_BASE_URL = 'https://www.themealdb.com/api/json/v1/1/';

async function fetchMealDetails(mealId: string): Promise<any | null> {
    try {
        const response = await fetch(`${THE_MEAL_DB_BASE_URL}lookup.php?i=${mealId}`);
        if (!response.ok) return null;
        const data = await response.json();
        return data.meals ? data.meals[0] : null;
    } catch (error) {
        console.error(`Error fetching meal details for ID ${mealId}:`, error);
        return null;
    }
}

function normalizeMealToEnrichedRecipe(meal: any): EnrichedRecipe {
    const ingredients: { name: string; measure: string }[] = [];
    for (let i = 1; i <= 20; i++) {
        const ingredient = meal[`strIngredient${i}`];
        const measure = meal[`strMeasure${i}`];
        if (ingredient && ingredient.trim() !== '') {
            ingredients.push({ name: ingredient, measure: measure });
        }
    }

    return {
        id: meal.idMeal,
        name: meal.strMeal,
        category: meal.strCategory,
        area: meal.strArea,
        instructions: meal.strInstructions,
        imageUrl: meal.strMealThumb,
        youtubeUrl: meal.strYoutube || undefined,
        ingredients: ingredients,
        source: 'TheMealDB',
    };
}


/**
 * Fetches recipes for a given cuisine area from TheMealDB.
 * @param area The cuisine area (e.g., "French", "Japanese").
 * @param limit The maximum number of recipes to return.
 * @returns A promise that resolves to an array of enriched recipe details.
 */
export async function fetchRecipesByArea(area: string, limit: number = 3): Promise<EnrichedRecipe[]> {
    try {
        const listResponse = await fetch(`${THE_MEAL_DB_BASE_URL}filter.php?a=${area}`);
        if (!listResponse.ok) {
            console.error(`TheMealDB API error (list by area): ${listResponse.status}`);
            return [];
        }

        const listData = await listResponse.json();
        if (!listData.meals) {
            return [];
        }

        const mealSummaries = listData.meals.slice(0, limit);
        
        const detailedRecipesPromises = mealSummaries.map((meal: any) => fetchMealDetails(meal.idMeal));
        const detailedMeals = await Promise.all(detailedRecipesPromises);

        return detailedMeals
            .filter(meal => meal !== null)
            .map(normalizeMealToEnrichedRecipe);

    } catch (error) {
        console.error(`Error in fetchRecipesByArea for area "${area}":`, error);
        return [];
    }
}
