/**
 * @fileOverview Type definitions specific to the Quest module.
 */
import type { PlayerStats } from "@/lib/types";

export type QuestStatus = 'active' | 'completed' | 'failed' | 'inactive';
export type QuestType = 'main' | 'secondary' | 'job';

export interface QuestObjective {
  id: string; // e.g., "find_document"
  description: string;
  isCompleted: boolean;
}

export interface QuestRewards {
    xp?: number;
    money?: number;
    items?: { itemId: string; quantity: number }[];
    stats?: Partial<Record<keyof PlayerStats, number>>;
    reputation?: number;
}

export interface Quest {
  id: string; // Unique ID for the quest, e.g., "main_story_01_paris_intro"
  title: string;
  description: string; // Overall description of the quest
  type: QuestType;
  status: QuestStatus;
  objectives: QuestObjective[];
  giver?: string; // Name of the PNJ who gave the quest, if any
  rewardDescription?: string; // Text description of the reward (items, XP)
  rewards?: QuestRewards;
  relatedLocation?: string; // Name of a relevant location
  dateAdded: string; // ISO string date
  dateCompleted?: string; // ISO string date
}

// This type is used by the AI to propose updates
export interface QuestUpdate {
  questId: string;
  newStatus?: 'active' | 'completed' | 'failed';
  updatedObjectives?: Array<{
    objectiveId: string;
    isCompleted: boolean;
  }>;
  newObjectiveDescription?: string;
}
