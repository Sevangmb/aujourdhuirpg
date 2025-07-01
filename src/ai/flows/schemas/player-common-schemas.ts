
/**
 * @fileOverview Zod schema definitions for common player-related data structures used as input for scenarios.
 */
import { z } from 'genkit';
import { AVAILABLE_TONES } from '@/lib/types';

export const LocationSchema = z.object({
  latitude: z.number().describe('La latitude du lieu.'),
  longitude: z.number().describe('La longitude du lieu.'),
  name: z.string().describe('Le nom lisible du lieu (ex: "Paris, France").'),
  type: z.string().optional().describe('Le type de lieu (ex: "restaurant", "shop", "museum").'),
  description: z.string().optional().describe('Une brève description du lieu.'),
  tags: z.record(z.string()).optional().describe('Tags bruts décrivant le lieu (ex: { "cuisine": "italian" }).'),
});

export const EnemySchema = z.object({
  name: z.string().describe("Nom de l'ennemi."),
  description: z.string().describe("Description de l'ennemi."),
  health: z.number().describe("Santé actuelle de l'ennemi."),
  maxHealth: z.number().describe("Santé maximale de l'ennemi."),
  attack: z.number().describe("Valeur d'attaque de l'ennemi."),
  defense: z.number().describe("Valeur de défense de l'ennemi."),
});

// UPDATED to AdvancedSkillSystem structure
export const SkillsSchema = z.object({
  cognitive: z.object({
    analysis: z.number(),
    memory: z.number(),
    creativity: z.number(),
    logic: z.number(),
    observation: z.number(),
  }),
  social: z.object({
    persuasion: z.number(),
    empathy: z.number(),
    leadership: z.number(),
    networking: z.number(),
    cultural_adaptation: z.number(),
  }),
  physical: z.object({
    endurance: z.number(),
    agility: z.number(),
    stealth: z.number(),
    strength: z.number(),
    dexterity: z.number(),
  }),
  technical: z.object({
    technology: z.number(),
    investigation: z.number(),
    languages: z.number(),
    finance: z.number(),
    crafting: z.number(),
  }),
  survival: z.object({
    streetwise: z.number(),
    wilderness: z.number(),
    medical: z.number(),
    navigation: z.number(),
    adaptation: z.number(),
  }),
});

export const TraitsMentalStatesSchema = z.array(z.string());

export const ProgressionInputSchema = z.object({
  level: z.number().describe("Le niveau actuel du joueur."),
  xp: z.number().describe("Les points d'expérience actuels du joueur."),
  xpToNextLevel: z.number().describe("L'XP requis pour atteindre le prochain niveau."),
  perks: z.array(z.string()).describe("Les avantages ou capacités passives débloqués par le joueur."),
});

export const AlignmentSchema = z.object({
  chaosLawful: z.number().describe("L'alignement du joueur sur l'axe Chaos/Loi (-100 à 100)."),
  goodEvil: z.number().describe("L'alignement du joueur sur l'axe Bien/Mal (-100 à 100)."),
});

export const IntelligentItemInputSchema = z.object({
  instanceId: z.string().describe("L'identifiant unique de cette instance d'objet."),
  id: z.string().describe("L'identifiant de base de l'objet (le modèle)."),
  name: z.string().describe("Le nom de l'objet."),
  description: z.string().describe("La description de l'objet."),
  type: z.enum(['wearable', 'consumable', 'key', 'electronic', 'tool', 'misc', 'quest']).describe("La catégorie de l'objet."),
  quantity: z.number().describe("La quantité de cet objet."),
  condition: z.object({ durability: z.number() }).describe("L'état actuel de l'objet (100 = parfait)."),
  memory: z.object({
    acquisitionStory: z.string().describe("Comment et où cet objet a été obtenu."),
  }).describe("La 'mémoire' de l'objet, son histoire."),
  economics: z.object({
      base_value: z.number(),
      rarity_multiplier: z.number()
  }).describe("Les propriétés économiques de base de l'objet."),
});


export const ToneSettingsSchema = z.object(
  AVAILABLE_TONES.reduce((acc, tone) => {
    acc[tone] = z.number().min(0).max(100);
    return acc;
  }, {} as Record<typeof AVAILABLE_TONES[number], z.ZodNumber>)
).partial();


// NEW: A comprehensive player schema for AI input
export const PlayerInputSchema = z.object({
  name: z.string(),
  gender: z.string(),
  age: z.number(),
  origin: z.string(),
  era: z.string(),
  background: z.string(),
  stats: z.record(z.string(), z.number()),
  skills: SkillsSchema,
  physiology: z.object({
    basic_needs: z.object({
      hunger: z.object({ level: z.number() }),
      thirst: z.object({ level: z.number() }),
    }),
  }),
  traitsMentalStates: TraitsMentalStatesSchema,
  progression: ProgressionInputSchema,
  alignment: AlignmentSchema,
  inventory: z.array(IntelligentItemInputSchema),
  money: z.number(),
  currentLocation: LocationSchema,
  toneSettings: ToneSettingsSchema,
  // --- ADDED NEW FIELDS for context ---
  keyInventoryItems: z.array(z.string()).optional().describe("Liste des objets clés actuellement dans l'inventaire du joueur."),
  recentActionTypes: z.array(z.string()).optional().describe("Les types des 3 dernières actions du joueur, pour éviter la répétition."),
  physiologicalState: z.object({
    needsFood: z.boolean(),
    needsRest: z.boolean(),
    isThirsty: z.boolean(),
  }).optional().describe("État physiologique résumé du joueur pour guider les actions (faim, fatigue, soif)."),
});
