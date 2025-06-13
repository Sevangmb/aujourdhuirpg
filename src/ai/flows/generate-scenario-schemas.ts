
/**
 * @fileOverview Zod schema definitions for the generateScenario flow.
 */
import {z} from 'genkit';

export const LocationSchema = z.object({
  latitude: z.number().describe('The latitude of the location.'),
  longitude: z.number().describe('The longitude of the location.'),
  placeName: z.string().describe('The human-readable name of the location (e.g., "Paris, France").'),
});

export const SkillsSchema = z.record(z.number()).describe("Player's skills (e.g., {\"Informatique\": 10, \"Discretion\": 5}).");
export const TraitsMentalStatesSchema = z.array(z.string()).describe("Player's current mental states or traits (e.g., [\"Stressé\", \"Observateur\"]).");

export const ProgressionInputSchema = z.object({
  level: z.number().describe("Player's current level."),
  xp: z.number().describe("Player's current experience points."),
  xpToNextLevel: z.number().describe("XP needed for the player to reach the next level."),
  perks: z.array(z.string()).describe("Player's unlocked perks or passive abilities."),
});

export const AlignmentSchema = z.object({
  chaosLawful: z.number().describe("Player's alignment on the Chaos/Lawful axis (-100 to 100)."),
  goodEvil: z.number().describe("Player's alignment on the Good/Evil axis (-100 to 100)."),
});

export const InventoryItemInputSchema = z.object({
    name: z.string().describe("The name of the item."),
    quantity: z.number().describe("The quantity of the item."),
});

export const QuestObjectiveInputSchema = z.object({
  id: z.string().describe("Identifiant unique de l'objectif (ex: 'trouver_document_x')."),
  description: z.string().describe("Description de ce que le joueur doit faire."),
  isCompleted: z.boolean().default(false).describe("Si l'objectif est complété (généralement false à la création).")
}).describe("Un objectif spécifique d'une quête.");

export const QuestInputSchema = z.object({
  id: z.string().describe("Identifiant unique de la quête (ex: 'quete_principale_01', 'secondaire_cafe_mystere'). Doit être unique et mémorable."),
  title: z.string().describe("Titre de la quête."),
  description: z.string().describe("Description générale de la quête."),
  type: z.enum(['main', 'secondary']).describe("Type de quête (principale ou secondaire)."),
  status: z.enum(['active', 'inactive', 'completed', 'failed']).default('active').describe("Statut de la quête."),
  objectives: z.array(QuestObjectiveInputSchema).describe("Liste des objectifs de la quête."),
  giver: z.string().optional().describe("Nom du PNJ qui a donné la quête."),
  reward: z.string().optional().describe("Description textuelle de la récompense potentielle (objets, XP)."),
  moneyReward: z.number().optional().describe("Montant d'argent (euros) offert en récompense pour la quête."),
  relatedLocation: z.string().optional().describe("Nom d'un lieu pertinent pour la quête."),
}).describe("Structure pour une nouvelle quête à ajouter au journal du joueur.");

export const QuestUpdateSchema = z.object({
  questId: z.string().describe("ID de la quête existante à mettre à jour."),
  newStatus: z.enum(['active', 'completed', 'failed']).optional().describe("Nouveau statut de la quête si changé."),
  updatedObjectives: z.array(z.object({
    objectiveId: z.string().describe("ID de l'objectif à mettre à jour."),
    isCompleted: z.boolean().describe("Si l'objectif est maintenant complété.")
  })).optional().describe("Liste des objectifs dont le statut a changé."),
  newObjectiveDescription: z.string().optional().describe("Description d'un nouvel objectif ajouté à cette quête (rare). L'IA devrait préférer créer des sous-quêtes ou des quêtes séquentielles.")
}).describe("Structure pour mettre à jour une quête existante.");

export const PNJInteractionSchema = z.object({
  id: z.string().describe("Identifiant unique du PNJ (ex: 'pnj_marie_cafe', 'pnj_detective_dupont'). Doit être unique et mémorable."),
  name: z.string().describe("Nom du PNJ."),
  description: z.string().describe("Brève description du PNJ ou de son rôle actuel."),
  relationStatus: z.enum(['friendly', 'neutral', 'hostile', 'allied', 'rival', 'unknown']).default('neutral').describe("Relation actuelle du joueur avec ce PNJ."),
  importance: z.enum(['major', 'minor', 'recurring']).default('minor').describe("Importance du PNJ dans l'histoire."),
  trustLevel: z.number().min(0).max(100).optional().describe("Niveau de confiance du PNJ envers le joueur (0-100)."),
  firstEncountered: z.string().optional().describe("Contexte de la première rencontre (si c'est la première fois)."),
  notes: z.array(z.string()).optional().describe("Notes à ajouter sur ce PNJ (actions mémorables, informations clés données).")
}).describe("Structure pour enregistrer ou mettre à jour une interaction avec un PNJ.");

export const MajorDecisionSchema = z.object({
  id: z.string().describe("Identifiant unique pour cette décision (ex: 'choix_trahir_contact_paris')."),
  summary: z.string().describe("Résumé concis de la décision prise par le joueur."),
  outcome: z.string().describe("Conséquence immédiate ou prévue de cette décision."),
  scenarioContext: z.string().describe("Brève description du contexte du scénario au moment de la décision.")
}).describe("Structure pour enregistrer une décision majeure du joueur.");

export const GenerateScenarioInputSchema = z.object({
  playerName: z.string().describe('The name of the player character.'),
  playerGender: z.string().describe("The player character's gender."),
  playerAge: z.number().describe("The player character's age."),
  playerOrigin: z.string().describe("The player character's origin (social, geographical)."),
  playerBackground: z.string().describe('The background or history of the player character.'),
  playerStats: z.record(z.number()).describe('A record of the player character stats (e.g., {"Sante": 100, "Charisme": 50}).'),
  playerSkills: SkillsSchema,
  playerTraitsMentalStates: TraitsMentalStatesSchema,
  playerProgression: ProgressionInputSchema,
  playerAlignment: AlignmentSchema,
  playerInventory: z.array(InventoryItemInputSchema).describe("A list of items the player currently possesses, with their names and quantities."),
  playerMoney: z.number().describe("The player's current amount of money (in euros)."),
  playerChoice: z.string().describe('The free-form text action the player typed.'),
  currentScenario: z.string().describe('The current scenario context (the HTML text of the previous scenario).'),
  playerLocation: LocationSchema.describe("The player's current location."),
  activeQuests: z.array(QuestInputSchema.omit({ status: true, objectives: true }).extend({ currentObjectivesDescriptions: z.array(z.string())})).optional().describe("Liste des quêtes actives du joueur (titre, description, objectifs actuels) pour contexte."),
  encounteredPNJsSummary: z.array(z.object({name: z.string(), relation: z.string()})).optional().describe("Résumé des PNJ importants déjà rencontrés et leur relation actuelle.")
});

export const NewLocationDetailsSchema = LocationSchema.extend({
    reasonForMove: z.string().optional().describe("A brief explanation if the AI decided the player moved, e.g., 'Took a train to Marseille'.")
}).describe("Details of the new location if the player's action caused them to move significantly. Omit if no significant location change.");

export const GenerateScenarioOutputSchema = z.object({
  scenarioText: z.string().describe('The generated scenario text, formatted in HTML (e.g., using <p> tags). This text describes the outcome of the player action and sets the scene for the next player input. It should NOT contain interactive elements like buttons.'),
  scenarioStatsUpdate: z.record(z.number()).optional().describe('A record of the changes that will happen to the player stats as a result of entering this new scenario (e.g., {"Sante": -10, "Intelligence": 5}). If there is no impact, the record can be empty or omitted.'),
  newLocationDetails: NewLocationDetailsSchema.optional(),
  xpGained: z.number().optional().describe("Experience points gained from this scenario's outcome, if any. Award reasonably (e.g., 5-50 XP)."),
  moneyChange: z.number().optional().describe("Amount of money (euros) the player gains (positive value) or loses (negative value) in this scenario. E.g., for rewards, purchases, finding/losing money. Do not include quest completion rewards here, use 'moneyReward' in 'newQuests' or 'questUpdates' for that."),
  itemsAdded: z.array(z.object({
      itemId: z.string().describe("The unique ID of the item from the master item list (e.g. 'energy_bar_01', 'medkit_basic_01', 'mysterious_key_01', 'data_stick_01')."),
      quantity: z.number().min(1).describe("Quantity of the item added.")
    })).optional().describe("List of items to be added to the player's inventory if they discover something."),
  itemsRemoved: z.array(z.object({
      itemName: z.string().describe("The NAME of the item as it appears in player's inventory (e.g. 'Smartphone', 'Barre énergétique')."),
      quantity: z.number().min(1).describe("Quantity of the item removed.")
    })).optional().describe("List of items to be removed from the player's inventory if they use or lose something."),
  newQuests: z.array(QuestInputSchema).optional().describe("Liste des nouvelles quêtes initiées par ce scénario."),
  questUpdates: z.array(QuestUpdateSchema).optional().describe("Mises à jour des quêtes existantes (objectifs complétés, statut changé)."),
  pnjInteractions: z.array(PNJInteractionSchema).optional().describe("PNJ rencontrés ou dont la relation/information a changé de manière significative."),
  majorDecisionsLogged: z.array(MajorDecisionSchema).optional().describe("Décisions importantes prises par le joueur qui méritent d'être enregistrées."),
});
