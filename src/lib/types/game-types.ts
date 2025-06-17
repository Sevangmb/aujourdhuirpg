
import type { Player } from './player-types';

// This type represents the data for a scenario that the player is currently in.
export type Scenario = {
  scenarioText: string; // HTML content from AI
};

import type { Position } from './game-types'; // Already here, but good to ensure for Position

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
  nearbyPois: Position[] | null; // Added for available POIs
  gameTimeInMinutes: number; // Added for tracking in-game time
  journal: JournalEntry[]; // Added for player journal
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

export type Zone = {
  name: string;
  description?: string; // Optional description for the zone
};

export type Position = {
  latitude: number;
  longitude: number;
  name: string;
  summary?: string; // Optional summary from Wikipedia
  imageUrl?: string; // Optional image URL
  zone?: Zone; // Optional zone information
};
