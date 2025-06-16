
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
import { getWikipediaInfoTool } from '@/ai/tools/get-wikipedia-info-tool';
import { getNearbyPoisTool } from '@/ai/tools/get-nearby-pois-tool';
import { getNewsTool } from '@/ai/tools/get-news-tool';
import {
  GenerateScenarioInputSchema,
  GenerateScenarioOutputSchema,
  ClueInputSchema, 
  DocumentInputSchema, 
  QuestInputSchema as AIQuestInputSchema 
} from './generate-scenario-schemas';

export type GenerateScenarioInput = z.infer<typeof GenerateScenarioInputSchema>;
export type GenerateScenarioOutput = z.infer<typeof GenerateScenarioOutputSchema>;

const PLAYER_ACTION_REFLECT_INTERNAL_THOUGHTS = "[PLAYER_ACTION_REFLECT_INTERNAL_THOUGHTS]";

export async function generateScenario(input: GenerateScenarioInput): Promise<GenerateScenarioOutput> {
  const simplifiedInput = { ...input };
  if (input.activeQuests) {
    simplifiedInput.activeQuests = input.activeQuests.map(q => ({
      id: q.id,
      title: q.title,
      description: q.description,
      type: q.type,
      moneyReward: q.moneyReward,
      currentObjectivesDescriptions: q.currentObjectivesDescriptions || []
    }));
  }
  if (input.encounteredPNJsSummary) {
    simplifiedInput.encounteredPNJsSummary = input.encounteredPNJsSummary.map(p => ({
      name: p.name,
      relationStatus: p.relationStatus 
    }));
  }
  if (input.currentCluesSummary) {
     simplifiedInput.currentCluesSummary = input.currentCluesSummary.map(c => ({ title: c.title, type: c.type}));
  }
  if (input.currentDocumentsSummary) {
      simplifiedInput.currentDocumentsSummary = input.currentDocumentsSummary.map(d => ({ title: d.title, type: d.type}));
  }
  // Ensure toneSettings are passed through
  simplifiedInput.toneSettings = input.toneSettings;


  return generateScenarioFlow(simplifiedInput);
}

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
  prompt: `You are a creative RPG game master, "Le Maître de l'Information Contextuelle," adept at creating engaging and dynamic scenarios for a text-based RPG set in modern-day France, often with an investigative or mystery element. The game is titled "Aujourd'hui RPG".

**Guiding Principles for Output (VERY IMPORTANT - STRICTLY ENFORCE):**
- **ABSOLUTE RULE:** The 'scenarioText' field MUST contain ONLY narrative and descriptive text intended for the player. It must read like a story or a game master's description.
- **STRICTLY PROHIBITED in 'scenarioText':**
    - ANY tool invocation syntax (e.g., \`getWeatherTool(...)\`, \`print(default_api.getNearbyPoisTool(...))\`, \`default_api.getWikipediaInfoTool(...)\`).
    - ANY mention of "tool", "API", "function call", "print", "default_api", or similar technical terms referring to the underlying system.
    - Raw JSON data, error messages from tools, or technical logs from tool executions.
    - Any text resembling programming code, function calls (e.g., \`print(...)\`, \`toolName(...)\`), or any internal system messages.
- Information obtained from tools (weather, POIs, news, Wikipedia) should be woven *seamlessly* and *naturally* into the narrative.
    - **CORRECT Example of using tool info:** "The sun shines brightly in the clear Parisian sky, and a nearby café called 'Le Petit Bistro' seems inviting."
    - **INCORRECT Example (DO NOT DO THIS):** "Tool output: weather: sunny. POIs: [{name: 'Le Petit Bistro'}]. The sun is sunny. I see Le Petit Bistro."
    - **INCORRECT Example (DO NOT DO THIS):** "print(getNearbyPoisTool(location='Paris')) found 'Le Petit Bistro'."
    - **INCORRECT Example (DO NOT DO THIS):** "default_api.getNearbyPoisTool(...) indicates several restaurants are nearby."
    - **INCORRECT Example (DO NOT DO THIS):** "After calling getWeatherTool, the weather is fine." // Do not mention calling the tool.
- Failure to adhere to these rules for 'scenarioText' will result in an invalid output.

Player Information (Context):
  Name: {{{playerName}}}
  Gender: {{{playerGender}}}
  Age: {{{playerAge}}}
  Origin: {{{playerOrigin}}}
  Background: {{{playerBackground}}}
  Current Stats: {{#each playerStats}}{{{@key}}}: {{{this}}} {{/each}}
  Skills: {{#each playerSkills}}{{{@key}}}: {{{this}}} {{/each}}
  Traits/Mental States: {{#if playerTraitsMentalStates}}{{#each playerTraitsMentalStates}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}Aucun{{/if}}
  Progression: Level {{{playerProgression.level}}}, XP: {{{playerProgression.xp}}} / {{{playerProgression.xpToNextLevel}}}
  Alignment: Chaos/Loyal: {{{playerAlignment.chaosLawful}}}, Bien/Mal: {{{playerAlignment.goodEvil}}}
  Money: {{{playerMoney}}} €
  Inventory: {{#if playerInventory}}{{#each playerInventory}}{{{name}}} ({{quantity}}){{#unless @last}}, {{/unless}}{{/each}}{{else}}Vide{{/if}}
  Current Location: {{{playerLocation.placeName}}} (latitude {{{playerLocation.latitude}}}, longitude {{{playerLocation.longitude}}}) - Consider day/night, specific district if known.
  Tone Preferences (0-100, 50=neutral):
  {{#if toneSettings}}
    {{#each toneSettings}}
      - {{{@key}}}: {{{this}}}.
    {{/each}}
    (Adapt narrative style: e.g., high Horreur = suspense; high Romance = emotional focus; high Humour = lighthearted situations; high Mystère = ambiguity; high Action = dynamic pace.)
  {{else}}
    (Default balanced tone)
  {{/if}}
  Active Quests (Summary): {{#if activeQuests}}{{#each activeQuests}}[{{type}}] {{{title}}}: {{{description}}} (Objectifs: {{#if currentObjectivesDescriptions}}{{#each currentObjectivesDescriptions}}{{{this}}}{{#unless @last}}; {{/unless}}{{/each}}{{else}}Pas d'objectifs en cours.{{/if}}) {{#if moneyReward}}Récompense: {{{moneyReward}}}€{{/if}}{{#unless @last}}. {{/unless}}{{/each}}{{else}}Aucune quête active.{{/if}}
  Encountered PNJs (Summary): {{#if encounteredPNJsSummary}}{{#each encounteredPNJsSummary}}{{{name}}} (Relation: {{{relationStatus}}}){{#unless @last}}, {{/unless}}{{/each}}{{else}}Aucun PNJ notable rencontré.{{/if}}
  Current Clues (Summary): {{#if currentCluesSummary}}{{#each currentCluesSummary}}Type: {{{type}}}, Titre: {{{title}}}{{#unless @last}}; {{/unless}}{{/each}}{{else}}Aucun indice découvert.{{/if}}
  Current Documents (Summary): {{#if currentDocumentsSummary}}{{#each currentDocumentsSummary}}Type: {{{type}}}, Titre: {{{title}}}{{#unless @last}}; {{/unless}}{{/each}}{{else}}Aucun document obtenu.{{/if}}
  Current Investigation Notes: {{{currentInvestigationNotes}}}
  Current Scenario Context (Previous Scene): {{{currentScenario}}}
Player's Typed Action (Last Choice): {{{playerChoice}}}

Task:
{{#if isReflectAction}}
  Generate an introspective 'scenarioText' (100-200 words, HTML formatted) reflecting the player character's current thoughts, detailed observations about their immediate surroundings, or a brief reminder of their active quest objectives or pressing concerns.
  This action should primarily provide narrative flavor and insight, reflecting current tone settings if specified.
  Generally, avoid significant game state changes like stat updates, XP gain, money changes, item additions/removals, or location changes unless a minor, natural consequence of reflection makes sense (e.g., remembering a small detail that updates investigation notes slightly).
  The output should still conform to the GenerateScenarioOutputSchema, but many optional fields (like scenarioStatsUpdate, xpGained, etc.) will likely be omitted or empty.
{{else}}
**Phase 1: Strategic Information Gathering & API Management**
   A. **Weather:** Use 'getWeatherTool' with the player's *current* coordinates ({{{playerLocation.latitude}}}, {{{playerLocation.longitude}}}) to get current weather (temperature, conditions: clear, cloudy, rain, fog, wind).
   B. **Local Environment (POIs):** If the player's action involves exploring, looking for a specific place, or if describing the environment would benefit, use 'getNearbyPoisTool'. Focus on the immediate vicinity. Identify types of streets, nearby businesses, parks, landmarks, urban density.
   C. **News Context:** Especially at the start of a new in-game day or if the player interacts with news sources (TV, radio, newspaper, internet), use 'getNewsTool' for France ('fr'). Fetch 3-5 *pertinent* headlines. Filter for news (global or local if in a major city) that could thematically (even distantly) relate to the game's mystery/thriller ambiance (technology, crime, politics, major cultural events) and selected TONE.
   D. **Wikipedia for Depth (PNJs & Locations):**
      i. **PNJs ("Les Visages du Savoir"):** When introducing new, significant PNJs (especially 'major' or 'recurring' ones), **strongly prefer basing them on real-world public figures (historical or contemporary, especially French) by using the 'getWikipediaInfoTool'**. Fetch their field of expertise, achievements, key biographical details. Adapt this real person to fit the current game scenario, timeline, and selected TONE.
      ii. **Iconic Locations:** If the player is at or interacts with a known landmark or historically significant place, use 'getWikipediaInfoTool' to fetch 1-2 notable historical or cultural facts to enrich the description, fitting the selected TONE.

**Phase 2: Information Filtering, Prioritization, and Synthesis**
   A. **Narrative Relevance & Tone:** For *all* information gathered (weather, POIs, news, Wikipedia facts), assess its direct relevance to the current plot, player's immediate goals, the action "{{{playerChoice}}}", AND the player's 'toneSettings'.
   B. **Ambiance:** Prioritize details that reinforce the "Thriller Urbain & Mystère Psychologique" mood OR the specific TONES requested by the player (e.g., high Horreur = unsettling weather; high Humour = an odd news headline).
   C. **Avoid Overload:** Select only the *most impactful* details. Do not dump raw API data.
   D. **Consistency vs. Freshness:** Favor recent API data, but if a strong narrative element was just established (e.g., heavy rain), ensure a smooth transition or explain rapid changes.
   E. **Mental Draft:** *Internally* combine the filtered weather, POI details, news snippets, and Wikipedia facts into a cohesive understanding of the current scene *before* writing, considering the chosen TONES.
   F. **Personalization:** Consider how the player's stats/mental state might color their perception of this synthesized information, influenced by TONES.
   G. **Identify Potential Clues:** Determine if any API-sourced information could serve as a subtle clue or trigger.

**Phase 3: Narrative Generation & Game State Updates**
   1.  Based on the *synthesized information* from Phase 2 (considering TONES), and ALL player information, generate a new 'scenarioText' (100-250 words, HTML formatted, no interactive elements). This text describes the outcome of "{{{playerChoice}}}" and sets the scene. Adhere strictly to the "Guiding Principles for Output" above. Explicitly state if and how the tone settings influenced the narrative (e.g., "The high 'Horreur' setting makes the shadows feel more menacing.").
   2.  Core Stat Updates: Provide 'scenarioStatsUpdate'.
   3.  XP Awards: Provide 'xpGained'.
   4.  Money Changes:
       *   Respect current money ({{{playerMoney}}} €). Actions requiring money are only possible if affordable.
       *   Use 'moneyChange' for direct gains/losses (finding cash, small purchases). Determine reasonable prices.
       *   Quest completion rewards go in 'moneyReward' within 'newQuests' or 'questUpdates' (game logic handles this).
   5.  Inventory Changes: Use 'itemsAdded' (with valid 'itemId' from master list) and 'itemsRemoved' (with 'itemName' from inventory).
   6.  Location Changes: 'newLocationDetails' if significant movement.
   7.  Quest Management:
       *   New Quests: Define in 'newQuests'. Set 'giver' for PNJ-given quests.
       *   Quest Updates: Define in 'questUpdates'.
   8.  PNJ Interactions ("Les Visages du Savoir" continued):
       *   When using Wikipedia info for a PNJ, weave details from their biography (expertise, personality traits influenced by TONES) into their description, dialogue, and role. Record/update these PNJs in 'pnjInteractions'.
   9.  Major Decisions: Log in 'majorDecisionsLogged'.
   10. Investigation Elements:
       *   Populate 'newClues' or 'newDocuments' if relevant. For 'photo' clues, use 'https://placehold.co/WIDTHxHEIGHT.png' with 'keywords'. For document 'content', use simple HTML.
       *   Provide concise 'investigationNotesUpdate' if the player's understanding evolves. Indicate additions/revisions.
{{/if}}

Always make the story feel real by mentioning famous people or real places from France. Actively seek opportunities to base PNJs on real individuals and use gathered information (Wikipedia, News) to add depth to their portrayal, adapting to selected TONES.
Ensure the output conforms to the JSON schema defined for GenerateScenarioOutputSchema.
`,
});

const generateScenarioFlow = ai.defineFlow(
  {
    name: 'generateScenarioFlow',
    inputSchema: GenerateScenarioInputSchema,
    outputSchema: GenerateScenarioOutputSchema,
  },
  async (input: GenerateScenarioInput) => {
    const isReflectAction = input.playerChoice === PLAYER_ACTION_REFLECT_INTERNAL_THOUGHTS;
    
    // Pass the original input along with the new boolean flag for template conditional logic
    const promptPayload: GenerateScenarioInput & { isReflectAction: boolean } = { ...input, isReflectAction };

    const {output} = await scenarioPrompt(promptPayload);
    if (!output) {
      console.error('AI model did not return output for generateScenarioPrompt.');
      throw new Error('AI model did not return output.');
    }
    return output;
  }
);
