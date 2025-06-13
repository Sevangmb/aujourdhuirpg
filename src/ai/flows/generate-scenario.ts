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

const GenerateScenarioInputSchema = z.object({
  playerName: z.string().describe('The name of the player character.'),
  playerBackground: z.string().describe('The background or history of the player character.'),
  playerStats: z.record(z.number()).describe('A record of the player character stats.'),
  playerChoice: z.string().describe('The choice the player made in the previous scenario.'),
  currentScenario: z.string().describe('The current scenario context.'),
});
export type GenerateScenarioInput = z.infer<typeof GenerateScenarioInputSchema>;

const GenerateScenarioOutputSchema = z.object({
  scenarioText: z.string().describe('The generated scenario text, formatted in HTML.'),
  scenarioStatsUpdate: z.record(z.number()).describe('A record of the changes that will happen to the player stats.'),
});
export type GenerateScenarioOutput = z.infer<typeof GenerateScenarioOutputSchema>;

export async function generateScenario(input: GenerateScenarioInput): Promise<GenerateScenarioOutput> {
  return generateScenarioFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateScenarioPrompt',
  model: 'googleai/gemini-2.0-flash', // Explicitly set the model here
  input: {schema: GenerateScenarioInputSchema},
  output: {schema: GenerateScenarioOutputSchema},
  prompt: `You are a creative RPG game master, adept at creating engaging and dynamic scenarios.

You are creating a scenario for a player in a text-based RPG. The game is set in modern-day France.

Consider current events in France when creating the scenario.

The player's name is: {{{playerName}}}
The player's background is: {{{playerBackground}}}
The player's current stats are: {{#each playerStats}}{{{@key}}}: {{{this}}} {{/each}}
The player's last choice was: {{{playerChoice}}}
The current scenario context is: {{{currentScenario}}}

Create a new scenario based on this information. The scenario should be no more than 200 words and must be returned in HTML format. The scenario should present the player with 2-3 choices.

You must also provide a scenarioStatsUpdate object that reflects the impact of the scenario on the player stats. This should be a record of numbers that can be added to the player stats.  If there is no impact, the record should be empty.  Do not decrease any values below zero.

Ensure that the generated scenario feels relevant and responsive to the player's choices and the overall game context.

Output should conform to the following schema:
\n{{json schema=GenerateScenarioOutputSchema}}
`,
});

const generateScenarioFlow = ai.defineFlow(
  {
    name: 'generateScenarioFlow',
    inputSchema: GenerateScenarioInputSchema,
    outputSchema: GenerateScenarioOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
