
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
  // Vérification détaillée des clés API avec diagnostic
  const googleApiKey = process.env.GOOGLE_API_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;
  
  if (!googleApiKey && !geminiApiKey) {
    console.error("❌ ERREUR CRITIQUE: Aucune clé API Google/Gemini trouvée");
    console.error("Variables d'environnement vérifiées:");
    console.error("- GOOGLE_API_KEY:", googleApiKey ? "✅ Présente" : "❌ Manquante");
    console.error("- GEMINI_API_KEY:", geminiApiKey ? "✅ Présente" : "❌ Manquante");
    console.error("- NODE_ENV:", process.env.NODE_ENV);
    console.error("\n🔧 Solution:");
    console.error("1. Créez/vérifiez votre fichier .env.local");
    console.error("2. Ajoutez: GOOGLE_API_KEY=votre_clé_api");
    console.error("3. Obtenez votre clé sur: https://makersuite.google.com/app/apikey");
    console.error("4. Redémarrez le serveur avec: npm run dev\n");
    
    return {
      scenarioText: `
        <div class="bg-red-50 border border-red-200 rounded-lg p-6 mb-4">
          <div class="flex items-center mb-3">
            <svg class="w-6 h-6 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 18.5c-.77.833.192 2.5 1.732 2.5z"/>
            </svg>
            <h3 class="text-red-800 font-bold text-lg">🚨 Configuration IA Manquante</h3>
          </div>
          
          <p class="text-red-700 mb-4">La génération de scénario par l'IA nécessite une clé API Google. Cette fonctionnalité est actuellement désactivée.</p>
          
          <div class="bg-white rounded-lg p-4 border border-red-200">
            <p class="text-red-800 font-semibold mb-2">📋 Pour corriger ce problème :</p>
            <ol class="list-decimal list-inside text-red-700 space-y-1 text-sm">
              <li>Obtenez une clé API gratuite sur <a href="https://makersuite.google.com/app/apikey" target="_blank" class="underline font-medium hover:text-red-900">Google AI Studio</a></li>
              <li>Créez ou modifiez le fichier <code class="bg-red-100 px-1 rounded">.env.local</code> dans votre projet</li>
              <li>Ajoutez la ligne : <code class="bg-red-100 px-1 rounded">GOOGLE_API_KEY=votre_clé_ici</code></li>
              <li>Redémarrez le serveur avec <code class="bg-red-100 px-1 rounded">npm run dev</code></li>
            </ol>
          </div>
          
          <div class="mt-4 p-3 bg-red-100 rounded-lg">
            <p class="text-red-800 text-sm">
              <strong>💡 Astuce :</strong> Vous pouvez continuer à jouer sans IA en mode dégradé, mais l'expérience sera limitée.
            </p>
          </div>
        </div>
      `,
      choices: [
        {
          id: 'retry-after-config',
          text: '🔄 Réessayer après configuration',
          description: 'Recharger la page pour tester la nouvelle configuration',
          iconName: 'RefreshCw',
          type: 'system',
          mood: 'hopeful',
          consequences: ['Configuration testée', 'IA réactivée si clés valides']
        },
        {
          id: 'continue-degraded',
          text: '⚠️ Continuer sans IA (mode dégradé)',
          description: 'Jouer avec des fonctionnalités limitées',
          iconName: 'AlertTriangle',
          type: 'fallback',
          mood: 'cautious',
          consequences: ['Expérience limitée', 'Pas de génération IA']
        },
        {
          id: 'view-setup-guide',
          text: '📖 Voir le guide de configuration',
          description: 'Consulter la documentation complète',
          iconName: 'BookOpen',
          type: 'info',
          mood: 'studious',
          consequences: ['Documentation affichée', 'Instructions détaillées']
        }
      ],
      aiRecommendation: { 
        focus: 'Configuration requise', 
        reasoning: 'La clé API Google/Gemini est nécessaire pour toutes les fonctionnalités IA du jeu, incluant la génération de scénarios, d\'avatars et d\'images.' 
      },
    };
  }
  
  // Vérification de la validité de la clé et génération
  try {
    console.log("✅ Clé API trouvée, tentative de génération de scénario...");
    return await generateScenarioFlow(input);
  } catch (error) {
    console.error("❌ Erreur lors de la génération du scénario:", error);
    
    // Diagnostic de l'erreur pour fournir une aide ciblée
    const isAuthError = error instanceof Error && (
      error.message.includes('API key') || 
      error.message.includes('authentication') ||
      error.message.includes('permission') ||
      error.message.includes('unauthorized') ||
      error.message.includes('403') ||
      error.message.includes('401')
    );
    
    const isNetworkError = error instanceof Error && (
      error.message.includes('network') ||
      error.message.includes('timeout') ||
      error.message.includes('fetch') ||
      error.message.includes('ENOTFOUND') ||
      error.message.includes('ECONNREFUSED')
    );
    
    const isQuotaError = error instanceof Error && (
      error.message.includes('quota') ||
      error.message.includes('limit') ||
      error.message.includes('rate') ||
      error.message.includes('429')
    );

    const isConfigError = error instanceof Error && (
      error.message.includes('initializer is not a function') ||
      error.message.includes('plugin') ||
      error.message.includes('genkit')
    );
    
    let errorMessage = "Une erreur inattendue s'est produite lors de la génération du scénario.";
    let errorSolution = "Veuillez réessayer dans quelques instants.";
    let errorColor = "yellow";
    let errorIcon = "AlertCircle";
    
    if (isAuthError) {
      errorMessage = "Problème d'authentification avec l'API Google.";
      errorSolution = "Vérifiez que votre clé API est valide et a les bonnes permissions.";
      errorColor = "red";
      errorIcon = "Shield";
    } else if (isNetworkError) {
      errorMessage = "Problème de connexion réseau.";
      errorSolution = "Vérifiez votre connexion internet et réessayez.";
      errorColor = "orange";
      errorIcon = "Wifi";
    } else if (isQuotaError) {
      errorMessage = "Limite de quota API atteinte.";
      errorSolution = "Attendez un moment avant de réessayer ou vérifiez vos limites API.";
      errorColor = "blue";
      errorIcon = "Clock";
    } else if (isConfigError) {
      errorMessage = "Problème de configuration du système IA.";
      errorSolution = "Redémarrez le serveur et vérifiez l'installation des dépendances.";
      errorColor = "purple";
      errorIcon = "Settings";
    }
    
    return {
      scenarioText: `
        <div class="bg-${errorColor}-50 border border-${errorColor}-200 rounded-lg p-6 mb-4">
          <div class="flex items-center mb-3">
            <svg class="w-6 h-6 text-${errorColor}-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <h3 class="text-${errorColor}-800 font-bold text-lg">⚠️ Erreur de Génération IA</h3>
          </div>
          
          <p class="text-${errorColor}-700 mb-2">${errorMessage}</p>
          <p class="text-${errorColor}-600 text-sm mb-4">${errorSolution}</p>
          
          <div class="bg-white rounded-lg p-3 border border-${errorColor}-200">
            <p class="text-${errorColor}-800 font-medium text-sm mb-1">🔍 Détails techniques :</p>
            <code class="text-${errorColor}-700 text-xs bg-${errorColor}-100 p-2 rounded block break-all">
              ${error instanceof Error ? error.message : 'Erreur inconnue'}
            </code>
          </div>
          
          ${isAuthError ? `
          <div class="mt-4 p-3 bg-white rounded-lg border border-${errorColor}-200">
            <p class="text-${errorColor}-800 font-medium text-sm mb-1">🔑 Actions pour l'authentification :</p>
            <ul class="text-${errorColor}-700 text-xs space-y-1">
              <li>• Vérifiez que votre clé API est correcte</li>
              <li>• Assurez-vous qu'elle a les permissions Generative Language API</li>
              <li>• Testez votre clé sur <a href="https://makersuite.google.com/app/apikey" target="_blank" class="underline">Google AI Studio</a></li>
            </ul>
          </div>
          ` : ''}
        </div>
      `,
      choices: [
        {
          id: 'retry-scenario',
          text: '🔄 Réessayer la génération',
          description: 'Nouvelle tentative de génération de scénario',
          iconName: 'RefreshCw',
          type: 'retry',
          mood: 'determined',
          consequences: ['Nouvelle tentative', 'Peut réussir si problème temporaire']
        },
        {
          id: 'use-fallback',
          text: '📝 Utiliser un scénario de base',
          description: 'Continuer avec un scénario prédéfini simple',
          iconName: 'FileText',
          type: 'fallback',
          mood: 'pragmatic',
          consequences: ['Scénario basique chargé', 'Fonctionnalité limitée']
        },
        {
          id: 'check-logs',
          text: '🔍 Voir plus de détails',
          description: 'Afficher les informations de diagnostic complètes',
          iconName: 'Search',
          type: 'debug',
          mood: 'analytical',
          consequences: ['Logs détaillés affichés', 'Aide au débogage']
        }
      ],
      aiRecommendation: { 
        focus: 'Réessayer', 
        reasoning: `Erreur ${isAuthError ? 'd\'authentification' : isNetworkError ? 'réseau' : isQuotaError ? 'de quota' : isConfigError ? 'de configuration' : 'temporaire'} de l'IA. ${errorSolution}` 
      },
    };
  }
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
        throw new Error("Le modèle IA n'a retourné aucune sortie. Cela peut indiquer un problème de configuration ou de connectivité.");
      }
      if (!output.choices || output.choices.length === 0) {
        console.warn("IA n'a pas généré de choix, ajout d'un choix par défaut");
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
       console.error('❌ Erreur détaillée dans generateScenarioFlow:', {
         message: error.message,
         cause: error.cause,
         stack: error.stack,
         name: error.name
       });
       
       let errorMessage = "Erreur critique du modèle IA.";
       let technicalDetails = "";
       
       if (error.cause) {
           technicalDetails += ` Cause: ${JSON.stringify(error.cause)}`;
       }
       
       if (error.message) {
         technicalDetails += ` Message: ${error.message}`;
       }
       
       return {
         scenarioText: `
           <div class="bg-red-50 border border-red-200 rounded-lg p-6 mb-4">
             <div class="flex items-center mb-3">
               <svg class="w-6 h-6 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 18.5c-.77.833.192 2.5 1.732 2.5z"/>
               </svg>
               <h3 class="text-red-800 font-bold text-lg">🚨 Erreur Critique IA</h3>
             </div>
             
             <p class="text-red-700 mb-4">L'IA n'a pas pu générer de scénario. Cette erreur peut être causée par un problème de configuration, de connectivité ou de service.</p>
             
             <div class="bg-white rounded-lg p-4 border border-red-200 mb-4">
               <p class="text-red-800 font-semibold mb-2">🔧 Solutions possibles :</p>
               <ul class="list-disc list-inside text-red-700 space-y-1 text-sm">
                 <li>Vérifiez votre connexion internet</li>
                 <li>Redémarrez le serveur (npm run dev)</li>
                 <li>Vérifiez que votre clé API est valide sur <a href="https://makersuite.google.com/app/apikey" target="_blank" class="underline">Google AI Studio</a></li>
                 <li>Vérifiez les logs de la console pour plus de détails</li>
               </ul>
             </div>
             
             ${technicalDetails ? `
             <div class="bg-red-100 rounded-lg p-3 border border-red-200">
               <p class="text-red-800 font-medium text-sm mb-1">🔍 Détails techniques :</p>
               <code class="text-red-700 text-xs bg-white p-2 rounded block break-all">
                 ${technicalDetails}
               </code>
             </div>
             ` : ''}
           </div>
         `,
         choices: [{
          id: 'retry_action',
          text: "🔄 Réessayer l'action précédente",
          description: "Tenter de relancer la dernière action pour voir si l'IA répond cette fois.",
          iconName: 'RefreshCw',
          type: 'retry',
          mood: 'determined',
          consequences: ['Nouvelle tentative', 'Peut fonctionner si problème temporaire'],
        }, {
          id: 'basic_continue',
          text: "➡️ Continuer sans IA",
          description: "Continuer le jeu avec des fonctionnalités de base",
          iconName: 'ArrowRight',
          type: 'fallback',
          mood: 'pragmatic',
          consequences: ['Mode dégradé activé', 'Fonctionnalités limitées'],
        }],
         aiRecommendation: { focus: 'Erreur', reasoning: errorMessage + (technicalDetails ? ` (${technicalDetails})` : '') },
       };
    }
  }
);
