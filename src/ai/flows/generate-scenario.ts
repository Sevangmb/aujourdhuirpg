
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
        style: "Vif, jeux de mots, ironique, exagéré.",
        ambiance: "Légère, absurde, cocasse.",
        dialogues: "Sarcastiques, moqueurs, pleins d'esprit.",
        actions: "Quêtes farfelues, choix comiques, improvisation.",
    },
    Action: {
        style: "Direct, percutant, rythme rapide, phrases courtes.",
        ambiance: "Tension, cinématique, mouvement constant.",
        dialogues: "Directs, ordres, concis.",
        actions: "Combat (utiliser 'startCombat'), poursuites, sauvetages, réactions rapides.",
    },
    Romantique: {
        style: "Métaphorique, sensoriel, poétique.",
        ambiance: "Intime, émotionnelle, contemplative.",
        dialogues: "Tendres, sincères, suggestifs.",
        actions: "Conversations profondes, admiration, moments partagés.",
    },
    Dramatique: {
        style: "Solennel, vocabulaire riche, rythme posé.",
        ambiance: "Pesante, introspective, conflits internes.",
        dialogues: "Chargés d'émotion, sérieux, réflexions profondes.",
        actions: "Dilemmes moraux, sacrifices, choix aux lourdes conséquences.",
    },
    Mystérieux: {
        style: "Elliptique, ambigu, suggestif.",
        ambiance: "Suspense, secrets, non-dits, indices subtils.",
        dialogues: "Cryptiques, allusifs, questions ouvertes.",
        actions: "Enquête, recherche d'indices, infiltration, résolution d'énigmes.",
    },
    Épique: {
        style: "Noble, grandiose, majestueux.",
        ambiance: "Héroïque, panoramas vastes, souffle de grandeur.",
        dialogues: "Solennels, prophétiques, discours marquants.",
        actions: "Grandes quêtes, batailles, actes héroïques, alliances.",
    },
    "Science-Fiction": {
        style: "Précis, technologique, conceptuel.",
        ambiance: "Futuriste, high-tech, étrange, merveilleux ou dystopique.",
        dialogues: "Logiques, techniques, explorant des concepts complexes.",
        actions: "Exploration technologique, énigmes scientifiques, conflits futuristes.",
    },
    Fantastique: {
        style: "Poétique, onirique, évocateur.",
        ambiance: "Magique, surnaturelle, merveilleuse et inquiétante.",
        dialogues: "Imagés, symboliques, parlant à des créatures.",
        actions: "Quêtes magiques, interaction avec le surnaturel, découverte de mythes.",
    },
    Thriller: {
        style: "Incisif, rythmé, nerveux, direct.",
        ambiance: "Tension psychologique, paranoïa, urgence, danger imminent.",
        dialogues: "Tendres, rapides, soupçonneux.",
        actions: "Poursuites, déjouer des complots, courses contre la montre.",
    },
    Horreur: {
        style: "Sensoriel, sombre, créant la tension.",
        ambiance: "Oppressante, angoissante, macabre, dérangeante.",
        dialogues: "Chuchotements, cris, désespoir, folie.",
        actions: "Survie, fuite, confrontation avec des monstruosités.",
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

const FULL_SCENARIO_PROMPT = `Vous êtes un maître de jeu (MJ) et narrateur créatif pour "Aujourd'hui RPG", un jeu de rôle textuel se déroulant en France à l'époque suivante : **{{{player.era}}}**. Votre écriture doit être en français, dans une police de caractère serif comme 'Literata'. Votre rôle est de raconter, pas de décider. Votre texte doit être aéré, avec des paragraphes (<p>) et des dialogues pertinents.

**TÂCHE PRINCIPALE :**
1.  **Narrer (scenarioText) :** Basé sur \`gameEvents\`, écrivez une narration HTML immersive qui décrit le résultat de l'action du joueur. C'est votre tâche la plus importante.
2.  **Proposer des choix (choices) :** Proposez 3-4 choix NARRATIFS et CRÉATIFS. Ne dupliquez pas les actions de \`suggestedContextualActions\`. Ne proposez jamais de choix d'attaque, utilisez \`startCombat\` à la place. Laissez les champs de coût et de gain vides, le moteur de jeu les calculera.
3.  **Suggérer des événements (optionnel) :** Si la narration le justifie, vous pouvez utiliser les champs optionnels comme \`newPNJs\`, \`newItems\`, \`pnjUpdates\`, etc. Utilisez-les avec parcimonie.

**PRINCIPES DIRECTEURS :**
- **FORMATAGE HTML :** Utilisez des balises \`<p>\` pour les paragraphes. Pour les dialogues, utilisez le format: \`<p><strong>Nom du PNJ :</strong> « ... »</p>\`.
- **TONALITÉ :** Suivez les instructions de tonalité. {{{toneInstructions}}}
- **COHÉRENCE :** Utilisez le contexte fourni (\`player\`, \`cascadeResult\`, etc.) pour une narration riche et cohérente.
- **OUTILS :** Utilisez les outils (\`getWeatherTool\`, etc.) si nécessaire pour enrichir le récit.

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

const FULL_PROLOGUE_PROMPT = `Vous êtes un maître de jeu (MJ) et narrateur créatif pour "Aujourd'hui RPG".

**TÂCHE PRINCIPALE : PROLOGUE**
Écrivez une scène d'introduction captivante en HTML pour le personnage suivant :
- **Personnage :** {{{player.name}}}, {{{player.gender}}} de {{{player.age}}} ans.
- **Contexte :** Époque "{{{player.era}}}", commençant à {{{player.currentLocation.name}}}. Passé : {{{player.background}}}.

Votre narration doit planter le décor, introduire le personnage, et suggérer le début d'une aventure.
Suivez les instructions de tonalité ci-dessous.
Proposez 3 choix narratifs initiaux dans le champ \`choices\`.

**Instructions de Tonalité :**
{{{toneInstructions}}}

**Format de Sortie :**
Assurez-vous de générer une sortie JSON valide avec les champs 'scenarioText' et 'choices'.
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
  prompt: FULL_SCENARIO_PROMPT,
});


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

    } catch (error: any) {
       console.error('Error in generateScenarioFlow calling prompt:', error);
       let errorMessage = "Erreur critique du modèle IA.";
       if (error.cause) {
           errorMessage += ` Cause: ${JSON.stringify(error.cause)}`;
       }
       return {
         scenarioText: `<p>Erreur critique: L'IA n'a pas pu générer de scénario. Veuillez réessayer ou vérifier la configuration du serveur.</p><p class="text-xs text-muted-foreground">${errorMessage}</p>`,
         choices: [{
          id: 'retry_action',
          text: "Réessayer l'action précédente",
          description: "Tenter de relancer la dernière action pour voir si l'IA répond cette fois.",
          iconName: 'Zap',
          type: 'action',
          mood: 'adventurous',
          consequences: ['Peut fonctionner', 'Peut échouer à nouveau'],
        }],
         aiRecommendation: { focus: 'Erreur', reasoning: errorMessage },
       };
    }
  }
);
