
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
import { getNearbyPoisTool } from '@/ai/tools/get-nearby-pois-tool'; // Import the new POI tool

const LocationSchema = z.object({
  latitude: z.number().describe('The latitude of the location.'),
  longitude: z.number().describe('The longitude of the location.'),
  placeName: z.string().describe('The human-readable name of the location (e.g., "Paris, France").'),
});

const SkillsSchema = z.record(z.number()).describe("Player's skills (e.g., {\"Informatique\": 10, \"Discretion\": 5}).");
const TraitsMentalStatesSchema = z.array(z.string()).describe("Player's current mental states or traits (e.g., [\"Stressé\", \"Observateur\"]).");

const ProgressionInputSchema = z.object({ // Schema for input to AI
  level: z.number().describe("Player's current level."),
  xp: z.number().describe("Player's current experience points."),
  xpToNextLevel: z.number().describe("XP needed for the player to reach the next level."),
  perks: z.array(z.string()).describe("Player's unlocked perks or passive abilities."),
});

const AlignmentSchema = z.object({
  chaosLawful: z.number().describe("Player's alignment on the Chaos/Lawful axis (-100 to 100)."),
  goodEvil: z.number().describe("Player's alignment on the Good/Evil axis (-100 to 100)."),
});

const InventoryItemInputSchema = z.object({
    name: z.string().describe("The name of the item."),
    quantity: z.number().describe("The quantity of the item."),
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
  playerProgression: ProgressionInputSchema, // Use the new input schema
  playerAlignment: AlignmentSchema,
  playerInventory: z.array(InventoryItemInputSchema).describe("A list of items the player currently possesses, with their names and quantities."),
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
  scenarioStatsUpdate: z.record(z.number()).optional().describe('A record of the changes that will happen to the player stats as a result of entering this new scenario (e.g., {"Sante": -10, "Intelligence": 5}). If there is no impact, the record can be empty or omitted.'),
  newLocationDetails: NewLocationDetailsSchema.optional(),
  xpGained: z.number().optional().describe("Experience points gained from this scenario's outcome, if any. Award reasonably (e.g., 5-50 XP)."),
  itemsAdded: z.array(z.object({ 
      itemId: z.string().describe("The unique ID of the item from the master item list (e.g. 'energy_bar_01', 'medkit_basic_01', 'mysterious_key_01', 'data_stick_01')."), 
      quantity: z.number().min(1).describe("Quantity of the item added.") 
    })).optional().describe("List of items to be added to the player's inventory if they discover something."),
  itemsRemoved: z.array(z.object({ 
      itemName: z.string().describe("The NAME of the item as it appears in player's inventory (e.g. 'Smartphone', 'Barre énergétique')."), 
      quantity: z.number().min(1).describe("Quantity of the item removed.") 
    })).optional().describe("List of items to be removed from the player's inventory if they use or lose something."),
});
export type GenerateScenarioOutput = z.infer<typeof GenerateScenarioOutputSchema>;

export async function generateScenario(input: GenerateScenarioInput): Promise<GenerateScenarioOutput> {
  return generateScenarioFlow(input);
}

const scenarioPrompt = ai.definePrompt({
  name: 'generateScenarioPrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  tools: [getWeatherTool, getWikipediaInfoTool, getNearbyPoisTool], // Add the POI tool
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
  Progression: Level {{{playerProgression.level}}}, XP: {{{playerProgression.xp}}} / {{{playerProgression.xpToNextLevel}}}
  Alignment: Chaos/Loyal: {{{playerAlignment.chaosLawful}}}, Bien/Mal: {{{playerAlignment.goodEvil}}}
  Inventory: {{#if playerInventory}}{{#each playerInventory}}{{{name}}} ({{quantity}}){{#unless @last}}, {{/unless}}{{/each}}{{else}}Vide{{/if}}
  Current Location: {{{playerLocation.placeName}}} (latitude {{{playerLocation.latitude}}}, longitude {{{playerLocation.longitude}}})

Current Scenario Context: {{{currentScenario}}} (This was the text of the previous scenario.)
Player's Typed Action (Last Choice): {{{playerChoice}}}

Task:
1.  Use the 'getWeatherTool' with the player's *current* coordinates ({{{playerLocation.latitude}}}, {{{playerLocation.longitude}}}) to find out the current weather conditions.
2.  If the player's action involves exploring the immediate surroundings, looking for a specific type of place (e.g., "je cherche un café", "où trouver un magasin ?", "y a-t-il un hôtel près d'ici ?"), or if simply describing the environment would benefit from knowing what's nearby, use the 'getNearbyPoisTool'.
    *   Provide the player's current latitude and longitude.
    *   You can specify a 'poiType' (e.g., "restaurant", "shop", "hotel", "tourism", "museum", "pharmacy") if the player's request is specific. If the player is just exploring, you can omit 'poiType' to get general amenities or use a broad category like "amenity" or "shop".
    *   The tool will return a list of nearby places.
3.  If the player's action or the scenario involves a specific, identifiable real-world place (e.g., "Musée du Louvre", "Mont Saint-Michel"), a historical figure, or a notable event that would benefit from factual context, consider using the 'getWikipediaInfoTool'. Provide the exact name as the 'searchTerm'.
4.  Incorporate the fetched weather, nearby POIs (if any), and Wikipedia information (if any) naturally and subtly into the scenario description. The goal is to enrich the story and provide context or options.
    *   For POIs: You might mention some of the found places, e.g., "En regardant autour de vous, vous remarquez une boulangerie animée, 'Le Pain Doré', et un petit café, 'Le Coin Tranquille', juste de l'autre côté de la rue." or "Votre recherche d'un hôtel vous indique que l'Hôtel Beau Séjour' est à quelques centaines de mètres."
    *   For Wikipedia: Focus on details that enhance immersion or provide interesting, brief context. Do NOT use Wikipedia for generic terms.
5.  Consider current events in France when creating the scenario if relevant and natural, but prioritize a fun and engaging player experience.
6.  Generate a new scenario based on ALL the player information (including their inventory) and their typed action: "{{{playerChoice}}}".
7.  The scenario text should be a narrative continuation of the story, describing what happens as a result of the player's action. It should be between 100 and 250 words and formatted as well-formed HTML (e.g., using <p> tags). It should NOT contain any interactive elements like buttons.
8.  Core Stat Updates: Provide 'scenarioStatsUpdate' for direct impacts on core stats.
9.  XP Awards: If the player's action represents an accomplishment, award XP via 'xpGained'.
10. Inventory Changes:
    *   Items Found/Gained: Populate 'itemsAdded' with 'itemId' (e.g. 'energy_bar_01', 'water_bottle_01', 'medkit_basic_01', 'map_paris_01', 'notebook_pen_01', 'mysterious_key_01', 'data_stick_01') and 'quantity'.
    *   Items Used/Lost: Populate 'itemsRemoved' with 'itemName' (from player's inventory) and 'quantity'.
11. Location Changes: If the player moves, provide 'newLocationDetails' with 'latitude', 'longitude', 'placeName', and 'reasonForMove'.

Always make the story feel real by mentioning famous people or real places from France whenever it makes sense.
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
    const {output} = await scenarioPrompt(input);
    if (!output) {
      console.error('AI model did not return output for generateScenarioPrompt.');
      throw new Error('AI model did not return output.');
    }
    return output;
  }
);

    