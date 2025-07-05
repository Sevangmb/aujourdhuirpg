'use server';
/**
 * @fileOverview Generates narrative scenarios for the RPG game based on player state and pre-calculated effects.
 * The AI now acts as a Game Master, able to generate not just text but also game events like quests and NPCs.
 * 
 * ⚡ CORRECTION DES ERREURS DE TEMPLATING - Bug des placeholders non résolus corrigé
 * Cette version corrige les placeholders {{{player.name}}} qui apparaissaient dans les narratives.
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
import { ACTION_TYPES, MOOD_TYPES, CHOICE_ICON_NAMES } from '@/lib/types';
import { safeReplaceTemplate } from './template-utils';

export type GenerateScenarioInput = z.infer<typeof GenerateScenarioInputSchema>;
export type GenerateScenarioOutput = z.infer<typeof GenerateScenarioOutputSchema>;

/**
 * 🛠️ Fonction pour valider et corriger les choix générés par l'IA
 * Corrige automatiquement les valeurs invalides pour éviter les erreurs de validation
 */
function validateAndFixChoices(choices: any[]): any[] {
  return choices.map((choice, index) => {
    const fixedChoice = { ...choice };
    
    // Vérifier et corriger l'iconName (CAUSE PRINCIPALE DE L'ERREUR)
    if (!fixedChoice.iconName || !CHOICE_ICON_NAMES.includes(fixedChoice.iconName)) {
      console.warn(`🔧 IconName invalide détecté au choix ${index}: "${fixedChoice.iconName}". Correction automatique appliquée.`);
      
      // Choisir une icône appropriée selon le type d'action
      const iconMap: Record<string, string> = {
        observation: 'Eye',
        exploration: 'Compass', 
        social: 'Users',
        action: 'Zap',
        reflection: 'Brain',
        job: 'Briefcase'
      };
      
      fixedChoice.iconName = iconMap[fixedChoice.type] || 'Zap';
    }
    
    // Vérifier et corriger le type d'action
    if (!fixedChoice.type || !ACTION_TYPES.includes(fixedChoice.type)) {
      console.warn(`🔧 Type d'action invalide détecté au choix ${index}: "${fixedChoice.type}". Correction vers "action".`);
      fixedChoice.type = 'action';
    }
    
    // Vérifier et corriger le mood
    if (!fixedChoice.mood || !MOOD_TYPES.includes(fixedChoice.mood)) {
      console.warn(`🔧 Mood invalide détecté au choix ${index}: "${fixedChoice.mood}". Correction vers "adventurous".`);
      fixedChoice.mood = 'adventurous';
    }
    
    // S'assurer que les champs obligatoires existent
    if (!fixedChoice.id) fixedChoice.id = `choice_${index}`;
    if (!fixedChoice.text) fixedChoice.text = `Action ${index + 1}`;
    if (!fixedChoice.description) fixedChoice.description = "Description de l'action";
    if (!fixedChoice.consequences || !Array.isArray(fixedChoice.consequences)) {
      fixedChoice.consequences = ['Action effectuée'];
    }
    
    return fixedChoice;
  });
}

export async function generateScenario(input: GenerateScenarioInput): Promise<GenerateScenarioOutput> {
  if (!process.env.GOOGLE_API_KEY) {
    console.error("❌ CRITICAL ERROR: GOOGLE_API_KEY is not set in .env.local");
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
        </div>
      `,
      choices: [
        {
          id: 'retry-after-config',
          text: '🔄 Réessayer après configuration',
          description: 'Recharger la page pour tester la nouvelle configuration',
          iconName: 'Zap',
          type: 'action',
          mood: 'adventurous',
          consequences: ['Configuration testée', 'IA réactivée si clés valides']
        },
        {
          id: 'view-setup-guide',
          text: '📖 Voir le guide de configuration',
          description: 'Consulter la documentation complète',
          iconName: 'BookOpen',
          type: 'reflection',
          mood: 'contemplative',
          consequences: ['Documentation affichée', 'Instructions détaillées']
        }
      ],
      aiRecommendation: { 
        focus: 'Configuration requise', 
        reasoning: 'La clé API Google est nécessaire pour toutes les fonctionnalités IA du jeu.' 
      },
    };
  }

  try {
    const toneInstructions = generateToneInstructions(input.player?.toneSettings);
    
    // 🔧 CORRECTION MAJEURE : Préparer les données pour le templating
    const templateData = {
      player: {
        name: input.player?.name || 'Aventurier',
        gender: input.player?.gender || 'Neutre',
        age: input.player?.age || 25,
        era: input.player?.era || 'Époque Moderne',
        background: input.player?.background || 'Passé mystérieux',
        traitsMentalStates: input.player?.traitsMentalStates || ['Curieux'],
        currentLocation: {
          name: input.player?.currentLocation?.name || 'Lieu Inconnu'
        }
      },
      playerChoiceText: input.playerChoiceText || '',
      gameEvents: input.gameEvents || '',
      cascadeResult: input.cascadeResult || '',
      toneInstructions: toneInstructions,
      suggestedContextualActions: input.suggestedContextualActions || []
    };

    // 🔧 CORRECTION MAJEURE : Remplacer les placeholders dans le prompt
    const resolvedPrompt = safeReplaceTemplate(FULL_SCENARIO_PROMPT_TEMPLATE, templateData);

    console.log('🔧 DEBUG: Prompt résolu envoyé à l\'IA (premiers 500 caractères):', resolvedPrompt.slice(0, 500) + '...');
    
    let attempts = 0;
    const maxAttempts = 3;
    let lastError: any = null;

    while (attempts < maxAttempts) {
      attempts++;
      
      try {
        console.log(`🔄 Tentative ${attempts}/${maxAttempts} de génération IA...`);
        
        const { output } = await ai.generate({
          model: 'googleai/gemini-1.5-flash-latest',
          prompt: resolvedPrompt, // 🔧 Utiliser le prompt résolu
          input: { ...input, toneInstructions },
          output: { schema: GenerateScenarioOutputSchema },
          tools: [getWeatherTool, getWikipediaInfoTool, getNearbyPoisTool, getNewsTool, getRecipesTool, getBookDetailsTool],
          config: {
            safetySettings: [
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            ],
            temperature: 0.8,
            topP: 0.95,
            maxOutputTokens: 4000,
          },
        });

        if (!output) {
          throw new Error("Le modèle IA n'a retourné aucune sortie.");
        }

        // 🔧 VALIDATION AUTOMATIQUE ET CORRECTION DES CHOIX
        if (output.choices && output.choices.length > 0) {
          output.choices = validateAndFixChoices(output.choices);
        } else {
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

        // 🔧 VALIDATION : Vérifier que la sortie ne contient pas de placeholders
        if (output.scenarioText && output.scenarioText.includes('{{{')) {
          console.warn('⚠️  Placeholders détectés dans la sortie de l\'IA, nettoyage...');
          output.scenarioText = output.scenarioText.replace(/\{\{\{[^}]+\}\}\}/g, '[données manquantes]');
        }

        console.log(`✅ Génération réussie en ${attempts} tentative(s)`);
        return output;

      } catch (error: any) {
        lastError = error;
        console.warn(`⚠️  Tentative ${attempts} échouée:`, error.message);
        
        // Gestion spécifique de différents types d'erreurs
        if (error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED')) {
          console.warn('🔄 Quota API dépassé, attente avant nouvelle tentative...');
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000 * attempts)); // Attente progressive
          }
        } else if (error.message?.includes('validation') || error.message?.includes('schema')) {
          console.warn('🔧 Erreur de validation de schéma détectée');
          break; // Pas de retry pour les erreurs de schéma, on va fallback
        } else {
          console.warn('❌ Erreur inconnue:', error);
          if (attempts >= maxAttempts) break;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    // Si toutes les tentatives ont échoué, générer une sortie de fallback
    console.error(`❌ Toutes les tentatives de génération IA ont échoué. Dernière erreur:`, lastError);
    
    return generateFallbackScenario(input, lastError);

  } catch (error: any) {
    console.error('❌ Erreur critique dans generateScenario:', error);
    return generateFallbackScenario(input, error);
  }
}

/**
 * 🚨 FALLBACK : Génère un scénario de secours en cas d'échec de l'IA
 */
function generateFallbackScenario(input: GenerateScenarioInput, error: any): GenerateScenarioOutput {
  const technicalDetails = `${error.message || 'Erreur inconnue'}`;
  
  // Créer un scénario de base fonctionnel
  const fallbackScenario = `
    <div class="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-4">
      <div class="flex items-center mb-3">
        <svg class="w-6 h-6 text-amber-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <h3 class="text-amber-800 font-bold text-lg">⚡ Mode Narratif Simplifié</h3>
      </div>
      <p class="text-amber-700 mb-4">L'IA narrative rencontre des difficultés temporaires. Le jeu continue avec un mode narratif simplifié.</p>
      
      <div class="bg-white rounded-lg p-4 border border-amber-200 mb-4">
        <p class="text-amber-800 font-medium mb-2">📖 Récapitulatif de l'action :</p>
        <p class="text-amber-700">${input.playerChoiceText || 'Vous continuez votre aventure.'}</p>
        ${input.gameEvents ? `<p class="text-amber-700 mt-2"><strong>Conséquences :</strong> ${input.gameEvents}</p>` : ''}
      </div>
    </div>
  `;

  return {
    scenarioText: fallbackScenario,
    choices: [
      {
        id: 'continue_adventure',
        text: '⏯️ Continuer l\'aventure',
        description: 'Poursuivre malgré les difficultés techniques',
        iconName: 'Zap',
        type: 'action',
        mood: 'adventurous',
        consequences: ['Aventure poursuivie', 'IA peut se rétablir']
      },
      {
        id: 'retry_generation',
        text: '🔄 Réessayer la génération',
        description: 'Tenter une nouvelle génération de scénario',
        iconName: 'Feather',
        type: 'action',
        mood: 'contemplative',
        consequences: ['Nouvelle tentative', 'Peut fonctionner']
      },
      {
        id: 'view_status',
        text: '📊 Voir le statut système',
        description: 'Consulter les informations techniques',
        iconName: 'Brain',
        type: 'reflection',
        mood: 'contemplative',
        consequences: ['Détails techniques affichés']
      }
    ],
    aiRecommendation: { 
      focus: 'Fallback activé', 
      reasoning: `Mode de secours actif en raison d'erreurs IA. (${technicalDetails})` 
    },
  };
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

// 🔧 CORRECTION MAJEURE : Template maintenant résolu avant envoi à l'IA
const FULL_SCENARIO_PROMPT_TEMPLATE = `Vous êtes un maître de jeu (MJ) et narrateur créatif pour "Aujourd'hui RPG", un jeu de rôle textuel se déroulant en France à l'époque suivante : **{{{player.era}}}**. Votre écriture doit être en français, dans une police de caractère serif comme 'Literata'. Votre rôle est de raconter, pas de décider. Votre texte doit être aéré, avec des paragraphes (<p>) et des dialogues pertinents.

**TÂCHE PRINCIPALE :**
{{#if (eq playerChoiceText "[COMMENCER L'AVENTURE]")}}
  **PROLOGUE :** Écrivez une scène d'introduction captivante pour le personnage suivant. Plantez le décor, introduisez le personnage, et suggérez le début d'une aventure. Proposez 3 choix narratifs initiaux dans le champ \`choices\`.
{{else}}
  **NARRATION :**
  1.  **Raconter (scenarioText) :** Basé sur \`gameEvents\`, écrivez une narration HTML immersive qui décrit le résultat de l'action du joueur. C'est votre tâche la plus importante.
  2.  **Proposer des choix (choices) :** Proposez 3-4 choix NARRATIFS et CRÉATIFS. Ne dupliquez pas les actions de \`suggestedContextualActions\`. Ne proposez jamais de choix d'attaque, utilisez \`startCombat\` à la place.
  3.  **Suggérer des événements (optionnel) :** Si la narration le justifie, vous pouvez utiliser les champs optionnels comme \`newPNJs\`, \`newItems\`, \`pnjUpdates\`, etc. Utilisez-les avec parcimonie.
{{/if}}

**PRINCIPES DIRECTEURS :**
- **FORMATAGE HTML :** Utilisez des balises \`<p>\` pour les paragraphes. Pour les dialogues, utilisez le format: \`<p><strong>Nom du PNJ :</strong> « ... »</p>\`.
- **TONALITÉ :** Suivez les instructions de tonalité. {{{toneInstructions}}}
- **RÈGLE ABSOLUE :** Votre sortie ne doit JAMAIS contenir de syntaxe de template comme \`{{{...}}}\` ou \`{{...}}\`. Toutes les variables doivent être remplacées par leur valeur textuelle dans la narration que vous générez.
- **ICÔNES :** Pour \`iconName\`, utilisez UNIQUEMENT une valeur de la liste suivante : Eye, Search, Compass, MapPin, Map, MessageSquare, Users, Heart, Zap, Sword, Wrench, Briefcase, KeyRound, Shield, Feather, Drama, Utensils, ShoppingCart, ChefHat, GlassWater, BookOpen, Sparkles, Brain, Wind, Smartphone, Camera, NotebookPen.
- **OUTILS :** Utilisez les outils (\`getWeatherTool\`, etc.) si nécessaire pour enrichir le récit.

**Contexte de l'Action et du Monde**
- **Joueur :** {{{player.name}}}, {{{player.gender}}}, {{{player.age}}} ans. Passé : {{{player.background}}}. Traits : {{{player.traitsMentalStates}}}.
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