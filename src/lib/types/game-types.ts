
import type { Player } from './player-types';
import type { ToneSettings } from './tone-types';

// This type represents the data for a scenario that the player is currently in.
export type Scenario = {
  scenarioText: string; // HTML content from AI
  suggestedActions?: string[]; // Optional array of AI-suggested actions
};

export type JournalEntry = {
  id: string; // unique ID, e.g., from uuid
  timestamp: number; // game time in minutes
  type: 'location_change' | 'event' | 'player_action' | 'quest_update' | 'npc_interaction' | 'misc';
  text: string; // Description of the entry
  location?: Position; // Optional, if related to a specific location
};

export type GameState = {
  player: Player | null;
  currentScenario: Scenario | null;
  nearbyPois: Position[] | null;
  gameTimeInMinutes: number;
  journal: JournalEntry[];
  toneSettings: ToneSettings;
  lastPlayed?: any; // For Firestore server timestamp
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
  | 'pnj_disposition_changed'
  | 'pnj_interaction_logged'
  | 'decision_logged'
  | 'money_changed'
  | 'clue_added'
  | 'document_added'
  | 'investigation_notes_updated'
  | 'tone_settings_updated'
  | 'skill_check'
  | 'info'
  | 'warning';

export interface GameNotification {
  type: GameNotificationType;
  title: string;
  description?: string;
  details?: Record<string, any>;
}

export type Zone = {
  name: string;
  description?: string;
};

export type Position = {
  latitude: number;
  longitude: number;
  name: string;
  summary?: string;
  imageUrl?: string;
  zone?: Zone;
  poiHighlights?: string[];
};
