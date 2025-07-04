

import type { ElementType } from 'react';
import * as LucideIcons from 'lucide-react';
import type { AdvancedSkillSystem, PlayerStats, Position } from './';
import type { EstablishmentType } from './poi-types';
import type { EnrichedRecipe } from './recipe-types';


export const ACTION_TYPES = ["observation", "exploration", "social", "action", "reflection", "job"] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export const MOOD_TYPES = ["contemplative", "adventurous", "social", "artistic", "mysterious"] as const;
export type MoodType = (typeof MOOD_TYPES)[number];

// NEW, CURATED LIST of reliable icon names for the AI to choose from.
export const CHOICE_ICON_NAMES = [
  // Observation & Exploration
  "Eye", "Search", "Compass", "MapPin", 
  // Social & Interaction
  "MessageSquare", "Users", "Heart", 
  // Action & Utility
  "Zap", "Sword", "Wrench", "Briefcase", "KeyRound",
  // Needs & Consumables
  "Utensils", "ShoppingCart", "ChefHat", "GlassWater",
  // Knowledge & Magic
  "BookOpen", "Sparkles", "Wind",
  // Misc
  "Smartphone", "Camera", "NotebookPen"
] as const;
export type ChoiceIconName = (typeof CHOICE_ICON_NAMES)[number];


export interface StoryChoice {
  id: string;
  text: string;
  description: string;
  iconName: ChoiceIconName;
  type: ActionType;
  mood: MoodType;
  energyCost?: number | null;
  timeCost?: number | null; // in minutes
  consequences: string[];
  isCombatAction?: boolean;
  combatActionType?: 'attack' | 'defend' | 'flee' | 'special' | 'use_item';
  itemReference?: string; // e.g., instanceId of item to use
  skillCheck?: {
    skill: string; // e.g., "cognitive.observation", "physical.stealth". A path in AdvancedSkillSystem
    difficulty: number; // e.g., 60
  };
  skillGains?: Record<string, number>;
  physiologicalEffects?: { hunger?: number; thirst?: number };
  statEffects?: Partial<Record<keyof PlayerStats, number>>;
  successProbability?: number; // Optional field for displaying success chance
  economicImpact?: { cost: { min: number, max: number }, location: string };
  poiReference?: { osmId: string, serviceId: string, establishmentType: EstablishmentType };
  craftingPayload?: { recipe: EnrichedRecipe };
  // New property to specifically handle travel actions
  travelChoiceInfo?: {
      destination: Position;
      mode: 'walk' | 'metro' | 'taxi';
  }
}
