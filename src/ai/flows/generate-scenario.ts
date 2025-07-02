
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
  StoryChoiceSchema,
} from './generate-scenario-schemas';
import type { ToneSettings, BookSearchResult, GameTone } from '@/lib/types';


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

const PROMPT_INTRO = `Vous êtes un maître de jeu (MJ) et narrateur créatif pour "Aujourd'hui RPG", un jeu de rôle textuel se déroulant en France à l'époque suivante : **{{{player.era}}}**. Votre écriture doit être en français. Votre rôle est de raconter, pas de décider. Votre texte doit être aéré, avec des paragraphes (<p>) et des dialogues pertinents.`;

const PROMPT_CORE_TASK = `
**Tâche Principale : Raconter, Suggérer, et Animer le Monde**
Votre mission est quadruple :

1.  **Raconter l'Histoire (scenarioText) :** Le moteur de jeu a calculé les conséquences de l'action du joueur et vous fournit un résumé textuel dans \`gameEvents\`. Transformez ces faits bruts en une description narrative captivante en HTML. Soyez immersif, n'énumérez pas les faits. Intégrez des dialogues lorsque c'est pertinent pour rendre la scène vivante.

2.  **Générer des Choix NARRATIFS et CRÉATIFS (choices) :** C'est votre mission la plus importante. Le moteur de jeu génère déjà des actions contextuelles (manger, acheter...). Votre rôle est d'imaginer 3 à 4 actions possibles qui sont MÉMORABLES, CRÉATIVES, et qui FONT AVANCER L'HISTOIRE.
    - **EXIGENCES STRICTES :**
        - **Pensez comme un scénariste :** Quels choix créeraient du drame, du mystère, ou révéleraient quelque chose sur le monde ou le personnage ?
        - **NE CALCULEZ PAS :** Ne remplissez PAS les champs mécaniques comme \`energyCost\`, \`timeCost\`, ou \`skillGains\`. Le moteur de jeu s'en chargera.
        - **Soyez spécifique et inspiré :** Proposez des interactions sociales inattendues, des actions pour faire avancer une quête, ou des décisions morales complexes.
    - **À INTERDIRE FORMELLEMENT (Actions trop génériques ou gérées par la logique) :**
        - ❌ "Explorer les environs", "Observer les alentours"
        - ❌ "Parler à quelqu'un" (Préférez "Confronter le marchand sur son mensonge")
        - ❌ "Manger", "Boire", "Cuisiner", "Lire un livre", "Acheter Objet X" (Le moteur de jeu s'en occupe déjà via la logique contextuelle. Voir la liste dans \`suggestedContextualActions\`.)
        - ❌ **Ne créez JAMAIS de choix de combat (Attaquer, Fuir...). Utilisez le champ \`startCombat\` pour initier un combat si la narration l'exige.**
    - **EXEMPLES D'ACTIONS ATTENDUES :**
        - ✅ "Utiliser votre compétence en **survie.pistage** pour déceler une incohérence dans le témoignage du garde."
        - ✅ "Proposer au musicien de rue de l'accompagner avec votre vieil harmonica, espérant attirer une audience... et peut-être des informations."
        - ✅ "Graver discrètement un symbole mystérieux sur le banc, un signe de reconnaissance pour une société secrète à laquelle vous appartenez."
        - ✅ "Tenter de déverrouiller la vieille malle avec vos compétences en **techniques.contrefacon**."
        - ✅ "Essayer de persuader le garde de vous laisser entrer en utilisant **sociales.persuasion**."

3.  **Proposer des Changements au Monde (Événements de Jeu) :** Agissez comme un maître de jeu. Si votre narration le justifie, proposez des changements concrets.
    - Si un PNJ propose un travail, utilisez \`newQuests\` pour créer une quête. Pour un 'job', proposez un 'requiredSkill' pertinent comme 'techniques.artisanat_general'.
    - **Si la narration mène à un combat inévitable, utilisez \`startCombat\` pour introduire un ou plusieurs ennemis. Le moteur de jeu gérera ensuite le combat.**
    - Si le joueur trouve un portefeuille, utilisez \`newItems\` et \`newTransactions\`.
    - **Remplissez ces champs uniquement** si cela est logiquement justifié. Sinon, laissez-les vides.

4.  **Donner un Conseil Stratégique (aiRecommendation) :** Si pertinent, analysez la situation et donnez un conseil via le champ optionnel \`aiRecommendation\`.
`;

const PROMPT_CONTEXTUAL_ACTIONS_INSTRUCTIONS = `
**Contexte des Actions Logiques (Facultatif)**
Le moteur de jeu a déjà identifié les actions contextuelles suivantes.
{{#if suggestedContextualActions}}
Actions déjà proposées par la logique du jeu :
{{#each suggestedContextualActions}}
- {{this.text}}
{{/each}}
**Ne reproposez PAS ces actions.** Concentrez-vous sur des choix NARRATIFS et CRÉATIFS qui ne sont pas de simples interactions mécaniques.
{{/if}}
`;

const PROMPT_CASCADE_INSTRUCTIONS = `
**EXPLOITATION DU CONTEXTE DE LA CASCADE (TRÈS IMPORTANT)**
Le champ \`cascadeResult\` contient un résumé des informations générées par des modules spécialisés. **Utilisez ces informations pour enrichir votre narration et créer une ambiance cohérente.** Par exemple, si le résumé mentionne une opportunité de cuisiner, vous pouvez décrire l'odeur des épices dans l'air. Si le résumé mentionne un fait culturel, intégrez-le dans la description des lieux. Le moteur de jeu génère déjà les actions logiques (comme "Cuisiner le plat X"), votre rôle n'est donc **PAS** de créer ces actions, mais de créer une atmosphère qui les justifie.
`;

const PROMPT_GUIDING_PRINCIPLES = `
**Principes Directeurs (TRÈS IMPORTANT) :**
- **ADAPTATION NARRATIVE :** Suivez impérativement les instructions de tonalité ci-dessous.
{{{toneInstructions}}}
- **CONTEXTE ENRICHI :** Utilisez toutes les données fournies pour rendre votre narration VIVANTE, DÉTAILLÉE et COHÉRENTE.
  - **Cascade Modulaire :** ${PROMPT_CASCADE_INSTRUCTIONS}
  - **Actions Logiques :** ${PROMPT_CONTEXTUAL_ACTIONS_INSTRUCTIONS}
  
  {{#if player.recentActionTypes}}
  🔄 **ÉVITEZ LA RÉPÉTITION :** Les dernières actions du joueur étaient de type : {{player.recentActionTypes}}. Proposez des types d'actions narratifs différents.
  {{/if}}

- **UTILISATION DES OUTILS :** Utilisez les outils disponibles ('getWeatherTool', etc.) pour enrichir votre narration et générer des choix contextuels.
`;

const PROMPT_PLAYER_CONTEXT = `
**Contexte du Joueur et du Monde :**
- Joueur : {{{player.name}}}, {{{player.gender}}}, {{{player.age}}} ans. Passé : {{{player.background}}}.
- Lieu : {{{player.currentLocation.name}}}
- Argent : {{{player.money}}}€
- Physiologie : Faim: {{{player.physiology.basic_needs.hunger.level}}}/100, Soif: {{{player.physiology.basic_needs.thirst.level}}}/100.
- Scène Précédente : {{{previousScenarioText}}}
`;

const PROMPT_ACTION_AND_EFFECTS = `
**Action du Joueur et Conséquences Calculées par le Moteur :**
1.  **Action Saisie :** '{{{playerChoiceText}}}'
2.  **Résumé des Événements Déterministes à Raconter :** {{{gameEvents}}} (Utilisez ce résumé comme base factuelle pour votre narration immersive).
3.  **Contexte de la Cascade (Texte) :** {{{cascadeResult}}} (Utilisez ces informations pour la narration et les choix).

Sur la base de tout ce qui précède, générez la sortie JSON complète, incluant le 'scenarioText' et les 'choices'.
`;

const FULL_PROMPT = `
${PROMPT_INTRO}
${PROMPT_CORE_TASK}
${PROMPT_GUIDING_PRINCIPLES}
${PROMPT_PLAYER_CONTEXT}
${PROMPT_ACTION_AND_EFFECTS}
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
          energyCost: 0,
          timeCost: 0,
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
          energyCost: 0,
          timeCost: 0,
        }],
         aiRecommendation: { focus: 'Erreur', reasoning: 'Erreur critique du modèle IA.' },
       };
    }
  }
);
