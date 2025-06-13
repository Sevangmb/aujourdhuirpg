
'use server';
/**
 * @fileOverview Generates interactive scenarios for the RPG game based on player choices.
 *
 * - generateScenario - A function that generates a scenario based on the player's current state and choice.
 * - GenerateScenarioInput - The input type for the generateScenario function.
 * - GenerateScenarioOutput - The return type for the generateScenario function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getWeatherTool } from '@/ai/tools/get-weather-tool'; // Import the weather tool

const GenerateScenarioInputSchema = z.object({
  playerName: z.string().describe('The name of the player character.'),
  playerBackground: z.string().describe('The background or history of the player character.'),
  playerStats: z.record(z.number()).describe('A record of the player character stats (e.g., {"Sante": 100, "Charisme": 50}).'),
  playerChoice: z.string().describe('The choice the player made in the previous scenario.'),
  currentScenario: z.string().describe('The current scenario context (the HTML text of the previous scenario).'),
});
export type GenerateScenarioInput = z.infer<typeof GenerateScenarioInputSchema>;

const GenerateScenarioOutputSchema = z.object({
  scenarioText: z.string().describe('The generated scenario text, formatted in HTML. This HTML should include <button data-choice-text="CHOICE_TEXT_HERE">Choice Description</button> elements for player choices.'),
  scenarioStatsUpdate: z.record(z.number()).describe('A record of the changes that will happen to the player stats as a result of entering this new scenario (e.g., {"Sante": -10, "Intelligence": 5}). If there is no impact, the record should be empty.'),
});
export type GenerateScenarioOutput = z.infer<typeof GenerateScenarioOutputSchema>;

export async function generateScenario(input: GenerateScenarioInput): Promise<GenerateScenarioOutput> {
  return generateScenarioFlow(input);
}

const scenarioPrompt = ai.definePrompt({
  name: 'generateScenarioPrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  tools: [getWeatherTool], // Make the tool available to the prompt
  input: {schema: GenerateScenarioInputSchema},
  output: {schema: GenerateScenarioOutputSchema},
  prompt: `You are a creative RPG game master, adept at creating engaging and dynamic scenarios.

You are creating a scenario for a player in a text-based RPG. The game is set in modern-day France, specifically Paris.
The player character's current location is Paris, France (latitude 48.85, longitude 2.35).
Use the 'getWeatherTool' with these coordinates for Paris to find out the current weather conditions.
Incorporate the fetched weather information naturally and subtly into the scenario description if it's relevant to the player's immediate surroundings or actions. For example, if it's raining, you might mention damp streets or the sound of rain. If it's sunny, you might describe the bright light. Don't make the weather the main focus unless it's a major event (like a storm).

Consider current events in France when creating the scenario if relevant and natural, but prioritize a fun and engaging player experience.

Player Name: {{{playerName}}}
Player Background: {{{playerBackground}}}
Player Current Stats: {{#each playerStats}}{{{@key}}}: {{{this}}} {{/each}}
Player's Last Choice: {{{playerChoice}}}
Current Scenario Context: {{{currentScenario}}} (This was the text of the previous scenario. Generate a NEW scenario that follows from the player's choice.)

Generate a new scenario based on this information. The scenario text should be between 100 and 250 words.
The scenario MUST be returned as well-formed HTML.
The scenario MUST present the player with 2 to 4 distinct choices. Each choice MUST be represented by an HTML button element: <button data-choice-text="TEXT_OF_THE_CHOICE">TEXT_OF_THE_CHOICE</button>.

You must also provide a scenarioStatsUpdate object. This object should reflect the impact of the *events leading to this new scenario* on the player's stats. This should be a record of numbers that can be added to (or subtracted from) the player's current stats. For example, if a choice led to a tiring activity, Sante might decrease. If no stats are affected, return an empty object for scenarioStatsUpdate. Do not decrease any stat values below zero when calculating the update, though the game logic will handle the final floor.

Ensure the generated scenario feels relevant and responsive to the player's choices and the overall game context.

Output MUST conform to the JSON schema defined for GenerateScenarioOutputSchema.
`,
});

const generateScenarioFlow = ai.defineFlow(
  {
    name: 'generateScenarioFlow',
    inputSchema: GenerateScenarioInputSchema,
    outputSchema: GenerateScenarioOutputSchema,
  },
  async (input: GenerateScenarioInput) => {
    const {output} = await scenarioPrompt(input);
    if (!output) {
      console.error('AI model did not return output for generateScenarioPrompt.');
      throw new Error('AI model did not return output.');
    }
    return output;
  }
);

