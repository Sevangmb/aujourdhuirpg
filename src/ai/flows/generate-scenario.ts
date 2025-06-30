
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
import { getBookDetailsTool } from '@/ai/tools/get-book-details-tool';
import {
  GenerateScenarioInputSchema,
  GenerateScenarioOutputSchema,
} from './generate-scenario-schemas';
import { ACTION_TYPES, MOOD_TYPES, CHOICE_ICON_NAMES } from '@/lib/types/choice-types';
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


// --- REFACTORED PROMPT (IN FRENCH) ---

const PROMPT_INTRO = `Vous êtes un maître de jeu (MJ) et narrateur créatif pour "Aujourd'hui RPG", un jeu de rôle textuel se déroulant en France à l'époque suivante : **{{{player.era}}}**. Votre écriture doit être en français.`;

const PROMPT_CORE_TASK = `
**Tâche Principale : Raconter l'Histoire ET Diriger le Jeu**
Votre mission a quatre volets :
1.  **Générer le 'scenarioText' :** Rédigez une description narrative captivante en HTML de ce qui se passe après l'action du joueur. Intégrez de manière transparente les 'deterministicEvents' fournis (conséquences déjà calculées par le moteur de jeu). **NE répétez PAS** les calculs de stats dans votre narration. Racontez le *ressenti*.
2.  **Générer des Événements de Jeu :** En tant que MJ, vous pouvez maintenant faire avancer le jeu. Si votre narration introduit une nouvelle quête, un nouveau PNJ, un objet à trouver, un changement financier ou un combat, utilisez les champs de sortie appropriés ('newQuests', 'newPNJs', 'itemsToAddToInventory', 'newTransactions', 'combatEvent', etc.) pour créer ces éléments.
    - **Mise à jour du Dossier d'Enquête :** Si le joueur fait une découverte majeure ou tire une conclusion, mettez à jour le champ 'updatedInvestigationNotes' pour refléter cette nouvelle synthèse.
3.  **Générer des Choix Guidés (Actions Adaptatives - RÈGLE CRITIQUE) :** C'est une partie cruciale. Pour guider le joueur, peuplez le champ 'choices' avec 3 ou 4 objets 'StoryChoice' riches et variés.
    - **Basé sur les Compétences ET L'ENVIRONNEMENT :** Analysez attentivement le profil de compétences du joueur ('player.skills') ET son environnement. Votre objectif est de rendre ses compétences utiles et gratifiantes, et de rendre le monde vivant.
        - **Proposez des Actions d'Exploration (Priorité Haute) :** Utilisez activement l'outil 'getNearbyPoisTool'. Si un lieu intéressant est trouvé (restaurant, boutique, parc, monument), vous DEVEZ créer une 'StoryChoice' de type 'exploration' pour que le joueur puisse s'y rendre. Exemple : "Visiter la librairie Shakespeare and Company" ou "Prendre un café au 'Café de Flore'".
        - **Proposez des Actions Pertinentes (Compétences) :** Créez des choix qui permettent au joueur d'utiliser ses **compétences les plus élevées**. Par exemple, si le joueur a une compétence élevée en 'social.persuasion', proposez un choix de dialogue complexe. S'il est fort en 'physical.stealth', proposez une option d'infiltration. Ces actions doivent inclure un 'skillCheck' pertinent.
        - **Créez des opportunités de Jobs :** Le joueur doit gagner sa vie. Intégrez des opportunités de "jobs" (type: 'job') qui correspondent à ses compétences. Par exemple, une compétence en 'technical.finance' pourrait mener à une mission de comptabilité; une compétence en 'physical.strength' à un travail de déménageur. **IMPORTANT : Créez toujours ces jobs avec le statut 'inactive'**. La narration doit présenter l'opportunité (ex: une annonce, une offre de PNJ) plutôt que de commencer la quête directement.
        - **Gérer l'acceptation de Jobs :** Vous avez maintenant la liste des quêtes avec leur statut ('active' ou 'inactive'). Si une quête pertinente est 'inactive' (par exemple, un job de cuisine que vous venez de créer, ou une mission dont le joueur se trouve sur le lieu de départ), proposez un choix d'action clair pour l'accepter (ex: "Accepter la mission de livraison"). Ce choix doit générer un événement 'updatedQuests' pour passer le statut de la quête à 'active' en utilisant son 'questId'.
    - **Variété d'Approches :** Proposez un mélange d'actions couvrant différents types (observation, action, social, etc.) et qui ouvrent des pistes narratives intéressantes. Évitez les choix génériques comme "Continuer" ou "Regarder autour".
    - **Structure Complète :** Chaque choix doit être un objet JSON avec les champs: id (unique, ex: 'chercher_indices'), text, description, iconName (choisir parmi: ${CHOICE_ICON_NAMES.join(', ')}), type (choisir parmi: ${ACTION_TYPES.join(', ')}), mood (choisir parmi: ${MOOD_TYPES.join(', ')}), energyCost (1-20), timeCost (5-60), consequences (2-3 mots-clés), et le 'skillCheck' si applicable. Pour les choix qui font progresser une compétence (surtout ceux avec un skillCheck), spécifiez les gains d'expérience de compétence potentiels dans 'skillGains' (ex: {'cognitive.observation': 5}).
4.  **Générer une Recommandation Stratégique :** En tant que MJ, analysez la situation globale du joueur (quêtes, argent, compétences) et remplissez le champ optionnel 'aiRecommendation' avec un conseil stratégique. Par exemple, si le joueur est à court d'argent, recommandez de se concentrer sur un job. Si un indice clé vient d'être trouvé, suggérez de poursuivre cette piste.
`;

const PROMPT_GUIDING_PRINCIPLES = `
**Principes Directeurs (TRÈS IMPORTANT) :**
- **ADAPTATION NARRATIVE :** Suivez impérativement les instructions de tonalité ci-dessous pour façonner votre style d'écriture et les choix que vous proposez.
{{{toneInstructions}}}
- **CATALOGUE D'ACTIONS CONTEXTUELLES :** Pour rendre le jeu plus riche, inspirez-vous de ce catalogue pour générer des choix variés :
    - **Investigation :**
        - **Fouiller :** Si le contexte le permet (une pièce, une zone), proposez une action pour 'Fouiller'. C'est une action risquée qui doit avoir un \`skillCheck\` (ex: 'cognitive.observation'). La réussite peut mener à la découverte d'objets (\`itemsToAddToInventory\`) ou d'indices (\`newClues\`).
        - **Prendre une photo :** Si le joueur possède un objet de type 'Camera' (\`vintage_camera_01\`), proposez de prendre une photo d'une scène ou d'un indice. Cela peut créer un \`newClues\` de type \`photo\`.
        - **Prendre des notes :** Si le joueur possède un 'Carnet et Stylo' (\`notebook_pen_01\`), proposez une action pour prendre des notes sur un événement ou un lieu. Cela peut mettre à jour le champ \`updatedInvestigationNotes\`.
    - **Social :**
        - **Intimider :** Au lieu d'une simple discussion, proposez d'intimider un PNJ si le ton est tendu. Utilisez un \`skillCheck\` basé sur \`stats.Force\` ou \`social.persuasion\` avec une difficulté élevée.
        - **Négocier :** Lors d'un achat, proposez de négocier le prix. Utilisez un \`skillCheck\` sur \`technical.finance\` ou \`social.persuasion\` pour potentiellement réduire le coût dans \`newTransactions\`.
- **RÈGLE D'OR :** Tout ce qui doit devenir un élément de jeu interactif (quête, objet, PNJ, transaction, ennemi) DOIT être défini dans les champs de sortie JSON. Ne les laissez pas exister uniquement dans le 'scenarioText'.
- **SYSTÈME DE COMBAT :** Vous pouvez désormais initier et gérer des combats.
    - Pour **DÉMARRER** un combat, remplissez le champ 'combatEvent.startCombat' avec les stats de l'ennemi. Le jeu prendra le relais pour l'afficher.
    - Si un 'currentEnemy' est fourni en entrée, le combat est **EN COURS**. Proposez des 'StoryChoice' avec 'isCombatAction: true' et 'combatActionType' (ex: 'attack', 'flee'). Décrivez l'état de l'ennemi (blessé, fatigué, etc.).
    - Pour **TERMINER** un combat (quand la santé de l'ennemi est à 0), remplissez 'combatEvent.endCombat: true'. Décrivez la victoire et les conséquences (loot, etc.).
- **GÉNÉRATION D'OBJETS CONTEXTUELS :** Le monde doit sembler vivant. Lorsque vous créez un scénario, pensez aux objets que le joueur pourrait trouver. Si le joueur explore une vieille bibliothèque, il pourrait trouver un 'Carnet et Stylo' ('notebook_pen_01'). Si une quête est terminée, la récompense doit être logique. Une quête de livraison à un médecin pourrait rapporter une 'Petite Trousse de Soins' ('medkit_basic_01'). Utilisez le champ 'itemsToAddToInventory' pour placer ces objets dans le monde.
- **LIVRES ET SAVOIR :** Lorsque le joueur est dans une librairie ou une bibliothèque, utilisez l'outil 'getBookDetailsTool' pour trouver des livres réels pertinents. Proposez des choix pour acheter ou lire ces livres. Si le joueur acquiert un livre, utilisez le champ de sortie 'newDynamicItems' pour le créer.
  - Utilisez 'baseItemId: 'generic_book_01''.
  - Remplissez les 'overrides' avec le 'name' (titre du livre) et la 'description' (résumé du livre) obtenus de l'outil.
  - Surtout, ajoutez des 'skillModifiers' pertinents. Par exemple, un livre de cuisine augmentera la compétence 'technical.crafting'. Un livre d'histoire augmentera 'cognitive.memory' ou 'technical.investigation'. Soyez créatif et logique pour lier les livres à des gains de compétences.
  - N'oubliez pas de générer une 'newTransactions' pour le coût du livre si le joueur l'achète.
- **INVENTAIRE INTELLIGENT :** Analysez l'inventaire détaillé du joueur ('player.inventory'). Créez des choix qui permettent d'utiliser des objets spécifiques. La narration peut faire référence à l'histoire d'un objet ('memory.acquisitionStory') pour plus de cohérence. Par exemple, si le joueur a une clé trouvée au Louvre, proposez un choix pour l'essayer sur une serrure ancienne. Si le joueur possède des consommables (comme une barre énergétique) et que sa physiologie est basse, proposez un choix avec un ID de la forme 'consume_item_ITEM_ID' (ex: 'consume_item_energy_bar_01') pour lui permettre de l'utiliser.
- **ÉVOLUTION DES OBJETS :** Certains objets, comme l'Appareil Photo Vintage, peuvent évoluer. Si le joueur utilise un tel objet de manière pertinente ou réussit une action avec, accordez-lui de l'expérience via le champ 'itemUpdates'. Spécifiez l'instanceId de l'objet et le montant d'XP gagné. Si un objet gagne assez d'expérience, il peut évoluer et se transformer. N'oubliez pas de décrire cet événement passionnant dans votre narration !
- **MÉMOIRE DES OBJETS :** Si votre narration décrit l'utilisation d'un objet spécifique de l'inventaire du joueur, vous DEVEZ le consigner dans le champ de sortie 'itemsUsed'. Fournissez l''instanceId' de l'objet et une brève 'usageDescription' (ex: 'Utilisé pour prendre la photo du document'). C'est crucial pour que les objets accumulent une histoire.
- **SYSTÈME DE CUISINE :** Maintenant que le joueur peut accepter des quêtes de cuisine, permettez-lui de les réaliser.
    - **Vérifiez les Ingrédients :** Si le joueur a une quête de cuisine 'active' et que son inventaire ('player.inventory') contient TOUS les ingrédients nécessaires listés dans la description de la quête, proposez un choix pour 'Cuisiner le plat'.
    - **Créez l'Action de Cuisiner :** Ce choix doit être de type 'action', utiliser l'icône 'ChefHat', et avoir un 'skillCheck' sur la compétence 'technical.crafting'.
    - **Générez le Plat Cuisiné :** Si le test de compétence réussit, vous devez générer la récompense. Utilisez le champ 'newDynamicItems' pour créer l'objet 'plat cuisiné'. Utilisez 'generic_meal_01' comme 'baseItemId'. Dans les 'overrides', spécifiez le 'name' (le nom de la recette) et une 'description' appétissante. Le plus important : ajoutez des 'physiologicalEffects' puissants (ex: {'hunger': 80, 'thirst': 20}) et des 'statEffects' (ex: {'Energie': 15, 'Stress': -20}).
    - **Mettez à Jour l'État du Jeu :** En plus de créer le plat, vous devez :
        - Lister les ingrédients consommés dans le champ 'itemsUsed'.
        - Mettre à jour la quête de cuisine en la marquant comme 'completed' dans 'updatedQuests'.
- **SIMULATION ÉCONOMIQUE :** Le monde a un coût. Si le joueur achète un objet (café, journal), paie pour un service (ticket de métro, entrée de musée), ou effectue une action qui coûte de l'argent, générez **systématiquement** une 'newTransactions' avec un montant négatif. C'est crucial pour l'immersion.
- **SIMULATION PHYSIOLOGIQUE :** Vérifiez les niveaux de faim et de soif du joueur. S'ils sont bas (en dessous de 30), le joueur sera pénalisé sur ses actions. Créez des choix pour manger ou boire, soit en trouvant un lieu, soit en utilisant un objet de l'inventaire. Pour les choix qui restaurent ces besoins, remplissez le champ 'physiologicalEffects' (ex: {'hunger': 20, 'thirst': 15}). Le texte narratif peut refléter l'état du joueur (ex: "Votre estomac gargouille, vous avez du mal à vous concentrer.").
- **INTERACTIONS CULINAIRES CONTEXTUELLES :** La nourriture est au cœur de l'expérience. Votre objectif est de rendre chaque interaction culinaire authentique, immersive et liée au gameplay.
    - **Règle 1 : Pas de choix génériques.** N'utilisez JAMAIS "Manger" ou "Boire". Analysez TOUJOURS les 'tags' du lieu (ex: { "cuisine": "italian" }) et son 'type' (ex: "restaurant").
    - **Règle 2 : Utiliser les outils pour trouver des plats.** Si le joueur est dans un lieu de restauration (restaurant, café), utilisez l'outil 'getRecipesTool' avec le type de cuisine du lieu (si disponible) pour trouver des plats authentiques. Si aucun tag de cuisine n'est présent, déduisez-la du nom ou du contexte.
    - **Règle 3 : Créer des choix de commande.** Proposez des 'StoryChoice' pour commander les plats spécifiques trouvés. Ex: "Commander une Pissaladière", "Prendre un café-crème en terrasse". Si aucun plat spécifique n'est trouvé, inventez des choix plausibles (ex: "Commander le plat du jour").
    - **Règle 4 : Lier aux mécaniques de jeu.** Chaque choix de nourriture/boisson DOIT générer :
        - une 'newTransactions' avec un coût négatif réaliste.
        - des 'physiologicalEffects' pour la faim/soif.
        - des 'statEffects' optionnels (ex: un café pourrait donner de l'énergie).
    - **Règle 5 : Créer des quêtes de cuisine.** SÉPARÉMENT, si le joueur exprime le désir de *cuisiner* ou d'*apprendre* une recette (plutôt que de la commander), ALORS utilisez l'outil 'getRecipesTool'. Créez une 'newQuests' de type 'job' avec la recette et ses ingrédients comme description/objectifs.
- **RÈGLE ABSOLUE :** Le 'scenarioText' doit contenir UNIQUEMENT du texte narratif et descriptif en français, formaté en HTML.
- **UTILISATION DES OUTILS POUR L'INSPIRATION :** Utilisez les outils disponibles ('getWeatherTool', 'getNearbyPoisTool', 'getWikipediaInfoTool', 'getNewsTool') pour enrichir votre narration ET SURTOUT pour générer des choix d'actions contextuels. Si un outil retourne une information intéressante (un musée à proximité, un fait historique sur le lieu), créez une 'StoryChoice' qui permet au joueur d'interagir avec cette information.
- **STRICTEMENT INTERDIT dans 'scenarioText' :**
    - NE MENTIONNEZ PAS "changement de stats", "gain d'XP", "gain d'argent", etc.
    - N'INCLUEZ PAS de syntaxe d'appel d'outil ou de termes techniques.
- Les informations des outils (météo, POIs, etc.) doivent être intégrées naturellement dans la description du monde, mais leurs résultats doivent inspirer les **choix interactifs**.
`;

const PROMPT_PLAYER_CONTEXT = `
**Contexte du Joueur et du Monde :**
- Joueur : {{{player.name}}}, {{{player.gender}}}, {{{player.age}}} ans. Passé : {{{player.background}}}.
- Lieu : {{{player.currentLocation.name}}} (Type: {{player.currentLocation.type}}, Description: {{player.currentLocation.description}})
- Ennemi Actuel: {{#if currentEnemy}}{{currentEnemy.name}} (Santé: {{currentEnemy.health}}/{{currentEnemy.maxHealth}}){{else}}Aucun{{/if}}
- Argent : {{{player.money}}}€
- Physiologie : Faim: {{{player.physiology.basic_needs.hunger.level}}}/100, Soif: {{{player.physiology.basic_needs.thirst.level}}}/100.
- Inventaire : {{#each player.inventory}}{{{this.name}}} (ID: {{{this.instanceId}}}, valeur: {{{this.economics.base_value}}}€, état: {{{this.condition.durability}}}%) x{{{this.quantity}}}; {{/each}}
- Stats Actuelles : {{#each player.stats}}{{{@key}}}: {{{this}}} {{/each}}
- Compétences :
  - Cognitives: {{#each player.skills.cognitive}}{{{@key}}}: {{{this}}}, {{/each}}
  - Sociales: {{#each player.skills.social}}{{{@key}}}: {{{this}}}, {{/each}}
  - Physiques: {{#each player.skills.physical}}{{{@key}}}: {{{this}}}, {{/each}}
  - Techniques: {{#each player.skills.technical}}{{{@key}}}: {{{this}}}, {{/each}}
  - Survie: {{#each player.skills.survival}}{{{@key}}}: {{{this}}}, {{/each}}
- Quêtes en cours: {{#each activeQuests}}"{{this.title}}" (Statut: {{this.status}}); {{/each}}
- Scène Précédente : {{{currentScenario}}}
- Dossier d'Enquête : {{{currentInvestigationNotes}}}
- Indices Connus : {{#each currentCluesSummary}}{{this.title}}; {{/each}}
- Documents Possédés : {{#each currentDocumentsSummary}}{{this.title}}; {{/each}}
`;

const PROMPT_ACTION_AND_EFFECTS = `
**Action du Joueur et Conséquences :**

1.  **Action Saisie :** '{{{playerChoice}}}'

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
  tools: [getWeatherTool, getWikipediaInfoTool, getNearbyPoisTool, getNewsTool, getRecipesTool, getBookDetailsTool],
  input: {schema: GenerateScenarioInputSchema.extend({ toneInstructions: z.string() })},
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

- Nom : {{{player.name}}}
- Genre : {{{player.gender}}}
- Âge : {{{player.age}}}
- Époque : {{{player.era}}}
- Lieu de Départ : {{{player.currentLocation.name}}}
- Passé : {{{player.background}}}

Plantez le décor en fonction de l'Époque et du Lieu de Départ. Présentez le personnage et laissez entrevoir le début de son aventure.
{{{toneInstructions}}}

**Contraintes Importantes :**
- Le prologue doit être purement narratif. N'incluez AUCUNE mécanique de jeu. Ne générez pas de quêtes, d'objets ou de PNJ dans la sortie JSON pour le prologue.
- La sortie DOIT être du HTML valide.
- Fournissez 3 suggestions d'actions initiales dans le champ \`choices\` en respectant la structure complète de l'objet 'StoryChoice'.

Générez uniquement le 'scenarioText' et 'choices' pour le début de l'aventure.
`;

const prologuePrompt = ai.definePrompt({
  name: 'generateProloguePrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  tools: [getWeatherTool, getWikipediaInfoTool, getNearbyPoisTool, getNewsTool, getRecipesTool, getBookDetailsTool],
  input: {schema: GenerateScenarioInputSchema.extend({ toneInstructions: z.string() })},
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
    const toneInstructions = generateToneInstructions(input.player?.toneSettings);
    const enrichedInput = { ...input, toneInstructions };

    const selectedPrompt = input.playerChoice === "[COMMENCER L'AVENTURE]"
      ? prologuePrompt
      : scenarioPrompt;

    const {output} = await selectedPrompt(enrichedInput);

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
