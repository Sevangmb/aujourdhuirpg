
'use server';
/**
 * @fileOverview Generates narrative scenarios for the RPG game based on player state and pre-calculated effects.
 * The AI now acts as a Game Master, able to generate not just text but also game events like quests and NPCs.
 *
 * - generateScenario - A function that generates a scenario narration and game events.
 * - GenerateScenarioInput - The input type for the generateScenario function.
 * - GenerateScenarioOutput - The return type for the generateScenario function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { getWeatherTool } from '@/ai/tools/get-weather-tool';
import { getWikipediaInfoTool } from '@/ai/tools/get-wikipedia-info-tool';
import { getNearbyPoisTool } from '@/ai/tools/get-nearby-pois-tool';
import { getNewsTool } from '@/ai/tools/get-news-tool';
import { getRecipesTool } from '@/ai/tools/get-recipes-tool';
import { getBookDetailsTool } from '@/ai/tools/get-book-details-tool';
import {
  GenerateScenarioInputSchema,
  GenerateScenarioOutputSchema,
} from './generate-scenario-schemas';
import type { ToneSettings, GameTone } from '@/lib/types';


export type GenerateScenarioInput = z.infer<typeof GenerateScenarioInputSchema>;
export type GenerateScenarioOutput = z.infer<typeof GenerateScenarioOutputSchema>;

export async function generateScenario(input: GenerateScenarioInput): Promise<GenerateScenarioOutput> {
  if (!process.env.GOOGLE_API_KEY && !process.env.GEMINI_API_KEY) {
    console.warn("Genkit API key is not set. AI scenario generation is disabled.");
    return {
      scenarioText: `<p><strong>Fonctionnalité IA Indisponible</strong></p><p>La génération de scénario par l'IA est désactivée car la clé API nécessaire n'est pas configurée.</p>`,
      choices: [],
      aiRecommendation: { focus: 'Erreur', reasoning: 'Clé API manquante.' },
    };
  }
  return generateScenarioFlow(input); 
}

const toneDetails: Record<GameTone, Record<string, string>> = {
    Humoristique: {
        style: "Langage vif, jeu de mots, exagérations, rythme rapide avec pauses comiques.",
        ambiance: "Ambiance légère, situations absurdes, détails cocasses, caricatures.",
        dialogues: "Sarcastiques, moqueurs, malicieux, ironie omniprésente.",
        actions: "Proposer des quêtes farfelues, des énigmes absurdes, et des choix permettant l'improvisation ou la plaisanterie.",
    },
    Action: {
        style: "Phrases courtes, verbes d’action, rythme haletant, parfois brutal.",
        ambiance: "Description cinématographique, scènes vives, mouvements rapides, sons percutants.",
        dialogues: "Directs, cris, ordres, échanges brefs.",
        actions: "Proposer des choix qui incitent à l'action rapide (combat, sauvetage, poursuite). Si la narration mène à un conflit, utiliser le champ 'startCombat'.",
    },
    Romantique: {
        style: "Langage métaphorique, images sensorielles, rythme fluide, moments calmes.",
        ambiance: "Atmosphère intime, descriptions sensuelles, mise en valeur des sentiments.",
        dialogues: "Doux, tendres, pleins d’émotions, souvent des silences lourds.",
        actions: "Suggérer des choix contemplatifs, comme savourer un moment, admirer une vue, ou engager une conversation intime.",
    },
    Dramatique: {
        style: "Style solennel, vocabulaire lourd, rythme posé, phrases longues.",
        ambiance: "Ambiance pesante, descriptions détaillées des émotions et conflits internes.",
        dialogues: "Lourds, réfléchis, chargés de sentiments, parfois conflictuels.",
        actions: "Mettre en scène des conflits moraux, des trahisons, des sacrifices, et des choix aux conséquences lourdes.",
    },
    Mystérieux: {
        style: "Style elliptique, ambigu, rythme variable, phrases incomplètes ou suggestives.",
        ambiance: "Atmosphère trouble, suspens latent, indices subtils.",
        dialogues: "Allusifs, cryptiques, réponses évasives, questions ouvertes.",
        actions: "Proposer des choix liés à l'enquête, au déchiffrage d’énigmes, à l'infiltration et à la recherche d’indices.",
    },
    Épique: {
        style: "Langage noble, solennel, rythme majestueux, phrases longues et rythmées.",
        ambiance: "Panorama vaste, descriptions panoramiques et héroïques, évocations de grandeur.",
        dialogues: "Solennels, rituels, discours héroïques, prononcés avec gravité.",
        actions: "Orienter vers de grandes quêtes, des batailles épiques, des alliances et des actes héroïques.",
    },
    "Science-Fiction": {
        style: "Langage précis, parfois jargon technique, rythmé selon la scène (rapide en action, posé en réflexion).",
        ambiance: "Décors high-tech, monde futuriste, ambiances souvent froides ou mystérieuses.",
        dialogues: "Logiques, rationnels, parfois distants ou froids, utilisant un jargon technologique.",
        actions: "Suggérer des choix liés à l'exploration spatiale, la résolution d’énigmes technologiques, ou des conflits interstellaires.",
    },
    Fantastique: {
        style: "Langage poétique, évocateur, rythme variable, passages atmosphériques.",
        ambiance: "Décors oniriques, détails magiques, ambiance à la fois belle et inquiétante.",
        dialogues: "Parfois cryptiques, poétiques, évocateurs, souvent mystérieux.",
        actions: "Proposer des quêtes magiques, des interactions avec des créatures surnaturelles, ou la résolution de malédictions.",
    },
    Thriller: {
        style: "Style court, incisif, rythmé, phrases nerveuses.",
        ambiance: "Ambiance tendue, atmosphère oppressante, description des réactions psychologiques.",
        dialogues: "Nerveux, paranoïaques, interrogatifs, parfois agressifs.",
        actions: "Mener vers des enquêtes, des poursuites, le déjouement de complots, la manipulation ou le sabotage.",
    },
    Horreur: {
        style: "Langage sensoriel, sombre, souvent lent pour créer la tension, phrases évocatrices.",
        ambiance: "Atmosphère oppressante, descriptions de la peur, du corps, de l’angoisse.",
        dialogues: "Murmures, cris, voix brisées, propos désespérés, folie latente.",
        actions: "Proposer des choix liés à la survie face à des monstres, la fuite de lieux maudits ou la résolution de mystères macabres.",
    },
};


function generateToneInstructions(toneSettings: ToneSettings | undefined): string {
  if (!toneSettings) {
    return "Le style narratif doit être équilibré et neutre.";
  }

  const activeTones = (Object.entries(toneSettings) as [GameTone, boolean][])
    .filter(([, isActive]) => isActive)
    .map(([toneName]) => toneName);

  if (activeTones.length === 0) {
    return "Le style narratif doit être équilibré et neutre.";
  }

  const instructions: string[] = [];
  instructions.push(`Le style narratif doit combiner les caractéristiques des tonalités suivantes:`);

  activeTones.forEach(toneName => {
    const details = toneDetails[toneName];
    if (details) {
      instructions.push(`\n**Pour le ton '${toneName}' :**`);
      instructions.push(`- **Style & Rythme :** ${details.style}`);
      instructions.push(`- **Ambiance & Descriptions :** ${details.ambiance}`);
      instructions.push(`- **Dialogues :** ${details.dialogues}`);
      instructions.push(`- **Types de Choix à Proposer :** ${details.actions}`);
    }
  });

  return `**Instructions de Tonalité Spécifiques :**\n${instructions.join('\n')}`;
}

const PROMPT_INTRO = `Vous êtes un maître de jeu (MJ) et narrateur créatif pour "Aujourd'hui RPG", un jeu de rôle textuel se déroulant en France à l'époque suivante : **{{{player.era}}}**. Votre écriture doit être en français, dans une police de caractère serif comme 'Literata'. Votre rôle est de raconter, pas de décider. Votre texte doit être aéré, avec des paragraphes (<p>) et des dialogues pertinents.`;

const PROMPT_CORE_TASK = `
**Tâche Principale : Raconter l'Histoire et Proposer des Actions Créatives**
Votre mission est simple et se déroule en trois temps :

1.  **RACONTER (scenarioText) :** Le moteur de jeu vous fournit un résumé des conséquences de l'action du joueur dans \`gameEvents\`. Transformez ces faits bruts en une narration immersive et captivante en HTML. Donnez vie à la scène avec des descriptions et des dialogues. C'est votre rôle principal.

2.  **IMAGINER (choices) :** Proposez 3 à 4 choix NARRATIFS et CRÉATIFS qui poussent l'histoire vers l'avant.
    - **Ne calculez JAMAIS** : Le moteur de jeu s'occupe de tous les aspects mécaniques (coûts, gains de compétences, etc.). Laissez ces champs vides.
    - **Pensez comme un scénariste :** Quels choix créeraient du drame, du mystère ou une opportunité intéressante ?
    - **Évitez la redondance :** Le champ \`suggestedContextualActions\` vous montre les actions logiques déjà disponibles. Ne les reproposez pas. Concentrez-vous sur ce qui est unique et mémorable.
    - **Pas de combat :** N'ajoutez jamais de choix "Attaquer" ou "Fuir". Utilisez plutôt le champ \`startCombat\` si la narration mène inévitablement à un conflit.

3.  **SUGGÉRER (champs optionnels) :** Si votre narration le justifie *logiquement*, vous pouvez proposer des événements.
    - Une rencontre inattendue ? Proposez un \`newPNJs\`.
    - Le joueur trouve un objet ? Proposez un \`newItems\`.
    - Laissez ces champs vides la plupart du temps.

**Principe d'Or : Vous êtes le conteur, pas le mécanicien.**
`;

const PROMPT_GUIDING_PRINCIPLES = `
**Principes Directeurs (TRÈS IMPORTANT) :**
- **ADAPTATION NARRATIVE :** Suivez impérativement les instructions de tonalité ci-dessous.
{{{toneInstructions}}}
- **CONTEXTE ENRICHI :** Utilisez toutes les données fournies (contexte du joueur, cascade, etc.) pour rendre votre narration VIVANTE, DÉTAILLÉE et COHÉRENTE.
- **UTILISATION DES OUTILS :** Utilisez les outils disponibles ('getWeatherTool', etc.) pour enrichir votre narration lorsque cela est pertinent.
`;

const PROMPT_CONTEXTUAL_INFO = `
**Contexte de l'Action et du Monde**
- **Joueur :** {{{player.name}}}, {{{player.gender}}}, {{{player.age}}} ans. Passé : {{{player.background}}}.
- **Lieu :** {{{player.currentLocation.name}}}
- **Contexte des Actions Logiques (Facultatif) :**
  {{#if suggestedContextualActions}}
  Le moteur de jeu a déjà identifié les actions contextuelles suivantes. Ne les reproposez PAS :
  {{#each suggestedContextualActions}}
  - {{this.text}}
  {{/each}}
  {{/if}}
- **Contexte de la Cascade (Infos Supplémentaires) :** {{{cascadeResult}}}

**Action du Joueur et Conséquences Calculées (Ce que vous devez raconter) :**
- **Action Saisie :** '{{{playerChoiceText}}}'
- **Résumé des Événements Déterministes à Raconter :** {{{gameEvents}}}

Sur la base de tout ce qui précède, générez la sortie JSON complète, incluant le 'scenarioText' et les 'choices'.
`;

const FULL_PROMPT = `
${PROMPT_INTRO}
${PROMPT_CORE_TASK}
${PROMPT_GUIDING_PRINCIPLES}
${PROMPT_CONTEXTUAL_INFO}
`;


const PromptInputSchema = GenerateScenarioInputSchema.extend({ 
  toneInstructions: z.string(),
});


const scenarioPrompt = ai.definePrompt({
  name: 'generateScenarioPrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  tools: [getWeatherTool, getWikipediaInfoTool, getNearbyPoisTool, getNewsTool, getRecipesTool, getBookDetailsTool],
  input: { schema: PromptInputSchema },
  output: { schema: GenerateScenarioOutputSchema },
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

const PROLOGUE_PROMPT_TASK = `
**Tâche Principale : Écrire un Prologue Captivant**
Vous commencez une nouvelle aventure de JDR textuel. Écrivez une scène d'introduction (un prologue) engageante en français pour un personnage avec les détails suivants :

- Nom : {{{player.name}}}
- Genre : {{{player.gender}}}
- Âge : {{{player.age}}}
- Époque : {{{player.era}}}
- Lieu de Départ : {{{player.currentLocation.name}}}
- Passé : {{{player.background}}}

Plantez le décor en fonction de l'Époque et du Lieu de Départ. Présentez le personnage et laissez entrevoir le début de son aventure.
{{{toneInstructions}}}

**Contraintes Importantes :**
- Le prologue doit être purement narratif et immersif, avec des paragraphes bien espacés.
- La sortie DOIT être du HTML valide.
- Fournissez 3 suggestions d'actions initiales NARRATIVES dans le champ \`choices\`.

Générez uniquement le 'scenarioText' et 'choices' pour le début de l'aventure.
`;

const FULL_PROLOGUE_PROMPT = `
${PROMPT_INTRO}
${PROLOGUE_PROMPT_TASK}
`;

const prologuePrompt = ai.definePrompt({
  name: 'generateProloguePrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  tools: [getWeatherTool, getWikipediaInfoTool, getNearbyPoisTool, getNewsTool, getRecipesTool, getBookDetailsTool],
  input: { schema: PromptInputSchema },
  output: { schema: GenerateScenarioOutputSchema },
  prompt: FULL_PROLOGUE_PROMPT,
});


const generateScenarioFlow = ai.defineFlow(
  {
    name: 'generateScenarioFlow',
    inputSchema: GenerateScenarioInputSchema, 
    outputSchema: GenerateScenarioOutputSchema,
  },
  async (input) => {
    const toneInstructions = generateToneInstructions(input.player?.toneSettings);
    const enrichedInput = { ...input, toneInstructions };

    const selectedPrompt = input.playerChoiceText === "[COMMENCER L'AVENTURE]"
      ? prologuePrompt
      : scenarioPrompt;

    try {
      const {output} = await selectedPrompt(enrichedInput); 

      if (!output) {
        throw new Error("AI model did not return any output.");
      }
      if (!output.choices || output.choices.length === 0) {
        output.choices = [{
          id: 'look_around',
          text: "Observer les alentours",
          description: "Prendre un moment pour analyser la situation et chercher de nouvelles options.",
          iconName: "Eye",
          type: 'observation',
          mood: 'contemplative',
          consequences: ['Nouvelles informations', 'Pas de changement majeur'],
        }];
      }
      return output;

    } catch (error) {
       console.error('Error in generateScenarioFlow calling prompt:', error);
       return {
         scenarioText: "<p>Erreur critique: L'IA n'a pas pu générer de scénario. Veuillez réessayer ou vérifier la configuration du serveur.</p>",
         choices: [{
          id: 'retry_action',
          text: "Réessayer l'action précédente",
          description: "Tenter de relancer la dernière action pour voir si l'IA répond cette fois.",
          iconName: 'Zap',
          type: 'action',
          mood: 'adventurous',
          consequences: ['Peut fonctionner', 'Peut échouer à nouveau'],
        }],
         aiRecommendation: { focus: 'Erreur', reasoning: 'Erreur critique du modèle IA.' },
       };
    }
  }
);
