export const AVAILABLE_TONES = ["Humoristique", "Action", "Romantique", "Dramatique", "Mystérieux", "Épique", "Science-Fiction", "Fantastique", "Thriller", "Horreur"] as const;
export type GameTone = typeof AVAILABLE_TONES[number];
export type ToneSettings = Partial<Record<GameTone, number>>;
