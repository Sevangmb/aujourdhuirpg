
import type { ElementType } from 'react';
import * as LucideIcons from 'lucide-react';
import type { AdvancedSkillSystem, PlayerStats, Position } from './';
import type { EstablishmentType } from './poi-types';
import type { EnrichedRecipe } from './recipe-types';


export const ACTION_TYPES = ["observation", "exploration", "social", "action", "reflection", "job"] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export const MOOD_TYPES = ["contemplative", "adventurous", "social", "artistic", "mysterious"] as const;
export type MoodType = (typeof MOOD_TYPES)[number];

// List of icon names for AI to choose from, matching the guide
export const CHOICE_ICON_NAMES = [
  "Eye", "Search", "Compass", "Map", // Exploration/Observation
  "MessageSquare", "Users", "Heart", "GlassWater", // Social & Needs
  "Zap", "Camera", "Wrench", "Briefcase", "Utensils", "ShoppingCart", "ChefHat", "Sword", "Smartphone", "Sparkles", // Action
  "Brain", "BookOpen", "Wind", "Feather", "Drama", "NotebookPen" // Reflection & Investigation
] as const;
export type ChoiceIconName = (typeof CHOICE_ICON_NAMES)[number];


export interface StoryChoice {
  id: string;
  text: string;
  description: string;
  iconName: ChoiceIconName;
  type: ActionType;
  mood: MoodType;
  energyCost: number;
  timeCost: number; // in minutes
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
