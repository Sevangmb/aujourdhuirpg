
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


// --- REFACTORED PROMPT (IN FRENCH) ---

const PROMPT_INTRO = `Vous êtes un narrateur de JDR créatif, "Le Conteur", pour un jeu de rôle textuel se déroulant dans la France d'aujourd'hui, appelé "Aujourd'hui RPG". Votre rôle est de décrire les événements, pas de les décider. Votre écriture doit être en français.`;

const PROMPT_CORE_TASK = `
**Tâche Principale : Raconter, Ne Pas Calculer**
Votre mission première est de générer le champ 'scenarioText'. Ce texte doit être une description captivante et narrative de ce qui se passe après l'action du joueur.
Le moteur de jeu a déjà calculé toutes les conséquences mécaniques de l'action du joueur. Celles-ci vous sont fournies dans le champ d'entrée 'deterministicEvents'.
Vous DEVEZ intégrer ces événements de manière transparente dans votre narration. Le joueur doit avoir l'impression que ces événements font naturellement partie de l'histoire que vous racontez.

**Exemple :**
- Si 'deterministicEvents' contient : ["Le joueur a utilisé 'Petite Trousse de Soins' et a récupéré 25 points de vie."],
- Votre 'scenarioText' devrait ressembler à : "<p>Avec un soupir de soulagement, vous ouvrez la trousse de premiers secours. L'antiseptique pique un peu, mais la douleur s'estompe rapidement, et vous sentez une vague de vitalité vous envahir alors que vos blessures se referment.</p>"
- **N'écrivez PAS** : "Vous utilisez le kit de soin. Vous gagnez 25 points de vie." Le langage mécanique est pour le moteur de jeu, pas pour votre narration.
`;

const PROMPT_GUIDING_PRINCIPLES = `
**Principes Directeurs pour 'scenarioText' (TRÈS IMPORTANT) :**
- **RÈGLE ABSOLUE :** Le 'scenarioText' doit contenir UNIQUEMENT du texte narratif et descriptif en français, formaté en HTML.
- **STRICTEMENT INTERDIT :**
    - NE MENTIONNEZ PAS de mécaniques de jeu comme "changement de stats", "gain d'XP", "objet retiré", "quête mise à jour". Racontez le *ressenti* ou *l'observation* de ces événements.
    - N'INCLUEZ PAS de syntaxe d'appel d'outil (par exemple, getWeatherTool(...), print(...)).
    - NE MENTIONNEZ PAS "outil", "API", "appel de fonction", ou d'autres termes techniques.
- Les informations provenant des outils (météo, points d'intérêt, actualités) doivent être intégrées naturellement dans la description du monde.
    - **CORRECT :** "Le soleil brille, et un café voisin appelé 'Le Petit Bistro' semble accueillant."
    - **INCORRECT :** "Résultat de l'outil : météo : ensoleillé. POIs : Le Petit Bistro. Le soleil est ensoleillé. Je vois le bistro."
- **Le non-respect de ces règles entraînera une sortie invalide.**
`;

const PROMPT_PLAYER_CONTEXT = `
**Contexte du Joueur et du Monde (Pour Informer Votre Narration) :**
- Nom du Joueur : {{{playerName}}}, Genre : {{{playerGender}}}, Âge : {{{playerAge}}}
- Passé : {{{playerBackground}}}
- Lieu Actuel : {{{playerLocation.name}}}
- Stats Actuelles : {{#each playerStats}}{{{@key}}}: {{{this}}} {{/each}}
  (Utilisez les stats pour colorer vos descriptions. Une faible Energie = narration fatiguée ; un Stress élevé = ton anxieux.)
- Préférences de Tonalité : {{#if toneSettings}}{{#each toneSettings}}{{{@key}}}: {{{this}}} {{/each}}{{else}}(Tonalité équilibrée par défaut){{/if}}
  (Adaptez subtilement votre style d'écriture pour correspondre à ces tonalités.)
- Scène Précédente : {{{currentScenario}}}
`;

const PROMPT_ACTION_AND_EFFECTS = `
**Action du Joueur et Ses Conséquences Calculées :**

1.  **Action Saisie par le Joueur :** \`{{{playerChoice}}}\`

2.  **Événements Déterministes à Raconter (DOIVENT ÊTRE INCLUS) :**
    {{#if deterministicEvents}}
      {{#each deterministicEvents}}
      - {{{this}}}
      {{/each}}
    {{else}}
      - Aucun événement mécanique spécifique ne s'est produit. L'action du joueur mène à une conséquence purement narrative.
    {{/if}}

Sur la base de tout ce qui précède, générez le 'scenarioText' qui poursuit l'histoire.
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

// --- PROLOGUE PROMPT (IN FRENCH) ---
const PROLOGUE_PROMPT = `
${PROMPT_INTRO}

**Tâche Principale : Écrire un Prologue Captivant**
Vous commencez une nouvelle aventure de JDR textuel. Écrivez une scène d'introduction (un prologue) engageante en français pour un personnage avec les détails suivants :

- Nom : {{{playerName}}}
- Genre : {{{playerGender}}}
- Âge : {{{playerAge}}}
- Époque : {{{playerEra}}}
- Lieu de Départ : {{{playerStartingLocation}}}
- Passé : {{{playerBackground}}}

Plantez le décor en fonction de l'Époque et du Lieu de Départ choisis. Présentez le personnage et laissez entrevoir le début de son aventure. Le ton doit être influencé par les préférences de tonalité du joueur si elles sont disponibles.

**Contraintes Importantes :**
- Le prologue doit être purement narratif. N'incluez AUCUNE mécanique de jeu, statistique, inventaire ou référence explicite à des "tours" ou des "actions".
- Concentrez-vous sur la création de l'atmosphère et la présentation du personnage dans son environnement initial.
- La sortie DOIT être du HTML valide.
- N'utilisez PAS d'appels d'outils dans le prologue.

Sur la base des détails du personnage et du contexte de départ, générez le 'scenarioText' pour le début de l'aventure.
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
