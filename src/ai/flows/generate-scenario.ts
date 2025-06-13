
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
import { getWeatherTool } from '@/ai/tools/get-weather-tool';

const LocationSchema = z.object({
  latitude: z.number().describe('The latitude of the location.'),
  longitude: z.number().describe('The longitude of the location.'),
  placeName: z.string().describe('The human-readable name of the location (e.g., "Paris, France").'),
});

const SkillsSchema = z.record(z.number()).describe("Player's skills (e.g., {\"Informatique\": 10, \"Discretion\": 5}).");
const TraitsMentalStatesSchema = z.array(z.string()).describe("Player's current mental states or traits (e.g., [\"Stressé\", \"Observateur\"]).");
const ProgressionSchema = z.object({
  level: z.number().describe("Player's current level."),
  xp: z.number().describe("Player's current experience points."),
  perks: z.array(z.string()).describe("Player's unlocked perks or passive abilities."),
});
const AlignmentSchema = z.object({
  chaosLawful: z.number().describe("Player's alignment on the Chaos/Lawful axis (-100 to 100)."),
  goodEvil: z.number().describe("Player's alignment on the Good/Evil axis (-100 to 100)."),
});

const GenerateScenarioInputSchema = z.object({
  playerName: z.string().describe('The name of the player character.'),
  playerGender: z.string().describe("The player character's gender."),
  playerAge: z.number().describe("The player character's age."),
  playerOrigin: z.string().describe("The player character's origin (social, geographical)."),
  playerBackground: z.string().describe('The background or history of the player character.'),
  playerStats: z.record(z.number()).describe('A record of the player character stats (e.g., {"Sante": 100, "Charisme": 50}).'),
  playerSkills: SkillsSchema,
  playerTraitsMentalStates: TraitsMentalStatesSchema,
  playerProgression: ProgressionSchema,
  playerAlignment: AlignmentSchema,
  playerChoice: z.string().describe('The free-form text action the player typed.'),
  currentScenario: z.string().describe('The current scenario context (the HTML text of the previous scenario).'),
  playerLocation: LocationSchema.describe("The player's current location."),
});
export type GenerateScenarioInput = z.infer<typeof GenerateScenarioInputSchema>;

const NewLocationDetailsSchema = LocationSchema.extend({
    reasonForMove: z.string().optional().describe("A brief explanation if the AI decided the player moved, e.g., 'Took a train to Marseille'.")
}).describe("Details of the new location if the player's action caused them to move significantly. Omit if no significant location change.");


const GenerateScenarioOutputSchema = z.object({
  scenarioText: z.string().describe('The generated scenario text, formatted in HTML (e.g., using <p> tags). This text describes the outcome of the player action and sets the scene for the next player input. It should NOT contain interactive elements like buttons.'),
  scenarioStatsUpdate: z.record(z.number()).describe('A record of the changes that will happen to the player stats as a result of entering this new scenario (e.g., {"Sante": -10, "Intelligence": 5}). If there is no impact, the record should be empty.'),
  // For future: add updates for skills, traits, xp, alignment if AI decisions impact them
  newLocationDetails: NewLocationDetailsSchema.optional(),
});
export type GenerateScenarioOutput = z.infer<typeof GenerateScenarioOutputSchema>;

export async function generateScenario(input: GenerateScenarioInput): Promise<GenerateScenarioOutput> {
  return generateScenarioFlow(input);
}

const scenarioPrompt = ai.definePrompt({
  name: 'generateScenarioPrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  tools: [getWeatherTool],
  input: {schema: GenerateScenarioInputSchema},
  output: {schema: GenerateScenarioOutputSchema},
  prompt: `You are a creative RPG game master, adept at creating engaging and dynamic scenarios for a text-based RPG set in modern-day France.

Player Information:
  Name: {{{playerName}}}
  Gender: {{{playerGender}}}
  Age: {{{playerAge}}}
  Origin: {{{playerOrigin}}}
  Background: {{{playerBackground}}}
  Current Stats: {{#each playerStats}}{{{@key}}}: {{{this}}} {{/each}}
  Skills: {{#each playerSkills}}{{{@key}}}: {{{this}}} {{/each}}
  Traits/Mental States: {{#if playerTraitsMentalStates}}{{#each playerTraitsMentalStates}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}Aucun{{/if}}
  Progression: Level {{{playerProgression.level}}}, XP: {{{playerProgression.xp}}}
  Alignment: Chaos/Loyal: {{{playerAlignment.chaosLawful}}}, Bien/Mal: {{{playerAlignment.goodEvil}}}
  Current Location: {{{playerLocation.placeName}}} (latitude {{{playerLocation.latitude}}}, longitude {{{playerLocation.longitude}}})

Current Scenario Context: {{{currentScenario}}} (This was the text of the previous scenario.)
Player's Typed Action (Last Choice): {{{playerChoice}}}

Task:
1.  Use the 'getWeatherTool' with the player's *current* coordinates ({{{playerLocation.latitude}}}, {{{playerLocation.longitude}}}) to find out the current weather conditions at their location.
2.  Incorporate the fetched weather information naturally and subtly into the scenario description if it's relevant to the player's immediate surroundings or actions. For example, if it's raining, you might mention damp streets or the sound of rain. If it's sunny, you might describe the bright light. Don't make the weather the main focus unless it's a major event (like a storm).
3.  Consider current events in France when creating the scenario if relevant and natural, but prioritize a fun and engaging player experience.
4.  Generate a new scenario based on ALL the player information and their typed action: "{{{playerChoice}}}".
5.  The scenario text should be a narrative continuation of the story, describing what happens as a result of the player's action.
6.  The scenario text should be between 100 and 250 words.
7.  The scenario MUST be returned as well-formed HTML (e.g., using <p> tags for paragraphs, <h1> or <h2> for titles if appropriate).
8.  It should NOT contain any interactive elements like buttons. The player will type their next action in a separate input field.
9.  Provide a 'scenarioStatsUpdate' object. This object should reflect the impact of the *events leading to this new scenario* (resulting from the player's typed action) on the player's *core stats* (Sante, Charisme, etc.). This should be a record of numbers that can be added to (or subtracted from) the player's current stats. For example, if a choice led to a tiring activity, Sante might decrease. If no stats are affected, return an empty object for scenarioStatsUpdate. Do not decrease any stat values below zero when calculating the update, though the game logic will handle the final floor. (For now, do not attempt to update skills, XP, traits, or alignment via this field; only core stats).
10. Determine if the player's action has caused them to move to a new significant location (e.g., a different city, a distinct landmark in a large area).
    If the player has moved to a new significant location:
      - Provide 'newLocationDetails' with the 'latitude', 'longitude', and 'placeName' of the new location.
      - For 'placeName', use a common name like "Marseille, France" or "Eiffel Tower, Paris".
      - Try to use realistic approximate coordinates for well-known places.
    If the player's location has NOT changed significantly (e.g., they moved to a nearby cafe in the same city), OMIT the 'newLocationDetails' field or provide it as null.

Ensure the generated scenario feels relevant and responsive to the player's typed action and the overall game context. Output MUST conform to the JSON schema defined for GenerateScenarioOutputSchema.
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
