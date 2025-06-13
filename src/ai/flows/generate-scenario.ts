
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
  ClueInputSchema, // Import for type consistency if needed for internal logic
  DocumentInputSchema, // Import for type consistency
  QuestInputSchema as AIQuestInputSchema // Import for type consistency if needed for internal logic
} from './generate-scenario-schemas';

export type GenerateScenarioInput = z.infer<typeof GenerateScenarioInputSchema>;
export type GenerateScenarioOutput = z.infer<typeof GenerateScenarioOutputSchema>;

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
      relation: p.relationStatus // Corrected: was p.relation, should be p.relationStatus from input schema
    }));
  }
  // Add summarization for clues and documents if they exist
  if (input.currentCluesSummary) {
     simplifiedInput.currentCluesSummary = input.currentCluesSummary.map(c => ({ title: c.title, type: c.type}));
  }
  if (input.currentDocumentsSummary) {
      simplifiedInput.currentDocumentsSummary = input.currentDocumentsSummary.map(d => ({ title: d.title, type: d.type}));
  }


  return generateScenarioFlow(simplifiedInput);
}

const scenarioPrompt = ai.definePrompt({
  name: 'generateScenarioPrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  tools: [getWeatherTool, getWikipediaInfoTool, getNearbyPoisTool, getNewsTool],
  input: {schema: GenerateScenarioInputSchema},
  output: {schema: GenerateScenarioOutputSchema},
  prompt: `You are a creative RPG game master, adept at creating engaging and dynamic scenarios for a text-based RPG set in modern-day France, often with an investigative or mystery element.

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
  Money: {{{playerMoney}}} €
  Inventory: {{#if playerInventory}}{{#each playerInventory}}{{{name}}} ({{quantity}}){{#unless @last}}, {{/unless}}{{/each}}{{else}}Vide{{/if}}
  Current Location: {{{playerLocation.placeName}}} (latitude {{{playerLocation.latitude}}}, longitude {{{playerLocation.longitude}}})
  Active Quests (Summary): {{#if activeQuests}}{{#each activeQuests}}[{{type}}] {{{title}}}: {{{description}}} (Objectifs: {{#if currentObjectivesDescriptions}}{{#each currentObjectivesDescriptions}}{{{this}}}{{#unless @last}}; {{/unless}}{{/each}}{{else}}Pas d'objectifs en cours.{{/if}}) {{#if moneyReward}}Récompense: {{{moneyReward}}}€{{/if}}{{#unless @last}}. {{/unless}}{{/each}}{{else}}Aucune quête active.{{/if}}
  Encountered PNJs (Summary): {{#if encounteredPNJsSummary}}{{#each encounteredPNJsSummary}}{{{name}}} (Relation: {{{relation}}}){{#unless @last}}, {{/unless}}{{/each}}{{else}}Aucun PNJ notable rencontré.{{/if}}
  Current Clues (Summary): {{#if currentCluesSummary}}{{#each currentCluesSummary}}Type: {{{type}}}, Titre: {{{title}}}{{#unless @last}}; {{/unless}}{{/each}}{{else}}Aucun indice découvert.{{/if}}
  Current Documents (Summary): {{#if currentDocumentsSummary}}{{#each currentDocumentsSummary}}Type: {{{type}}}, Titre: {{{title}}}{{#unless @last}}; {{/unless}}{{/each}}{{else}}Aucun document obtenu.{{/if}}
  Current Investigation Notes: {{{currentInvestigationNotes}}}

Current Scenario Context: {{{currentScenario}}} (This was the text of the previous scenario.)
Player's Typed Action (Last Choice): {{{playerChoice}}}

Task:
1.  Use the 'getWeatherTool' with the player's *current* coordinates ({{{playerLocation.latitude}}}, {{{playerLocation.longitude}}}) to find out the current weather conditions.
2.  If the player's action involves exploring the immediate surroundings, looking for a specific type of place, or if describing the environment would benefit from knowing what's nearby, use the 'getNearbyPoisTool'.
3.  If the player's action, the scenario, or an emerging PNJ involves a specific, identifiable real-world place or public figure, consider using the 'getWikipediaInfoTool'.
4.  To make the world feel current, consider using the 'getNewsTool' (especially for 'fr' - France) at the beginning of a new game session or if the player interacts with news sources.
5.  Incorporate fetched weather, POIs, Wikipedia info, and news naturally.
6.  Generate a new scenario (100-250 words, HTML formatted, no interactive elements) based on ALL player information (including their money, inventory, active quests, PNJ relations) and their action: "{{{playerChoice}}}".
7.  Core Stat Updates: Provide 'scenarioStatsUpdate'.
8.  XP Awards: Provide 'xpGained'.
9.  Money Changes:
    *   If the player gains or loses money (e.g., finding cash, paying for something, receiving a small immediate reward NOT tied to quest completion), set 'moneyChange' to the amount (positive for gain, negative for loss).
    *   For quest completion rewards, use 'moneyReward' within the 'newQuests' or 'questUpdates' objects.
10. Inventory Changes: 'itemsAdded' (with 'itemId' like 'energy_bar_01', 'data_stick_01') and 'itemsRemoved' (with 'itemName').
11. Location Changes: 'newLocationDetails' if the player moves significantly.
12. Quest Management:
    *   New Quests: Define in 'newQuests'. Include 'moneyReward' if applicable. **If a PNJ gives the quest, ensure the PNJ's name or a descriptive ID is set in the 'giver' field of the QuestInputSchema.** Quests should be logical and fit the context.
    *   Quest Updates: Define in 'questUpdates'. If a quest is completed and has a 'moneyReward', the player should receive this money (reflect this implicitly in the story, the game logic will handle the actual money addition based on the quest definition).
13. PNJ Interactions:
    *   Proactively introduce new PNJs or have existing ones interact. They can be sources of information, quests, conflict, or aid.
    *   Strongly consider basing new major/recurring PNJs on real-world public figures (historical or contemporary, especially French) using 'getWikipediaInfoTool' for background. Integrate these details naturally.
    *   Record/update PNJ details in 'pnjInteractions'.
14. Major Decisions: Log in 'majorDecisionsLogged'.
15. Investigation Elements:
    *   If the player's action leads to the discovery of clues or documents relevant to an ongoing mystery or quest, populate 'newClues' or 'newDocuments'.
        *   Clues ('newClues') are typically observations, photos, short testimonies, or small physical items. For 'photo' type clues, use a placeholder URL from 'https://placehold.co/WIDTHxHEIGHT.png' and add relevant 'keywords'.
        *   Documents ('newDocuments') are more text-heavy items like letters, articles, notes, reports. For 'content', use simple HTML if needed (e.g. <p>, <ul>). Provide relevant 'keywords'.
    *   If the scenario or player action significantly advances an investigation or changes the player's understanding, provide a concise update in 'investigationNotesUpdate'. This text will be appended to or integrated with the player's existing notes. Indicate if this is an addition or a concise revision of existing notes.

Always make the story feel real by mentioning famous people or real places from France. Actively seek opportunities to base PNJs on real individuals and use gathered information (Wikipedia, News) to add depth to their portrayal.
Ensure the output conforms to the JSON schema defined for GenerateScenarioOutputSchema.
Be mindful of the player's current money. Actions that require money (e.g., buying an item, paying for a service) should only be possible if the player has enough money. If they don't, the scenario should reflect this limitation.
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
