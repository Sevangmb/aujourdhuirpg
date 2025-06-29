
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
import {
  GenerateScenarioInputSchema,
  GenerateScenarioOutputSchema,
} from './generate-scenario-schemas';
import { ACTION_TYPES, MOOD_TYPES, CHOICE_ICON_NAMES } from '@/lib/types/choice-types';


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


// --- REFACTORED PROMPT (IN FRENCH) ---

const PROMPT_INTRO = `Vous êtes un maître de jeu (MJ) et narrateur créatif pour "Aujourd'hui RPG", un jeu de rôle textuel se déroulant en France à l'époque suivante : **{{{playerEra}}}**. Votre écriture doit être en français.`;

const PROMPT_CORE_TASK = `
**Tâche Principale : Raconter l'Histoire ET Diriger le Jeu**
Votre mission a quatre volets :
1.  **Générer le 'scenarioText' :** Rédigez une description narrative captivante en HTML de ce qui se passe après l'action du joueur. Intégrez de manière transparente les 'deterministicEvents' fournis (conséquences déjà calculées par le moteur de jeu). **NE répétez PAS** les calculs de stats dans votre narration. Racontez le *ressenti*.
2.  **Générer des Événements de Jeu :** En tant que MJ, vous pouvez maintenant faire avancer le jeu. Si votre narration introduit une nouvelle quête, un nouveau PNJ, un objet à trouver, ou un changement financier, utilisez les champs de sortie appropriés (\`newQuests\`, \`newPNJs\`, \`itemsToAddToInventory\`, \`newTransactions\`, etc.) pour créer ces éléments.
    - **Mise à jour du Dossier d'Enquête :** Si le joueur fait une découverte majeure ou tire une conclusion, mettez à jour le champ \`updatedInvestigationNotes\` pour refléter cette nouvelle synthèse.
3.  **Générer des Choix Guidés (Actions Adaptatives - RÈGLE CRITIQUE) :** C'est une partie cruciale. Pour guider le joueur, peuplez le champ \`choices\` avec 3 ou 4 objets 'StoryChoice' riches et variés.
    - **Basé sur les Compétences :** Analysez attentivement le profil de compétences du joueur (\`playerSkills\`). Votre objectif est de rendre ses compétences utiles et gratifiantes.
        - **Proposez des Actions Pertinentes :** Créez des choix qui permettent au joueur d'utiliser ses **compétences les plus élevées**. Par exemple, si le joueur a une compétence élevée en \`social.persuasion\`, proposez un choix de dialogue complexe. S'il est fort en \`physical.stealth\`, proposez une option d'infiltration. Ces actions doivent inclure un \`skillCheck\` pertinent.
        - **Créez des opportunités de Jobs :** Le joueur doit gagner sa vie. Intégrez des opportunités de "jobs" (type: 'job') qui correspondent à ses compétences. Par exemple, une compétence en \`technical.finance\` pourrait mener à une mission de comptabilité; une compétence en \`physical.strength\` à un travail de déménageur. **IMPORTANT : Créez toujours ces jobs avec le statut `'inactive'`**. La narration doit présenter l'opportunité (ex: une annonce, une offre de PNJ) plutôt que de commencer la quête directement.
        - **Gérer l'acceptation de Jobs :** Si l'action du joueur indique qu'il accepte un job (ex: "j'accepte la mission de livraison"), générez un événement \`updatedQuests\` pour passer le statut de la quête correspondante à \`'active'\`.
    - **Variété d'Approches :** Proposez un mélange d'actions couvrant différents types (observation, action, social, etc.) et qui ouvrent des pistes narratives intéressantes. Évitez les choix génériques comme "Continuer" ou "Regarder autour".
    - **Structure Complète :** Chaque choix doit être un objet JSON avec les champs: id (unique, ex: 'chercher_indices'), text, description, iconName (choisir parmi: ${CHOICE_ICON_NAMES.join(', ')}), type (choisir parmi: ${ACTION_TYPES.join(', ')}), mood (choisir parmi: ${MOOD_TYPES.join(', ')}), energyCost (1-20), timeCost (5-60), consequences (2-3 mots-clés), et le \`skillCheck\` si applicable. Pour les choix qui font progresser une compétence (surtout ceux avec un skillCheck), spécifiez les gains d'expérience de compétence potentiels dans 'skillGains' (ex: {'cognitive.observation': 5}).
4.  **Générer une Recommandation Stratégique :** En tant que MJ, analysez la situation globale du joueur (quêtes, argent, compétences) et remplissez le champ optionnel \`aiRecommendation\` avec un conseil stratégique. Par exemple, si le joueur est à court d'argent, recommandez de se concentrer sur un job. Si un indice clé vient d'être trouvé, suggérez de poursuivre cette piste.
`;

const PROMPT_GUIDING_PRINCIPLES = `
**Principes Directeurs (TRÈS IMPORTANT) :**
- **RÈGLE D'OR :** Tout ce qui doit devenir un élément de jeu interactif (quête, objet, PNJ, transaction) DOIT être défini dans les champs de sortie JSON. Ne les laissez pas exister uniquement dans le 'scenarioText'.
- **INVENTAIRE INTELLIGENT :** Analysez l'inventaire détaillé du joueur (\`playerInventory\`). Créez des choix qui permettent d'utiliser des objets spécifiques. La narration peut faire référence à l'histoire d'un objet (\`memory.acquisitionStory\`) pour plus de cohérence. Par exemple, si le joueur a une clé trouvée au Louvre, proposez un choix pour l'essayer sur une serrure ancienne.
- **ÉVOLUTION DES OBJETS :** Certains objets, comme l'Appareil Photo Vintage, peuvent évoluer. Si le joueur utilise un tel objet de manière pertinente ou réussit une action avec, accordez-lui de l'expérience via le champ \`itemUpdates\`. Spécifiez l'instanceId de l'objet et le montant d'XP gagné.
- **RÈGLE ABSOLUE :** Le 'scenarioText' doit contenir UNIQUEMENT du texte narratif et descriptif en français, formaté en HTML.
- **SIMULATION ÉCONOMIQUE :** Le monde a un coût. Si le joueur achète un objet (café, journal), paie pour un service (ticket de métro, entrée de musée), ou effectue une action qui coûte de l'argent, générez **systématiquement** une \`newTransactions\` avec un montant négatif. C'est crucial pour l'immersion.
- **UTILISATION DES OUTILS POUR L'INSPIRATION :** Utilisez les outils disponibles (\`getWeatherTool\`, \`getNearbyPoisTool\`, \`getWikipediaInfoTool\`, \`getNewsTool\`) pour enrichir votre narration ET SURTOUT pour générer des choix d'actions contextuels. Si un outil retourne une information intéressante (un musée à proximité, un fait historique sur le lieu), créez une \`StoryChoice\` qui permet au joueur d'interagir avec cette information.
- **STRICTEMENT INTERDIT dans 'scenarioText' :**
    - NE MENTIONNEZ PAS "changement de stats", "gain d'XP", "gain d'argent", etc.
    - N'INCLUEZ PAS de syntaxe d'appel d'outil ou de termes techniques.
- Les informations des outils (météo, POIs, etc.) doivent être intégrées naturellement dans la description du monde, mais leurs résultats doivent inspirer les **choix interactifs**.
`;

const PROMPT_PLAYER_CONTEXT = `
**Contexte du Joueur et du Monde :**
- Joueur : {{{playerName}}}, {{{playerGender}}}, {{{playerAge}}} ans. Passé : {{{playerBackground}}}.
- Lieu : {{{playerLocation.name}}}
- Argent : {{{playerMoney}}}€
- Inventaire : {{#each playerInventory}}{{{this.name}}} (x{{{this.quantity}}}); {{/each}}
- Stats Actuelles : {{#each playerStats}}{{{@key}}}: {{{this}}} {{/each}}
- Compétences :
  - Cognitives: {{#each playerSkills.cognitive}}{{{@key}}}: {{{this}}}, {{/each}}
  - Sociales: {{#each playerSkills.social}}{{{@key}}}: {{{this}}}, {{/each}}
  - Physiques: {{#each playerSkills.physical}}{{{@key}}}: {{{this}}}, {{/each}}
  - Techniques: {{#each playerSkills.technical}}{{{@key}}}: {{{this}}}, {{/each}}
  - Survie: {{#each playerSkills.survival}}{{{@key}}}: {{{this}}}, {{/each}}
- Tonalité : {{#if toneSettings}}{{#each toneSettings}}{{{@key}}}: {{{this}}} {{/each}}{{else}}(Équilibrée){{/if}}
- Scène Précédente : {{{currentScenario}}}
- Dossier d'Enquête : {{{currentInvestigationNotes}}}
- Indices Connus : {{#each currentCluesSummary}}{{this.title}}; {{/each}}
- Documents Possédés : {{#each currentDocumentsSummary}}{{this.title}}; {{/each}}
`;

const PROMPT_ACTION_AND_EFFECTS = `
**Action du Joueur et Conséquences :**

1.  **Action Saisie :** \\\`{{{playerChoice}}}\\\`

2.  **Événements Déterministes (Calculés par le Moteur) à Raconter :**
    {{#if deterministicEvents}}
      {{#each deterministicEvents}}- {{{this}}}\n{{/each}}
      **Instruction Spéciale :** Si un événement est un "Résultat du jet de compétence", votre narration DOIT refléter le succès ou l'échec. Un succès critique peut révéler un secret, un échec critique peut causer un problème. Ne vous contentez pas d'énoncer le résultat, décrivez-le de manière immersive.
    {{else}}
      - Aucun événement mécanique spécifique.
    {{/if}}

Sur la base de tout ce qui précède, générez la sortie JSON complète, incluant le 'scenarioText' et tous les événements de jeu que vous, en tant que MJ, décidez de créer.
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

Plantez le décor en fonction de l'Époque et du Lieu de Départ. Présentez le personnage et laissez entrevoir le début de son aventure. Le ton doit être influencé par les préférences de tonalité.

**Contraintes Importantes :**
- Le prologue doit être purement narratif. N'incluez AUCUNE mécanique de jeu. Ne générez pas de quêtes, d'objets ou de PNJ dans la sortie JSON pour le prologue.
- La sortie DOIT être du HTML valide.
- Fournissez 3 suggestions d'actions initiales dans le champ \`choices\` en respectant la structure complète de l'objet 'StoryChoice'.

Générez uniquement le 'scenarioText' et 'choices' pour le début de l'aventure.
`;

const prologuePrompt = ai.definePrompt({
  name: 'generateProloguePrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  tools: [getWeatherTool, getWikipediaInfoTool, getNearbyPoisTool, getNewsTool],
  input: {schema: GenerateScenarioInputSchema},
  output: {schema: GenerateScenarioOutputSchema},
  prompt: PROLOGUE_PROMPT,
});

const generateScenarioFlow = ai.defineFlow(
  {
    name: 'generateScenarioFlow',
    inputSchema: GenerateScenarioInputSchema,
    outputSchema: GenerateScenarioOutputSchema,
  },
  async (input: GenerateScenarioInput) => {
    const selectedPrompt = input.playerChoice === "[COMMENCER L'AVENTURE]"
      ? prologuePrompt
      : scenarioPrompt;

    const {output} = await selectedPrompt(input);

    if (!output) {
      console.error('AI model did not return output for generateScenarioPrompt.');
      return {
        scenarioText: "<p>Erreur: L'IA n'a pas retourné de réponse. Veuillez réessayer.</p>",
        choices: [],
      };
    }
    return output;
  }
);
