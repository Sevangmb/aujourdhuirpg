export const AVAILABLE_TONES = ["Horreur", "Romance", "Humour", "Mystère", "Action", "Fantastique", "Science Fiction"] as const;
export type GameTone = typeof AVAILABLE_TONES[number];
export type ToneSettings = Partial<Record<GameTone, number>>;