
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
  GenerateScenarioOutputSchema
} from './generate-scenario-schemas'; // Import Zod schemas

// Export TypeScript types inferred from Zod schemas
export type GenerateScenarioInput = z.infer<typeof GenerateScenarioInputSchema>;
export type GenerateScenarioOutput = z.infer<typeof GenerateScenarioOutputSchema>;

export async function generateScenario(input: GenerateScenarioInput): Promise<GenerateScenarioOutput> {
  // Simplifier l'input pour l'IA concernant les quêtes actives et PNJ
  const simplifiedInput = { ...input };
  if (input.activeQuests) {
    // @ts-ignore
    simplifiedInput.activeQuests = input.activeQuests.map(q => ({
      id: q.id,
      title: q.title,
      description: q.description,
      type: q.type,
      // @ts-ignore
      currentObjectivesDescriptions: q.objectives ? q.objectives.map(obj => obj.description) : []
    }));
  }
  // This check was missing for encounteredPNJsSummary, which could lead to an error if it's undefined
  if (input.encounteredPNJsSummary) {
    // @ts-ignore
    simplifiedInput.encounteredPNJsSummary = input.encounteredPNJsSummary.map(p => ({
      name: p.name,
      // @ts-ignore // Assuming the input 'p' object has 'relationStatus' based on previous logic
      relation: p.relationStatus
    }));
  }


  return generateScenarioFlow(simplifiedInput);
}

const scenarioPrompt = ai.definePrompt({
  name: 'generateScenarioPrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  tools: [getWeatherTool, getWikipediaInfoTool, getNearbyPoisTool, getNewsTool],
  input: {schema: GenerateScenarioInputSchema}, // Use imported Zod schema
  output: {schema: GenerateScenarioOutputSchema}, // Use imported Zod schema
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
  Progression: Level {{{playerProgression.level}}}, XP: {{{playerProgression.xp}}} / {{{playerProgression.xpToNextLevel}}}
  Alignment: Chaos/Loyal: {{{playerAlignment.chaosLawful}}}, Bien/Mal: {{{playerAlignment.goodEvil}}}
  Inventory: {{#if playerInventory}}{{#each playerInventory}}{{{name}}} ({{quantity}}){{#unless @last}}, {{/unless}}{{/each}}{{else}}Vide{{/if}}
  Current Location: {{{playerLocation.placeName}}} (latitude {{{playerLocation.latitude}}}, longitude {{{playerLocation.longitude}}})
  Active Quests (Summary): {{#if activeQuests}}{{#each activeQuests}}[{{type}}] {{{title}}}: {{{description}}} (Objectifs: {{#each currentObjectivesDescriptions}}{{{this}}}{{#unless @last}}; {{/unless}}{{/each}}){{#unless @last}}. {{/unless}}{{/each}}{{else}}Aucune quête active.{{/if}}
  Encountered PNJs (Summary): {{#if encounteredPNJsSummary}}{{#each encounteredPNJsSummary}}{{{name}}} (Relation: {{{relation}}}){{#unless @last}}, {{/unless}}{{/each}}{{else}}Aucun PNJ notable rencontré.{{/if}}


Current Scenario Context: {{{currentScenario}}} (This was the text of the previous scenario.)
Player's Typed Action (Last Choice): {{{playerChoice}}}

Task:
1.  Use the 'getWeatherTool' with the player's *current* coordinates ({{{playerLocation.latitude}}}, {{{playerLocation.longitude}}}) to find out the current weather conditions.
2.  If the player's action involves exploring the immediate surroundings, looking for a specific type of place (e.g., "je cherche un café", "où trouver un magasin ?", "y a-t-il un hôtel près d'ici ?"), or if simply describing the environment would benefit from knowing what's nearby, use the 'getNearbyPoisTool'.
    *   Provide the player's current latitude and longitude.
    *   You can specify a 'poiType' (e.g., "restaurant", "shop", "hotel", "tourism", "museum", "pharmacy") if the player's request is specific. If the player is just exploring, you can omit 'poiType' to get general amenities or use a broad category like "amenity" or "shop".
3.  If the player's action, the scenario, or an emerging Non-Player Character (PNJ) involves a specific, identifiable real-world place (e.g., "Musée du Louvre"), or if an *emerging PNJ could be based on a historical or contemporary public figure* (e.g., a famous artist, scientist, politician), consider using the 'getWikipediaInfoTool'. Provide the exact name of the place or person as the 'searchTerm' to fetch factual context.
4.  To make the world feel current and alive, consider using the 'getNewsTool' (especially for 'fr' - France) at the beginning of a new game session (if currentScenario is initial) or if the player interacts with news sources (TV, radio, internet cafe).
    *   The news should be woven into the narrative subtly – perhaps as background chatter, a headline glimpsed, or a topic of conversation for PNJs. It could inspire minor events or a general mood. Avoid just listing news.
5.  Incorporate the fetched weather, nearby POIs, Wikipedia information, and news (if any) naturally and subtly into the scenario description. The goal is to enrich the story and provide context or options.
    *   For POIs: You might mention some of the found places, e.g., "En regardant autour de vous, vous remarquez une boulangerie animée, 'Le Pain Doré', et un petit café, 'Le Coin Tranquille', juste de l'autre côté de la rue."
    *   For Wikipedia (places): Weave the *information and descriptions* obtained from the Wikipedia summary for places into the narrative. Describe places using details from their Wikipedia summary to make them more vivid and recognizable.
    *   For Wikipedia (PNJs): See point 13.
    *   For News: A radio in a cafe might be discussing a recent event, or a discarded newspaper headline could hint at something larger.
6.  Generate a new scenario based on ALL the player information (including their inventory, active quests, and PNJ relations) and their typed action: "{{{playerChoice}}}".
7.  The scenario text should be a narrative continuation of the story, describing what happens as a result of the player's action. It should be between 100 and 250 words and formatted as well-formed HTML (e.g., using <p> tags). It should NOT contain any interactive elements like buttons.
8.  Core Stat Updates: Provide 'scenarioStatsUpdate' for direct impacts on core stats.
9.  XP Awards: If the player's action represents an accomplishment, award XP via 'xpGained'.
10. Inventory Changes:
    *   Items Found/Gained: Populate 'itemsAdded' with 'itemId' (e.g. 'energy_bar_01', 'water_bottle_01', 'medkit_basic_01', 'map_paris_01', 'notebook_pen_01', 'mysterious_key_01', 'data_stick_01') and 'quantity'.
    *   Items Used/Lost: Populate 'itemsRemoved' with 'itemName' (from player's inventory) and 'quantity'.
11. Location Changes: If the player moves, provide 'newLocationDetails' with 'latitude', 'longitude', 'placeName', and 'reasonForMove'.
12. Quest Management:
    *   If the player's actions or the unfolding story naturally lead to a new quest (main or secondary), define it in 'newQuests'. Ensure quest IDs are unique and descriptive. Objectives should be clear.
    *   If an existing quest is progressed (e.g., an objective is met) or its status changes (e.g., completed, failed due to player action), provide details in 'questUpdates'.
13. PNJ Interactions:
    *   Proactively introduce new Non-Player Characters (PNJs) or have existing ones interact with the player when narratively appropriate.
    *   When creating a *new major or recurring PNJ*, strongly consider basing them on a real-world public figure (historical or contemporary, particularly from France or relevant to the story context). Use the 'getWikipediaInfoTool' to fetch their background by providing the person's name as 'searchTerm'.
    *   For *all* PNJs (new or existing), if they are based on a real person or if their background could be enriched by real-world information obtained via 'getWikipediaInfoTool', use the Wikipedia summary to add depth to their personality, dialogue, motivations, and how they are described. For instance, a PNJ based on a historical artist might talk about their past works or struggles in a way that reflects their known biography. A scientist PNJ might discuss concepts related to their field of expertise. Integrate these details subtly and naturally into the PNJ's character and the story.
    *   Record/update the PNJ's details in 'pnjInteractions'. Assign a unique ID. Describe their appearance/role, set their initial or new relation status, and importance. If based on a real person, ensure the description and interactions are inspired by, but not necessarily a direct copy of, their Wikipedia entry.
14. Major Decisions:
    *   If the player makes a choice with significant, lasting consequences, log it in 'majorDecisionsLogged'. Ensure the ID is unique.

Always make the story feel real by mentioning famous people or real places from France whenever it makes sense. For PNJs, *actively seek opportunities to base them on real individuals* and use the information gathered from tools like Wikipedia (using 'getWikipediaInfoTool') and NewsAPI (using 'getNewsTool') to add depth, accuracy, and flavor to their portrayal or description in the story.
Ensure the output conforms to the JSON schema defined for GenerateScenarioOutputSchema.
`,
});

const generateScenarioFlow = ai.defineFlow(
  {
    name: 'generateScenarioFlow',
    inputSchema: GenerateScenarioInputSchema, // Use imported Zod schema
    outputSchema: GenerateScenarioOutputSchema, // Use imported Zod schema
  },
  async (input: GenerateScenarioInput) => {
    // L'input ici est déjà simplifié par la fonction wrapper generateScenario
    const {output} = await scenarioPrompt(input);
    if (!output) {
      console.error('AI model did not return output for generateScenarioPrompt.');
      throw new Error('AI model did not return output.');
    }
    return output;
  }
);
