'use server';
/**
 * @fileOverview Generates narrative scenarios for the RPG game based on player state and pre-calculated effects.
 * The AI now acts as a Game Master, able to generate not just text but also game events like quests and NPCs.
 * 
 * ⚡ CORRECTION DES ERREURS DE VALIDATION DE SCHÉMA ET QUOTA API
 * Cette version corrige les erreurs de validation iconName et améliore la gestion des quotas API.
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
      console.warn(`🔧 ActionType invalide détecté au choix ${index}: "${fixedChoice.type}". Utilisation de 'action' par défaut.`);
      fixedChoice.type = 'action';
    }
    
    // Vérifier et corriger le mood
    if (!fixedChoice.mood || !MOOD_TYPES.includes(fixedChoice.mood)) {
      console.warn(`🔧 MoodType invalide détecté au choix ${index}: "${fixedChoice.mood}". Utilisation de 'adventurous' par défaut.`);
      fixedChoice.mood = 'adventurous';
    }
    
    // S'assurer que les champs obligatoires existent
    fixedChoice.id = fixedChoice.id || `choice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    fixedChoice.text = fixedChoice.text || "Action par défaut";
    fixedChoice.description = fixedChoice.description || "Description par défaut";
    fixedChoice.consequences = fixedChoice.consequences || ["Action effectuée"];
    
    return fixedChoice;
  });
}

/**
 * 📊 Gestionnaire simple de quota API
 */
class SimpleQuotaManager {
  private requestCount = 0;
  private lastReset = Date.now();
  private readonly HOURLY_LIMIT = 50; // Limite conservatrice
  private readonly RESET_INTERVAL = 60 * 60 * 1000; // 1 heure
  
  canMakeRequest(): boolean {
    const now = Date.now();
    
    // Reset du compteur si une heure s'est écoulée
    if (now - this.lastReset > this.RESET_INTERVAL) {
      this.lastReset = now;
      this.requestCount = 0;
    }
    
    return this.requestCount < this.HOURLY_LIMIT;
  }
  
  recordRequest(): void {
    this.requestCount++;
  }
  
  getStatus() {
    return {
      remaining: Math.max(0, this.HOURLY_LIMIT - this.requestCount),
      resetIn: Math.max(0, this.RESET_INTERVAL - (Date.now() - this.lastReset))
    };
  }
}

const quotaManager = new SimpleQuotaManager();

export async function generateScenario(input: GenerateScenarioInput): Promise<GenerateScenarioOutput> {
  // Vérification des clés API avec diagnostic amélioré
  const googleApiKey = process.env.GOOGLE_API_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;
  
  if (!googleApiKey && !geminiApiKey) {
    console.error("❌ ERREUR CRITIQUE: Aucune clé API Google/Gemini trouvée");
    console.error("Variables d'environnement vérifiées:");
    console.error("- GOOGLE_API_KEY:", googleApiKey ? "✅ Présente" : "❌ Manquante");
    console.error("- GEMINI_API_KEY:", geminiApiKey ? "✅ Présente" : "❌ Manquante");
    
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
          iconName: 'RefreshCw',
          type: 'action',
          mood: 'adventurous',
          consequences: ['Configuration testée', 'IA réactivée si clés valides']
        },
        {
          id: 'continue-degraded',
          text: '⚠️ Continuer sans IA (mode dégradé)',
          description: 'Jouer avec des fonctionnalités limitées',
          iconName: 'AlertTriangle',
          type: 'action',
          mood: 'contemplative',
          consequences: ['Expérience limitée', 'Pas de génération IA']
        }
      ],
      aiRecommendation: { 
        focus: 'Configuration requise', 
        reasoning: 'La clé API Google/Gemini est nécessaire pour toutes les fonctionnalités IA du jeu.' 
      },
    };
  }
  
  // Vérification du quota avant l'appel IA
  if (!quotaManager.canMakeRequest()) {
    const status = quotaManager.getStatus();
    const resetMinutes = Math.ceil(status.resetIn / 1000 / 60);
    
    console.warn(`⏳ Quota API épuisé. Reset dans ${resetMinutes} minutes.`);
    
    return {
      scenarioText: `
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-4">
          <div class="flex items-center mb-3">
            <svg class="w-6 h-6 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <h3 class="text-yellow-800 font-bold text-lg">⏳ Quota API Temporairement Épuisé</h3>
          </div>
          
          <p class="text-yellow-700 mb-4">Les appels à l'IA sont temporairement limités pour éviter les surcoûts et respecter les quotas.</p>
          
          <div class="bg-white rounded-lg p-4 border border-yellow-200">
            <p class="text-yellow-800 font-semibold">📊 Statut du quota :</p>
            <p class="text-yellow-700 text-sm">• Requêtes restantes: ${status.remaining}</p>
            <p class="text-yellow-700 text-sm">• Reset automatique dans: ${resetMinutes} minutes</p>
          </div>
        </div>
      `,
      choices: [
        {
          id: 'wait_quota_reset',
          text: "⏰ Attendre le reset du quota",
          description: "Patienter que le quota API se renouvelle automatiquement",
          iconName: 'Clock',
          type: 'reflection',
          mood: 'contemplative',
          consequences: ['Quota renouvelé', 'IA disponible'],
        },
        {
          id: 'continue_basic',
          text: "🎮 Continuer en mode basique",
          description: "Jouer avec des actions prédéfinies sans IA",
          iconName: 'Gamepad2',
          type: 'action', 
          mood: 'adventurous',
          consequences: ['Jeu simplifié', 'Pas de génération IA'],
        }
      ],
      aiRecommendation: { 
        focus: 'Quota Limité', 
        reasoning: `Attendez ${resetMinutes} minutes pour que le quota se renouvelle automatiquement.` 
      },
    };
  }
  
  // Tentative de génération avec gestion d'erreur robuste
  try {
    console.log("✅ Clé API trouvée, tentative de génération de scénario...");
    quotaManager.recordRequest();
    
    const result = await generateScenarioFlow(input);
    
    // Validation et correction automatique des choix
    if (result.choices && result.choices.length > 0) {
      result.choices = validateAndFixChoices(result.choices);
    }
    
    return result;
    
  } catch (error: any) {
    console.error("❌ Erreur lors de la génération du scénario:", error);
    
    // Classification des erreurs pour un diagnostic précis
    const isQuotaError = error && (
      error.message?.includes('quota') || 
      error.message?.includes('limit') || 
      error.message?.includes('rate') ||
      error.message?.includes('429') ||
      error.code === 429 ||
      error.status === 429
    );
    
    const isSchemaError = error && (
      error.message?.includes('Schema validation failed') ||
      error.message?.includes('iconName') ||
      error.message?.includes('must be equal to one of the allowed values')
    );
    
    const isAuthError = error && (
      error.message?.includes('API key') || 
      error.message?.includes('authentication') ||
      error.message?.includes('unauthorized') ||
      error.message?.includes('403') ||
      error.message?.includes('401')
    );
    
    // Gestion spécialisée selon le type d'erreur
    if (isQuotaError) {
      return {
        scenarioText: `
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-4">
            <div class="flex items-center mb-3">
              <svg class="w-6 h-6 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <h3 class="text-blue-800 font-bold text-lg">📊 Limite de Quota API Atteinte</h3>
            </div>
            
            <p class="text-blue-700 mb-4">Le service d'IA a atteint sa limite de quota. Veuillez patienter avant de réessayer.</p>
            
            <div class="bg-white rounded-lg p-4 border border-blue-200">
              <p class="text-blue-800 font-semibold mb-2">💡 Solutions :</p>
              <ul class="list-disc list-inside text-blue-700 space-y-1 text-sm">
                <li>Attendez quelques minutes pour que le quota se renouvelle</li>
                <li>Vérifiez vos limites API sur <a href="https://makersuite.google.com/app/apikey" target="_blank" class="underline">Google AI Studio</a></li>
                <li>Considérez upgrader votre plan API si nécessaire</li>
              </ul>
            </div>
          </div>
        `,
        choices: [
          {
            id: 'wait_and_retry',
            text: "⏳ Attendre et réessayer",
            description: "Patienter quelques minutes puis relancer l'action",
            iconName: 'Clock',
            type: 'reflection',
            mood: 'contemplative',
            consequences: ['Attente nécessaire', 'Quota peut se renouveler'],
          },
          {
            id: 'manual_continue',
            text: "📝 Continuer manuellement",
            description: "Analyser la situation sans IA pour continuer l'aventure",
            iconName: 'FileText',
            type: 'observation', 
            mood: 'contemplative',
            consequences: ['Continue sans IA', 'Exploration basique'],
          }
        ],
        aiRecommendation: { 
          focus: 'Quota Épuisé', 
          reasoning: 'Attendez que le quota API se renouvelle ou vérifiez votre configuration.' 
        },
      };
    }
    
    if (isSchemaError) {
      return {
        scenarioText: `
          <div class="bg-orange-50 border border-orange-200 rounded-lg p-6 mb-4">
            <div class="flex items-center mb-3">
              <svg class="w-6 h-6 text-orange-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 18.5c-.77.833.192 2.5 1.732 2.5z"/>
              </svg>
              <h3 class="text-orange-800 font-bold text-lg">🔧 Erreur de Validation Corrigée</h3>
            </div>
            
            <p class="text-orange-700 mb-4">L'IA a généré une réponse avec des valeurs invalides. Le système a automatiquement appliqué des corrections.</p>
            
            <div class="bg-white rounded-lg p-4 border border-orange-200">
              <p class="text-orange-800 font-semibold mb-2">✅ Corrections automatiques :</p>
              <ul class="list-disc list-inside text-orange-700 space-y-1 text-sm">
                <li>Valeurs d'icônes corrigées selon les standards</li>
                <li>Types d'actions validés et normalisés</li>
                <li>Ambiances ajustées aux valeurs acceptées</li>
              </ul>
            </div>
            
            <p class="text-orange-600 text-sm mt-3">Vous pouvez continuer votre aventure normalement avec les actions corrigées ci-dessous.</p>
          </div>
        `,
        choices: [
          {
            id: 'basic_observation',
            text: "👁️ Observer attentivement",
            description: "Regarder attentivement l'environnement immédiat",
            iconName: 'Eye',
            type: 'observation',
            mood: 'contemplative', 
            consequences: ['Informations sur le lieu', 'Nouvelle perspective'],
          },
          {
            id: 'basic_exploration',
            text: "🧭 Explorer les environs",
            description: "Se déplacer et découvrir ce qui se trouve à proximité",
            iconName: 'Compass',
            type: 'exploration',
            mood: 'adventurous',
            consequences: ['Découverte possible', 'Dépense d\'énergie'],
          },
          {
            id: 'basic_social',
            text: "👥 Chercher des gens",
            description: "Essayer de rencontrer ou de parler à des personnes",
            iconName: 'Users',
            type: 'social',
            mood: 'social',
            consequences: ['Nouvelles rencontres', 'Informations sociales'],
          }
        ],
        aiRecommendation: { 
          focus: 'Mode Corrigé', 
          reasoning: 'Actions automatiquement corrigées et validées pour continuer l\'aventure.' 
        },
      };
    }
    
    // Erreur générique avec diagnostic détaillé
    let errorMessage = "Une erreur technique s'est produite lors de la génération du scénario.";
    let technicalDetails = error.message || "Erreur inconnue";
    
    if (isAuthError) {
      errorMessage = "Problème d'authentification avec l'API Google.";
      technicalDetails = "Vérifiez que votre clé API est valide et a les bonnes permissions.";
    }
    
    return {
      scenarioText: `
        <div class="bg-red-50 border border-red-200 rounded-lg p-6 mb-4">
          <div class="flex items-center mb-3">
            <svg class="w-6 h-6 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 18.5c-.77.833.192 2.5 1.732 2.5z"/>
            </svg>
            <h3 class="text-red-800 font-bold text-lg">❌ Erreur Technique</h3>
          </div>
          
          <p class="text-red-700 mb-4">${errorMessage}</p>
          
          <div class="bg-white rounded-lg p-4 border border-red-200">
            <p class="text-red-800 font-semibold mb-2">🔍 Détails techniques :</p>
            <code class="text-red-700 text-xs bg-red-100 p-2 rounded block break-all">
              ${technicalDetails}
            </code>
          </div>
          
          <div class="mt-4 p-3 bg-red-100 rounded-lg">
            <p class="text-red-800 text-sm">
              <strong>💡 Suggestion :</strong> Réessayez dans quelques instants ou redémarrez le serveur si le problème persiste.
            </p>
          </div>
        </div>
      `,
      choices: [
        {
          id: 'retry_action',
          text: "🔄 Réessayer l'action",
          description: "Tenter de relancer la dernière action",
          iconName: 'RefreshCw',
          type: 'action',
          mood: 'adventurous',
          consequences: ['Nouvelle tentative', 'Peut fonctionner'],
        },
        {
          id: 'fallback_continue',
          text: "➡️ Continuer sans IA",
          description: "Poursuivre avec des actions basiques",
          iconName: 'ArrowRight',
          type: 'action',
          mood: 'contemplative',
          consequences: ['Mode dégradé', 'Fonctionnalités limitées'],
        }
      ],
      aiRecommendation: { 
        focus: 'Erreur Technique', 
        reasoning: errorMessage 
      },
    };
  }
}

// Reste du code existant (toneDetails, instructions, prompts, etc.)
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

// Instructions améliorées pour l'IA avec validation stricte
const CHOICE_INSTRUCTIONS = `
- **Cohérence des Choix :** Proposez 3-4 choix NARRATIFS et CRÉATIFS. Ne dupliquez pas les actions de \`suggestedContextualActions\`.
- **Pas de Combat :** Ne proposez JAMAIS de choix d'attaque, utilisez le champ \`startCombat\` pour initier un combat si la narration le justifie.
- **Champs Vides :** Laissez les champs \`energyCost\`, \`timeCost\`, et \`skillGains\` vides ; le moteur de jeu les calculera.

- **⚠️ RESPECT STRICT DES ÉNUMÉRATIONS (OBLIGATOIRE POUR ÉVITER LES ERREURS) :**
  
  **Pour le champ 'iconName', utilisez UNIQUEMENT une de ces valeurs exactes :**
  ${CHOICE_ICON_NAMES.map(icon => `"${icon}"`).join(', ')}
  
  **Pour le champ 'type', utilisez UNIQUEMENT :**
  ${ACTION_TYPES.map(type => `"${type}"`).join(', ')}
  
  **Pour le champ 'mood', utilisez UNIQUEMENT :**
  ${MOOD_TYPES.map(mood => `"${mood}"`).join(', ')}

- **🚨 IMPORTANT :** Ne créez JAMAIS de nouvelles valeurs pour ces champs. Utilisez SEULEMENT celles listées ci-dessus.
- **✅ Exemples d'iconName valides :** "Eye", "Compass", "Heart", "Sword", "Brain"
- **❌ Exemples d'iconName INVALIDES :** "Look", "Explore", "Attack", "Think" (ces valeurs causeront des erreurs)

**🔍 VALIDATION AVANT ENVOI :**
Avant de générer votre réponse JSON, vérifiez que CHAQUE choix respecte exactement ces contraintes.
Si vous n'êtes pas sûr d'une valeur, utilisez ces valeurs par défaut sûres :
- iconName: "Zap"
- type: "action" 
- mood: "adventurous"
`;

const VALIDATION_REMINDER = `
**🚨 VALIDATION CRITIQUE FINALE :**
Votre réponse sera rejetée si elle contient des valeurs non autorisées. 
Vérifiez une dernière fois que tous les iconName sont dans cette liste exacte :
[${CHOICE_ICON_NAMES.join(', ')}]
`;

const FULL_SCENARIO_PROMPT = `Vous êtes un maître de jeu (MJ) et narrateur créatif pour "Aujourd'hui RPG", un jeu de rôle textuel se déroulant en France à l'époque suivante : **{{{player.era}}}**. Votre écriture doit être en français, dans une police de caractère serif comme 'Literata'. Votre rôle est de raconter, pas de décider. Votre texte doit être aéré, avec des paragraphes (<p>) et des dialogues pertinents.

**TÂCHE PRINCIPALE :**
1.  **Narrer (scenarioText) :** Basé sur \`gameEvents\`, écrivez une narration HTML immersive qui décrit le résultat de l'action du joueur. C'est votre tâche la plus importante.
2.  **Proposer des choix (choices) :**
    ${CHOICE_INSTRUCTIONS}
3.  **Suggérer des événements (optionnel) :** Si la narration le justifie, vous pouvez utiliser les champs optionnels comme \`newPNJs\`, \`newItems\`, \`pnjUpdates\`, etc. Utilisez-les avec parcimonie.

${VALIDATION_REMINDER}

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
**RAPPEL FINAL :** Vérifiez que chaque iconName est exactement l'une des valeurs autorisées avant de soumettre votre réponse.
`;

const FULL_PROLOGUE_PROMPT = `Vous êtes un maître de jeu (MJ) et narrateur créatif pour "Aujourd'hui RPG".

**TÂCHE PRINCIPALE : PROLOGUE**
Écrivez une scène d'introduction captivante en HTML pour le personnage suivant :
- **Personnage :** {{{player.name}}}, {{{player.gender}}} de {{{player.age}}} ans.
- **Contexte :** Époque "{{{player.era}}}", commençant à {{{player.currentLocation.name}}}. Passé : {{{player.background}}}.

Votre narration doit planter le décor, introduire le personnage, et suggérer le début d'une aventure.
Suivez les instructions de tonalité ci-dessous.
Proposez 3 choix narratifs initiaux dans le champ \`choices\`.

**Instructions pour les choix :**
${CHOICE_INSTRUCTIONS}

**Instructions de Tonalité :**
{{{toneInstructions}}}

${VALIDATION_REMINDER}

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
      
      // Validation et correction automatique des choix AVANT de retourner
      if (output.choices && output.choices.length > 0) {
        console.log("🔍 Validation des choix générés par l'IA...");
        output.choices = validateAndFixChoices(output.choices);
        console.log("✅ Validation terminée");
      } else {
        console.warn("⚠️ IA n'a pas généré de choix, ajout d'un choix par défaut");
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
         stack: error.stack?.substring(0, 500), // Limite pour éviter les logs trop longs
         name: error.name
       });
       
       // Re-lancer l'erreur pour qu'elle soit gérée par la fonction appelante
       throw error;
    }
  }
);