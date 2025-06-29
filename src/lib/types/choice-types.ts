import type { ElementType } from 'react';
import * as LucideIcons from 'lucide-react';
import type { AdvancedSkillSystem } from './player-types';

export const ACTION_TYPES = ["observation", "exploration", "social", "action", "reflection"] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export const MOOD_TYPES = ["contemplative", "adventurous", "social", "artistic", "mysterious"] as const;
export type MoodType = (typeof MOOD_TYPES)[number];

// List of icon names for AI to choose from, matching the guide
export const CHOICE_ICON_NAMES = [
  "Eye", "Search", "Compass", "Map", // Exploration/Observation
  "MessageSquare", "Users", "Heart", // Social
  "Zap", "Camera", "Wrench", "Briefcase", "Utensils", "ShoppingCart",// Action
  "Brain", "BookOpen", "Wind", "Feather", "Drama" // Reflection
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
  skillCheck?: {
    skill: string; // e.g., "cognitive.observation", "physical.stealth". A path in AdvancedSkillSystem
    difficulty: number; // e.g., 60
  };
}
