#!/usr/bin/env ts-node
/**
 * @fileOverview Unit test script for AI data flow logic.
 * This script validates the data preparation for the AI and the processing of its output.
 * Run with: npm run test:ai
 */

import { AIContextPreparer } from './src/core/cascade/ai-context-preparer';
import { enrichAIChoicesWithLogic } from './src/lib/game-logic';
import { hydratePlayer } from './src/lib/game-state-persistence';
import { GenerateScenarioInputSchema, GenerateScenarioOutputSchema } from './src/ai/flows/generate-scenario-schemas';
import type { GameState, StoryChoice, Player, GameEvent } from './src/lib/types';
import type { GenerateScenarioOutput } from './src/ai/flows/generate-scenario';
import { z } from 'zod';

// --- Test Utilities ---
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

// --- Mock Data ---

const mockPlayer: Player = hydratePlayer({
    name: "Testeur",
    age: 30,
    gender: "Homme",
    origin: "Paris",
    background: "Un testeur cherchant des bugs.",
    era: 'Époque Contemporaine',
});

const mockGameState: GameState = {
  player: mockPlayer,
  currentScenario: {
    scenarioText: "<p>Le test commence.</p>",
    choices: [],
  },
  nearbyPois: [],
  gameTimeInMinutes: 0,
  journal: [],
};

const mockChoice: StoryChoice = {
  id: 'test_action',
  text: 'Lancer un test',
  description: 'Exécuter un test unitaire pour valider la logique.',
  iconName: 'Zap',
  type: 'action',
  mood: 'adventurous',
  energyCost: 0,
  timeCost: 0,
  consequences: ['Validation'],
};

const mockValidAiOutput: GenerateScenarioOutput = {
    scenarioText: '<h3>Test Réussi</h3><p>Le test s\'est bien déroulé.</p>',
    aiRecommendation: {
        focus: 'Continuer',
        reasoning: 'La logique semble stable.'
    },
    choices: [
        {
            id: 'continue_testing',
            text: 'Continuer les tests',
            description: 'Lancer le prochain test.',
            iconName: 'Zap',
            type: 'action',
            mood: 'adventurous',
            consequences: ['Plus de validation']
        },
        {
            id: 'stop_testing',
            text: 'Arrêter les tests',
            description: 'Terminer la session de test.',
            iconName: 'BookOpen',
            type: 'reflection',
            mood: 'contemplative',
            consequences: ['Retour au développement']
        }
    ],
    newQuests: [
        {
            title: 'Bug Hunt',
            description: 'Trouver et éradiquer tous les bugs.',
            type: 'main',
            objectives: ['Valider le flux de données AI']
        }
    ]
};

// --- Test Runner ---

async function runTests() {
  let failures = 0;
  
  log('\n🔬 Démarrage des tests unitaires pour le flux de données IA...', 'bold');
  
  // Test 1: AI Input Preparation
  try {
    log('\n--- Test 1: Préparation des données pour l\'IA ---', 'yellow');
    const preparer = new AIContextPreparer();
    const aiContext = preparer.prepareContext(mockGameState, [], null, mockChoice);
    
    GenerateScenarioInputSchema.parse(aiContext);
    log('✅ SUCCÈS: Le contexte généré pour l\'IA est valide.', 'green');

  } catch (error) {
    log('❌ ÉCHEC: La préparation du contexte pour l\'IA a échoué.', 'red');
    if (error instanceof z.ZodError) {
        log(JSON.stringify(error.errors, null, 2), 'red');
    } else {
        log((error as Error).message, 'red');
    }
    failures++;
  }
  
  // Test 2: AI Output Validation
  try {
    log('\n--- Test 2: Validation d\'une réponse simulée de l\'IA ---', 'yellow');
    GenerateScenarioOutputSchema.parse(mockValidAiOutput);
    log('✅ SUCCÈS: La réponse simulée de l\'IA est conforme au schéma.', 'green');
  } catch(error) {
    log('❌ ÉCHEC: La réponse simulée de l\'IA est INVALIDE.', 'red');
    if (error instanceof z.ZodError) {
        log(JSON.stringify(error.errors, null, 2), 'red');
    } else {
        log((error as Error).message, 'red');
    }
    failures++;
  }

  // Test 3: AI Output to Event Conversion
  try {
    log('\n--- Test 3: Conversion de la réponse IA en événements de jeu ---', 'yellow');
    const preparer = new AIContextPreparer();
    const events: GameEvent[] = preparer.convertAIOutputToEvents(mockValidAiOutput);
    
    if (!Array.isArray(events)) throw new Error('La sortie n\'est pas un tableau.');
    if (events.length === 0 && mockValidAiOutput.newQuests) throw new Error('Aucun événement généré alors qu\'une nouvelle quête était attendue.');
    if (events[0].type !== 'QUEST_ADDED') throw new Error('Le type d\'événement généré est incorrect.');

    log('✅ SUCCÈS: La conversion de la réponse IA en événements a fonctionné.', 'green');

  } catch (error) {
    log('❌ ÉCHEC: La conversion de la réponse IA a échoué.', 'red');
    log((error as Error).message, 'red');
    failures++;
  }

  // Test 4: Choice Enrichment
  try {
    log('\n--- Test 4: Enrichissement des choix IA avec la logique du jeu ---', 'yellow');
    if(!mockValidAiOutput.choices) throw new Error("Mock data is missing choices");

    const enrichedChoices = enrichAIChoicesWithLogic(mockValidAiOutput.choices, mockPlayer);
    
    if (enrichedChoices.length !== mockValidAiOutput.choices.length) throw new Error('Le nombre de choix a changé après enrichissement.');
    if (enrichedChoices[0].timeCost === undefined || enrichedChoices[0].energyCost === undefined) {
        throw new Error('Les coûts en temps et énergie n\'ont pas été ajoutés aux choix.');
    }
    log('✅ SUCCÈS: L\'enrichissement des choix a fonctionné correctement.', 'green');

  } catch(error) {
    log('❌ ÉCHEC: L\'enrichissement des choix a échoué.', 'red');
    log((error as Error).message, 'red');
    failures++;
  }

  // Final Summary
  log('\n' + '='.repeat(50), 'bold');
  if (failures === 0) {
    log('🎉 Tous les tests sont passés avec succès !', 'green');
    log('La logique de transmission de données semble robuste.', 'cyan');
    process.exit(0);
  } else {
    log(`🚨 ${failures} test(s) ont échoué.`, 'red');
    log('Veuillez examiner les erreurs ci-dessus pour déboguer le problème.', 'cyan');
    process.exit(1);
  }
}

runTests();
