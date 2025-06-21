
'use server';
/**
 * @fileOverview Generates narrative scenarios for the RPG game based on player state and pre-calculated effects.
 *
 * - generateScenario - A function that generates a scenario narration.
 * - GenerateScenarioInput - The input type for the generateScenario function.
 * - GenerateScenarioOutput - The return type for the generateScenario function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getWeatherTool } from '@/ai/tools/get-weather-tool';
import { getWikipediaInfoTool } from '@/ai/tools/get-wikipedia-info-tool';
import { getNearbyPoisTool } from '@/ai/tools/get-nearby-pois-tool';
import { getNewsTool } from '@/ai/tools/get-news-tool';
import {
  GenerateScenarioInputSchema,
  GenerateScenarioOutputSchema,
} from './generate-scenario-schemas';
import { UNKNOWN_STARTING_PLACE_NAME } from '@/data/initial-game-data';

export type GenerateScenarioInput = z.infer<typeof GenerateScenarioInputSchema>;
export type GenerateScenarioOutput = z.infer<typeof GenerateScenarioOutputSchema>;

export async function generateScenario(input: GenerateScenarioInput): Promise<GenerateScenarioOutput> {
  if (!process.env.GOOGLE_API_KEY && !process.env.GEMINI_API_KEY) {
    console.warn("Genkit API key is not set. AI scenario generation is disabled.");
    return {
      scenarioText: `<p><strong>Fonctionnalité IA Indisponible</strong></p><p>La génération de scénario par l'IA est désactivée car la clé API nécessaire n'est pas configurée.</p>`,
      newLocationDetails: null,
    };
  }
  return generateScenarioFlow(input);
}


// --- REFACTORED PROMPT ---
// This prompt instructs the AI to act as a narrator for events that have already been calculated by the game's code.

const PROMPT_INTRO = `You are a creative RPG narrator, "Le Conteur," for a text-based RPG set in modern-day France called "Aujourd'hui RPG". Your role is to describe events, not decide them.`;

const PROMPT_CORE_TASK = `
**Core Task: Narrate, Do Not Calculate**
Your primary mission is to generate the 'scenarioText' field. This text must be a compelling, story-like description of what happens after the player's action.
The game engine has already calculated all the mechanical outcomes of the player's action. These are provided to you in the 'deterministicEvents' input field.
You MUST seamlessly weave these events into your narrative. The player should feel like these events are a natural part of the story you are telling.

**Example:**
- If 'deterministicEvents' contains: ["Player used 'Petite Trousse de Soins' and recovered 25 health."],
- Your 'scenarioText' should be something like: "<p>Avec un soupir de soulagement, vous ouvrez la trousse de premiers secours. L'antiseptique pique un peu, mais la douleur s'estompe rapidement, et vous sentez une vague de vitalité vous envahir alors que vos blessures se referment.</p>"
- **DO NOT** write: "Vous utilisez le kit de soin. Vous gagnez 25 points de vie." The mechanical language is for the game engine, not your narration.
`;

const PROMPT_GUIDING_PRINCIPLES = `
**Guiding Principles for 'scenarioText' (VERY IMPORTANT):**
- **ABSOLUTE RULE:** The 'scenarioText' MUST contain ONLY narrative and descriptive text.
- **STRICTLY PROHIBITED:**
    - DO NOT mention game mechanics like "stat changes", "XP gain", "item removed", "quest updated". Narrate the *feeling* or *observation* of these events.
    - DO NOT include tool invocation syntax (e.g., getWeatherTool(...), print(...)).
    - DO NOT mention "tool", "API", "function call", or other technical terms.
- Information from tools (weather, POIs, news) should be integrated naturally into the description of the world.
    - **CORRECT:** "The sun shines brightly, and a nearby café called 'Le Petit Bistro' seems inviting."
    - **INCORRECT:** "Tool output: weather: sunny. POIs: Le Petit Bistro. The sun is sunny. I see the bistro."
- **Failure to adhere to these rules will result in an invalid output.**
`;

const PROMPT_PLAYER_CONTEXT = `
**Player and World Context (For Informing Your Narration):**
- Player Name: {{{playerName}}}, Gender: {{{playerGender}}}, Age: {{{playerAge}}}
- Background: {{{playerBackground}}}
- Current Location: {{{playerLocation.name}}}
- Current Stats: {{#each playerStats}}{{{@key}}}: {{{this}}} {{/each}}
  (Use stats to color your descriptions. Low Energie = tired narration; high Stress = anxious tone.)
- Tone Preferences: {{#if toneSettings}}{{#each toneSettings}}{{{@key}}}: {{{this}}} {{/each}}{{else}}(Default balanced tone){{/if}}
  (Subtly adapt your writing style to match these tones.)
- Previous Scene: {{{currentScenario}}}
`;

const PROMPT_ACTION_AND_EFFECTS = `
**Player's Action and Its Calculated Outcomes:**

1.  **Player's Typed Action:** \`{{{playerChoice}}}\`

2.  **Deterministic Events to Narrate (MUST BE INCLUDED):**
    {{#if deterministicEvents}}
      {{#each deterministicEvents}}
      - {{{this}}}
      {{/each}}
    {{else}}
      - No specific mechanical events occurred. The player's action leads to a purely narrative outcome.
    {{/if}}

Based on all the above, generate the 'scenarioText' that continues the story.
`;


const FULL_PROMPT = `
${PROMPT_INTRO}
${PROMPT_CORE_TASK}
${PROMPT_GUIDING_PRINCIPLES}
${PROMPT_PLAYER_CONTEXT}
${PROMPT_ACTION_AND_EFFECTS}
`;

const scenarioPrompt = ai.definePrompt({
  name: 'generateScenarioPrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  tools: [getWeatherTool, getWikipediaInfoTool, getNearbyPoisTool, getNewsTool],
  input: {schema: GenerateScenarioInputSchema},
  output: {schema: GenerateScenarioOutputSchema},
  config: {
    safetySettings: [
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
    ],
  },
  prompt: FULL_PROMPT,
});

// --- PROLOGUE PROMPT ---
// This prompt is specifically for generating the initial prologue narration based on character creation details.

const PROLOGUE_PROMPT = `
${PROMPT_INTRO}

**Core Task: Write a Compelling Prologue**
You are starting a new text-based RPG adventure. Write an engaging introductory scene (a prologue) for a character with the following details:

- Name: {{{playerName}}}
- Gender: {{{playerGender}}}
- Age: {{{playerAge}}}
- Era: {{{playerEra}}}
- Starting Location: {{{playerStartingLocation}}}
- Background: {{{playerBackground}}}

Set the scene based on the chosen Era and Starting Location. Introduce the character and hint at the beginning of their adventure. The tone should be influenced by the player's tone preferences if available.

**Important Constraints:**
- The prologue must be purely narrative. Do NOT include any game mechanics, stats, inventory, or explicit references to "turns" or "actions".
- Focus on setting the atmosphere and introducing the character in their initial environment.
- The output MUST be valid HTML.
- DO NOT use tool calls in the prologue.

Based on the character details and starting context, generate the 'scenarioText' for the beginning of the adventure.
`;

const prologuePrompt = ai.definePrompt({
  name: 'generateProloguePrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  tools: [getWeatherTool, getWikipediaInfoTool, getNearbyPoisTool, getNewsTool], // Tools might still be useful for context in prologue?
  input: {schema: GenerateScenarioInputSchema}, // Use the same input schema
  output: {schema: GenerateScenarioOutputSchema},
  prompt: PROLOGUE_PROMPT,
});

const generateScenarioFlow = ai.defineFlow(
  { // This flow will now decide which prompt to call
    name: 'generateScenarioFlow',
    inputSchema: GenerateScenarioInputSchema,
    outputSchema: GenerateScenarioOutputSchema,
  },
  async (input: GenerateScenarioInput) => {
    // The new architecture simplifies the flow. It just calls the prompt with the provided input.
    // All deterministic logic is handled before this flow is invoked.

    let promptToUse = FULL_PROMPT;
    let selectedPrompt = scenarioPrompt;

    if (input.playerChoice === "[COMMENCER L'AVENTURE]") {
      selectedPrompt = prologuePrompt; // Use the specific prologue prompt
    }

    const {output} = await selectedPrompt(input); // Pass the standard input object

    if (!output) {
      console.error('AI model did not return output for generateScenarioPrompt.');
      return {
        scenarioText: "<p>Erreur: L'IA n'a pas retourné de réponse. Veuillez réessayer.</p>",
        newLocationDetails: null,
      };
    }
    return output;
  }
);
