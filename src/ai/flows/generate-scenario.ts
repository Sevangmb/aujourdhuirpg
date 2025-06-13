
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
import { getNewsTool } from '@/ai/tools/get-news-tool'; // Import the new news tool

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

// --- Schémas pour les Quêtes, PNJ, Décisions (pour l'input IA si nécessaire, et surtout pour l'output) ---
const QuestObjectiveInputSchema = z.object({
  id: z.string().describe("Identifiant unique de l'objectif (ex: 'trouver_document_x')."),
  description: z.string().describe("Description de ce que le joueur doit faire."),
  isCompleted: z.boolean().default(false).describe("Si l'objectif est complété (généralement false à la création).")
}).describe("Un objectif spécifique d'une quête.");

const QuestInputSchema = z.object({
  id: z.string().describe("Identifiant unique de la quête (ex: 'quete_principale_01', 'secondaire_cafe_mystere'). Doit être unique et mémorable."),
  title: z.string().describe("Titre de la quête."),
  description: z.string().describe("Description générale de la quête."),
  type: z.enum(['main', 'secondary']).describe("Type de quête (principale ou secondaire)."),
  status: z.enum(['active', 'inactive', 'completed', 'failed']).default('active').describe("Statut de la quête."),
  objectives: z.array(QuestObjectiveInputSchema).describe("Liste des objectifs de la quête."),
  giver: z.string().optional().describe("Nom du PNJ qui a donné la quête."),
  reward: z.string().optional().describe("Description textuelle de la récompense potentielle."),
  relatedLocation: z.string().optional().describe("Nom d'un lieu pertinent pour la quête."),
}).describe("Structure pour une nouvelle quête à ajouter au journal du joueur.");

const QuestUpdateSchema = z.object({
  questId: z.string().describe("ID de la quête existante à mettre à jour."),
  newStatus: z.enum(['active', 'completed', 'failed']).optional().describe("Nouveau statut de la quête si changé."),
  updatedObjectives: z.array(z.object({
    objectiveId: z.string().describe("ID de l'objectif à mettre à jour."),
    isCompleted: z.boolean().describe("Si l'objectif est maintenant complété.")
  })).optional().describe("Liste des objectifs dont le statut a changé."),
  newObjectiveDescription: z.string().optional().describe("Description d'un nouvel objectif ajouté à cette quête (rare). L'IA devrait préférer créer des sous-quêtes ou des quêtes séquentielles.")
}).describe("Structure pour mettre à jour une quête existante.");

const PNJInteractionSchema = z.object({
  id: z.string().describe("Identifiant unique du PNJ (ex: 'pnj_marie_cafe', 'pnj_detective_dupont'). Doit être unique et mémorable."),
  name: z.string().describe("Nom du PNJ."),
  description: z.string().describe("Brève description du PNJ ou de son rôle actuel."),
  relationStatus: z.enum(['friendly', 'neutral', 'hostile', 'allied', 'rival', 'unknown']).default('neutral').describe("Relation actuelle du joueur avec ce PNJ."),
  importance: z.enum(['major', 'minor', 'recurring']).default('minor').describe("Importance du PNJ dans l'histoire."),
  trustLevel: z.number().min(0).max(100).optional().describe("Niveau de confiance du PNJ envers le joueur (0-100)."),
  firstEncountered: z.string().optional().describe("Contexte de la première rencontre (si c'est la première fois)."),
  notes: z.array(z.string()).optional().describe("Notes à ajouter sur ce PNJ (actions mémorables, informations clés données).")
}).describe("Structure pour enregistrer ou mettre à jour une interaction avec un PNJ.");

const MajorDecisionSchema = z.object({
  id: z.string().describe("Identifiant unique pour cette décision (ex: 'choix_trahir_contact_paris')."),
  summary: z.string().describe("Résumé concis de la décision prise par le joueur."),
  outcome: z.string().describe("Conséquence immédiate ou prévue de cette décision."),
  scenarioContext: z.string().describe("Brève description du contexte du scénario au moment de la décision.")
}).describe("Structure pour enregistrer une décision majeure du joueur.");

// --- Fin des Schémas ---


const GenerateScenarioInputSchema = z.object({
  playerName: z.string().describe('The name of the player character.'),
  playerGender: z.string().describe("The player character's gender."),
  playerAge: z.number().describe("The player character's age."),
  playerOrigin: z.string().describe("The player character's origin (social, geographical)."),
  playerBackground: z.string().describe('The background or history of the player character.'),
  playerStats: z.record(z.number()).describe('A record of the player character stats (e.g., {"Sante": 100, "Charisme": 50}).'),
  playerSkills: SkillsSchema,
  playerTraitsMentalStates: TraitsMentalStatesSchema,
  playerProgression: ProgressionInputSchema,
  playerAlignment: AlignmentSchema,
  playerInventory: z.array(InventoryItemInputSchema).describe("A list of items the player currently possesses, with their names and quantities."),
  playerChoice: z.string().describe('The free-form text action the player typed.'),
  currentScenario: z.string().describe('The current scenario context (the HTML text of the previous scenario).'),
  playerLocation: LocationSchema.describe("The player's current location."),
  // Input pour l'état actuel du journal de quêtes, etc. pour que l'IA en tienne compte
  activeQuests: z.array(QuestInputSchema.omit({ status: true, objectives: true }).extend({ currentObjectivesDescriptions: z.array(z.string())})).optional().describe("Liste des quêtes actives du joueur (titre, description, objectifs actuels) pour contexte."),
  encounteredPNJsSummary: z.array(z.object({name: z.string(), relation: z.string()})).optional().describe("Résumé des PNJ importants déjà rencontrés et leur relation actuelle.")
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
  // Nouveaux champs pour le journal de quêtes, PNJ, décisions
  newQuests: z.array(QuestInputSchema).optional().describe("Liste des nouvelles quêtes initiées par ce scénario."),
  questUpdates: z.array(QuestUpdateSchema).optional().describe("Mises à jour des quêtes existantes (objectifs complétés, statut changé)."),
  pnjInteractions: z.array(PNJInteractionSchema).optional().describe("PNJ rencontrés ou dont la relation/information a changé de manière significative."),
  majorDecisionsLogged: z.array(MajorDecisionSchema).optional().describe("Décisions importantes prises par le joueur qui méritent d'être enregistrées."),
});
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
  if (input.encounteredPNJsSummary) {
    // @ts-ignore
    simplifiedInput.encounteredPNJsSummary = input.encounteredPNJsSummary.map(p => ({
      name: p.name,
      relation: p.relationStatus // Assumant que l'input a relationStatus
    }));
  }

  return generateScenarioFlow(simplifiedInput);
}

const scenarioPrompt = ai.definePrompt({
  name: 'generateScenarioPrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  tools: [getWeatherTool, getWikipediaInfoTool, getNearbyPoisTool, getNewsTool],
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
  Active Quests (Summary): {{#if activeQuests}}{{#each activeQuests}}[{{type}}] {{{title}}}: {{{description}}} (Objectifs: {{#each currentObjectivesDescriptions}}{{{this}}}{{#unless @last}}; {{/unless}}{{/each}}){{#unless @last}}. {{/unless}}{{/each}}{{else}}Aucune quête active.{{/if}}
  Encountered PNJs (Summary): {{#if encounteredPNJsSummary}}{{#each encounteredPNJsSummary}}{{{name}}} (Relation: {{{relation}}}){{#unless @last}}, {{/unless}}{{/each}}{{else}}Aucun PNJ notable rencontré.{{/if}}


Current Scenario Context: {{{currentScenario}}} (This was the text of the previous scenario.)
Player's Typed Action (Last Choice): {{{playerChoice}}}

Task:
1.  Use the 'getWeatherTool' with the player's *current* coordinates ({{{playerLocation.latitude}}}, {{{playerLocation.longitude}}}) to find out the current weather conditions.
2.  If the player's action involves exploring the immediate surroundings, looking for a specific type of place (e.g., "je cherche un café", "où trouver un magasin ?", "y a-t-il un hôtel près d'ici ?"), or if simply describing the environment would benefit from knowing what's nearby, use the 'getNearbyPoisTool'.
    *   Provide the player's current latitude and longitude.
    *   You can specify a 'poiType' (e.g., "restaurant", "shop", "hotel", "tourism", "museum", "pharmacy") if the player's request is specific. If the player is just exploring, you can omit 'poiType' to get general amenities or use a broad category like "amenity" or "shop".
3.  If the player's action, the scenario, or an emerging Non-Player Character (PNJ) involves a specific, identifiable real-world place (e.g., "Musée du Louvre"), a historical or contemporary public figure (e.g., a famous artist, scientist, politician encountered as a PNJ), or a notable event, consider using the 'getWikipediaInfoTool'. Provide the exact name as the 'searchTerm' to fetch factual context.
4.  To make the world feel current and alive, consider using the 'getNewsTool' (especially for 'fr' - France) at the beginning of a new game session (if currentScenario is initial) or if the player interacts with news sources (TV, radio, internet cafe).
    *   The news should be woven into the narrative subtly – perhaps as background chatter, a headline glimpsed, or a topic of conversation for PNJs. It could inspire minor events or a general mood. Avoid just listing news.
5.  Incorporate the fetched weather, nearby POIs, Wikipedia information, and news (if any) naturally and subtly into the scenario description. The goal is to enrich the story and provide context or options.
    *   For POIs: You might mention some of the found places, e.g., "En regardant autour de vous, vous remarquez une boulangerie animée, 'Le Pain Doré', et un petit café, 'Le Coin Tranquille', juste de l'autre côté de la rue."
    *   For Wikipedia: Weave the *information and descriptions* obtained from the Wikipedia summary (for both places and PNJs) into the narrative. For example, if a PNJ is based on a real person, you might subtly include details from their known biography or achievements in their dialogue or actions. For a place, describe it using details from its Wikipedia summary to make it more vivid and recognizable.
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
    *   If the player meets a new PNJ or significantly interacts with an existing one, record/update their details in 'pnjInteractions'. Assign a unique ID. Describe their appearance/role, set their initial or new relation status, and importance.
    *   Use Wikipedia for inspiration if a PNJ could be based on a real public figure, incorporating details subtly.
14. Major Decisions:
    *   If the player makes a choice with significant, lasting consequences, log it in 'majorDecisionsLogged'. Ensure the ID is unique.

Always make the story feel real by mentioning famous people or real places from France whenever it makes sense, using the information gathered from tools like Wikipedia and NewsAPI to add depth and accuracy to their portrayal or description in the story.
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
    // L'input ici est déjà simplifié par la fonction wrapper generateScenario
    const {output} = await scenarioPrompt(input);
    if (!output) {
      console.error('AI model did not return output for generateScenarioPrompt.');
      throw new Error('AI model did not return output.');
    }
    return output;
  }
);
