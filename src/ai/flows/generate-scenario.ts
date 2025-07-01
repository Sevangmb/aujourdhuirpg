
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
import type { ToneSettings, BookSearchResult } from '@/lib/types';


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


function generateToneInstructions(toneSettings: ToneSettings | undefined): string {
  if (!toneSettings || Object.keys(toneSettings).length === 0) {
    return "Le style narratif doit être équilibré et neutre.";
  }

  const instructions: string[] = [];
  const sortedTones = Object.entries(toneSettings).sort(([, a], [, b]) => b - a);

  const primaryTone = sortedTones[0];
  
  if (primaryTone && primaryTone[1] > 55) { // Main tone must be significant
    switch (primaryTone[0]) {
      case 'Horreur':
        instructions.push("Adoptez un style narratif sombre et oppressant. Utilisez un vocabulaire qui évoque le malaise et la tension. Décrivez les ombres, les bruits étranges. Proposez des choix liés à l'investigation du danger ou à la confrontation avec l'inconnu.");
        break;
      case 'Romance':
        instructions.push("Utilisez un style poétique et sensoriel. Décrivez les émotions, les regards, les atmosphères avec des métaphores. Proposez des choix contemplatifs, comme savourer un moment, admirer une vue, ou engager une conversation intime.");
        break;
      case 'Humour':
        instructions.push("Créez des situations cocasses et légères. Utilisez des dialogues pleins d'esprit et des descriptions ironiques. Proposez des choix qui permettent d'improviser, de faire une blague ou de prendre une situation à la légère.");
        break;
      case 'Mystère':
        instructions.push("Distillez des indices subtils et maintenez une ambiance ambiguë. Privilégiez les non-dits et les questions en suspens. Proposez des choix liés à l'examen de détails, à la déduction et à la recherche d'informations cachées.");
        break;
      case 'Action':
        instructions.push("Employez un style direct avec des phrases courtes et un rythme dynamique. Décrivez les mouvements et les impacts. Proposez des choix qui incitent à l'action rapide. Si la narration mène à un conflit, utilisez le champ 'startCombat' pour introduire un ennemi.");
        break;
      case 'Fantastique':
         instructions.push("Introduisez des éléments surnaturels ou magiques de manière subtile ou grandiose. Décrivez l'émerveillement, l'étrangeté. Proposez des choix qui permettent d'interagir avec le merveilleux, de découvrir des secrets anciens ou d'utiliser des capacités extraordinaires.");
        break;
      case 'Science Fiction':
         instructions.push("Intégrez des concepts technologiques avancés, des dilemmes futuristes ou des rencontres extraterrestres. Utilisez un vocabulaire technique mais évocateur. Proposez des choix liés à l'utilisation de la technologie, à l'exploration spatiale ou à des questionnements sur l'humanité.");
        break;
    }
  }

  if (instructions.length === 0) {
    return "Le style narratif doit être équilibré et neutre.";
  }

  return `**Instructions de Tonalité Spécifiques :** ${instructions.join(' ')}`;
}

// --- PROMPT COMPONENTS ---

const PROMPT_INTRO = `Vous êtes un maître de jeu (MJ) et narrateur créatif pour "Aujourd'hui RPG", un jeu de rôle textuel se déroulant en France à l'époque suivante : **{{{player.era}}}**. Votre écriture doit être en français. Votre rôle est de raconter, pas de décider.`;

const PROMPT_CORE_TASK = `
**Tâche Principale : Raconter, Suggérer, et Animer le Monde**
Votre mission est quadruple :

1.  **Raconter l'Histoire (scenarioText) :** Le moteur de jeu a calculé les conséquences de l'action du joueur et vous fournit un résumé textuel dans \`gameEvents\`. Transformez ces faits bruts en une description narrative captivante en HTML, en utilisant des paragraphes (<p>) bien espacés pour une lecture aérée. Soyez immersif, n'énumérez pas les faits. Utilisez des dialogues lorsque c'est pertinent.

2.  **Générer des Choix NARRATIFS et CRÉATIFS (choices) :** C'est votre mission la plus importante. Le moteur de jeu génère déjà des actions contextuelles (manger, acheter un café...). Votre rôle est d'imaginer 3 à 4 actions possibles qui sont MÉMORABLES, CRÉATIVES, et qui FONT AVANCER L'HISTOIRE.
    - **EXIGENCES STRICTES POUR VOS CHOIX :**
        - **Pensez comme un scénariste :** Quels choix créeraient du drame, du mystère, ou révéleraient quelque chose sur le monde ou le personnage ?
        - **NE CALCULEZ PAS les coûts et récompenses :** Ne remplissez PAS les champs mécaniques comme \`energyCost\`, \`timeCost\`, ou \`skillGains\`. Le moteur de jeu s'en chargera. Concentrez-vous sur la création d'actions narrativement intéressantes.
        - **Utilisez les PNJ et l'intrigue :** Proposez des interactions sociales inattendues, des actions pour faire avancer une quête, ou des décisions morales complexes.
        - **Soyez spécifique :** Ne vous contentez pas d'un verbe, décrivez l'action de manière évocatrice.
    - **À INTERDIRE FORMELLEMENT (Actions trop génériques ou gérées par la logique du jeu) :**
        - ❌ "Explorer les environs", "Observer les alentours"
        - ❌ "Parler à quelqu'un" (Préférez "Confronter le marchand sur son mensonge")
        - ❌ "Manger", "Boire", "Aller à [lieu proche]" (Le moteur de jeu s'en occupe déjà)
        - ❌ Ne créez **JAMAIS** de choix de combat (Attaquer, Fuir...). Utilisez le champ \`startCombat\` pour initier un combat si la narration l'exige.
    - **EXEMPLES D'ACTIONS ATTENDUES (Narratives et créatives) :**
        - ✅ "Utiliser votre compétence en observation pour déceler une incohérence dans le témoignage du garde."
        - ✅ "Proposer au musicien de rue de l'accompagner avec votre vieil harmonica, espérant attirer une audience... et peut-être des informations."
        - ✅ "Graver discrètement un symbole mystérieux sur le banc, un signe de reconnaissance pour une société secrète à laquelle vous appartenez."

3.  **Proposer des Changements au Monde (Événements de Jeu) :** Agissez comme un maître de jeu. En fonction de votre narration, vous pouvez proposer des changements concrets.
    - Si un PNJ propose un travail, utilisez \`newQuests\` pour créer une quête.
    - Si le joueur découvre un corps, utilisez \`newClues\` et \`startCombat\` avec un ennemi "Rat d'égout agressif".
    - Si le joueur trouve un portefeuille, utilisez \`newItems\` et \`newTransactions\`.
    - **Remplissez les champs** (\`newQuests\`, \`startCombat\`, \`newPNJs\`, etc.) **uniquement** si cela est logiquement justifié par le récit. Sinon, laissez-les vides.

4.  **Donner un Conseil Stratégique (aiRecommendation) :** Si pertinent, analysez la situation globale du joueur (argent bas, quête importante) et donnez un conseil via le champ optionnel \`aiRecommendation\`.
`;

const PROMPT_CASCADE_INSTRUCTIONS = `
**EXPLOITATION DU CONTEXTE DE LA CASCADE (TRÈS IMPORTANT)**
Le champ \`cascadeResult\` contient un résumé textuel des informations contextuelles générées par des modules spécialisés (culture, cuisine, etc.). **Utilisez ces informations pour enrichir votre narration.** Par exemple, si le résumé mentionne une opportunité de cuisiner, vous pouvez décrire l'odeur des épices dans l'air. Si le résumé mentionne un fait culturel, intégrez-le dans la description des lieux. Le moteur de jeu génère déjà les actions logiques (comme "Cuisiner le plat X"), votre rôle n'est donc **PAS** de créer ces actions, mais de créer une ambiance cohérente avec ces informations.
`;

const PROMPT_GUIDING_PRINCIPLES = `
**Principes Directeurs (TRÈS IMPORTANT) :**
- **ADAPTATION NARRATIVE :** Suivez impérativement les instructions de tonalité ci-dessous.
{{{toneInstructions}}}

- **GÉNÉRATION DE JOBS :** Lorsque vous générez une quête de type "job", vous devez fournir la compétence requise dans le champ \`requiredSkill\` de l'objet de la quête (par exemple, \`'technical.crafting'\`). Le moteur de jeu calculera la récompense monétaire en fonction du niveau de compétence du joueur. Ne fixez PAS la récompense vous-même.

- **CONTEXTE ENRICHI :** Vous recevez des données enrichies. Utilisez-les pour rendre votre narration VIVANTE, DÉTAILLÉE et COHÉRENTE.
  - **Cascade Modulaire :** ${PROMPT_CASCADE_INSTRUCTIONS}
  
  {{#if player.recentActionTypes}}
  🔄 **ÉVITEZ LA RÉPÉTITION :** Les dernières actions du joueur étaient de type : {{player.recentActionTypes}}. Proposez des types d'actions narratifs différents. Le moteur de jeu ajoutera des actions utilitaires (manger, boire, etc.) si nécessaire.
  {{/if}}

- **UTILISATION DES OUTILS POUR L'INSPIRATION :** Utilisez les outils disponibles ('getWeatherTool', 'getNearbyPoisTool', etc.) pour enrichir votre narration et générer des choix contextuels.
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


// --- PROMPTS DEFINITION ---

// This is the schema for the data passed to the prompt, including internal fields.
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
- Le prologue doit être purement narratif.
- La sortie DOIT être du HTML valide, utilisant des balises <p> pour une lecture aérée.
- Fournissez 3 suggestions d'actions initiales dans le champ \`choices\` en respectant la structure NARRATIVE de l'objet 'StoryChoice'. Ne vous préoccupez pas des valeurs mécaniques comme les coûts ou les gains.

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


// --- FLOW DEFINITION ---

const generateScenarioFlow = ai.defineFlow(
  {
    name: 'generateScenarioFlow',
    inputSchema: GenerateScenarioInputSchema, 
    outputSchema: GenerateScenarioOutputSchema,
  },
  async (input) => {
    const toneInstructions = generateToneInstructions(input.player?.toneSettings);
    // Construct the full object expected by the prompt
    const enrichedInput = { ...input, toneInstructions };

    const selectedPrompt = input.playerChoiceText === "[COMMENCER L'AVENTURE]"
      ? prologuePrompt
      : scenarioPrompt;

    try {
      const {output} = await selectedPrompt(enrichedInput); 

      if (!output) {
        throw new Error("AI model did not return any output.");
      }
      // Ensure the output conforms to the schema, especially the non-optional 'choices' field.
      if (!output.choices) {
        output.choices = [];
      }
      return output;

    } catch (error) {
       console.error('Error in generateScenarioFlow calling prompt:', error);
       return {
         scenarioText: "<p>Erreur critique: L'IA n'a pas pu générer de scénario. Veuillez réessayer ou vérifier la configuration du serveur.</p>",
         choices: [],
         aiRecommendation: { focus: 'Erreur', reasoning: 'Erreur critique du modèle IA.' },
       };
    }
  }
);
