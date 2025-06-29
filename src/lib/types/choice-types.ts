import type { ElementType } from 'react';

export const ACTION_TYPES = ["observation", "exploration", "social", "action", "reflection"] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export const MOOD_TYPES = ["contemplative", "adventurous", "social", "artistic", "mysterious"] as const;
export type MoodType = (typeof MOOD_TYPES)[number];

export interface StoryChoice {
  id: string;
  text: string;
  description: string;
  icon: ElementType;
  type: ActionType;
  mood: MoodType;
  energyCost: number;
  timeCost: number; // in minutes
  consequences: string[];
}
