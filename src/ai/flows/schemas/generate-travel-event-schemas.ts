/**
 * @fileOverview Zod schemas for the generateTravelEvent flow.
 */
import { z } from 'genkit';
import { LocationSchema } from './player-common-schemas';

export const GenerateTravelEventInputSchema = z.object({
  travelMode: z.enum(['walk', 'metro', 'taxi']).describe("The mode of transport used by the player."),
  origin: LocationSchema.describe("The starting point of the travel."),
  destination: LocationSchema.describe("The destination of the travel."),
  playerStats: z.record(z.number()).describe("Player's current stats to influence the event."),
  playerSkills: z.record(z.number()).describe("Player's current skills to influence the event."),
  gameTimeInMinutes: z.number().describe("The current time in the game world to influence the event (e.g., day/night).")
});
export type GenerateTravelEventInput = z.infer<typeof GenerateTravelEventInputSchema>;

export const GenerateTravelEventOutputSchema = z.object({
  narrative: z.string().describe("A short, descriptive HTML paragraph detailing a small event that occurred during the travel. Should be empty if nothing noteworthy happens."),
});
export type GenerateTravelEventOutput = z.infer<typeof GenerateTravelEventOutputSchema>;
