
export type QuestStatus = 'active' | 'completed' | 'failed' | 'inactive';
export type QuestType = 'main' | 'secondary';

export interface QuestObjective {
  id: string; // e.g., "find_document"
  description: string;
  isCompleted: boolean;
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
  moneyReward?: number; // Monetary reward for completing the quest
  relatedLocation?: string; // Name of a relevant location
  dateAdded: string; // ISO string date
  dateCompleted?: string; // ISO string date
}

export interface QuestUpdate {
  questId: string;
  newStatus?: 'active' | 'completed' | 'failed';
  updatedObjectives?: Array<{
    objectiveId: string;
    isCompleted: boolean;
  }>;
  newObjectiveDescription?: string;
}
