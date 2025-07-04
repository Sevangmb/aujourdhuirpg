# Documentation Technique - Aujourd'hui RPG
## Architecture de Communication entre Logique et IA

> **Projet analysé** : [Sevangmb/aujourdhuirpg](https://github.com/Sevangmb/aujourdhuirpg)  
> **Date d'audit** : 4 juillet 2025  
> **Version analysée** : Développement principal 2025

---

## 🏗️ Vue d'ensemble de l'Architecture

**Aujourd'hui RPG** implémente une **architecture modulaire en cascade** révolutionnaire qui sépare radicalement les responsabilités entre la logique métier et l'intelligence artificielle narrative.

### Principe fondamental
```
ACTION JOUEUR → LOGIQUE PURE → ENRICHISSEMENT CONTEXTUEL → IA NARRATIVE → RENDU UI
```

Cette approche garantit que :
- **La logique métier** reste déterministe et testable
- **L'IA** se concentre uniquement sur la narration immersive
- **Les données** circulent de manière structurée et prévisible

---

## 📊 Flux de Données Principal

### 1. Point d'entrée : Action du Joueur
```typescript
// Interface StoryChoice - Contrat d'action
interface StoryChoice {
  id: string;
  text: string;
  description: string;
  type: ActionType;
  mood: MoodType;
  consequences: string[];
  // Coûts calculés par la logique métier
  energyCost?: number;
  timeCost?: number;
}
```

### 2. Traitement par la Logique Métier Pure
```typescript
// GameLogicProcessor - Aucune IA ici
class GameLogicProcessor {
  processAction(gameState: GameState, choice: StoryChoice): {
    gameEvents: GameEvent[];
  } {
    const events: GameEvent[] = [];
    
    // Combat, déplacements, économie, etc.
    // Tout est calculé de manière déterministe
    
    return { gameEvents: events };
  }
}
```

### 3. Enrichissement Contextuel (Cascade)
```typescript
// Système de cascade - Enrichit le contexte
class CascadeOrchestrator {
  async processPlayerAction(
    gameState: GameState,
    contextualData: GameContextData,
    playerChoice: StoryChoice
  ): Promise<{
    gameLogicResult: { gameEvents: GameEvent[]; cascadeResult: CascadeResult | null; };
    aiContext: any;
  }>
}
```

### 4. Préparation du Contexte IA
```typescript
// AIContextPreparer - Prépare les données pour l'IA
class AIContextPreparer {
  prepareContext(
    gameState: GameState,
    gameEvents: GameEvent[],
    cascadeResult: CascadeResult | null,
    playerChoice: StoryChoice
  ): GenerateScenarioInput
}
```

### 5. Génération Narrative par l'IA
```typescript
// Genkit Flow - L'IA raconte, ne calcule pas
export async function generateScenario(
  input: GenerateScenarioInput
): Promise<GenerateScenarioOutput> {
  // L'IA agit comme un Game Master narratif
  // Elle raconte les événements pré-calculés
}
```

---

## 🔧 Composants Techniques Clés

### Core Engine (`src/core/`)

#### `cascade-orchestrator.ts`
**Rôle** : Chef d'orchestre principal
```typescript
export class CascadeOrchestrator {
  public gameLogicProcessor: GameLogicProcessor;
  public aiContextPreparer: AIContextPreparer;
  
  // Coordonne toute la chaîne de traitement
  async processPlayerAction(gameState, contextualData, playerChoice)
}
```

#### `game-logic-processor.ts`
**Rôle** : Logique métier pure (déterministe)
- Gestion du combat
- Calculs économiques
- Déplacements et transport
- Interaction avec les POIs
- Usage d'objets
- Tests de compétences

#### `ai-context-preparer.ts`
**Rôle** : Interface entre logique et IA
```typescript
export class AIContextPreparer {
  prepareContext(): GenerateScenarioInput {
    // Transforme les événements de jeu en contexte narratif
    const gameEventsSummary = summarizeGameEventsForAI(gameEvents);
    const cascadeSummary = this.summarizeCascadeResultsForAI(cascadeResult);
    return { player, playerChoiceText, gameEvents, ... };
  }
}
```

### IA Generative (`src/ai/`)

#### `flows/generate-scenario.ts`
**Rôle** : Narrateur principal
- Transforme les événements logiques en récit immersif
- Génère des choix contextuels
- Crée des quêtes et événements narratifs
- Maintient la cohérence tonale

#### `flows/generate-scenario-schemas.ts`
**Rôle** : Contrat de données
```typescript
// Input : Ce que la logique envoie à l'IA
export const GenerateScenarioInputSchema = z.object({
  player: PlayerInputSchema,
  playerChoiceText: z.string(),
  gameEvents: z.string(), // Événements pré-calculés
  cascadeResult: z.string().optional(),
});

// Output : Ce que l'IA retourne
export const GenerateScenarioOutputSchema = z.object({
  scenarioText: z.string(), // HTML narratif
  choices: z.array(StoryChoiceSchema),
  newQuests: z.array(QuestInputSchema).optional(),
  // ...
});
```

#### `tools/`
**Rôle** : Enrichissement de données externes
- `get-weather-tool.ts` : Données météorologiques
- `get-wikipedia-info-tool.ts` : Informations encyclopédiques
- `get-nearby-pois-tool.ts` : Points d'intérêt géographiques
- `get-news-tool.ts` : Actualités contextuelles

---

## 🌊 Architecture en Cascade Détaillée

### Système de Modules d'Enrichissement

Le système de cascade suit un modèle de dépendances sophistiqué :

```typescript
// DependencyChainManager.ts
class DependencyChainManager {
  private modules: Map<string, EnrichmentModule> = new Map();
  
  registerModule(module: EnrichmentModule): void;
  resolveDependencies(): EnrichmentModule[];
  executeChain(gameState: GameState, choice: StoryChoice): Promise<CascadeResult>;
}
```

### Modules Disponibles

1. **WeatherModule** : Enrichit avec données météorologiques
2. **LocationModule** : Informations géographiques et POIs
3. **HistoricalModule** : Contexte historique des lieux
4. **EconomicModule** : Données économiques locales
5. **CulturalModule** : Événements culturels et actualités

---

## 📋 Contrats de Données

### GameEvent (Logique → IA)
```typescript
interface GameEvent {
  type: 'HEALTH_CHANGED' | 'ITEM_USED' | 'QUEST_COMPLETED' | 'TRAVEL_COMPLETED' | ...;
  payload?: any;
  timestamp?: number;
}
```

### GenerateScenarioInput (Interface IA)
```typescript
interface GenerateScenarioInput {
  player: Player;                    // État complet du joueur
  playerChoiceText: string;          // Action sélectionnée
  gameEvents: string;                // Résumé des événements calculés
  previousScenarioText: string;      // Contexte narratif précédent
  cascadeResult?: string;            // Enrichissement contextuel
  suggestedContextualActions?: SuggestedAction[]; // Actions contextuelles
}
```

### GenerateScenarioOutput (Retour IA)
```typescript
interface GenerateScenarioOutput {
  scenarioText: string;              // HTML narratif immersif
  choices: StoryChoice[];            // Nouveaux choix disponibles
  aiRecommendation: {                // Suggestion IA
    focus: string;
    reasoning: string;
  };
  newQuests?: Quest[];               // Quêtes générées
  newPNJ?: PNJ[];                   // Personnages introduits
  majorDecisions?: MajorDecision[];  // Décisions importantes
  // ... autres événements générés
}
```

---

## 🔄 Cycle de Communication Complet

### 1. **Initialisation**
```typescript
// Création du contexte de jeu
const gameContext = useGameContext();
const { gameState, updateGameState } = gameContext;
```

### 2. **Action du Joueur**
```typescript
const handlePlayerChoice = async (choice: StoryChoice) => {
  // Désactivation UI pendant traitement
  setIsLoading(true);
  
  try {
    // Orchestration principale
    const orchestrator = new CascadeOrchestrator();
    const result = await orchestrator.processPlayerAction(
      gameState,
      contextualData,
      choice
    );
    
    // Mise à jour état de jeu
    updateGameState({
      player: result.updatedPlayer,
      gameEvents: result.gameLogicResult.gameEvents,
      currentScenario: result.aiOutput,
    });
    
  } catch (error) {
    console.error('Erreur traitement action:', error);
  } finally {
    setIsLoading(false);
  }
};
```

### 3. **Traitement Logique**
```typescript
// Dans GameLogicProcessor
const events = this.processAction(gameState, choice, weatherData);

// Exemples d'événements générés :
const combatEvents = processCombatTurn(player, enemy, choice);
const travelEvents = this.processTravel(gameState, choice);
const itemEvents = this.processItemUsage(gameState, choice);
```

### 4. **Enrichissement Cascade**
```typescript
// Exécution des modules d'enrichissement
const cascadeResult = await runCascadeForAction(gameState, choice);

// Enrichissement avec données externes
const weatherContext = await weatherModule.enrich(gameState);
const locationContext = await locationModule.enrich(gameState);
const historicalContext = await historicalModule.enrich(gameState);
```

### 5. **Génération IA**
```typescript
// Préparation contexte IA
const aiContext = this.aiContextPreparer.prepareContext(
  gameState,
  gameEvents,
  cascadeResult,
  choice
);

// Appel IA narrative
const aiOutput = await generateScenario(aiContext);
```

### 6. **Mise à Jour UI**
```typescript
// Rendu du nouveau scénario
return (
  <GameInterface>
    <ScenarioDisplay html={aiOutput.scenarioText} />
    <ChoiceSelector choices={aiOutput.choices} onSelect={handlePlayerChoice} />
    <PlayerStatusBar player={updatedPlayer} />
  </GameInterface>
);
```

---

## ⚡ Optimisations et Performance

### 1. **Séparation des Responsabilités**
- **Logique pure** : Calculs synchrones et rapides
- **IA narrative** : Traitement asynchrone avec feedback utilisateur
- **Enrichissement** : Cache intelligent des données externes

### 2. **Gestion des Erreurs**
```typescript
// Fallback scenarios si l'IA échoue
if (!process.env.GOOGLE_API_KEY) {
  return {
    scenarioText: `<p><strong>Mode Hors-ligne</strong></p>`,
    choices: generateStaticChoices(gameState),
    aiRecommendation: { focus: 'Manuel', reasoning: 'IA indisponible' }
  };
}
```

### 3. **Cache et Optimisations**
- Cache des réponses IA pour actions similaires
- Debouncing des actions rapides
- Préchargement des modules cascade

---

## 🧪 Tests et Validation

### Structure de Tests
```typescript
// test-ai-logic.ts - Validation flux complet
describe('AI Data Flow Logic', () => {
  test('AI Input Preparation', () => {
    const preparer = new AIContextPreparer();
    const aiContext = preparer.prepareContext(mockGameState, [], null, mockChoice);
    expect(GenerateScenarioInputSchema.parse(aiContext)).toBeDefined();
  });
  
  test('AI Output Validation', () => {
    expect(GenerateScenarioOutputSchema.parse(mockAiOutput)).toBeDefined();
  });
  
  test('Choice Enrichment', () => {
    const enrichedChoices = enrichAIChoicesWithLogic(mockChoices, mockPlayer);
    expect(enrichedChoices[0].energyCost).toBeDefined();
  });
});
```

### Commandes de Test
```bash
# Test logique IA
npm run test:ai

# Test complet
npm run validate

# Tests unitaires spécifiques
npm test -- --grep "AI Logic"
```

---

## 🔧 Configuration et Déploiement

### Variables d'Environnement Requises
```bash
# .env.local
GOOGLE_API_KEY=your_genkit_api_key_here
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
```

### Commandes de Développement
```bash
# Frontend Next.js
npm run dev

# Backend Genkit (IA)
npm run genkit:watch

# Développement complet
npm run dev:all
```

### Architecture Firebase
- **Firestore** : Sauvegarde état de jeu
- **Authentication** : Gestion utilisateurs
- **Hosting** : Déploiement production
- **Functions** : Flux IA serverless

---

## 📊 Métriques et Monitoring

### KPIs Techniques
- **Temps de réponse IA** : < 3 secondes (objectif)
- **Taux de succès génération** : > 98%
- **Cache hit ratio** : > 80%
- **Bundle size** : < 2MB initial

### Logs et Debugging
```typescript
// Logging structuré
console.log('[GAME_LOGIC]', 'Events generated:', events.length);
console.log('[CASCADE]', 'Modules executed:', moduleResults);
console.log('[AI_CONTEXT]', 'Context size:', JSON.stringify(aiContext).length);
```

---

## 🚀 Roadmap Développement

### Phase Actuelle (Juillet 2025)
- ✅ Architecture cascade fonctionnelle
- ✅ IA narrative stable
- 🔄 Interface de combat
- 🔄 Modals de transport
- 🔄 Tests complets

### Prochaines Étapes
1. **Système de cuisine IA** (Q3 2025)
2. **Rencontres historiques** (Q4 2025)
3. **Mode multijoueur** (2026)
4. **IA émotionnelle adaptative** (2026)

---

## 📚 Ressources et Références

### Documentation Technique
- `COMBAT_INTEGRATION.md` : Système de combat
- `SECURITY_SETUP.md` : Configuration sécurisée
- `TROUBLESHOOTING.md` : Résolution problèmes

### APIs Externes Utilisées
- **Google AI (Genkit)** : Génération narrative
- **OpenStreetMap (Overpass)** : Données géographiques
- **OpenWeatherMap** : Météorologie
- **Wikipedia API** : Informations encyclopédiques

### Technologies Clés
- **Frontend** : Next.js 15, React 18, TypeScript
- **IA** : Google Genkit, Gemini API
- **Backend** : Firebase (Firestore, Auth, Functions)
- **Styling** : Tailwind CSS, ShadCN/UI

---

## 👥 Équipe et Support

### Contacts
- **Développeur Principal** : Sevangmb
- **Repository** : [github.com/Sevangmb/aujourdhuirpg](https://github.com/Sevangmb/aujourdhuirpg)
- **Issues** : [GitHub Issues](https://github.com/Sevangmb/aujourdhuirpg/issues)

### Support Firebase Studio
Cette documentation est spécialement conçue pour aider Firebase Studio dans le développement et la maintenance du système de communication logique-IA.

**Focus prioritaire** : Compréhension de l'architecture en cascade et intégration des nouveaux modules d'enrichissement.

---

*Document généré le 4 juillet 2025 - Version 1.0*