/**
 * @fileOverview Zod schemas for generating a save game summary.
 */
import { z } from 'zod';

export const GenerateSaveSummaryInputSchema = z.object({
  playerName: z.string().describe("The player's name."),
  level: z.number().describe("The player's current level."),
  locationName: z.string().describe("The player's current location name."),
  lastJournalEntries: z.array(z.string()).describe("A list of the last 3-5 journal entries to provide context on recent activities."),
  questLogSummary: z.array(z.string()).describe("A summary of active quest titles."),
});
export type GenerateSaveSummaryInput = z.infer<typeof GenerateSaveSummaryInputSchema>;

export const GenerateSaveSummaryOutputSchema = z.object({
  summary: z.string().describe("A very short, one-sentence summary of the player's current situation for a save file. Example: 'Exploring the Louvre after finding a mysterious key.'"),
});
export type GenerateSaveSummaryOutput = z.infer<typeof GenerateSaveSummaryOutputSchema>;
