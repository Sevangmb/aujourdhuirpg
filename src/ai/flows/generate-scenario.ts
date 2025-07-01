
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
import {z} from 'genkit';
import { getWeatherTool } from '@/ai/tools/get-weather-tool';
import { getWikipediaInfoTool } from '@/ai/tools/get-wikipedia-info-tool';
import { getNearbyPoisTool } from '@/ai/tools/get-nearby-pois-tool';
import { getNewsTool } from '@/ai/tools/get-news-tool';
import { getRecipesTool } from '@/ai/tools/get-recipes-tool';
import {
  GenerateScenarioInputSchema,
  GenerateScenarioOutputSchema,
} from './generate-scenario-schemas';
import type { ToneSettings } from '@/lib/types';


export type GenerateScenarioInput = z.infer<typeof GenerateScenarioInputSchema>;
export type GenerateScenarioOutput = z.infer<typeof GenerateScenarioOutputSchema>;

export async function generateScenario(input: GenerateScenarioInput): Promise<GenerateScenarioOutput> {
  if (!process.env.GOOGLE_API_KEY && !process.env.GEMINI_API_KEY) {
    console.warn("Genkit API key is not set. AI scenario generation is disabled.");
    return {
      scenarioText: `<p><strong>Fonctionnalité IA Indisponible</strong></p><p>La génération de scénario par l'IA est désactivée car la clé API nécessaire n'est pas configurée.</p>`,
      choices: [],
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
        instructions.push("Employez un style direct avec des phrases courtes et un rythme dynamique. Décrivez les mouvements et les impacts. Proposez des choix qui incitent à l'action rapide, à la prise de risque et à la confrontation physique. Si la situation le justifie, déclenchez un combat via 'combatEvent.startCombat'.");
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

1.  **Raconter l'Histoire (scenarioText) :** Le moteur de jeu a calculé les conséquences de l'action du joueur (\`gameEvents\`). Transformez ces événements bruts en une description narrative captivante en HTML. Soyez immersif, n'énumérez pas les faits.

2.  **Générer des Choix Créatifs et Uniques (choices) :** C'est la partie la plus importante. Vous DEVEZ générer 4 à 5 actions possibles pour le joueur qui sont MÉMORABLES, CRÉATIVES, et SPÉCIFIQUES au contexte.
    - **EXIGENCES STRICTES POUR LES CHOIX :**
        - **UTILISEZ L'INVENTAIRE :** Proposez des actions qui utilisent les objets du joueur de manière ingénieuse.
        - **ADAPTEZ-VOUS À L'ÉTAT PHYSIQUE :** Si le joueur est fatigué ou affamé, les choix doivent le refléter.
        - **PROPOSEZ DE LA VARIÉTÉ :** Offrez un éventail de risques et de récompenses.
        - **SOYEZ SPÉCIFIQUE :** Ne vous contentez pas d'un verbe, décrivez l'action.
    - **À INTERDIRE FORMELLEMENT (Actions trop génériques) :**
        - ❌ "Explorer les environs"
        - ❌ "Observer les alentours"
        - ❌ "Parler à quelqu'un"
        - ❌ "Chercher des informations"
    - **EXEMPLES D'ACTIONS ATTENDUES (Contextuelles et créatives) :**
        - ✅ "Négocier un portrait au fusain contre une anecdote sur Picasso." (Social + Compétence)
        - ✅ "Utiliser votre smartphone pour géolocaliser les œuvres de street art cachées dans la ruelle." (Inventaire + Exploration)
        - ✅ "Capturer le reflet des pavés mouillés avec votre appareil photo vintage." (Inventaire + Créativité)

3.  **Proposer des Changements au Monde (Événements de Jeu) :** Agissez comme un maître de jeu. En fonction de votre narration, vous pouvez proposer des changements concrets.
    - Si un PNJ propose un travail, utilisez \`newQuests\` pour créer une quête de type "job".
    - Si le joueur découvre un corps, utilisez \`newClues\` pour générer un indice.
    - Si le joueur trouve un portefeuille, utilisez \`newItems\` et \`newTransactions\`.
    - **Remplissez les champs** (\`newQuests\`, \`newPNJs\`, \`questUpdates\`, etc.) **uniquement** si cela est logiquement justifié par le récit. Sinon, laissez-les vides.

4.  **Donner un Conseil Stratégique (aiRecommendation) :** Si pertinent, analysez la situation globale du joueur (argent bas, quête importante) et donnez un conseil via le champ optionnel \`aiRecommendation\`.
`;

const PROMPT_CASCADE_INSTRUCTIONS = `
**EXPLOITATION DU CONTEXTE DE LA CASCADE (TRÈS IMPORTANT)**
Le champ \`cascadeResult\` contient des informations contextuelles ultra-riches générées par des modules spécialisés. Votre tâche est d'utiliser ces informations pour rendre votre narration vivante et pour créer des choix pertinents.

Voici comment interpréter les données de la cascade :

- **Si le module \`cuisine\` est présent dans \`cascadeResult.results\` :**
  - **Narration :** Décrivez les odeurs, les pensées du personnage sur une recette, ou l'ambiance d'une cuisine ou d'un restaurant. Utilisez les \`cookingOpportunities\` pour enrichir l'histoire.
  - **Choix :** Si \`cascadeResult.results.cuisine.data.cookableRecipes\` n'est pas vide, proposez un choix de type 'job' ou 'action' pour "Cuisiner [nom de la recette]". Si \`nearlyCookableRecipes\` existe, proposez un choix pour "Trouver les ingrédients manquants pour [nom de la recette]".

- **Si le module \`culture_locale\` est présent dans \`cascadeResult.results\` :**
  - **Narration :** Intégrez un détail historique ou culturel du \`summary\` dans les pensées du personnage ou dans la description d'un bâtiment. Par exemple : "En passant devant la fontaine, vous vous souvenez avoir lu que..."
  - **Choix :** Proposez un choix d'exploration lié à l'anecdote culturelle, comme "Chercher plus d'informations sur [détail historique]".

- **Si le module \`livre\` est présent dans \`cascadeResult.results\` :**
  - **Narration :** Décrivez le personnage en train de chercher ou trouver des livres. Mentionnez les titres trouvés dans \`cascadeResult.results.livre.data.foundBooks\`.
  - **Choix :** Pour chaque livre pertinent trouvé, proposez un choix de type 'action' pour "Lire le livre : [titre du livre]" ou "Acheter le livre : [titre du livre]". S'il n'y a pas de livres, proposez un choix pour "Continuer les recherches".

- **Pour tous les modules :** Lisez les messages et les données fournies et laissez-les inspirer votre récit. Si des opportunités sont listées, essayez de les transformer en choix d'action.
`;

const PROMPT_GUIDING_PRINCIPLES = `
**Principes Directeurs (TRÈS IMPORTANT) :**
- **ADAPTATION NARRATIVE :** Suivez impérativement les instructions de tonalité ci-dessous.
{{{toneInstructions}}}
- **SYSTÈME ÉCONOMIQUE POUR LES JOBS :** Lorsque vous générez une quête de type "job", la récompense monétaire, définie dans \`rewards.money\`, doit être cohérente avec le niveau de compétence du joueur et la nature du travail. Utilisez les Tiers suivants comme guide :
  - **Petits Boulots (5-15€):** Tâches simples ne nécessitant aucune compétence particulière (ex: distribuer des flyers, faire une course).
  - **Emploi Qualifié (15-30€):** Tâches nécessitant un niveau de compétence de base (10-25) dans un domaine pertinent (ex: aider un cuisinier, réparer un objet simple).
  - **Expertise (30-60€):** Tâches complexes nécessitant un niveau de compétence notable (25-50) (ex: rédiger un article technique, enquêter sur une piste difficile).
  - **Consulting (60-150€+):** Tâches de très haut niveau nécessitant une compétence avancée (>50) ou une combinaison de compétences rares (ex: décrypter des données complexes, négocier un accord commercial).
  Analysez les compétences du joueur (objet \`player.skills\`) pour proposer des jobs appropriés et fixer une récompense juste dans le champ \`rewards.money\`.

- **EXPLOITATION DU CONTEXTE JOUEUR :** Les actions que vous proposez DOIVENT être intelligentes et contextuelles.
  {{#if player.keyInventoryItems}}
  🎒 **OBJETS DISPONIBLES :** {{player.keyInventoryItems}}. Créez des actions qui utilisent ces objets de manière créative et logique.
  {{/if}}
  {{#if player.physiologicalState.needsFood}}
  🍽️ **JOUEUR AFFAMÉ :** Proposez au moins une action pour que le joueur puisse manger ou trouver de la nourriture.
  {{/if}}
  {{#if player.physiologicalState.isThirsty}}
  💧 **JOUEUR ASSOIFFÉ :** Proposez au moins une action pour que le joueur puisse boire.
  {{/if}}
  {{#if player.physiologicalState.needsRest}}
  😴 **JOUEUR FATIGUÉ :** Proposez des actions moins coûteuses en énergie ou qui permettent de se reposer.
  {{/if}}
  {{#if player.recentActionTypes}}
  🔄 **ÉVITEZ LA RÉPÉTITION :** Les dernières actions étaient de type : {{player.recentActionTypes}}. Proposez des types d'actions différents.
  {{/if}}

- **CONTEXTE ENRICHI :** Vous recevez des données enrichies. Utilisez-les pour rendre votre narration VIVANTE, DÉTAILLÉE et COHÉRENTE.
  - **Cascade Modulaire :** ${PROMPT_CASCADE_INSTRUCTIONS}
  - **Contexte Géographique :**
    {{#if nearbyEstablishments}}
    Les établissements suivants sont à proximité immédiate. Intègre-les NATURELLEMENT dans la narration et propose des actions uniques :
    {{#each nearbyEstablishments}}
    - **{{name}}** ({{subCategory}}), à environ {{distance}}m. Services notables: {{#each availableServices}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}.
    {{/each}}
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
2.  **Événements Déterministes à Raconter (Format JSON) :** {{{gameEvents}}} (Intégrez-les de manière immersive dans la narration).
3.  **Contexte de la Cascade (JSON Format) :** {{{cascadeResult}}} (Utilisez-le pour la narration et les choix comme indiqué dans les principes directeurs).

Sur la base de tout ce qui précède, générez la sortie JSON complète, incluant le 'scenarioText' et les 'choices'.
`;

const FULL_PROMPT = `
${PROMPT_INTRO}
${PROMPT_CORE_TASK}
${PROMPT_GUIDING_PRINCIPLES}
${PROMPT_PLAYER_CONTEXT}
${PROMPT_ACTION_AND_EFFECTS}
`;

// --- NEW SCHEMAS FOR CONTEXT ---
const PoiContextSchema = z.object({
  name: z.string(),
  type: z.string(),
  subCategory: z.string(),
  availableServices: z.array(z.string()),
  distance: z.number(),
});

const SuggestedActionContextSchema = z.object({
  text: z.string(),
  description: z.string(),
  type: z.string(),
  estimatedCost: z.object({ min: z.number(), max: z.number() }).optional(),
});


// --- PROMPTS DEFINITION ---

const scenarioPrompt = ai.definePrompt({
  name: 'generateScenarioPrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  tools: [getWeatherTool, getWikipediaInfoTool, getNearbyPoisTool, getNewsTool, getRecipesTool],
  input: {schema: GenerateScenarioInputSchema.extend({ 
    toneInstructions: z.string(),
    nearbyEstablishments: z.array(PoiContextSchema).optional(),
    suggestedContextualActions: z.array(SuggestedActionContextSchema).optional(),
  })},
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
- La sortie DOIT être du HTML valide.
- Fournissez 3 suggestions d'actions initiales dans le champ \`choices\` en respectant la structure complète de l'objet 'StoryChoice'.

Générez uniquement le 'scenarioText' et 'choices' pour le début de l'aventure.
`;

const FULL_PROLOGUE_PROMPT = `
${PROMPT_INTRO}
${PROLOGUE_PROMPT_TASK}
`;

const prologuePrompt = ai.definePrompt({
  name: 'generateProloguePrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  tools: [getWeatherTool, getWikipediaInfoTool, getNearbyPoisTool, getNewsTool, getRecipesTool],
  input: {schema: GenerateScenarioInputSchema.extend({ 
    toneInstructions: z.string(),
    nearbyEstablishments: z.array(PoiContextSchema).optional(),
    suggestedContextualActions: z.array(SuggestedActionContextSchema).optional(),
  })},
  output: {schema: GenerateScenarioOutputSchema},
  prompt: FULL_PROLOGUE_PROMPT,
});


// --- FLOW DEFINITION ---

const generateScenarioFlow = ai.defineFlow(
  {
    name: 'generateScenarioFlow',
    inputSchema: GenerateScenarioInputSchema,
    outputSchema: GenerateScenarioOutputSchema,
  },
  async (input: GenerateScenarioInput) => {
    const toneInstructions = generateToneInstructions(input.player?.toneSettings);
    // The input received by the flow already contains the enriched context fields
    // from prepareAIInput, so we just pass them along.
    const enrichedInput = { ...input, toneInstructions };

    const selectedPrompt = input.playerChoiceText === "[COMMENCER L'AVENTURE]"
      ? prologuePrompt
      : scenarioPrompt;

    try {
      const {output} = await selectedPrompt(enrichedInput as any); // Cast as any to handle extended schema

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
       };
    }
  }
);
