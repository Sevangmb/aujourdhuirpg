
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
  SimplifiedGenerateScenarioInputSchema, // Import the new schema
} from './generate-scenario-schemas';

export type GenerateScenarioInput = z.infer<typeof GenerateScenarioInputSchema>;
export type GenerateScenarioOutput = z.infer<typeof GenerateScenarioOutputSchema>;

// Infer the type from the Zod schema
export type SimplifiedGenerateScenarioInput = z.infer<typeof SimplifiedGenerateScenarioInputSchema>;

/**
 * A special string constant used in the `playerChoice` field of `GenerateScenarioInput`.
 * When `playerChoice` is equal to this string, the AI is instructed to generate
 * an introspective or reflective scenario (e.g., character's thoughts, observations)
 * rather than processing a direct player action.
 */
const PLAYER_ACTION_REFLECT_INTERNAL_THOUGHTS = "[PLAYER_ACTION_REFLECT_INTERNAL_THOUGHTS]";

/**
 * Simplifies the input for the AI model, primarily by truncating lengthy text fields
 * to keep the prompt concise and focused.
 *
 * @param input The original `GenerateScenarioInput` from the client.
 * @returns A `SimplifiedGenerateScenarioInput` object tailored for the AI prompt.
 */
function simplifyGenerateScenarioInput(input: GenerateScenarioInput): SimplifiedGenerateScenarioInput {
  const simplifiedInput: SimplifiedGenerateScenarioInput = { ...input };
  if (input.activeQuests) {
    simplifiedInput.activeQuests = input.activeQuests.map(q => ({
      id: q.id,
      title: q.title,
      description: q.description.substring(0,150) + "...",
      type: q.type,
      moneyReward: q.moneyReward,
      currentObjectivesDescriptions: (q.currentObjectivesDescriptions || [])
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
  // toneSettings is already part of GenerateScenarioInput and thus included in simplifiedInput by the spread operator.
  // simplifiedInput.toneSettings = input.toneSettings; // This line is redundant

  return simplifiedInput;
}

/**
 * The main entry point for generating a game scenario.
 * It takes the full player and game state, simplifies it, and then calls the Genkit flow
 * to interact with the AI model and produce the next part of the story.
 *
 * @param input The complete input data (`GenerateScenarioInput`) required to generate the scenario.
 * @returns A promise that resolves to the `GenerateScenarioOutput` from the AI.
 */
export async function generateScenario(input: GenerateScenarioInput): Promise<GenerateScenarioOutput> {
  const simplifiedInput = simplifyGenerateScenarioInput(input);
  return generateScenarioFlow(simplifiedInput);
}

// --- Prompt Sections ---

// 1. Introduction & Role Definition: Sets the AI's persona.
const PROMPT_INTRO = `You are a creative RPG game master, "Le Maître de l'Information Contextuelle," adept at creating engaging and dynamic scenarios for a text-based RPG set in modern-day France, often with an investigative or mystery element. The game is titled "Aujourd'hui RPG".`;

// 2. Core Output & Formatting Rules: Critical rules for how the AI should format its main narrative output ('scenarioText').
const PROMPT_GUIDING_PRINCIPLES = `
**Guiding Principles for Output (VERY IMPORTANT - STRICTLY ENFORCE):**
- **ABSOLUTE RULE:** The 'scenarioText' field MUST contain ONLY narrative and descriptive text intended for the player. It must read like a story or a game master's description.
- **STRICTLY PROHIBITED in 'scenarioText':**
    - ANY tool invocation syntax (e.g., getWeatherTool(...), print(default_api.getNearbyPoisTool(...)), default_api.getWikipediaInfoTool(...)).
    - ANY mention of "tool", "API", "function call", "print", "default_api", or similar technical terms referring to the underlying system.
    - Raw JSON data, error messages from tools, or technical logs from tool executions.
    - Any text resembling programming code, function calls (e.g., print(...), toolName(...)), or any internal system messages.
- Information obtained from tools (weather, POIs, news, Wikipedia) should be woven *seamlessly* and *naturally* into the narrative.
    - **CORRECT Example of using tool info:** "The sun shines brightly in the clear Parisian sky, and a nearby café called 'Le Petit Bistro' seems inviting."
    - **INCORRECT Example (DO NOT DO THIS):** "Tool output: weather: sunny. POIs: [{name: 'Le Petit Bistro'}]. The sun is sunny. I see Le Petit Bistro."
    - **INCORRECT Example (DO NOT DO THIS):** "print(getNearbyPoisTool(location='Paris')) found 'Le Petit Bistro'."
    - **INCORRECT Example (DO NOT DO THIS):** "default_api.getNearbyPoisTool(...) indicates several restaurants are nearby."
    - **INCORRECT Example (DO NOT DO THIS):** "After calling getWeatherTool, the weather is fine." // Do not mention calling the tool.
- Failure to adhere to these rules for 'scenarioText' will result in an invalid output.`;

// 3. Contextual Information - Player & Game State: Details about the player character, their stats, inventory, location, quests, etc.
const PROMPT_PLAYER_INFO_CONTEXT = `
Player Information (Context):
  Name: {{{playerName}}}
  Gender: {{{playerGender}}}
  Age: {{{playerAge}}}
  Origin: {{{playerOrigin}}}
  Background: {{{playerBackground}}}
  Current Stats: {{#each playerStats}}{{{@key}}}: {{{this}}} {{/each}}
    (Key Stats to consider:
      - Sante: Vitality. Low Sante can lead to weakness, injury. Death if 0.
      - Energie: Endurance. Low Energie leads to fatigue, penalties on actions, need for rest. Hallucinations or forced sleep possible at very low levels.
      - Stress: Mental tension. High Stress can cause errors, affect choices, trigger negative mental states/involuntary behaviors. Low is good.
      - Volonte: Mental fortitude. Influences ability to resist pressure, make hard choices, undertake risky/illegal actions.
      - Reputation: How others perceive the player. Affects PNJ interactions, opportunities, prices.
      - Charisme, Intelligence, Force: Standard RPG stats influencing relevant actions.)
  Skills: {{#each playerSkills}}{{{@key}}}: {{{this}}} {{/each}} (Core stats can influence skill checks implicitly.)
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
`;

// 4. Core Mechanics & Systems:
// 4.a. Instructions for how the AI should handle player actions that imply skill use or challenges.
const PROMPT_INTERNAL_SKILL_CHECK_SYSTEM = `
**Narrating Player Actions and Challenges (Invisible to Player):**
When the player attempts an action that would reasonably require a skill or challenge (e.g., hacking a computer, persuading a PNJ, picking a lock, a stealthy maneuver), describe the attempt and the immediate, observable situation in the 'scenarioText'.
Do not determine or narrate the final success or failure of the skill-based aspects of the action, nor its ultimate consequences on game mechanics like stats, inventory, or quests.
Focus on the narrative leading up to such a resolution, which will be handled by the game system.
Your description should provide enough context for the game system to then adjudicate the outcome based on the player's skills and the situation you've described.
For example, if a player tries to pick a lock, you might describe them approaching the door, examining the lock, and starting to work on it, noting any immediate environmental factors like poor lighting or nearby sounds. Avoid saying "You successfully picked the lock" or "Your attempt fails."
`;

// 5. Special Game Scenarios / Turn Types:
// 5.a. Specific instructions for the very first turn of the game if the location is unknown.
const PROMPT_INITIAL_LOCATION_SETUP = `
{{#if (eq playerLocation.placeName "Lieu de Départ Inconnu")}}
**Special First Turn: Initial Location Setup**
The player is starting a new game. Their initial coordinates are (lat: {{{playerLocation.latitude}}}, lon: {{{playerLocation.longitude}}}).
Your *ABSOLUTE PRIMARY GOAL* for this turn is to:
1.  **Identify a specific, plausible inhabited location (city, town, large village) at or very near these coordinates.**
    *   Use \\\`getNearbyPoisTool\\\` with the given coordinates. Look for POIs like 'town', 'village', 'city', or clusters of 'amenity', 'shop', 'tourism' that indicate a settlement. You might need to make several calls with different radii or POI types.
    *   You can also use \\\`getWikipediaInfoTool\\\` if you can infer a plausible region or large city name from the POIs or coordinates to get more context.
    *   **Prioritize finding a location in France if the coordinates are reasonably close to or within France. Otherwise, choose any interesting and plausible inhabited location globally.**
2.  **Handle Uninhabitable Areas:** If the initial coordinates are in a clearly uninhabitable area (e.g., open ocean, vast desert, ice cap), you MUST select a suitable *inhabited* place on the nearest relevant landmass or an accessible point (e.g., a port city if in the ocean, an oasis town if in a desert, a research station if in Antarctica). The goal is a *playable* start.
3.  **Update Location Details:** Once a suitable inhabited place is identified or decided:
    *   You **MUST** provide its specific name in \\\`newLocationDetails.placeName\\\`.
    *   You **MUST** provide its geographical coordinates in \\\`newLocationDetails.latitude\\\` and \\\`newLocationDetails.longitude\\\`. (These can be the original random coordinates if you determine they fall within the named place, or slightly adjusted coordinates if your tool use provides a more precise center for the named place).
    *   Include a \\\`newLocationDetails.reasonForMove\\\` like "Starting the game in [NomDeLaVille]".
4.  **Scenario Text:** The \\\`scenarioText\\\` for this first turn **MUST** describe the player character waking up or arriving in this *specific, named location* that you have determined. **DO NOT** describe them as being in "Lieu de Départ Inconnu" or an undefined place. Make it engaging.
5.  **Minimal Other Effects:** For this very first setup turn, keep other game state changes (stats, items, quests, etc.) minimal or non-existent, unless the narrative of their arrival strongly dictates a specific minor change (e.g., slight stress from waking up confused). The focus is location establishment.
6.  All other guiding principles (no tool calls in scenarioText etc.) still apply.

(End of Special First Turn Instructions - The rest of the prompt applies if this is not the first turn, or after location is set)
{{/if}}
`;

// 6. Main Task Definition & Processing Logic:
// 6.a. Simple "Task:" header.
const PROMPT_TASK_HEADER = `Task:`;

// 6.b. Instructions for when the player performs an introspective/reflective action.
// This prompt section contains a conditional block: {{#if isReflectAction}} ... {{else}} ... {{/if}}
// The {{else}} is part of this string, and the corresponding {{/if}} is in the FULL_PROMPT concatenation.
const PROMPT_TASK_REFLECT_ACTION = `
{{#if isReflectAction}}
  Generate an introspective 'scenarioText' (100-200 words, HTML formatted) reflecting the player character's current thoughts, detailed observations about their immediate surroundings, or a brief reminder of their active quest objectives or pressing concerns.
  This action should primarily provide narrative flavor and insight, reflecting current tone settings if specified. Use the tone settings to subtly influence the mood and focus of the reflection, but DO NOT mention the tone settings themselves in the scenarioText.
  Consider current player stats like Energie (low Energie might lead to tired thoughts) and Stress (high Stress might lead to anxious or paranoid reflections).
  **CRITICAL FOR 'scenarioText': This text MUST adhere to the "Guiding Principles for Output" detailed above, especially ensuring NO tool invocation syntax, API calls, print statements, or other technical details are included. It must be PURELY NARRATIVE.**
  Generally, avoid significant game state changes like stat updates, XP gain, money changes, item additions/removals, or location changes unless a minor, natural consequence of reflection makes sense (e.g., remembering a small detail that updates investigation notes slightly).
  The output should still conform to the GenerateScenarioOutputSchema, but many optional fields (like scenarioStatsUpdate, xpGained, etc.) will likely be omitted or empty.
{{else}}`; // Note: {{else}} is part of this string, the gameplay action intro follows.

// 6.c. Instructions for a standard gameplay action, part of the {{else}} block from PROMPT_TASK_REFLECT_ACTION.
// This section is active if 'isReflectAction' is false.
const PROMPT_TASK_GAMEPLAY_ACTION_INTRO = `
{{#unless (eq playerLocation.placeName "Lieu de Départ Inconnu")}}
Remember to consider the player's activeQuests and currentObjectivesDescriptions when evaluating their playerChoice and generating the scenario. The player might be trying to advance a quest.
Factor in new player stats: Energie (low means tired, high means active), Stress (high means negative thoughts/errors, low means calm), Volonte (influences choices in tough situations), Reputation (influences PNJ reactions).
For complex actions implied by '{{{playerChoice}}}', describe the player's attempt and the observable situation in the narrative. The game system will determine the mechanical outcome.
{{/unless}}`;

// 7. Phased Approach to Scenario Generation (Information Gathering, Synthesis, Narrative Output):
// These phases are generally part of the {{else}} block from PROMPT_TASK_REFLECT_ACTION.
// 7.a. Instructions for tool use to gather external information (weather, POIs, news, Wikipedia).
const PROMPT_PHASE_1_INFO_GATHERING = `
**Phase 1: Strategic Information Gathering & API Management**
{{#unless (eq playerLocation.placeName "Lieu de Départ Inconnu")}}
   A. **Weather:** Use 'getWeatherTool' with the player's *current* coordinates ({{{playerLocation.latitude}}}, {{{playerLocation.longitude}}}) to get current weather (temperature, conditions: clear, cloudy, rain, fog, wind).
   B. **Local Environment (POIs):** If the player's action involves exploring, looking for a specific place, or if a quest objective points to a type of location, use 'getNearbyPoisTool'. Focus on the immediate vicinity. Identify types of streets, nearby businesses, parks, landmarks, urban density.
   C. **News Context:** Especially at the start of a new in-game day or if the player interacts with news sources (TV, radio, newspaper, internet), use 'getNewsTool' for France ('fr'). Fetch 3-5 *pertinent* headlines. Filter for news (global or local if in a major city) that could thematically (even distantly) relate to the game's mystery/thriller ambiance (technology, crime, politics, major cultural events) and selected TONE.
   D. **Wikipédia pour PNJ et Lieux ("Les Visages du Savoir") :**
      i. **PNJ ("Les Visages du Savoir"):** When introducing new, significant PNJs (especially 'major' or 'recurring' ones, or those relevant to a quest), **STRONGLY PREFER basing them on real-world public figures (historical or contemporary, especially French) by using the 'getWikipediaInfoTool'**. Fetch their field of expertise, achievements, key biographical details. Adapt this real person to fit the current game scenario, timeline, and selected TONE. Actively seek opportunities to do this.
      ii. **Iconic Locations:** If the player is at or interacts with a known landmark or historically significant place (especially if relevant to a quest or clue), use 'getWikipediaInfoTool' to fetch 1-2 notable historical or cultural facts to enrich the description, fitting the selected TONE.
{{/unless}}`;

// 7.b. How to process and filter the gathered information.
const PROMPT_PHASE_2_INFO_SYNTHESIS = `
**Phase 2: Information Filtering, Prioritization, and Synthesis**
{{#unless (eq playerLocation.placeName "Lieu de Départ Inconnu")}}
   A. **Narrative Relevance & Tone:** For *all* information gathered (weather, POIs, news, Wikipedia facts), assess its direct relevance to the current plot, player's immediate goals, the action "{{{playerChoice}}}", AND the player's 'toneSettings'. Pay special attention to how this information can support or advance activeQuests and currentObjectivesDescriptions. Consider player stats (e.g., low Energie might make the player less perceptive of POIs, high Stress might make them misinterpret news).
   B. **Ambiance:** Prioritize details that reinforce the "Thriller Urbain & Mystère Psychologique" mood OR the specific TONES requested by the player (e.g., high Horreur = unsettling weather; high Humour = an odd news headline).
   C. **Avoid Overload:** Select only the *most impactful* details. Do not dump raw API data.
   D. **Consistency vs. Freshness:** Favor recent API data, but if a strong narrative element was just established (e.g., heavy rain), ensure a smooth transition or explain rapid changes.
   E. **Mental Draft:** *Internally* combine the filtered weather, POI details, news snippets, and Wikipedia facts into a cohesive understanding of the current scene *before* writing, considering the chosen TONES and player stats (Energie, Stress, Volonte, Reputation). This includes performing an internal skill check if "{{{playerChoice}}}" is a complex action.
   F. **Personalization:** Consider how the player's stats/mental state (especially Energie, Stress, Volonte) might color their perception of this synthesized information, influenced by TONES.
   G. **Identify Potential Clues:** Determine if any API-sourced information could serve as a subtle clue to advance an active quest or trigger a new one.
   H. **Quest Opportunities:** Based on the synthesized information and the player's current state/location, identify opportunities for new quests or for progressing existing ones. Could a news headline be the missing piece for an objective? Could a POI be the next step in an investigation? Could a Wikipedia PNJ be a quest giver (consider player Reputation)?
{{/unless}}`;

// 7.c. How to construct the narrative and update game state based on the synthesis.
// This section also handles the case for "Lieu de Départ Inconnu" within its logic.
const PROMPT_PHASE_3_NARRATIVE_GENERATION = `
**Phase 3: Narrative Generation & Game State Updates**
   1.  **Scenario Text Generation**:
       {{#if (eq playerLocation.placeName "Lieu de Départ Inconnu")}}
       Follow the "Initial Location Setup" instructions above to determine the actual starting location and generate the \`scenarioText\` and \`newLocationDetails\`.
       {{else}}
       Based on the *synthesized information* from Phase 2 (considering TONES and player stats like Energie, Stress, Volonte, Reputation), and ALL player information, generate a new 'scenarioText' (100-250 words, HTML formatted, no interactive elements). This text describes the player's attempted action related to "{{{playerChoice}}}" and the immediate, observable state of the environment or characters involved. The narrative should lead up to a point where a game mechanic (handled by the game system) would determine the detailed success, failure, or consequences. Adhere strictly to the "Guiding Principles for Output" above. The tone settings should subtly influence the narrative style, vocabulary, and focus, but **DO NOT explicitly mention the tone settings or their values in the 'scenarioText'**.

       **Item Interactions**: If the player uses or examines an item, describe the act of using or examining it and any immediate sensory feedback or observable changes. Do not determine the item's mechanical effects (e.g., health restored, door opened, information revealed).
       {{/if}}
   2.  **Location Changes**: If the player moves significantly, provide 'newLocationDetails'. This object **MUST** include 'latitude', 'longitude', and 'placeName'. If the new location is a specific place (e.g., a shop found via a POI tool) within the same general area as the input 'playerLocation', reuse the 'latitude' and 'longitude' from the input 'playerLocation' and update 'placeName' accordingly. If it's a new city or region, determine appropriate coordinates. If no significant location change, 'newLocationDetails' should be null or omitted. (This applies even if it's the first turn, as per "Initial Location Setup")
   3.  **Quest-Related Narrative**: If the player's actions or discoveries in the narrative seem to relate to their active quests, or could inspire new ones, weave these elements into the story. For example, the player might find an item mentioned in a quest objective, or encounter a character who seems to offer a new task. Describe these narrative events. The game system will handle the mechanical aspects of quest updates or creation.
   4.  **PNJ Interactions ("Les Visages du Savoir" continued)**: When using Wikipedia info for a PNJ, weave details from their biography (expertise, personality traits influenced by TONES) into their description, dialogue, and role. Record/update these PNJs in pnjInteractions. Describe the PNJ's initial demeanor and response to the player's words/actions based on the ongoing narrative and their established personality. The game system will handle any underlying mechanics like persuasion checks, which may influence the PNJ's future disposition or available dialogue.
   5.  **Major Decisions**: Log in majorDecisionsLogged if the narrative describes a significant choice made by the player that should be recorded for long-term consequence.
   6.  **Investigation Elements**:
       *   **Narrative Clues/Documents**: If the narrative leads to the player potentially discovering a clue or document, describe it in the \`scenarioText\` (e.g., 'You see a crumpled note on the floor,' or 'The ledger lies open on the desk.'). The game system will handle the mechanics of the player actually acquiring it as a formal clue or document.
       *   **Investigation Notes Update**: If the events of this scenario or new information (from tools, observations, or quest progression) lead to new insights, hypotheses, or connections from the player's perspective, provide text for 'investigationNotesUpdate'. To structure this, you can use prefixes like "NOUVELLE HYPOTHÈSE:", "CONNEXION NOTÉE:", or "MISE À JOUR:". The game logic will append this to existing notes. If you believe existing notes need substantial rewriting for clarity or to resolve contradictions due to new information, preface the entire new note content with "RÉVISION COMPLÈTE DES NOTES:". If no update is needed, omit 'investigationNotesUpdate' or set it to null.
`;

// 8. Conclusion & Final Reminders: Final reminders about realism, PNJ basing, and output schema.
const PROMPT_CONCLUSION = `
Always make the story feel real by mentioning famous people or real places from France. Actively seek opportunities to base PNJs on real individuals using 'getWikipediaInfoTool' and use gathered information (Wikipedia, News) to add depth to their portrayal, adapting to selected TONES.
Ensure the output conforms to the JSON schema defined for GenerateScenarioOutputSchema.
`;

// Concatenation of all prompt sections in the desired order.
// The {{/if}} closes the {{#if isReflectAction}} block started in PROMPT_TASK_REFLECT_ACTION.
const FULL_PROMPT = `
${PROMPT_INTRO}
${PROMPT_GUIDING_PRINCIPLES}
${PROMPT_PLAYER_INFO_CONTEXT}
${PROMPT_INTERNAL_SKILL_CHECK_SYSTEM}
${PROMPT_INITIAL_LOCATION_SETUP}
${PROMPT_TASK_HEADER}
${PROMPT_TASK_REFLECT_ACTION}
${PROMPT_TASK_GAMEPLAY_ACTION_INTRO}
// PROMPT_ITEM_CATEGORIES_REFERENCE is removed as itemsAdded/Removed are no longer AI responsibilities.
${PROMPT_PHASE_1_INFO_GATHERING}
${PROMPT_PHASE_2_INFO_SYNTHESIS}
${PROMPT_PHASE_3_NARRATIVE_GENERATION}
{{/if}} 
${PROMPT_CONCLUSION}
`;

/**
 * Defines the Genkit prompt for generating game scenarios.
 * This includes specifying the AI model, any tools (functions) the AI can call,
 * the expected input and output schemas, and the full prompt template string
 * which is constructed from various `PROMPT_` constants.
 * Input schema: `SimplifiedGenerateScenarioInputSchema`
 * Output schema: `GenerateScenarioOutputSchema`
 */
const scenarioPrompt = ai.definePrompt({
  name: 'generateScenarioPrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  tools: [getWeatherTool, getWikipediaInfoTool, getNearbyPoisTool, getNewsTool],
  input: {schema: SimplifiedGenerateScenarioInputSchema}, // Use the new schema
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

/**
 * Defines the Genkit AI flow for generating game scenarios.
 * This flow orchestrates the process of taking a simplified input,
 * passing it to the `scenarioPrompt` (which then calls the AI model),
 * and returning the AI's generated output.
 * Input schema: `SimplifiedGenerateScenarioInputSchema`
 * Output schema: `GenerateScenarioOutputSchema`
 */
const generateScenarioFlow = ai.defineFlow(
  {
    name: 'generateScenarioFlow',
    inputSchema: SimplifiedGenerateScenarioInputSchema, // Use the new schema
    outputSchema: GenerateScenarioOutputSchema,
  },
  async (input: SimplifiedGenerateScenarioInput) => {
    const isReflectAction = input.playerChoice === PLAYER_ACTION_REFLECT_INTERNAL_THOUGHTS;

    // The promptPayload now correctly reflects the structure of SimplifiedGenerateScenarioInput
    const promptPayload: SimplifiedGenerateScenarioInput & { isReflectAction: boolean } = { ...input, isReflectAction };

    const {output} = await scenarioPrompt(promptPayload);
    if (!output) {
      console.error('AI model did not return output for generateScenarioPrompt.');
      throw new Error('AI model did not return output.');
    }
    return output;
  }
);

