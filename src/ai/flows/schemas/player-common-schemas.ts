
/**
 * @fileOverview Zod schema definitions for common player-related data structures used as input for scenarios.
 */
import { z } from 'zod';
import { AVAILABLE_TONES } from '@/lib/types';

export const LocationSchema = z.object({
  latitude: z.number().describe('La latitude du lieu.'),
  longitude: z.number().describe('La longitude du lieu.'),
  name: z.string().describe('Le nom lisible du lieu (ex: "Paris, France").'),
  type: z.string().optional().describe('Le type de lieu (ex: "restaurant", "shop", "museum").'),
  description: z.string().optional().describe('Une brève description du lieu.'),
  tags: z.record(z.string()).optional().describe('Tags bruts décrivant le lieu (ex: { "cuisine": "italian" }).'),
});

// This simplified schema is for the AI, which only needs the level number.
export const SkillsSchema = z.object({
  physiques: z.record(z.number()),
  techniques: z.record(z.number()),
  survie: z.record(z.number()),
  sociales: z.record(z.number()),
  savoir: z.record(z.number()),
});

export const PlayerStatsSchema = z.object({
    Force: z.number(), Dexterite: z.number(), Constitution: z.number(),
    Intelligence: z.number(), Perception: z.number(), Charisme: z.number(),
    Volonte: z.number(), Savoir: z.number(), Technique: z.number(),
    MagieOccultisme: z.number(), Discretion: z.number(), ChanceDestin: z.number(),
    Sante: z.number(), Energie: z.number(), Stress: z.number()
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
    acc[tone] = z.boolean();
    return acc;
  }, {} as Record<typeof AVAILABLE_TONES[number], z.ZodBoolean>)
).partial();


// A comprehensive player schema for AI input
export const PlayerInputSchema = z.object({
  name: z.string(),
  gender: z.string(),
  age: z.number(),
  origin: z.string(),
  era: z.string(),
  background: z.string(),
  stats: PlayerStatsSchema,
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
  keyInventoryItems: z.array(z.string()).optional().describe("Liste des objets clés actuellement dans l'inventaire du joueur."),
  recentActionTypes: z.array(z.string()).optional().describe("Les types des 3 dernières actions du joueur, pour éviter la répétition."),
  physiologicalState: z.object({
    needsFood: z.boolean(),
    needsRest: z.boolean(),
    isThirsty: z.boolean(),
  }).optional().describe("État physiologique résumé du joueur pour guider les actions (faim, fatigue, soif)."),
});
