
export const AVAILABLE_TONES = ["Horreur", "Romance", "Humour", "Mystère", "Action"] as const;
export type GameTone = typeof AVAILABLE_TONES[number];
export type ToneSettings = Partial<Record<GameTone, number>>;
