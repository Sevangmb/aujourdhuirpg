
export type ClueType = 'photo' | 'testimony' | 'text_extract' | 'object_observation' | 'digital_trace' | 'audio_recording' | 'misc_clue';

export interface Clue {
  id: string; // Unique ID for the clue, e.g., "clue_photo_crime_scene_01"
  title: string;
  description: string; // Detailed description of the clue
  type: ClueType;
  dateFound: string; // ISO string date
  source?: string; // How/where the clue was found (e.g., "PNJ Interview: Témoin X", "Fouille: Bureau de la victime")
  imageUrl?: string; // Optional URL if it's a photo clue
  keywords?: string[]; // Keywords for searching/tagging, suggested by AI or player
}

export type DocumentType = 'article' | 'letter' | 'note' | 'journal_entry' | 'computer_log' | 'report' | 'misc_document';

export interface GameDocument {
  id: string; // Unique ID for the document, e.g., "doc_letter_victim_01"
  title: string;
  content: string; // Can be plain text or HTML for formatting
  type: DocumentType;
  dateAcquired: string; // ISO string date
  source?: string; // How/where the document was acquired
  keywords?: string[]; // Keywords for searching/tagging
}
