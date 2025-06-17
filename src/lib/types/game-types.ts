
import type { Player } from './player-types';

// This type represents the data for a scenario that the player is currently in.
export type Scenario = {
  scenarioText: string; // HTML content from AI
};

export type GameState = {
  player: Player | null;
  currentScenario: Scenario | null;
};

// Notification types for UI feedback after AI processing
export type GameNotificationType =
  | 'xp_gained'
  | 'item_added'
  | 'item_removed'
  | 'leveled_up'
  | 'location_changed'
  | 'stat_changed'
  | 'quest_added'
  | 'quest_updated'
  | 'pnj_encountered'
  | 'decision_logged'
  | 'money_changed'
  | 'clue_added' // New
  | 'document_added' // New
  | 'investigation_notes_updated' // New
  | 'tone_settings_updated' // New
  | 'skill_check' // For results of skill checks
  | 'warning'; // For generic warnings or unclear actions

export interface GameNotification {
  type: GameNotificationType;
  title: string;
  description?: string;
  details?: Record<string, any>; // e.g., { itemName: 'Potion', quantity: 1 } or { amount: 50 }
}
